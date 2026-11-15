using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ResQui.Application.Common;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Assistente;

public class AssistenteService(
    IAssistenteProvider provider,
    IReagentesRepository reagentesRepo,
    IResiduosRepository residuosRepo,
    IConfiguration config) : IAssistenteService
{
    private static readonly string[] AcoesConhecidas =
        ["nav", "compat", "detail", "consume", "generateLabel", "registerWaste", "createMtr", "listExpiring", "explain"];

    private const int MaxHistorico = 6;

    public const int MaxCaracteresMensagem = 1000;

    private static readonly JsonElement ParamsVazio = JsonDocument.Parse("{}").RootElement.Clone();

    public async Task<RespostaAssistenteDto> ResponderAsync(MensagemAssistenteCmd cmd, Solicitante solicitante, CancellationToken ct = default)
    {
        if (!config.GetValue("Assistente:Enabled", false))
            throw new AssistenteIndisponivelException("O assistente não está configurado nesta instalação.");

        if (string.IsNullOrWhiteSpace(cmd.Mensagem))
            throw new ValidationException("Envie uma mensagem para o assistente.");

        if (cmd.Mensagem.Length > MaxCaracteresMensagem)
            throw new ValidationException($"A mensagem passa de {MaxCaracteresMensagem} caracteres. Resuma o pedido.");

        var maxReagentes = config.GetValue("Assistente:MaxReagentesCatalogo", 200);

        var reagentes = (await reagentesRepo.GetAllAsync())
            .Where(r => solicitante.Responde(r.LaboratorioId))
            .OrderBy(r => r.Id, StringComparer.Ordinal)
            .Take(maxReagentes)
            .ToList();

        var residuos = (await residuosRepo.GetAllAsync())
            .Where(r => r.Status == "aguardando-coleta")
            .Where(r => solicitante.VeTudo || solicitante.LaboratorioIds.Contains(r.LaboratorioId))
            .OrderBy(r => r.Id)
            .ToList();

        var prompt = AssistentePrompt.Montar(reagentes, residuos);

        var historico = (cmd.Historico ?? [])
            .Where(m => !string.IsNullOrWhiteSpace(m.Texto))
            .TakeLast(MaxHistorico)
            .Select(m => m with { Texto = Truncar(m.Texto) })
            .ToList();

        var conteudo = await provider.CompletarAsync(prompt, historico, cmd.Mensagem, ct);

        return Interpretar(conteudo);
    }

    private static string Truncar(string texto) =>
        texto.Length > MaxCaracteresMensagem ? texto[..MaxCaracteresMensagem] : texto;

    private static RespostaAssistenteDto Interpretar(string conteudo)
    {
        var limpo = conteudo.Trim();
        if (limpo.StartsWith("```", StringComparison.Ordinal))
        {
            var primeiraQuebra = limpo.IndexOf('\n');
            if (primeiraQuebra >= 0) limpo = limpo[(primeiraQuebra + 1)..];
            var fim = limpo.LastIndexOf("```", StringComparison.Ordinal);
            if (fim >= 0) limpo = limpo[..fim];
            limpo = limpo.Trim();
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(limpo);
        }
        catch (JsonException)
        {
            throw new AssistenteIndisponivelException("Não consegui interpretar a resposta do assistente. Tente reformular.");
        }

        using (doc)
        {
            var raiz = doc.RootElement;
            if (raiz.ValueKind != JsonValueKind.Object)
                throw new AssistenteIndisponivelException("Não consegui interpretar a resposta do assistente. Tente reformular.");

            var say = raiz.TryGetProperty("say", out var s) && s.ValueKind == JsonValueKind.String
                ? s.GetString() ?? "" : "";
            var action = raiz.TryGetProperty("action", out var a) && a.ValueKind == JsonValueKind.String
                ? a.GetString() ?? "explain" : "explain";
            if (!AcoesConhecidas.Contains(action)) action = "explain";

            var parametros = raiz.TryGetProperty("params", out var p) && p.ValueKind == JsonValueKind.Object
                ? p.Clone()
                : ParamsVazio;

            return new RespostaAssistenteDto(say, action, parametros);
        }
    }
}

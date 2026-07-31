using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Notificacoes;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Compatibilidade;

// Ações que a tela de Compatibilidade dispara sobre um par de reagentes. Vive separado do
// CompatService (matriz + overrides), de que os gates de ResiduosService/MtrsService dependem.
public class CompatAcoesService(
    IReagentesRepository reagentes,
    ICompatService compat,
    IAuditoriaService auditoria,
    INotificacoesService notificacoes,
    IAuthRepository auth) : ICompatAcoesService
{
    private const int LimiteParecer = 1000;

    public async Task RegistrarParecerAsync(string usuarioEmail, RegistrarParecerCmd cmd)
    {
        var parecer = (cmd.Parecer ?? "").Trim();
        if (parecer.Length > LimiteParecer)
            throw new ValidationException($"O parecer não pode passar de {LimiteParecer} caracteres.");

        var (a, b, resultado) = await ResolverParAsync(cmd.ReagenteAId, cmd.ReagenteBId);

        var detalhe = $"{a.Id} ({a.Nome}, classe {a.ClasseReatividade}) + " +
                      $"{b.Id} ({b.Nome}, classe {b.ClasseReatividade}) → " +
                      $"nível {resultado.Nivel} ({resultado.Descricao}).";
        if (parecer.Length > 0) detalhe += $" Parecer: {parecer}";

        await auditoria.RegistrarAsync(usuarioEmail, "compat.parecer", "Compatibilidade", detalhe, RiscoAuditoria.Low);
    }

    public async Task<NotificarResponsaveisResultDto> NotificarResponsaveisAsync(string usuarioEmail, NotificarResponsaveisCmd cmd)
    {
        var (a, b, resultado) = await ResolverParAsync(cmd.ReagenteAId, cmd.ReagenteBId);

        if (resultado.Nivel < 2)
            throw new ValidationException("Notificação só se aplica a pares em nível Perigo ou Proibido.");

        var ativos = (await auth.GetAllAsync()).Where(u => !u.Arquivado).ToList();

        var notificados = new List<NotificadoDto>();
        var naoResolvidos = new List<NaoResolvidoDto>();

        foreach (var reagente in new[] { a, b })
        {
            var responsavel = (reagente.Responsavel ?? "").Trim();
            if (responsavel.Length == 0)
            {
                naoResolvidos.Add(new NaoResolvidoDto(reagente.Id, $"reagente {reagente.Id} sem responsável cadastrado"));
                continue;
            }

            // O mesmo responsável nos dois reagentes rende uma entrada só.
            if (naoResolvidos.Any(n => n.Responsavel == responsavel) ||
                notificados.Any(n => n.Nome == responsavel))
                continue;

            var porNome = ativos
                .Where(u => string.Equals((u.Nome ?? "").Trim(), responsavel, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (porNome.Count > 1)
            {
                naoResolvidos.Add(new NaoResolvidoDto(responsavel, "nome corresponde a mais de um usuário"));
                continue;
            }

            var alvo = porNome.SingleOrDefault()
                ?? ativos.FirstOrDefault(u => string.Equals(u.Email.Trim(), responsavel, StringComparison.OrdinalIgnoreCase));

            if (alvo is null)
            {
                naoResolvidos.Add(new NaoResolvidoDto(responsavel, "não corresponde a nenhum usuário ativo"));
                continue;
            }

            if (notificados.Any(n => n.UsuarioId == alvo.Id)) continue;
            notificados.Add(new NotificadoDto(alvo.Id, responsavel));
        }

        var refId = string.CompareOrdinal(a.Id, b.Id) < 0 ? $"{a.Id}|{b.Id}" : $"{b.Id}|{a.Id}";
        var severidade = resultado.Nivel >= 3 ? "red" : "amber";
        var mensagem = $"{usuarioEmail} sinalizou incompatibilidade entre {a.Nome} e {b.Nome} " +
                       $"(nível {resultado.Descricao}).";

        foreach (var n in notificados)
            await notificacoes.CriarAsync(n.UsuarioId, mensagem, "compat", refId, severidade);

        var detalhe = $"{a.Id} + {b.Id} → nível {resultado.Nivel} ({resultado.Descricao}). " +
                      $"Notificados: {(notificados.Count > 0 ? string.Join(", ", notificados.Select(n => n.Nome)) : "nenhum")}. " +
                      $"Não resolvidos: {(naoResolvidos.Count > 0 ? string.Join(", ", naoResolvidos.Select(n => $"{n.Responsavel} ({n.Motivo})")) : "nenhum")}.";

        await auditoria.RegistrarAsync(usuarioEmail, "compat.notificar", "Compatibilidade", detalhe, RiscoAuditoria.Medium);

        return new NotificarResponsaveisResultDto(notificados, naoResolvidos);
    }

    // Valida o par e devolve os dois reagentes com o nível vindo do servidor.
    private async Task<(Reagente A, Reagente B, CompatResultDto Resultado)> ResolverParAsync(string idA, string idB)
    {
        if (string.Equals(idA, idB, StringComparison.Ordinal))
            throw new ValidationException("Selecione dois reagentes diferentes.");

        var a = await reagentes.GetByIdAsync(idA) ?? throw new ValidationException($"Reagente {idA} não encontrado.");
        var b = await reagentes.GetByIdAsync(idB) ?? throw new ValidationException($"Reagente {idB} não encontrado.");

        var resultado = await compat.ConsultarParAsync(a.ClasseReatividade, b.ClasseReatividade)
            ?? throw new ValidationException("Par de classes sem entrada na matriz de compatibilidade.");

        return (a, b, resultado);
    }
}

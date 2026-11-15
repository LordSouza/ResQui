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
    IAuthRepository auth,
    IUsuarioLaboratoriosRepository usuarioLabs,
    ITransacoes transacoes) : ICompatAcoesService
{
    private const int LimiteParecer = 1000;

    public async Task RegistrarParecerAsync(Solicitante solicitante, RegistrarParecerCmd cmd)
    {
        var parecer = (cmd.Parecer ?? "").Trim();
        if (parecer.Length > LimiteParecer)
            throw new ValidationException($"O parecer não pode passar de {LimiteParecer} caracteres.");

        var (a, b, resultado) = await ResolverParAsync(cmd.ReagenteAId, cmd.ReagenteBId, solicitante);

        var detalhe = $"{a.Id} ({a.Nome}, classe {a.ClasseReatividade}) + " +
                      $"{b.Id} ({b.Nome}, classe {b.ClasseReatividade}) → " +
                      $"nível {resultado.Nivel} ({resultado.Descricao}).";
        if (parecer.Length > 0) detalhe += $" Parecer: {parecer}";

        await auditoria.RegistrarAsync(solicitante.Email, "compat.parecer", "Compatibilidade", detalhe, RiscoAuditoria.Low);
    }

    public async Task<NotificarProfessoresResultDto> NotificarProfessoresAsync(Solicitante solicitante, NotificarProfessoresCmd cmd)
    {
        var (a, b, resultado) = await ResolverParAsync(cmd.ReagenteAId, cmd.ReagenteBId, solicitante);

        if (resultado.Nivel < 2)
            throw new ValidationException("Notificação só se aplica a pares em nível Perigo ou Proibido.");

        var laboratoriosDoPar = new[] { a.LaboratorioId, b.LaboratorioId };
        var laboratoriosPorUsuario = await usuarioLabs.DeTodosAsync();
        var notificados = (await auth.GetAllAsync())
            .Where(u => !u.Arquivado && u.Papel == "Professor")
            .Where(u => laboratoriosPorUsuario.TryGetValue(u.Id, out var labs) && labs.Any(l => laboratoriosDoPar.Contains(l)))
            .Select(u => new NotificadoDto(u.Id, string.IsNullOrWhiteSpace(u.Nome) ? u.Email : u.Nome))
            .ToList();

        var refId = string.CompareOrdinal(a.Id, b.Id) < 0 ? $"{a.Id}|{b.Id}" : $"{b.Id}|{a.Id}";
        var severidade = resultado.Nivel >= 3 ? "red" : "amber";
        var mensagem = $"{solicitante.Email} sinalizou incompatibilidade entre {a.Nome} e {b.Nome} " +
                       $"(nível {resultado.Descricao}).";

        var detalhe = $"{a.Id} + {b.Id} → nível {resultado.Nivel} ({resultado.Descricao}). " +
                      $"Notificados: {(notificados.Count > 0 ? string.Join(", ", notificados.Select(n => n.Nome)) : "nenhum")}.";

        await transacoes.ExecutarAsync(async () =>
        {
            foreach (var n in notificados)
                await notificacoes.CriarAsync(n.UsuarioId, mensagem, "compat", refId, severidade);
            await auditoria.RegistrarAsync(solicitante.Email, "compat.notificar", "Compatibilidade", detalhe, RiscoAuditoria.Medium);
        });

        return new NotificarProfessoresResultDto(notificados);
    }

    // Valida o par e devolve os dois reagentes com o nível vindo do servidor.
    private async Task<(Reagente A, Reagente B, CompatResultDto Resultado)> ResolverParAsync(string idA, string idB, Solicitante solicitante)
    {
        if (string.Equals(idA, idB, StringComparison.Ordinal))
            throw new ValidationException("Selecione dois reagentes diferentes.");

        var a = await reagentes.GetByIdAsync(idA) ?? throw new ValidationException($"Reagente {idA} não encontrado.");
        var b = await reagentes.GetByIdAsync(idB) ?? throw new ValidationException($"Reagente {idB} não encontrado.");
        foreach (var r in new[] { a, b })
            if (!solicitante.Responde(r.LaboratorioId))
                throw new AcessoNegadoException($"O reagente {r.Id} é de um laboratório pelo qual você não responde.");

        var resultado = await compat.ConsultarParAsync(a.ClasseReatividade, b.ClasseReatividade)
            ?? throw new ValidationException("Par de classes sem entrada na matriz de compatibilidade.");

        return (a, b, resultado);
    }
}

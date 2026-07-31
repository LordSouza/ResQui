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

    public Task<NotificarResponsaveisResultDto> NotificarResponsaveisAsync(string usuarioEmail, NotificarResponsaveisCmd cmd) =>
        throw new NotImplementedException();

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

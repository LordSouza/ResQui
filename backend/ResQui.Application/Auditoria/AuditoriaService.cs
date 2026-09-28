using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Auditoria;

public class AuditoriaService(IAuditoriaRepository repo) : IAuditoriaService
{
    public async Task RegistrarAsync(string who, string what, string where, string detail, RiscoAuditoria risk)
    {
        var entry = new AuditoriaEntry
        {
            Who = who,
            What = what,
            Where = where,
            Detail = detail,
            Risk = risk,
            Timestamp = DateTime.UtcNow
        };
        await repo.AddAsync(entry);
        await repo.SaveChangesAsync();
    }

    public async Task<IEnumerable<AuditoriaItemDto>> ListarAsync(AuditoriaFiltroDto filtro)
    {
        RiscoAuditoria? risco =
            !string.IsNullOrEmpty(filtro.Risk)
            && Enum.TryParse<RiscoAuditoria>(filtro.Risk, ignoreCase: true, out var r)
                ? r : null;

        var entries = await repo.BuscarAsync(
            filtro.From is { } de ? ComoUtc(de) : null,
            filtro.To is { } ate ? ComoUtc(ate.Date.AddDays(1)) : null,
            risco, filtro.Who, filtro.What, filtro.Where, filtro.Detail, filtro.Limite, filtro.Autores);

        return entries.Select(e => new AuditoriaItemDto(
            e.Id, e.Timestamp, e.Who, e.What, e.Where, e.Detail,
            e.Risk.ToString().ToLower()));
    }

    private static DateTime ComoUtc(DateTime valor) =>
        valor.Kind == DateTimeKind.Utc ? valor : DateTime.SpecifyKind(valor, DateTimeKind.Utc);
}

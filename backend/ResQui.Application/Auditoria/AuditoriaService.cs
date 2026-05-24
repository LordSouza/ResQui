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
        var entries = await repo.GetAllAsync();

        if (filtro.From.HasValue)
            entries = entries.Where(e => e.Timestamp >= filtro.From.Value);
        if (filtro.To.HasValue)
            entries = entries.Where(e => e.Timestamp <= filtro.To.Value);
        if (!string.IsNullOrEmpty(filtro.Risk) &&
            Enum.TryParse<RiscoAuditoria>(filtro.Risk, ignoreCase: true, out var r))
            entries = entries.Where(e => e.Risk == r);
        if (!string.IsNullOrEmpty(filtro.Who))
            entries = entries.Where(e => e.Who.Contains(filtro.Who, StringComparison.OrdinalIgnoreCase));

        return entries.Select(e => new AuditoriaItemDto(
            e.Id, e.Timestamp, e.Who, e.What, e.Where, e.Detail,
            e.Risk.ToString().ToLower()));
    }
}

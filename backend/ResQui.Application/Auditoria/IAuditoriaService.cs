using ResQui.Domain.Enums;

namespace ResQui.Application.Auditoria;

public interface IAuditoriaService
{
    Task RegistrarAsync(string who, string what, string where, string detail, RiscoAuditoria risk);
    Task<IEnumerable<AuditoriaItemDto>> ListarAsync(AuditoriaFiltroDto filtro);
}

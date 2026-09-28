using ResQui.Domain.Entities;
using ResQui.Domain.Enums;

namespace ResQui.Domain.Interfaces;

public interface IAuditoriaRepository
{
    Task AddAsync(AuditoriaEntry entry);
    Task<IEnumerable<AuditoriaEntry>> BuscarAsync(
        DateTime? de, DateTime? ate, RiscoAuditoria? risco,
        string? quem, string? oQue, string? onde, string? detalhe, int? limite,
        IReadOnlyCollection<string>? autores = null);
    Task SaveChangesAsync();
}

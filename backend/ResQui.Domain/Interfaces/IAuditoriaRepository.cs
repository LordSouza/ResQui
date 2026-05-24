using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IAuditoriaRepository
{
    Task AddAsync(AuditoriaEntry entry);
    Task<IEnumerable<AuditoriaEntry>> GetAllAsync();
    Task SaveChangesAsync();
}

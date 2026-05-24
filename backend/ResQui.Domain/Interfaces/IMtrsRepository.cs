using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IMtrsRepository
{
    Task<IEnumerable<Mtr>> GetAllAsync();
    Task<Mtr?> GetByIdAsync(int id);
    Task AddAsync(Mtr mtr);
    Task UpdateAsync(Mtr mtr);
    Task SaveChangesAsync();
}

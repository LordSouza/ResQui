using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IResiduosRepository
{
    Task<IEnumerable<Residuo>> GetAllAsync();
    Task<Residuo?> GetByIdAsync(int id);
    Task AddAsync(Residuo residuo);
    Task UpdateAsync(Residuo residuo);
    Task SaveChangesAsync();
}

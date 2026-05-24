using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IReagentesRepository
{
    Task<IEnumerable<Reagente>> GetAllAsync();
    Task<Reagente?> GetByIdAsync(string id);
    Task AddAsync(Reagente reagente);
    Task UpdateAsync(Reagente reagente);
    Task DeleteAsync(string id);
    Task SaveChangesAsync();
}

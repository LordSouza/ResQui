using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface ILaboratoriosRepository
{
    Task<IEnumerable<Laboratorio>> GetAllAsync();
    Task<Laboratorio?> GetByIdAsync(string id);
    Task AddAsync(Laboratorio lab);
    Task UpdateAsync(Laboratorio lab);
    Task DeleteAsync(string id);
    Task SaveChangesAsync();
}

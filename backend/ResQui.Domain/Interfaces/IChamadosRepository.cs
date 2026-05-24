using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IChamadosRepository
{
    Task<IEnumerable<Chamado>> GetAllAsync();
    Task<Chamado?> GetByIdAsync(int id);
    Task AddAsync(Chamado chamado);
    Task UpdateAsync(Chamado chamado);
    Task SaveChangesAsync();
}

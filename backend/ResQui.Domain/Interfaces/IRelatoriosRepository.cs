using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IRelatoriosRepository
{
    Task<IEnumerable<RelatorioGerado>> GetAllAsync();
    Task<RelatorioGerado?> GetByIdAsync(int id);
    Task AddAsync(RelatorioGerado relatorio);
    Task SaveChangesAsync();
}

using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IReagenteLotesRepository
{
    Task<IEnumerable<ReagenteLote>> GetByReagenteAsync(string reagenteId);
    Task<ReagenteLote?> GetByIdAsync(int id);
    Task AddAsync(ReagenteLote lote);
    Task UpdateAsync(ReagenteLote lote);
    Task DeleteAsync(ReagenteLote lote);
    Task SaveChangesAsync();
}

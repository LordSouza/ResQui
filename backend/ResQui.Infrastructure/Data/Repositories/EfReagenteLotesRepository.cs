using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfReagenteLotesRepository(AppDbContext db) : IReagenteLotesRepository
{
    public async Task<IEnumerable<ReagenteLote>> GetByReagenteAsync(string reagenteId) =>
        await db.ReagenteLotes.Where(l => l.ReagenteId == reagenteId).OrderBy(l => l.Validade).ToListAsync();

    public async Task<ReagenteLote?> GetByIdAsync(int id) =>
        await db.ReagenteLotes.FindAsync(id);

    public async Task AddAsync(ReagenteLote lote) =>
        await db.ReagenteLotes.AddAsync(lote);

    public Task UpdateAsync(ReagenteLote lote)
    {
        db.ReagenteLotes.Update(lote);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ReagenteLote lote)
    {
        db.ReagenteLotes.Remove(lote);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

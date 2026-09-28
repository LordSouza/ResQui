using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfReagentesRepository(AppDbContext db) : IReagentesRepository
{
    public async Task<IEnumerable<Reagente>> GetAllAsync() =>
        await db.Reagentes.Include(r => r.Ghs).Include(r => r.Laboratorio).ToListAsync();

    public async Task<Reagente?> GetByIdAsync(string id) =>
        await db.Reagentes.Include(r => r.Ghs).Include(r => r.Laboratorio).FirstOrDefaultAsync(r => r.Id == id);

    public async Task AddAsync(Reagente reagente) =>
        await db.Reagentes.AddAsync(reagente);

    public Task UpdateAsync(Reagente reagente)
    {
        db.Reagentes.Update(reagente);
        if (reagente.Laboratorio is not null)
            db.Entry(reagente.Laboratorio).State = EntityState.Unchanged;
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(string id)
    {
        var r = await db.Reagentes.FindAsync(id);
        if (r is not null) db.Reagentes.Remove(r);
    }

    public async Task SaveChangesAsync() =>
        await db.SaveChangesAsync();
}

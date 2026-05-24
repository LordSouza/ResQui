using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfResiduosRepository(AppDbContext db) : IResiduosRepository
{
    public async Task<IEnumerable<Residuo>> GetAllAsync() =>
        await db.Residuos.ToListAsync();

    public async Task<Residuo?> GetByIdAsync(int id) =>
        await db.Residuos.FindAsync(id);

    public async Task AddAsync(Residuo residuo) =>
        await db.Residuos.AddAsync(residuo);

    public Task UpdateAsync(Residuo residuo)
    {
        db.Residuos.Update(residuo);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

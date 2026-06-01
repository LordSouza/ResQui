using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfCompatOverridesRepository(AppDbContext db) : ICompatOverridesRepository
{
    public async Task<IEnumerable<CompatOverride>> GetAllAsync() =>
        await db.CompatOverrides.ToListAsync();

    public async Task<CompatOverride?> GetAsync(int classeA, int classeB) =>
        await db.CompatOverrides.FindAsync(classeA, classeB);

    public async Task UpsertAsync(CompatOverride entry)
    {
        var existing = await db.CompatOverrides.FindAsync(entry.ClasseA, entry.ClasseB);
        if (existing is null)
            db.CompatOverrides.Add(entry);
        else
        {
            existing.Nivel = entry.Nivel;
            existing.Motivo = entry.Motivo;
            existing.Autor = entry.Autor;
            existing.DataEdicao = entry.DataEdicao;
        }
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int classeA, int classeB)
    {
        var entry = await db.CompatOverrides.FindAsync(classeA, classeB);
        if (entry is not null)
        {
            db.CompatOverrides.Remove(entry);
            await db.SaveChangesAsync();
        }
    }
}

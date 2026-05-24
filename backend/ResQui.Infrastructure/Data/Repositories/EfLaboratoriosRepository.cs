using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfLaboratoriosRepository(AppDbContext db) : ILaboratoriosRepository
{
    public async Task<IEnumerable<Laboratorio>> GetAllAsync() =>
        await db.Laboratorios.ToListAsync();

    public async Task<Laboratorio?> GetByIdAsync(int id) =>
        await db.Laboratorios.FindAsync(id);

    public async Task AddAsync(Laboratorio lab) =>
        await db.Laboratorios.AddAsync(lab);

    public Task UpdateAsync(Laboratorio lab)
    {
        db.Laboratorios.Update(lab);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(int id)
    {
        var l = await db.Laboratorios.FindAsync(id);
        if (l is not null) db.Laboratorios.Remove(l);
    }

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

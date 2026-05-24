using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfMtrsRepository(AppDbContext db) : IMtrsRepository
{
    public async Task<IEnumerable<Mtr>> GetAllAsync() => await db.Mtrs.ToListAsync();
    public async Task<Mtr?> GetByIdAsync(int id) => await db.Mtrs.FindAsync(id);
    public async Task AddAsync(Mtr mtr) => await db.Mtrs.AddAsync(mtr);
    public Task UpdateAsync(Mtr mtr) { db.Mtrs.Update(mtr); return Task.CompletedTask; }
    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfConvitesRepository(AppDbContext db) : IConvitesRepository
{
    public async Task AddAsync(Convite convite) => await db.Convites.AddAsync(convite);

    public async Task<Convite?> GetByTokenHashAsync(string tokenHash) =>
        await db.Convites.FirstOrDefaultAsync(c => c.TokenHash == tokenHash);

    public async Task<Convite?> GetByIdAsync(int id) =>
        await db.Convites.FirstOrDefaultAsync(c => c.Id == id);

    public async Task<IEnumerable<Convite>> GetAllAsync() =>
        await db.Convites.OrderByDescending(c => c.CriadoEm).ToListAsync();

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

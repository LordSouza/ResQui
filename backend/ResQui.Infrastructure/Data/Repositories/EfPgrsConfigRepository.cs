using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfPgrsConfigRepository(AppDbContext db) : IPgrsConfigRepository
{
    public async Task<ConfiguracaoPgrs?> GetAsync() =>
        await db.ConfiguracaoPgrs.FirstOrDefaultAsync();

    public async Task AddAsync(ConfiguracaoPgrs cfg) =>
        await db.ConfiguracaoPgrs.AddAsync(cfg);

    public async Task SaveChangesAsync() =>
        await db.SaveChangesAsync();
}

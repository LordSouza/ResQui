using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfRelatoriosRepository(AppDbContext db) : IRelatoriosRepository
{
    public async Task<IEnumerable<RelatorioGerado>> GetAllAsync() =>
        await db.RelatoriosGerados.OrderByDescending(r => r.GeradoEm).ToListAsync();

    public async Task<RelatorioGerado?> GetByIdAsync(int id) =>
        await db.RelatoriosGerados.FindAsync(id);

    public async Task AddAsync(RelatorioGerado relatorio) =>
        await db.RelatoriosGerados.AddAsync(relatorio);

    public async Task SaveChangesAsync() =>
        await db.SaveChangesAsync();
}

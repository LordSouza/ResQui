using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfAuditoriaRepository(AppDbContext db) : IAuditoriaRepository
{
    public async Task AddAsync(AuditoriaEntry entry) => await db.Auditoria.AddAsync(entry);
    public async Task<IEnumerable<AuditoriaEntry>> GetAllAsync() =>
        await db.Auditoria.OrderByDescending(a => a.Timestamp).ToListAsync();
    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

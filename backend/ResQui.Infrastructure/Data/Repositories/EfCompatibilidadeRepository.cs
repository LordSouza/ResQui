using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfCompatibilidadeRepository(AppDbContext db) : ICompatibilidadeRepository
{
    public async Task<CompatEntry?> GetNivelAsync(int classeA, int classeB) =>
        await db.CompatEntries.FindAsync(classeA, classeB);

    public async Task<IEnumerable<CompatEntry>> GetAllAsync() =>
        await db.CompatEntries.ToListAsync();
}

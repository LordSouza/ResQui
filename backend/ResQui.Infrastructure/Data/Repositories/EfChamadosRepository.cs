using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfChamadosRepository(AppDbContext db) : IChamadosRepository
{
    public async Task<IEnumerable<Chamado>> GetAllAsync() => await db.Chamados.ToListAsync();
    public async Task<Chamado?> GetByIdAsync(int id) => await db.Chamados.FindAsync(id);
    public async Task AddAsync(Chamado chamado) => await db.Chamados.AddAsync(chamado);
    public Task UpdateAsync(Chamado chamado) { db.Chamados.Update(chamado); return Task.CompletedTask; }
    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

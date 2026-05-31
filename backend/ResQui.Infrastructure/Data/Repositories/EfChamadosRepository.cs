using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfChamadosRepository(AppDbContext db) : IChamadosRepository
{
    public async Task<IEnumerable<Chamado>> GetAllWithComentariosAsync() =>
        await db.Chamados.Include(c => c.Comentarios).ToListAsync();

    public async Task<Chamado?> GetByIdWithComentariosAsync(int id) =>
        await db.Chamados.Include(c => c.Comentarios).FirstOrDefaultAsync(c => c.Id == id);

    public async Task AddAsync(Chamado chamado) => await db.Chamados.AddAsync(chamado);

    public async Task AddComentarioAsync(ChamadoComentario comentario) =>
        await db.ChamadoComentarios.AddAsync(comentario);

    public Task UpdateAsync(Chamado chamado) { db.Chamados.Update(chamado); return Task.CompletedTask; }

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfRedefinicoesSenhaRepository(AppDbContext db) : IRedefinicoesSenhaRepository
{
    public async Task AddAsync(RedefinicaoSenha redefinicao) => await db.RedefinicoesSenha.AddAsync(redefinicao);

    public async Task<RedefinicaoSenha?> GetByTokenHashAsync(string tokenHash) =>
        await db.RedefinicoesSenha.FirstOrDefaultAsync(r => r.TokenHash == tokenHash);

    public async Task<int> ContarDesdeAsync(string usuarioId, DateTime desde) =>
        await db.RedefinicoesSenha.CountAsync(r => r.UsuarioId == usuarioId && r.CriadaEm >= desde);

    public async Task<IEnumerable<RedefinicaoSenha>> PendentesDoUsuarioAsync(string usuarioId) =>
        await db.RedefinicoesSenha
            .Where(r => r.UsuarioId == usuarioId && r.UsadaEm == null && r.ExpiraEm > DateTime.UtcNow)
            .ToListAsync();

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

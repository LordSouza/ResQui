using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfSessoesRepository(AppDbContext db) : ISessoesRepository
{
    public async Task AddAsync(SessaoToken sessao) =>
        await db.SessoesTokens.AddAsync(sessao);

    public async Task<SessaoToken?> GetByJtiAsync(string jti) =>
        await db.SessoesTokens.FirstOrDefaultAsync(s => s.Jti == jti);

    public async Task<IEnumerable<SessaoToken>> GetAtivasByUsuarioAsync(string usuarioId) =>
        await db.SessoesTokens
            .Where(s => s.UsuarioId == usuarioId && !s.Revogada && s.ExpiraEm > DateTime.UtcNow)
            .OrderByDescending(s => s.CriadaEm)
            .ToListAsync();

    public Task UpdateAsync(SessaoToken sessao)
    {
        db.SessoesTokens.Update(sessao);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();
}

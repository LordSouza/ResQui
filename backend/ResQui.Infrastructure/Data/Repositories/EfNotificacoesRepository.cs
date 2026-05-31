using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfNotificacoesRepository(AppDbContext db) : INotificacoesRepository
{
    public async Task<IEnumerable<Notificacao>> GetByUsuarioAsync(string usuarioId) =>
        await db.Notificacoes.Where(n => n.UsuarioId == usuarioId).ToListAsync();

    public async Task MarkAsReadAsync(int id)
    {
        var n = await db.Notificacoes.FindAsync(id);
        if (n is not null) { n.Lida = true; await db.SaveChangesAsync(); }
    }

    public async Task AddAsync(Notificacao notificacao) =>
        await db.Notificacoes.AddAsync(notificacao);

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();

    public async Task<bool> ExisteNaoLidaAsync(string usuarioId, string tipo, string referenciaId) =>
        await db.Notificacoes.AnyAsync(n =>
            n.UsuarioId == usuarioId &&
            n.Tipo == tipo &&
            n.ReferenciaId == referenciaId &&
            !n.Lida);

    public async Task MarcarTodasLidasAsync(string usuarioId)
    {
        await db.Notificacoes
            .Where(n => n.UsuarioId == usuarioId && !n.Lida)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Lida, true));
    }
}

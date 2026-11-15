using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfNotificacoesRepository(AppDbContext db) : INotificacoesRepository
{
    private const int LimiteListagem = 50;

    // Não lidas vêm antes para que o limite nunca esconda uma pendente atrás de lidas recentes:
    // o badge do front conta as não lidas a partir desta lista.
    public async Task<IEnumerable<Notificacao>> GetByUsuarioAsync(string usuarioId) =>
        await db.Notificacoes
            .Where(n => n.UsuarioId == usuarioId)
            .OrderBy(n => n.Lida)
            .ThenByDescending(n => n.CriadaEm)
            .ThenByDescending(n => n.Id)
            .Take(LimiteListagem)
            .ToListAsync();

    public async Task<bool> MarkAsReadAsync(int id, string usuarioId)
    {
        var n = await db.Notificacoes.FirstOrDefaultAsync(x => x.Id == id && x.UsuarioId == usuarioId);
        if (n is null || n.Lida) return false;
        n.Lida = true;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task AddAsync(Notificacao notificacao) =>
        await db.Notificacoes.AddAsync(notificacao);

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();

    public async Task<bool> ExisteAsync(string usuarioId, string tipo, string referenciaId) =>
        await db.Notificacoes.AnyAsync(n =>
            n.UsuarioId == usuarioId &&
            n.Tipo == tipo &&
            n.ReferenciaId == referenciaId);

    public async Task<int> MarcarTodasLidasAsync(string usuarioId)
    {
        return await db.Notificacoes
            .Where(n => n.UsuarioId == usuarioId && !n.Lida)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Lida, true));
    }

    public async Task<int> ExcluirLidasCriadasAntesDeAsync(DateTime criadasAntesDeUtc) =>
        await db.Notificacoes
            .Where(n => n.Lida && n.CriadaEm < criadasAntesDeUtc)
            .ExecuteDeleteAsync();
}

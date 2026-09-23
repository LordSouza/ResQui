using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfUsuarioLaboratoriosRepository(AppDbContext db) : IUsuarioLaboratoriosRepository
{
    public async Task<IReadOnlyList<string>> DoUsuarioAsync(string usuarioId) =>
        await db.UsuarioLaboratorios
            .Where(ul => ul.UsuarioId == usuarioId)
            .Select(ul => ul.LaboratorioId)
            .OrderBy(id => id)
            .ToListAsync();

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> DeTodosAsync()
    {
        var linhas = await db.UsuarioLaboratorios.OrderBy(ul => ul.LaboratorioId).ToListAsync();
        return linhas
            .GroupBy(ul => ul.UsuarioId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<string>)g.Select(ul => ul.LaboratorioId).ToList());
    }

    public async Task<IReadOnlyList<string>> UsuariosDoLaboratorioAsync(string laboratorioId) =>
        await db.UsuarioLaboratorios
            .Where(ul => ul.LaboratorioId == laboratorioId)
            .Select(ul => ul.UsuarioId)
            .ToListAsync();

    public async Task DefinirAsync(string usuarioId, IEnumerable<string> laboratorioIds)
    {
        var atuais = await db.UsuarioLaboratorios.Where(ul => ul.UsuarioId == usuarioId).ToListAsync();
        db.UsuarioLaboratorios.RemoveRange(atuais);
        foreach (var laboratorioId in laboratorioIds.Distinct())
            await db.UsuarioLaboratorios.AddAsync(new UsuarioLaboratorio
            {
                UsuarioId = usuarioId,
                LaboratorioId = laboratorioId,
            });
        await db.SaveChangesAsync();
    }

    public async Task AdicionarAsync(string usuarioId, string laboratorioId)
    {
        var ja = await db.UsuarioLaboratorios
            .AnyAsync(ul => ul.UsuarioId == usuarioId && ul.LaboratorioId == laboratorioId);
        if (ja) return;
        await db.UsuarioLaboratorios.AddAsync(new UsuarioLaboratorio
        {
            UsuarioId = usuarioId,
            LaboratorioId = laboratorioId,
        });
        await db.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<string>> DoConviteAsync(int conviteId) =>
        await db.ConviteLaboratorios
            .Where(cl => cl.ConviteId == conviteId)
            .Select(cl => cl.LaboratorioId)
            .OrderBy(id => id)
            .ToListAsync();

    public async Task DefinirDoConviteAsync(int conviteId, IEnumerable<string> laboratorioIds)
    {
        var atuais = await db.ConviteLaboratorios.Where(cl => cl.ConviteId == conviteId).ToListAsync();
        db.ConviteLaboratorios.RemoveRange(atuais);
        foreach (var laboratorioId in laboratorioIds.Distinct())
            await db.ConviteLaboratorios.AddAsync(new ConviteLaboratorio
            {
                ConviteId = conviteId,
                LaboratorioId = laboratorioId,
            });
        await db.SaveChangesAsync();
    }
}

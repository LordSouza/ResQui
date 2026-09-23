using Microsoft.EntityFrameworkCore;
using ResQui.Application.Common;
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
        var desejados = laboratorioIds.Distinct().ToHashSet();
        var atuais = await db.UsuarioLaboratorios.Where(ul => ul.UsuarioId == usuarioId).ToListAsync();

        db.UsuarioLaboratorios.RemoveRange(atuais.Where(ul => !desejados.Contains(ul.LaboratorioId)));
        foreach (var laboratorioId in desejados.Except(atuais.Select(ul => ul.LaboratorioId)))
            await db.UsuarioLaboratorios.AddAsync(new UsuarioLaboratorio
            {
                UsuarioId = usuarioId,
                LaboratorioId = laboratorioId,
            });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ViolacaoDeUnicidade.Detecta(ex))
        {
            throw new ConflitoConcorrenciaException(
                "Os laboratórios deste usuário foram alterados por outra pessoa enquanto você editava. Recarregue antes de salvar.");
        }
    }

    public async Task AdicionarAsync(string usuarioId, string laboratorioId)
    {
        var ja = await db.UsuarioLaboratorios
            .AnyAsync(ul => ul.UsuarioId == usuarioId && ul.LaboratorioId == laboratorioId);
        if (ja) return;
        var linha = new UsuarioLaboratorio { UsuarioId = usuarioId, LaboratorioId = laboratorioId };
        await db.UsuarioLaboratorios.AddAsync(linha);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ViolacaoDeUnicidade.Detecta(ex))
        {
            db.Entry(linha).State = EntityState.Detached;
        }
    }

    public async Task<IReadOnlyList<string>> DoConviteAsync(int conviteId) =>
        await db.ConviteLaboratorios
            .Where(cl => cl.ConviteId == conviteId)
            .Select(cl => cl.LaboratorioId)
            .OrderBy(id => id)
            .ToListAsync();

    public async Task DefinirDoConviteAsync(int conviteId, IEnumerable<string> laboratorioIds)
    {
        var desejados = laboratorioIds.Distinct().ToHashSet();
        var atuais = await db.ConviteLaboratorios.Where(cl => cl.ConviteId == conviteId).ToListAsync();

        db.ConviteLaboratorios.RemoveRange(atuais.Where(cl => !desejados.Contains(cl.LaboratorioId)));
        foreach (var laboratorioId in desejados.Except(atuais.Select(cl => cl.LaboratorioId)))
            await db.ConviteLaboratorios.AddAsync(new ConviteLaboratorio
            {
                ConviteId = conviteId,
                LaboratorioId = laboratorioId,
            });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ViolacaoDeUnicidade.Detecta(ex))
        {
            throw new ConflitoConcorrenciaException(
                "Os laboratórios deste convite foram alterados por outra pessoa. Recarregue antes de salvar.");
        }
    }
}

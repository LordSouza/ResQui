using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfAuditoriaRepository(AppDbContext db) : IAuditoriaRepository
{
    public async Task AddAsync(AuditoriaEntry entry) => await db.Auditoria.AddAsync(entry);

    public async Task<IEnumerable<AuditoriaEntry>> BuscarAsync(
        DateTime? de, DateTime? ate, RiscoAuditoria? risco,
        string? quem, string? oQue, string? onde, string? detalhe, int? limite)
    {
        var consulta = db.Auditoria.AsQueryable();

        if (de is { } inicio) consulta = consulta.Where(a => a.Timestamp >= inicio);
        if (ate is { } fim) consulta = consulta.Where(a => a.Timestamp < fim);
        if (risco is { } r) consulta = consulta.Where(a => a.Risk == r);
        if (!string.IsNullOrEmpty(quem)) consulta = consulta.Where(a => EF.Functions.ILike(a.Who, Curinga(quem), Escape));
        if (!string.IsNullOrEmpty(oQue)) consulta = consulta.Where(a => EF.Functions.ILike(a.What, Curinga(oQue), Escape));
        if (!string.IsNullOrEmpty(onde)) consulta = consulta.Where(a => EF.Functions.ILike(a.Where, Curinga(onde), Escape));
        if (!string.IsNullOrEmpty(detalhe)) consulta = consulta.Where(a => EF.Functions.ILike(a.Detail, Curinga(detalhe), Escape));

        consulta = consulta.OrderByDescending(a => a.Timestamp);
        if (limite is { } teto) consulta = consulta.Take(Math.Max(teto, 0));

        return await consulta.ToListAsync();
    }

    public async Task SaveChangesAsync() => await db.SaveChangesAsync();

    private const string Escape = "\\";

    private static string Curinga(string termo) =>
        "%" + termo.Replace(Escape, Escape + Escape)
                   .Replace("%", Escape + "%")
                   .Replace("_", Escape + "_") + "%";
}

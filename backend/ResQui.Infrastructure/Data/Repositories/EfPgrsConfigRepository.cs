using Microsoft.EntityFrameworkCore;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data.Repositories;

public class EfPgrsConfigRepository(AppDbContext db) : IPgrsConfigRepository
{
    public async Task<ConfiguracaoPgrs?> GetAsync() =>
        await db.ConfiguracaoPgrs.FirstOrDefaultAsync();

    public async Task AddAsync(ConfiguracaoPgrs cfg) =>
        await db.ConfiguracaoPgrs.AddAsync(cfg);

    public async Task SaveChangesAsync()
    {
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ViolacaoDeUnicidade.Detecta(ex))
        {
            throw new ConflitoConcorrenciaException(
                "A configuração foi criada por outra pessoa enquanto você editava. Recarregue antes de salvar.");
        }
    }
}

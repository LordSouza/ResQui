using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Compatibilidade;

public class CompatService(
    ICompatibilidadeRepository repo,
    ICompatOverridesRepository overridesRepo) : ICompatService
{
    private static readonly string[] Descricoes = ["Compatível", "Cautela", "Perigo", "Proibido"];

    public async Task<CompatResultDto?> ConsultarParAsync(int classeA, int classeB)
    {
        var ov = await overridesRepo.GetAsync(classeA, classeB);
        if (ov is not null)
            return new CompatResultDto(classeA, classeB, ov.Nivel, Descricoes[ov.Nivel]);
        var entry = await repo.GetNivelAsync(classeA, classeB);
        if (entry is null) return null;
        return new CompatResultDto(classeA, classeB, entry.Nivel, Descricoes[entry.Nivel]);
    }

    public async Task<CompatResultDto?> AvaliarMisturaAsync(IReadOnlyCollection<int> classes)
    {
        CompatResultDto? pior = null;
        var distintas = classes.Distinct().ToList();
        for (var i = 0; i < distintas.Count; i++)
        for (var j = i + 1; j < distintas.Count; j++)
        {
            var result = await ConsultarParAsync(distintas[i], distintas[j]);
            if (result is not null && (pior is null || result.Nivel > pior.Nivel))
                pior = result;
        }
        return pior;
    }

    public async Task<CompatMatrizDto> GetMatrizAsync()
    {
        var all = await repo.GetAllAsync();
        var overrides = (await overridesRepo.GetAllAsync())
            .ToDictionary(o => (o.ClasseA, o.ClasseB));
        return new CompatMatrizDto(
            all.Select(e =>
            {
                var nivel = overrides.TryGetValue((e.ClasseA, e.ClasseB), out var ov)
                    ? ov.Nivel
                    : e.Nivel;
                return new CompatEntryDto(e.ClasseA, e.ClasseB, nivel);
            }).ToList()
        );
    }

    public async Task<IEnumerable<CompatOverrideDto>> GetOverridesAsync()
    {
        var all = await overridesRepo.GetAllAsync();
        return all.Select(ToDto);
    }

    public async Task<CompatOverrideDto> SalvarOverrideAsync(int classeA, int classeB, SalvarOverrideCmd cmd)
    {
        var entry = new CompatOverride
        {
            ClasseA = classeA,
            ClasseB = classeB,
            Nivel = cmd.Nivel,
            Motivo = cmd.Motivo,
            Autor = cmd.Autor,
            DataEdicao = DateTime.UtcNow,
        };
        await overridesRepo.UpsertAsync(entry);
        return ToDto(entry);
    }

    public async Task RemoverOverrideAsync(int classeA, int classeB) =>
        await overridesRepo.DeleteAsync(classeA, classeB);

    private static CompatOverrideDto ToDto(CompatOverride o) =>
        new(o.ClasseA, o.ClasseB, o.Nivel, o.Motivo, o.Autor,
            o.DataEdicao.ToString("yyyy-MM-dd"));
}

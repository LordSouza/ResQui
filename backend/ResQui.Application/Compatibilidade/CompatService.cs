using ResQui.Domain.Interfaces;

namespace ResQui.Application.Compatibilidade;

public class CompatService(ICompatibilidadeRepository repo) : ICompatService
{
    private static readonly string[] Descricoes = ["Compatível", "Cautela", "Perigo", "Proibido"];

    public async Task<CompatResultDto?> ConsultarParAsync(int classeA, int classeB)
    {
        var entry = await repo.GetNivelAsync(classeA, classeB);
        if (entry is null) return null;
        return new CompatResultDto(classeA, classeB, entry.Nivel, Descricoes[entry.Nivel]);
    }

    public async Task<CompatMatrizDto> GetMatrizAsync()
    {
        var all = await repo.GetAllAsync();
        return new CompatMatrizDto(all.Select(e => new CompatEntryDto(e.ClasseA, e.ClasseB, e.Nivel)).ToList());
    }
}

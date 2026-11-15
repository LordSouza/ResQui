using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Compatibilidade;

public class CompatService(
    ICompatibilidadeRepository repo,
    ICompatOverridesRepository overridesRepo,
    IAuditoriaService auditoria) : ICompatService
{
    private static readonly string[] Descricoes = ["Compatível", "Cautela", "Perigo", "Proibido"];

    private static (int classeA, int classeB) ParCanonico(int classeA, int classeB) =>
        classeA <= classeB ? (classeA, classeB) : (classeB, classeA);

    public async Task<CompatResultDto?> ConsultarParAsync(int classeA, int classeB)
    {
        var (canonicoA, canonicoB) = ParCanonico(classeA, classeB);
        var ov = await overridesRepo.GetAsync(canonicoA, canonicoB);
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
            .ToDictionary(o => ParCanonico(o.ClasseA, o.ClasseB));
        return new CompatMatrizDto(
            all.Select(e =>
            {
                var nivel = overrides.TryGetValue(ParCanonico(e.ClasseA, e.ClasseB), out var ov)
                    ? ov.Nivel
                    : e.Nivel;
                return new CompatEntryDto(e.ClasseA, e.ClasseB, nivel);
            }).ToList(),
            CompatProveniencia.ToDto()
        );
    }

    public async Task<IEnumerable<CompatOverrideDto>> GetOverridesAsync()
    {
        var all = await overridesRepo.GetAllAsync();
        return all.Select(ToDto);
    }

    public async Task<CompatOverrideDto> SalvarOverrideAsync(int classeA, int classeB, SalvarOverrideCmd cmd, string usuarioEmail)
    {
        if (classeA is < 1 or > 12 || classeB is < 1 or > 12)
            throw new ValidationException("Classes de reatividade devem estar entre 1 e 12.");
        if (cmd.Nivel is < 0 or > 3)
            throw new ValidationException("Nível de compatibilidade deve estar entre 0 (Compatível) e 3 (Proibido).");
        if (classeA == classeB)
            throw new ValidationException("Um override precisa de duas classes de reatividade diferentes.");

        var (canonicoA, canonicoB) = ParCanonico(classeA, classeB);
        var entry = new CompatOverride
        {
            ClasseA = canonicoA,
            ClasseB = canonicoB,
            Nivel = cmd.Nivel,
            Motivo = cmd.Motivo,
            Autor = cmd.Autor,
            DataEdicao = DateTime.UtcNow,
        };
        await overridesRepo.UpsertAsync(entry);
        await auditoria.RegistrarAsync(usuarioEmail, "compat.override-salvar", "Compatibilidade",
            $"Definiu o par {canonicoA}×{canonicoB} como {Descricoes[cmd.Nivel]}. Motivo: {Resumir(cmd.Motivo)}",
            RiscoAuditoria.High);
        return ToDto(entry);
    }

    public async Task RemoverOverrideAsync(int classeA, int classeB, string usuarioEmail)
    {
        var (canonicoA, canonicoB) = ParCanonico(classeA, classeB);
        await overridesRepo.DeleteAsync(canonicoA, canonicoB);
        await auditoria.RegistrarAsync(usuarioEmail, "compat.override-remover", "Compatibilidade",
            $"Removeu o override do par {canonicoA}×{canonicoB}; volta a valer a matriz base", RiscoAuditoria.High);
    }

    // O Detail da auditoria tem 1000 caracteres; o motivo é texto livre.
    private static string Resumir(string? motivo) =>
        motivo is { Length: > 500 } ? motivo[..500] + "…" : motivo ?? "";

    private static CompatOverrideDto ToDto(CompatOverride o) =>
        new(o.ClasseA, o.ClasseB, o.Nivel, o.Motivo, o.Autor,
            o.DataEdicao.ToString("yyyy-MM-dd"));
}

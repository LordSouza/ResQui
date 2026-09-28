using ResQui.Application.Common;

namespace ResQui.Application.Relatorios;

public record RecorteDeLaboratorios(IReadOnlyCollection<string>? LaboratorioIds)
{
    public static RecorteDeLaboratorios Institucional { get; } = new((IReadOnlyCollection<string>?)null);

    public static RecorteDeLaboratorios De(Solicitante solicitante) =>
        solicitante.VeTudo ? Institucional : new RecorteDeLaboratorios(solicitante.LaboratorioIds.ToList());

    public RecorteDeLaboratorios LimitadoAoEscopoDe(Solicitante solicitante)
    {
        if (solicitante.VeTudo) return this;
        var escopo = solicitante.LaboratorioIds;
        return new RecorteDeLaboratorios(LaboratorioIds is null
            ? escopo.ToList()
            : LaboratorioIds.Intersect(escopo).ToList());
    }

    public bool Inclui(string? laboratorioId) =>
        LaboratorioIds is null || (laboratorioId is not null && LaboratorioIds.Contains(laboratorioId));
}

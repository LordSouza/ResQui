using ResQui.Application.Common;

namespace ResQui.Application.Relatorios;

public record RecorteDeLaboratorios(IReadOnlyCollection<string>? LaboratorioIds)
{
    public static RecorteDeLaboratorios Institucional { get; } = new((IReadOnlyCollection<string>?)null);

    public static RecorteDeLaboratorios De(Solicitante solicitante) =>
        solicitante.VeTudo ? Institucional : new RecorteDeLaboratorios(solicitante.LaboratorioIds.ToList());

    public bool Inclui(string? laboratorioId) =>
        LaboratorioIds is null || (laboratorioId is not null && LaboratorioIds.Contains(laboratorioId));
}

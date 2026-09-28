namespace ResQui.Application.Common;

public record Solicitante(string Id, string Email, string Papel, IReadOnlyList<string> LaboratorioIds)
{
    public bool VeTudo => Papel == "Admin";

    public bool Responde(string? laboratorioId) =>
        VeTudo || (laboratorioId is not null && LaboratorioIds.Contains(laboratorioId));

    public bool Enxerga(string usuarioId, string papel, IEnumerable<string> laboratoriosDoUsuario) =>
        VeTudo || usuarioId == Id || (papel != "Admin" && laboratoriosDoUsuario.Any(LaboratorioIds.Contains));
}

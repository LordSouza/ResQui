namespace ResQui.Application.Common;

public record Solicitante(string Id, string Email, string Papel, IReadOnlyList<string> LaboratorioIds)
{
    public bool VeTudo => Papel == "Admin";

    public bool Responde(string laboratorioId) =>
        VeTudo || LaboratorioIds.Contains(laboratorioId);
}

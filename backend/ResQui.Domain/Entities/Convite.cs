namespace ResQui.Domain.Entities;

public class Convite
{
    public int Id { get; set; }
    public string TokenHash { get; set; } = "";
    public string Papel { get; set; } = "";
    public string? CriadoPorId { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime ExpiraEm { get; set; }
    public DateTime? UsadoEm { get; set; }
    public string? UsadoPorId { get; set; }
    public DateTime? RevogadoEm { get; set; }
}

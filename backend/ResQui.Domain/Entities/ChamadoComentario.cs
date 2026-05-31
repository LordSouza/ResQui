namespace ResQui.Domain.Entities;

public class ChamadoComentario
{
    public int Id { get; set; }
    public int ChamadoId { get; set; }
    public Chamado Chamado { get; set; } = null!;
    public string Texto { get; set; } = "";
    public string AutorId { get; set; } = "";
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}

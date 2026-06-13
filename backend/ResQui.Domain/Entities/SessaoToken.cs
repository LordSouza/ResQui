namespace ResQui.Domain.Entities;

// Sessão emitida no login (JWT identificado pelo jti) — permite listar e revogar dispositivos.
public class SessaoToken
{
    public int Id { get; set; }
    public string UsuarioId { get; set; } = "";
    public string Jti { get; set; } = "";
    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
    public DateTime ExpiraEm { get; set; }
    public string? UserAgent { get; set; }
    public bool Revogada { get; set; }
}

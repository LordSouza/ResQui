namespace ResQui.Domain.Entities;

public class RedefinicaoSenha
{
    public int Id { get; set; }
    public string UsuarioId { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
    public DateTime ExpiraEm { get; set; }
    public DateTime? UsadaEm { get; set; }
}

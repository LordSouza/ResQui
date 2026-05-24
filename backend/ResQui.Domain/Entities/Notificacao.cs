namespace ResQui.Domain.Entities;

public class Notificacao
{
    public int Id { get; set; }
    public string UsuarioId { get; set; } = "";
    public string Mensagem { get; set; } = "";
    public bool Lida { get; set; } = false;
    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
}

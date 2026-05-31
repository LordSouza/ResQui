namespace ResQui.Domain.Entities;

public class Notificacao
{
    public int Id { get; set; }
    public string UsuarioId { get; set; } = "";
    public string Mensagem { get; set; } = "";
    public bool Lida { get; set; } = false;
    public DateTime CriadaEm { get; set; } = DateTime.UtcNow;
    public string Tipo { get; set; } = "";          // expiry | low-stock | sinir | compat | coleta
    public string ReferenciaId { get; set; } = "";  // ID do item relacionado
    public string Severidade { get; set; } = "";    // red | amber
}

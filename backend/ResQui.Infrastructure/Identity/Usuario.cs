using Microsoft.AspNetCore.Identity;

namespace ResQui.Infrastructure.Identity;

public class Usuario : IdentityUser
{
    public string? Nome { get; set; }
    public string? Matricula { get; set; }
    public string Papel { get; set; } = "Visualizador";
    public bool Arquivado { get; set; } = false;
    // JSON: {"expiry":false,"low-stock":false,"compat":false,"coleta":false}
    public string NotificacaoPrefsJson { get; set; } = "{}";
}

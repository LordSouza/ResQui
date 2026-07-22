using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace ResQui.Infrastructure.Jobs.Checkers;

/// <summary>
/// Lê as preferências de e-mail (opt-in por tipo) persistidas como JSON.
/// Fail-safe: prefs ausentes/vazias ou JSON corrompido => e-mail não enviado (retorna false).
/// Ao contrário do padrão anterior (catch silencioso), um JSON inválido agora é logado.
/// </summary>
public static class NotificacaoPrefs
{
    public static bool Habilitada(string? json, string tipo, ILogger logger, string usuarioId)
    {
        if (string.IsNullOrWhiteSpace(json)) return false;
        try
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, bool>>(json);
            return dict?.GetValueOrDefault(tipo) ?? false;
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Prefs de notificação inválidas (usuário {UsuarioId}); e-mail '{Tipo}' não enviado.", usuarioId, tipo);
            return false;
        }
    }
}

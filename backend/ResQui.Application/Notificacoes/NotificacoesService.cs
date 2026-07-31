using System.Text.Json;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Notificacoes;

public class NotificacoesService(INotificacoesRepository repo, IAuthRepository auth) : INotificacoesService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public async Task<IEnumerable<NotificacaoDto>> ListarPorUsuarioAsync(string usuarioId) =>
        (await repo.GetByUsuarioAsync(usuarioId))
            .Select(n => new NotificacaoDto(n.Id, n.Mensagem, n.Lida, n.CriadaEm, n.Tipo, n.ReferenciaId, n.Severidade));

    public async Task MarcarComoLidaAsync(int id) =>
        await repo.MarkAsReadAsync(id);

    public async Task MarcarTodasLidasAsync(string usuarioId) =>
        await repo.MarcarTodasLidasAsync(usuarioId);

    public async Task<NotificacaoPrefsDto> GetPrefsAsync(string usuarioId)
    {
        var json = await auth.GetNotificacaoPrefsJsonAsync(usuarioId);
        var dict = JsonSerializer.Deserialize<Dictionary<string, bool>>(json, JsonOpts) ?? [];
        return new NotificacaoPrefsDto(
            dict.GetValueOrDefault("expiry"),
            dict.GetValueOrDefault("low-stock"),
            dict.GetValueOrDefault("compat"),
            dict.GetValueOrDefault("coleta")
        );
    }

    public async Task SavePrefsAsync(string usuarioId, NotificacaoPrefsDto prefs)
    {
        var dict = new Dictionary<string, bool>
        {
            ["expiry"] = prefs.Expiry,
            ["low-stock"] = prefs.LowStock,
            ["compat"] = prefs.Compat,
            ["coleta"] = prefs.Coleta,
        };
        await auth.SaveNotificacaoPrefsJsonAsync(usuarioId, JsonSerializer.Serialize(dict));
    }
}

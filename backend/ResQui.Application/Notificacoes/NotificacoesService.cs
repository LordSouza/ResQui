using System.Text.Json;
using ResQui.Application.Auditoria;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Notificacoes;

public class NotificacoesService(INotificacoesRepository repo, IAuthRepository auth, IAuditoriaService auditoria) : INotificacoesService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public async Task<IEnumerable<NotificacaoDto>> ListarPorUsuarioAsync(string usuarioId) =>
        (await repo.GetByUsuarioAsync(usuarioId))
            .Select(n => new NotificacaoDto(n.Id, n.Mensagem, n.Lida, n.CriadaEm, n.Tipo, n.ReferenciaId, n.Severidade));

    public async Task MarcarComoLidaAsync(int id, string usuarioId)
    {
        if (!await repo.MarkAsReadAsync(id, usuarioId)) return;
        await auditoria.RegistrarAsync(await EmailDoUsuarioAsync(usuarioId), "notificacao.lida", "Conta",
            $"Marcou a notificação {id} como lida", RiscoAuditoria.Low);
    }

    public async Task MarcarTodasLidasAsync(string usuarioId)
    {
        var marcadas = await repo.MarcarTodasLidasAsync(usuarioId);
        if (marcadas == 0) return;
        await auditoria.RegistrarAsync(await EmailDoUsuarioAsync(usuarioId), "notificacao.todas-lidas", "Conta",
            $"Marcou {marcadas} notificação(ões) como lida(s)", RiscoAuditoria.Low);
    }

    public async Task CriarAsync(string usuarioId, string mensagem, string tipo, string referenciaId, string severidade)
    {
        await repo.AddAsync(new Notificacao
        {
            UsuarioId = usuarioId,
            Mensagem = mensagem,
            Tipo = tipo,
            ReferenciaId = referenciaId,
            Severidade = severidade,
        });
        await repo.SaveChangesAsync();
    }

    public async Task<NotificacaoPrefsDto> GetPrefsAsync(string usuarioId)
    {
        var json = await auth.GetNotificacaoPrefsJsonAsync(usuarioId);
        Dictionary<string, bool> dict;
        try
        {
            dict = string.IsNullOrWhiteSpace(json)
                ? []
                : JsonSerializer.Deserialize<Dictionary<string, bool>>(json, JsonOpts) ?? [];
        }
        catch (JsonException)
        {
            dict = [];
        }
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
        await auditoria.RegistrarAsync(await EmailDoUsuarioAsync(usuarioId), "user.notificacao-prefs", "Conta",
            "Alterou preferências de e-mail: " + string.Join(", ", dict.Select(p => $"{p.Key}={(p.Value ? "on" : "off")}")),
            RiscoAuditoria.Low);
    }

    private async Task<string> EmailDoUsuarioAsync(string usuarioId) =>
        (await auth.FindByIdAsync(usuarioId))?.Email ?? usuarioId;
}

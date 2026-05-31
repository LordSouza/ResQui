using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Jobs.Checkers;

public class SinirChecker(
    IMtrsRepository mtrs,
    INotificacoesRepository notifs,
    IAuthRepository auth,
    IEmailService email)
{
    private static readonly string[] PapeisElegiveis = ["Admin", "Gestor"];

    public async Task RunAsync(CancellationToken ct = default)
    {
        var limite = DateTime.UtcNow.AddDays(-2);
        var pendentes = (await mtrs.GetAllAsync())
            .Where(m => m.Status == MtrStatus.Rascunho && m.DataEmissao < limite)
            .ToList();

        if (pendentes.Count == 0) return;

        var usuarios = (await auth.GetAllAsync())
            .Where(u => !u.Arquivado && PapeisElegiveis.Contains(u.Papel))
            .ToList();

        bool houveMudanca = false;

        foreach (var m in pendentes)
        {
            var refId = m.Id.ToString();
            foreach (var u in usuarios)
            {
                if (await notifs.ExisteNaoLidaAsync(u.Id, "sinir", refId)) continue;

                await notifs.AddAsync(new Notificacao
                {
                    UsuarioId = u.Id,
                    Mensagem = $"MTR {m.Numero} aguarda envio ao SINIR.",
                    Tipo = "sinir",
                    ReferenciaId = refId,
                    Severidade = "amber",
                });
                houveMudanca = true;

                if (!string.IsNullOrEmpty(u.Email))
                {
                    var prefsJson = await auth.GetNotificacaoPrefsJsonAsync(u.Id);
                    if (PrefsHabilitadas(prefsJson, "sinir"))
                    {
                        var (subject, html) = NotificacaoEmailBuilder.BuildSinir(m.Numero, m.Id);
                        await email.SendAsync(u.Email, subject, html);
                    }
                }
            }
        }

        if (houveMudanca) await notifs.SaveChangesAsync();
    }

    private static bool PrefsHabilitadas(string json, string tipo)
    {
        try { var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(json); return dict?.GetValueOrDefault(tipo) ?? false; }
        catch { return false; }
    }
}

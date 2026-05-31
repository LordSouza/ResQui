using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Jobs.Checkers;

public class ExpiryChecker(
    IReagentesRepository reagentes,
    INotificacoesRepository notifs,
    IAuthRepository auth,
    IEmailService email)
{
    private static readonly string[] PapeisElegiveis = ["Admin", "Gestor", "Tecnico"];

    public async Task RunAsync(CancellationToken ct = default)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var limite = hoje.AddDays(30);

        var vencendo = (await reagentes.GetAllAsync())
            .Where(r => r.Validade <= limite)
            .ToList();

        if (vencendo.Count == 0) return;

        var usuarios = (await auth.GetAllAsync())
            .Where(u => !u.Arquivado && PapeisElegiveis.Contains(u.Papel))
            .ToList();

        bool houveMudanca = false;

        foreach (var r in vencendo)
        {
            var diasRestantes = r.Validade.DayNumber - hoje.DayNumber;
            foreach (var u in usuarios)
            {
                if (await notifs.ExisteNaoLidaAsync(u.Id, "expiry", r.Id)) continue;

                await notifs.AddAsync(new Notificacao
                {
                    UsuarioId = u.Id,
                    Mensagem = $"Reagente {r.Nome} ({r.Id}) vence em {diasRestantes} dia(s).",
                    Tipo = "expiry",
                    ReferenciaId = r.Id,
                    Severidade = diasRestantes <= 7 ? "red" : "amber",
                });
                houveMudanca = true;

                if (!string.IsNullOrEmpty(u.Email))
                {
                    var prefsJson = await auth.GetNotificacaoPrefsJsonAsync(u.Id);
                    if (PrefsHabilitadas(prefsJson, "expiry"))
                    {
                        var (subject, html) = NotificacaoEmailBuilder.BuildExpiry(r.Nome, r.Id, diasRestantes);
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

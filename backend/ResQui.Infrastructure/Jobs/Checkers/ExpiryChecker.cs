using Microsoft.Extensions.Logging;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Jobs.Checkers;

public class ExpiryChecker(
    IReagentesRepository reagentes,
    INotificacoesRepository notifs,
    IAuthRepository auth,
    IEmailService email,
    IUsuarioLaboratoriosRepository usuarioLabs,
    ILogger<ExpiryChecker> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var limite = hoje.AddDays(30);

        var vencendo = (await reagentes.GetAllAsync())
            .Where(r => r.Validade <= limite)
            .ToList();

        await notifs.RearmarAsync("expiry", vencendo.Select(r => r.Id).ToList());
        if (vencendo.Count == 0) return;

        var destinatarios = await DestinatariosPorLaboratorio.CarregarAsync(auth, usuarioLabs);

        bool houveMudanca = false;
        var emails = new EmailsPendentes();

        foreach (var r in vencendo)
        {
            ct.ThrowIfCancellationRequested();
            var diasRestantes = r.Validade.DayNumber - hoje.DayNumber;
            var severidade = diasRestantes <= 7 ? "red" : "amber";
            foreach (var u in destinatarios.Do(r.LaboratorioId))
            {
                if (await notifs.ExisteAsync(u.Id, "expiry", r.Id, severidade)) continue;

                await notifs.AddAsync(new Notificacao
                {
                    UsuarioId = u.Id,
                    Mensagem = $"Reagente {r.Nome} ({r.Id}) {PrazoValidade.Descrever(diasRestantes)}.",
                    Tipo = "expiry",
                    ReferenciaId = r.Id,
                    Severidade = severidade,
                });
                houveMudanca = true;

                if (!string.IsNullOrEmpty(u.Email))
                {
                    var prefsJson = await auth.GetNotificacaoPrefsJsonAsync(u.Id);
                    if (NotificacaoPrefs.Habilitada(prefsJson, "expiry", logger, u.Id))
                    {
                        var (subject, html) = NotificacaoEmailBuilder.BuildExpiry(r.Nome, r.Id, diasRestantes);
                        emails.Adicionar(u.Email, subject, html);
                    }
                }
            }
        }

        if (!houveMudanca) return;
        await notifs.SaveChangesAsync();
        await emails.EnviarAsync(email, logger, ct);
    }
}

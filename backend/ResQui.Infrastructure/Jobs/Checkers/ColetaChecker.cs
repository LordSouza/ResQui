using Microsoft.Extensions.Logging;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Jobs.Checkers;

public class ColetaChecker(
    IResiduosRepository residuos,
    INotificacoesRepository notifs,
    IAuthRepository auth,
    IEmailService email,
    IUsuarioLaboratoriosRepository usuarioLabs,
    ILogger<ColetaChecker> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        var limite = DateTime.UtcNow.AddDays(-7);
        var atrasados = (await residuos.GetAllAsync())
            .Where(r => r.Status == "aguardando-coleta" && r.DataRegistro < limite)
            .ToList();

        if (atrasados.Count == 0) return;

        var destinatarios = await DestinatariosPorLaboratorio.CarregarAsync(auth, usuarioLabs);

        bool houveMudanca = false;
        var emails = new EmailsPendentes();

        foreach (var r in atrasados)
        {
            ct.ThrowIfCancellationRequested();
            var refId = r.Id.ToString();
            foreach (var u in destinatarios.Do(r.LaboratorioId))
            {
                if (await notifs.ExisteAsync(u.Id, "coleta", refId)) continue;

                await notifs.AddAsync(new Notificacao
                {
                    UsuarioId = u.Id,
                    Mensagem = $"Resíduo #{r.Id} ({r.Descricao}) aguarda coleta há mais de 7 dias.",
                    Tipo = "coleta",
                    ReferenciaId = refId,
                    Severidade = "amber",
                });
                houveMudanca = true;

                if (!string.IsNullOrEmpty(u.Email))
                {
                    var prefsJson = await auth.GetNotificacaoPrefsJsonAsync(u.Id);
                    if (NotificacaoPrefs.Habilitada(prefsJson, "coleta", logger, u.Id))
                    {
                        var (subject, html) = NotificacaoEmailBuilder.BuildColeta(r.Id, r.Descricao);
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

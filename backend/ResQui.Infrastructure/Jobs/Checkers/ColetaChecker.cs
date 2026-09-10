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
    ILogger<ColetaChecker> logger)
{
    private static readonly string[] PapeisElegiveis = ["Professor"];

    public async Task RunAsync(CancellationToken ct = default)
    {
        var limite = DateTime.UtcNow.AddDays(-7);
        var atrasados = (await residuos.GetAllAsync())
            .Where(r => r.Status == "aguardando-coleta" && r.DataRegistro < limite)
            .ToList();

        if (atrasados.Count == 0) return;

        var usuarios = (await auth.GetAllAsync())
            .Where(u => !u.Arquivado && PapeisElegiveis.Contains(u.Papel))
            .ToList();

        bool houveMudanca = false;

        foreach (var r in atrasados)
        {
            var refId = r.Id.ToString();
            foreach (var u in usuarios)
            {
                if (await notifs.ExisteNaoLidaAsync(u.Id, "coleta", refId)) continue;

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
                        var (subject, html) = NotificacaoEmailBuilder.BuildColeta(1);
                        await email.SendAsync(u.Email, subject, html);
                    }
                }
            }
        }

        if (houveMudanca) await notifs.SaveChangesAsync();
    }
}

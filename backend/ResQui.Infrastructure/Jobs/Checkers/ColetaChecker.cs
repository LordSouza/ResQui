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
    private static readonly string[] PapeisElegiveis = ["Professor"];

    public async Task RunAsync(CancellationToken ct = default)
    {
        var limite = DateTime.UtcNow.AddDays(-7);
        var atrasados = (await residuos.GetAllAsync())
            .Where(r => r.Status == "aguardando-coleta" && r.DataRegistro < limite)
            .ToList();

        if (atrasados.Count == 0) return;

        var ativos = (await auth.GetAllAsync()).Where(u => !u.Arquivado).ToList();
        var elegiveis = ativos.Where(u => PapeisElegiveis.Contains(u.Papel)).ToList();
        var admins = ativos.Where(u => u.Papel == "Admin").ToList();
        var laboratoriosPorUsuario = await usuarioLabs.DeTodosAsync();

        bool houveMudanca = false;

        foreach (var r in atrasados)
        {
            var refId = r.Id.ToString();
            var responsaveis = elegiveis
                .Where(u => laboratoriosPorUsuario.TryGetValue(u.Id, out var labs)
                            && labs.Contains(r.LaboratorioId))
                .ToList();
            // Laboratório sem professor ativo: o aviso cai para os Admins, senão o silêncio
            // ficaria indistinguível de "não há resíduo atrasado".
            var destinatarios = responsaveis.Count > 0 ? responsaveis : admins;
            foreach (var u in destinatarios)
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

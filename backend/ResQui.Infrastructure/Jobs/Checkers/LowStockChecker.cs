using Microsoft.Extensions.Logging;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Jobs.Checkers;

public class LowStockChecker(
    IReagentesRepository reagentes,
    INotificacoesRepository notifs,
    IAuthRepository auth,
    IEmailService email,
    IUsuarioLaboratoriosRepository usuarioLabs,
    ILogger<LowStockChecker> logger)
{
    public async Task RunAsync(CancellationToken ct = default)
    {
        var abaixoMinimo = (await reagentes.GetAllAsync())
            .Where(r => r.EstoqueMin.HasValue && r.Estoque < r.EstoqueMin.Value)
            .ToList();

        if (abaixoMinimo.Count == 0) return;

        var destinatarios = await DestinatariosPorLaboratorio.CarregarAsync(auth, usuarioLabs);

        bool houveMudanca = false;
        var emails = new EmailsPendentes();

        foreach (var r in abaixoMinimo)
        {
            ct.ThrowIfCancellationRequested();
            foreach (var u in destinatarios.Do(r.LaboratorioId))
            {
                if (await notifs.ExisteAsync(u.Id, "low-stock", r.Id)) continue;

                await notifs.AddAsync(new Notificacao
                {
                    UsuarioId = u.Id,
                    Mensagem = $"{r.Nome} ({r.Id}) abaixo do estoque mínimo: {r.Estoque} {r.Unidade} (mín: {r.EstoqueMin} {r.Unidade}).",
                    Tipo = "low-stock",
                    ReferenciaId = r.Id,
                    Severidade = "red",
                });
                houveMudanca = true;

                if (!string.IsNullOrEmpty(u.Email))
                {
                    var prefsJson = await auth.GetNotificacaoPrefsJsonAsync(u.Id);
                    if (NotificacaoPrefs.Habilitada(prefsJson, "low-stock", logger, u.Id))
                    {
                        var (subject, html) = NotificacaoEmailBuilder.BuildLowStock(r.Nome, r.Id, r.Estoque, r.EstoqueMin!.Value, r.Unidade);
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

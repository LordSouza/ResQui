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
    ILogger<LowStockChecker> logger)
{
    private static readonly string[] PapeisElegiveis = ["Professor"];

    public async Task RunAsync(CancellationToken ct = default)
    {
        var abaixoMinimo = (await reagentes.GetAllAsync())
            .Where(r => r.EstoqueMin.HasValue && r.Estoque < r.EstoqueMin.Value)
            .ToList();

        if (abaixoMinimo.Count == 0) return;

        var usuarios = (await auth.GetAllAsync())
            .Where(u => !u.Arquivado && PapeisElegiveis.Contains(u.Papel))
            .ToList();

        bool houveMudanca = false;

        foreach (var r in abaixoMinimo)
        {
            foreach (var u in usuarios)
            {
                if (await notifs.ExisteNaoLidaAsync(u.Id, "low-stock", r.Id)) continue;

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
                        await email.SendAsync(u.Email, subject, html);
                    }
                }
            }
        }

        if (houveMudanca) await notifs.SaveChangesAsync();
    }
}

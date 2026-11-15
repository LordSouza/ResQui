using Microsoft.Extensions.Logging;
using ResQui.Application.Email;

namespace ResQui.Infrastructure.Jobs.Checkers;

/// <summary>
/// Acumula os e-mails de um ciclo para enviá-los só depois de as notificações estarem salvas:
/// se o SaveChanges falhar, nenhum e-mail sai sem a notificação que o deduplica.
/// </summary>
public sealed class EmailsPendentes
{
    private readonly List<(string Para, string Assunto, string Html)> _itens = [];

    public void Adicionar(string para, string assunto, string html) => _itens.Add((para, assunto, html));

    /// <summary>Uma falha não impede os envios seguintes; só o cancelamento de <paramref name="ct"/> interrompe.</summary>
    public async Task EnviarAsync(IEmailService email, ILogger logger, CancellationToken ct)
    {
        foreach (var (para, assunto, html) in _itens)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                await email.SendAsync(para, assunto, html, ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                logger.LogError(ex, "Falha ao enviar e-mail de notificação para {Para}: {Assunto}", para, assunto);
            }
        }
    }
}

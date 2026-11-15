using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace ResQui.Application.Email;

public class EmailService(IConfiguration config, ILogger<EmailService> logger) : IEmailService
{
    public bool Habilitado => config.GetValue("Email:Enabled", false);

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        if (!Habilitado)
            return;

        var host = config["Email:Host"] ?? "";
        var port = config.GetValue("Email:Port", 587);
        var user = config["Email:User"] ?? "";
        var pass = config["Email:Password"] ?? "";
        var from = config["Email:From"] ?? "resqui@resqui.local";
        // O envio acontece dentro de requisições do usuário (o alerta de código de recuperação sai
        // no caminho do login). O Timeout padrão do MailKit é de 120 s por operação: um host que
        // faz DROP penduraria o login até o proxy devolver 504, e o usuário — já com o código
        // consumido — tentaria de novo e queimaria um segundo código. O CTS abaixo é único para
        // todo o envio, então o pior caso é TimeoutSeconds no total, não por operação.
        var timeout = TimeSpan.FromSeconds(config.GetValue("Email:TimeoutSeconds", 10));
        // Default true: a ausência da chave falha fechado. Development a desliga (Mailpit não faz TLS).
        var requireTls = config.GetValue("Email:RequireTls", true);

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(timeout);
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(from));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            var socketOptions = EscolherSocketOptions(user, requireTls);

            using var smtp = new SmtpClient { Timeout = (int)timeout.TotalMilliseconds };
            await smtp.ConnectAsync(host, port, socketOptions, cts.Token);
            if (!string.IsNullOrWhiteSpace(user))
                await smtp.AuthenticateAsync(user, pass, cts.Token);
            await smtp.SendAsync(message, cts.Token);
            await smtp.DisconnectAsync(true, cts.Token);
        }
        // Cancelamento de quem chamou (ex.: desligamento do host) não é falha de SMTP: propaga para
        // que o laço de envio pare em vez de tentar o próximo destinatário.
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        // O MailKit não aflora estouro de tempo de forma uniforme: o CTS vira
        // OperationCanceledException, o SmtpClient.Timeout pode virar TimeoutException, e alguns
        // caminhos de socket ainda saem como IOException — esses últimos caem no LogError abaixo.
        catch (Exception ex) when (ex is OperationCanceledException or TimeoutException)
        {
            logger.LogWarning("Envio de e-mail para {To} abortado após {Timeout}s (SMTP {Host}:{Port} não respondeu): {Subject}",
                to, timeout.TotalSeconds, host, port, subject);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Falha ao enviar e-mail para {To}: {Subject}", to, subject);
        }
    }

    /// Extraído do caminho de I/O para ser verificável sem abrir conexão SMTP.
    ///
    /// Com requireTls, um servidor que não anuncia STARTTLS faz o ConnectAsync lançar, e o catch
    /// de SendAsync transforma isso em LogError — ou seja, o e-mail silenciosamente não sai. É o
    /// comportamento desejado (melhor não enviar do que enviar alerta de segurança em texto
    /// claro), mas um relay mal configurado se manifesta só como linha de log.
    public static SecureSocketOptions EscolherSocketOptions(string user, bool requireTls) =>
        requireTls || !string.IsNullOrWhiteSpace(user)
            ? SecureSocketOptions.StartTls
            : SecureSocketOptions.Auto;
}

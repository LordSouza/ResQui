using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace ResQui.Application.Email;

public class EmailService(IConfiguration config, ILogger<EmailService> logger) : IEmailService
{
    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        if (!config.GetValue("Email:Enabled", false))
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

        try
        {
            using var cts = new CancellationTokenSource(timeout);
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(from));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            var socketOptions = string.IsNullOrWhiteSpace(user)
                ? SecureSocketOptions.Auto
                : SecureSocketOptions.StartTls;

            using var smtp = new SmtpClient { Timeout = (int)timeout.TotalMilliseconds };
            await smtp.ConnectAsync(host, port, socketOptions, cts.Token);
            if (!string.IsNullOrWhiteSpace(user))
                await smtp.AuthenticateAsync(user, pass, cts.Token);
            await smtp.SendAsync(message, cts.Token);
            await smtp.DisconnectAsync(true, cts.Token);
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
}

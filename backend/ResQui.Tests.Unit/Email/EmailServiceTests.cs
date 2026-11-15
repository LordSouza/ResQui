using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using FluentAssertions;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ResQui.Application.Email;

namespace ResQui.Tests.Unit.Email;

public class EmailServiceTests
{
    // O gate anterior era só a presença de credenciais: um relay interno sem autenticação caía em
    // Auto, que envia em texto claro se o servidor não anunciar STARTTLS — e o que trafega são
    // alertas de segurança de conta.
    [Fact]
    public void EscolherSocketOptions_RequireTls_ForcaStartTlsMesmoSemCredenciais()
        => EmailService.EscolherSocketOptions("", requireTls: true)
            .Should().Be(SecureSocketOptions.StartTls);

    [Fact]
    public void EscolherSocketOptions_SemRequireTlsESemCredenciais_UsaAuto()
        => EmailService.EscolherSocketOptions("", requireTls: false)
            .Should().Be(SecureSocketOptions.Auto);

    [Fact]
    public void EscolherSocketOptions_SemRequireTlsComCredenciais_UsaStartTls()
        => EmailService.EscolherSocketOptions("smtp-user", requireTls: false)
            .Should().Be(SecureSocketOptions.StartTls);

    [Fact]
    public void EscolherSocketOptions_UserSoComEspacos_NaoContaComoCredencial()
        => EmailService.EscolherSocketOptions("   ", requireTls: false)
            .Should().Be(SecureSocketOptions.Auto);

    private readonly ILogger<EmailService> _logger = Substitute.For<ILogger<EmailService>>();

    // Aceita a conexão TCP e nunca responde: o cliente fica esperando o banner SMTP.
    private static TcpListener ServidorMudo(List<TcpClient> conexoes)
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        _ = Task.Run(async () =>
        {
            try { while (true) conexoes.Add(await listener.AcceptTcpClientAsync()); }
            catch (Exception ex) when (ex is SocketException or ObjectDisposedException) { }
        });
        return listener;
    }

    private EmailService Servico(int porta, int timeoutSegundos) =>
        new(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Email:Enabled"] = "true",
            ["Email:Host"] = "127.0.0.1",
            ["Email:Port"] = porta.ToString(),
            ["Email:RequireTls"] = "false",
            ["Email:TimeoutSeconds"] = timeoutSegundos.ToString(),
        }).Build(), _logger);

    private IEnumerable<LogLevel> NiveisLogados() =>
        _logger.ReceivedCalls()
            .Where(c => c.GetMethodInfo().Name == nameof(ILogger.Log))
            .Select(c => (LogLevel)c.GetArguments()[0]!);

    [Fact]
    public async Task SendAsync_ServidorQueNaoResponde_DesisteNoTimeoutSemLancar()
    {
        var conexoes = new List<TcpClient>();
        var listener = ServidorMudo(conexoes);
        try
        {
            var relogio = Stopwatch.StartNew();

            await Servico(((IPEndPoint)listener.LocalEndpoint).Port, timeoutSegundos: 1)
                .SendAsync("ana@lab.com", "Assunto", "<p>corpo</p>");

            relogio.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(4));
            NiveisLogados().Should().Contain(LogLevel.Warning);
        }
        finally
        {
            listener.Stop();
            conexoes.ForEach(c => c.Dispose());
        }
    }

    [Fact]
    public async Task SendAsync_CancelamentoDeQuemChamou_PropagaAntesDoTimeout()
    {
        var conexoes = new List<TcpClient>();
        var listener = ServidorMudo(conexoes);
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));
            var relogio = Stopwatch.StartNew();

            var act = () => Servico(((IPEndPoint)listener.LocalEndpoint).Port, timeoutSegundos: 30)
                .SendAsync("ana@lab.com", "Assunto", "<p>corpo</p>", cts.Token);

            await act.Should().ThrowAsync<OperationCanceledException>();
            relogio.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(4));
        }
        finally
        {
            listener.Stop();
            conexoes.ForEach(c => c.Dispose());
        }
    }
}

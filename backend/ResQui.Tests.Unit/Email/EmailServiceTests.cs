using FluentAssertions;
using MailKit.Security;
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
}

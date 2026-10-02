using FluentAssertions;
using ResQui.Application.Auth;

namespace ResQui.Tests.Unit.Auth;

public class RedefinicaoSenhaOptionsValidatorTests
{
    [Theory]
    [InlineData("")]
    [InlineData("resqui.com.br")]
    [InlineData("ftp://resqui.com.br")]
    public void Validate_EmailLigadoSemUrlHttpAbsoluta_Falha(string url)
    {
        var validacao = new RedefinicaoSenhaOptionsValidator(emailHabilitado: true)
            .Validate(null, new RedefinicaoSenhaOptions { UrlPublica = url });

        validacao.Failed.Should().BeTrue();
    }

    [Theory]
    [InlineData("https://resqui.com.br")]
    [InlineData("http://localhost:5173")]
    public void Validate_EmailLigadoComUrlHttpAbsoluta_Sucede(string url)
    {
        var validacao = new RedefinicaoSenhaOptionsValidator(emailHabilitado: true)
            .Validate(null, new RedefinicaoSenhaOptions { UrlPublica = url });

        validacao.Succeeded.Should().BeTrue();
    }

    [Fact]
    public void Validate_EmailDesligadoSemUrl_Sucede()
    {
        var validacao = new RedefinicaoSenhaOptionsValidator(emailHabilitado: false)
            .Validate(null, new RedefinicaoSenhaOptions());

        validacao.Succeeded.Should().BeTrue();
    }
}

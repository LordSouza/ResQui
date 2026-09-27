using FluentAssertions;
using ResQui.Application.Assistente;

namespace ResQui.Tests.Unit.Assistente;

public class AssistenteOptionsValidatorTests
{
    private readonly AssistenteOptionsValidator _sut = new();

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_HabilitadoSemChave_Falha(string chave)
    {
        var r = _sut.Validate(null, new AssistenteOptions { Enabled = true, ApiKey = chave });
        r.Failed.Should().BeTrue();
        r.FailureMessage.Should().Contain("Assistente__ApiKey");
    }

    [Fact]
    public void Validate_HabilitadoComChave_Sucede()
    {
        var r = _sut.Validate(null, new AssistenteOptions { Enabled = true, ApiKey = "sk-teste" });
        r.Succeeded.Should().BeTrue();
    }

    [Fact]
    public void Validate_DesabilitadoSemChave_Sucede()
    {
        var r = _sut.Validate(null, new AssistenteOptions { Enabled = false, ApiKey = "" });
        r.Succeeded.Should().BeTrue();
    }
}

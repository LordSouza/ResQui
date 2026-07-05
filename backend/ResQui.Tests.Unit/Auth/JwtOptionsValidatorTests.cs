using FluentAssertions;
using ResQui.Application.Auth;

namespace ResQui.Tests.Unit.Auth;

public class JwtOptionsValidatorTests
{
    private readonly JwtOptionsValidator _sut = new();

    [Fact]
    public void Validate_KeyVazia_Falha()
    {
        var r = _sut.Validate(null, new JwtOptions { Key = "" });
        r.Failed.Should().BeTrue();
    }

    [Fact]
    public void Validate_KeyMenorQue32Bytes_Falha()
    {
        var r = _sut.Validate(null, new JwtOptions { Key = "curta-demais" });
        r.Failed.Should().BeTrue();
    }

    [Fact]
    public void Validate_KeyCom32BytesOuMais_Sucede()
    {
        var r = _sut.Validate(null, new JwtOptions { Key = "0123456789012345678901234567890123" });
        r.Succeeded.Should().BeTrue();
    }
}

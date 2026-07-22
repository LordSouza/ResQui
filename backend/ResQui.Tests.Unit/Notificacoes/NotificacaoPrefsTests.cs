using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Tests.Unit.Notificacoes;

public class NotificacaoPrefsTests
{
    private static bool Avaliar(string? json, string tipo)
        => NotificacaoPrefs.Habilitada(json, tipo, NullLogger.Instance, "u-1");

    [Fact]
    public void TipoHabilitado_RetornaTrue()
        => Avaliar("{\"sinir\":true}", "sinir").Should().BeTrue();

    [Fact]
    public void TipoDesabilitado_RetornaFalse()
        => Avaliar("{\"sinir\":false}", "sinir").Should().BeFalse();

    [Fact]
    public void TipoAusente_RetornaFalse()
        => Avaliar("{\"expiry\":true}", "sinir").Should().BeFalse();

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("{ nao é json }")]
    [InlineData("[1,2,3]")]
    public void JsonInvalidoOuVazio_RetornaFalseSemLancar(string? json)
        => Avaliar(json, "sinir").Should().BeFalse();
}

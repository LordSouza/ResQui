using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ResQui.Application.Auth;

namespace ResQui.Tests.Unit.Auth;

public class FilaPedidosRedefinicaoTests
{
    private readonly ILogger<FilaPedidosRedefinicao> _logger = Substitute.For<ILogger<FilaPedidosRedefinicao>>();

    private IEnumerable<LogLevel> NiveisLogados() =>
        _logger.ReceivedCalls()
            .Where(c => c.GetMethodInfo().Name == nameof(ILogger.Log))
            .Select(c => (LogLevel)c.GetArguments()[0]!);

    [Fact]
    public void Enfileirar_ComEspaco_NaoLoga()
    {
        var sut = new FilaPedidosRedefinicao(_logger);

        sut.Enfileirar("ana@lab.com");

        NiveisLogados().Should().BeEmpty();
    }

    [Fact]
    public void Enfileirar_FilaCheia_LogaWarningSemOEmail()
    {
        var sut = new FilaPedidosRedefinicao(_logger);
        for (var i = 0; i < 1000; i++) sut.Enfileirar($"u{i}@lab.com");

        sut.Enfileirar("descartado@lab.com");

        NiveisLogados().Should().Equal(LogLevel.Warning);
        _logger.ReceivedCalls().Single(c => c.GetMethodInfo().Name == nameof(ILogger.Log))
            .GetArguments()[2]!.ToString().Should().NotContain("descartado@lab.com");
    }
}

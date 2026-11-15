using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Jobs;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Tests.Unit.Notificacoes;

public class NotificacoesJobTests
{
    private readonly IReagentesRepository _reagentes = Substitute.For<IReagentesRepository>();
    private readonly IResiduosRepository _residuos = Substitute.For<IResiduosRepository>();
    private readonly INotificacoesRepository _notifs = Substitute.For<INotificacoesRepository>();
    private readonly ILogger<NotificacoesJob> _logger = Substitute.For<ILogger<NotificacoesJob>>();

    public NotificacoesJobTests()
    {
        _reagentes.GetAllAsync().Returns(Task.FromResult<IEnumerable<Reagente>>([]));
        _residuos.GetAllAsync().Returns(Task.FromResult<IEnumerable<Residuo>>([]));
    }

    private NotificacoesJob Job(Dictionary<string, string?>? config = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton(typeof(ILogger<>), typeof(NullLogger<>));
        services.AddSingleton(_reagentes);
        services.AddSingleton(_residuos);
        services.AddSingleton(_notifs);
        services.AddSingleton(Substitute.For<IAuthRepository>());
        services.AddSingleton(Substitute.For<IUsuarioLaboratoriosRepository>());
        services.AddSingleton(Substitute.For<IEmailService>());
        services.AddSingleton(Substitute.For<ICompatService>());
        services.AddScoped<ExpiryChecker>();
        services.AddScoped<LowStockChecker>();
        services.AddScoped<ColetaChecker>();
        services.AddScoped<CompatChecker>();
        var provider = services.BuildServiceProvider();

        var configuration = new ConfigurationBuilder().AddInMemoryCollection(config ?? []).Build();
        return new NotificacoesJob(provider.GetRequiredService<IServiceScopeFactory>(), configuration, _logger);
    }

    private IEnumerable<string> ErrosLogados() =>
        _logger.ReceivedCalls()
            .Where(c => c.GetMethodInfo().Name == nameof(ILogger.Log) && (LogLevel)c.GetArguments()[0]! == LogLevel.Error)
            .Select(c => c.GetArguments()[2]!.ToString()!);

    [Fact]
    public async Task RunCycleAsync_PrimeiroCheckerLanca_OsDemaisERetencaoAindaRodam()
    {
        _reagentes.GetAllAsync().Returns(
            _ => Task.FromException<IEnumerable<Reagente>>(new InvalidOperationException("falha no ExpiryChecker")),
            _ => Task.FromResult<IEnumerable<Reagente>>([]));

        await Job().RunCycleAsync(CancellationToken.None);

        // Expiry (falhou), LowStock e Compat leem reagentes; Coleta lê resíduos.
        await _reagentes.Received(3).GetAllAsync();
        await _residuos.Received(1).GetAllAsync();
        await _notifs.Received(1).ExcluirLidasCriadasAntesDeAsync(Arg.Any<DateTime>());
        ErrosLogados().Should().ContainSingle().Which.Should().Contain(nameof(ExpiryChecker));
    }

    [Fact]
    public async Task RunCycleAsync_Retencao_ExcluiLidasCriadasAntesDoPrazoPadraoDe90Dias()
    {
        await Job().RunCycleAsync(CancellationToken.None);

        var esperado = DateTime.UtcNow.AddDays(-90);
        await _notifs.Received(1).ExcluirLidasCriadasAntesDeAsync(
            Arg.Is<DateTime>(d => Math.Abs((d - esperado).TotalMinutes) < 1));
    }

    [Fact]
    public async Task RunCycleAsync_RetencaoConfigurada_UsaOPrazoDaConfiguracao()
    {
        await Job(new() { ["Jobs:NotificacoesRetencaoDias"] = "30" }).RunCycleAsync(CancellationToken.None);

        var esperado = DateTime.UtcNow.AddDays(-30);
        await _notifs.Received(1).ExcluirLidasCriadasAntesDeAsync(
            Arg.Is<DateTime>(d => Math.Abs((d - esperado).TotalMinutes) < 1));
    }

    // Zero apagaria toda notificação lida a cada ciclo e, com isso, desfaria a deduplicação.
    [Theory]
    [InlineData("0")]
    [InlineData("-5")]
    public async Task RunCycleAsync_RetencaoMenorQueUmDia_NaoExclui(string dias)
    {
        await Job(new() { ["Jobs:NotificacoesRetencaoDias"] = dias }).RunCycleAsync(CancellationToken.None);

        await _notifs.DidNotReceiveWithAnyArgs().ExcluirLidasCriadasAntesDeAsync(default);
    }
}

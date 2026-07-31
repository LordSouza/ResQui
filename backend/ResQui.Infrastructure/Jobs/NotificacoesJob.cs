using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Infrastructure.Jobs;

public class NotificacoesJob(
    IServiceScopeFactory factory,
    IConfiguration config,
    ILogger<NotificacoesJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var interval = config.GetValue("Jobs:NotificacoesInterval", TimeSpan.FromHours(1));
        logger.LogInformation("NotificacoesJob iniciado. Intervalo: {Interval}", interval);

        while (!ct.IsCancellationRequested)
        {
            try { await RunCycleAsync(ct); }
            catch (Exception ex) { logger.LogError(ex, "Erro no ciclo de notificações"); }
            await Task.Delay(interval, ct);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = factory.CreateScope();
        var sp = scope.ServiceProvider;
        logger.LogDebug("Executando ciclo de notificações");
        await sp.GetRequiredService<ExpiryChecker>().RunAsync(ct);
        await sp.GetRequiredService<LowStockChecker>().RunAsync(ct);
        await sp.GetRequiredService<ColetaChecker>().RunAsync(ct);
        await sp.GetRequiredService<CompatChecker>().RunAsync(ct);
    }
}

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ResQui.Domain.Interfaces;
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
            catch (Exception ex) when (!ct.IsCancellationRequested) { logger.LogError(ex, "Erro no ciclo de notificações"); }
            await Task.Delay(interval, ct);
        }
    }

    internal async Task RunCycleAsync(CancellationToken ct)
    {
        logger.LogDebug("Executando ciclo de notificações");
        await ExecutarEtapaAsync(nameof(ExpiryChecker), sp => sp.GetRequiredService<ExpiryChecker>().RunAsync(ct), ct);
        await ExecutarEtapaAsync(nameof(LowStockChecker), sp => sp.GetRequiredService<LowStockChecker>().RunAsync(ct), ct);
        await ExecutarEtapaAsync(nameof(ColetaChecker), sp => sp.GetRequiredService<ColetaChecker>().RunAsync(ct), ct);
        await ExecutarEtapaAsync(nameof(CompatChecker), sp => sp.GetRequiredService<CompatChecker>().RunAsync(ct), ct);
        await ExecutarEtapaAsync("Retenção", ExcluirLidasAntigasAsync, ct);
    }

    // Um escopo por etapa: se o SaveChanges de um checker falha, as notificações que ele adicionou
    // continuam rastreadas no DbContext, e a etapa seguinte, no mesmo contexto, tentaria salvá-las
    // de novo (sem os e-mails correspondentes).
    private async Task ExecutarEtapaAsync(string etapa, Func<IServiceProvider, Task> executar, CancellationToken ct)
    {
        try
        {
            using var scope = factory.CreateScope();
            await executar(scope.ServiceProvider);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Erro em {Etapa} no ciclo de notificações", etapa);
        }
    }

    // Excluir uma notificação lida libera a deduplicação: se a condição ainda existir, o próximo
    // ciclo cria outra (e envia e-mail). Com o padrão de 90 dias, isso vira um lembrete trimestral;
    // um valor muito baixo traria de volta o reenvio a cada ciclo, daí o mínimo de 1 dia.
    private async Task ExcluirLidasAntigasAsync(IServiceProvider sp)
    {
        var retencaoDias = config.GetValue("Jobs:NotificacoesRetencaoDias", 90);
        if (retencaoDias < 1)
        {
            logger.LogWarning("Jobs:NotificacoesRetencaoDias={Dias} inválido (mínimo 1); retenção não executada.", retencaoDias);
            return;
        }

        var excluidas = await sp.GetRequiredService<INotificacoesRepository>()
            .ExcluirLidasCriadasAntesDeAsync(DateTime.UtcNow.AddDays(-retencaoDias));
        if (excluidas > 0)
            logger.LogInformation("Retenção: {Excluidas} notificação(ões) lida(s) com mais de {Dias} dias excluída(s).", excluidas, retencaoDias);
    }
}

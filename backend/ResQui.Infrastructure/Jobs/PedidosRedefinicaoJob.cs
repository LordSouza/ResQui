using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ResQui.Application.Auth;

namespace ResQui.Infrastructure.Jobs;

public class PedidosRedefinicaoJob(
    IFilaPedidosRedefinicao fila,
    IServiceScopeFactory factory,
    ILogger<PedidosRedefinicaoJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var emailInformado in fila.LerTodosAsync(ct))
        {
            try
            {
                using var scope = factory.CreateScope();
                await scope.ServiceProvider.GetRequiredService<IRedefinicaoSenhaService>().ProcessarPedidoAsync(emailInformado);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Erro ao processar pedido de redefinição de senha");
            }
        }
    }
}

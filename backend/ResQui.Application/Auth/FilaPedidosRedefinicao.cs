using System.Threading.Channels;
using Microsoft.Extensions.Logging;

namespace ResQui.Application.Auth;

public interface IFilaPedidosRedefinicao
{
    void Enfileirar(string email);
    IAsyncEnumerable<string> LerTodosAsync(CancellationToken ct);
}

public class FilaPedidosRedefinicao(ILogger<FilaPedidosRedefinicao> logger) : IFilaPedidosRedefinicao
{
    private const int Capacidade = 1000;

    // Com DropWrite o TryWrite devolve true mesmo descartando; só o callback avisa do descarte.
    // Sem o e-mail no log: a fila só enche sob rajada, e registrar cada endereço descartado
    // encheria o log com dados pessoais escolhidos por quem faz a rajada.
    private readonly Channel<string> pedidos = Channel.CreateBounded<string>(
        new BoundedChannelOptions(Capacidade) { FullMode = BoundedChannelFullMode.DropWrite },
        _ => logger.LogWarning("Pedido de redefinição de senha descartado: fila cheia ({Capacidade} pendentes)", Capacidade));

    public void Enfileirar(string email) => pedidos.Writer.TryWrite(email);

    public IAsyncEnumerable<string> LerTodosAsync(CancellationToken ct) => pedidos.Reader.ReadAllAsync(ct);
}

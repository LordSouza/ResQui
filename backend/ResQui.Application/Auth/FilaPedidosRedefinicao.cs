using System.Threading.Channels;

namespace ResQui.Application.Auth;

public interface IFilaPedidosRedefinicao
{
    void Enfileirar(string email);
    IAsyncEnumerable<string> LerTodosAsync(CancellationToken ct);
}

public class FilaPedidosRedefinicao : IFilaPedidosRedefinicao
{
    private const int Capacidade = 1000;

    private readonly Channel<string> pedidos = Channel.CreateBounded<string>(
        new BoundedChannelOptions(Capacidade) { FullMode = BoundedChannelFullMode.DropWrite });

    public void Enfileirar(string email) => pedidos.Writer.TryWrite(email);

    public IAsyncEnumerable<string> LerTodosAsync(CancellationToken ct) => pedidos.Reader.ReadAllAsync(ct);
}

using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Common;

// Executa a operação sem banco e só registra se ela terminou com exceção (que, com banco,
// desfaria a transação). O rollback de verdade é provado em ResQui.Tests.Integracao.
public class TransacoesDiretas : ITransacoes
{
    public int Desfeitas { get; private set; }

    public Task ExecutarAsync(Func<Task> operacao) =>
        ExecutarAsync(async () =>
        {
            await operacao();
            return true;
        });

    public async Task<T> ExecutarAsync<T>(Func<Task<T>> operacao)
    {
        try
        {
            return await operacao();
        }
        catch
        {
            Desfeitas++;
            throw;
        }
    }
}

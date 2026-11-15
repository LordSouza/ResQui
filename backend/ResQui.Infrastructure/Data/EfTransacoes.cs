using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Data;

public class EfTransacoes(AppDbContext db) : ITransacoes
{
    public Task ExecutarAsync(Func<Task> operacao) =>
        ExecutarAsync(async () =>
        {
            await operacao();
            return true;
        });

    public async Task<T> ExecutarAsync<T>(Func<Task<T>> operacao)
    {
        if (db.Database.CurrentTransaction is not null) return await operacao();

        // Sem commit, o DisposeAsync desfaz a transação.
        await using var transacao = await db.Database.BeginTransactionAsync();
        var resultado = await operacao();
        await transacao.CommitAsync();
        return resultado;
    }
}

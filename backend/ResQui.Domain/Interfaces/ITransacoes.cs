namespace ResQui.Domain.Interfaces;

/// <summary>
/// Agrupa várias gravações (inclusive o registro de auditoria) num commit só. Aninhar é seguro:
/// dentro de uma transação já aberta, a operação só é executada. Qualquer exceção desfaz tudo.
/// Não chame serviço externo (e-mail, HTTP) dentro da operação: o gatilho da auditoria segura
/// um advisory lock até o commit, e toda gravação auditada do sistema esperaria por ele.
/// </summary>
public interface ITransacoes
{
    Task ExecutarAsync(Func<Task> operacao);
    Task<T> ExecutarAsync<T>(Func<Task<T>> operacao);
}

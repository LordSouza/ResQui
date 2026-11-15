namespace ResQui.Application.Assistente;

public interface IAssistenteProvider
{
    Task<string> CompletarAsync(string systemPrompt, IReadOnlyList<MensagemChat> historico, string mensagem, CancellationToken ct = default);
}

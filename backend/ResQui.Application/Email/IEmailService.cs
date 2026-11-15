namespace ResQui.Application.Email;

public interface IEmailService
{
    bool Habilitado { get; }
    /// <summary>
    /// Falhas e estouro do timeout interno são registrados em log e não lançam. Lança
    /// <see cref="OperationCanceledException"/> só quando <paramref name="ct"/> é cancelado.
    /// </summary>
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}

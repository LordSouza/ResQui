namespace ResQui.Application.Email;

public interface IEmailService
{
    bool Habilitado { get; }
    Task SendAsync(string to, string subject, string htmlBody);
}

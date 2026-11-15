namespace ResQui.Application.Auth;

public interface IFalhasLoginPorIp
{
    /// null quando a origem pode tentar este e-mail; senão, quanto falta para a janela que a
    /// bloqueia terminar.
    TimeSpan? TempoAteLiberar(string ip, string email);

    /// Devolve true só na falha que faz a origem atingir o teto de e-mails distintos, para que o
    /// bloqueio seja auditado uma vez.
    bool RegistrarFalha(string ip, string email);
}

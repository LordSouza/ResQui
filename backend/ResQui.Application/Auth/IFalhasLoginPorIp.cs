namespace ResQui.Application.Auth;

public interface IFalhasLoginPorIp
{
    bool EstaBloqueado(string ip);

    /// Devolve true só na falha que atinge o teto, para que o bloqueio seja auditado uma vez.
    bool RegistrarFalha(string ip);
}

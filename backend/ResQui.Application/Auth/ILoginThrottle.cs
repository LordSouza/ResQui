namespace ResQui.Application.Auth;

public interface ILoginThrottle
{
    /// Consome um permit da janela do e-mail. Devolve false quando a janela já estourou.
    bool TentarConsumir(string email);

    /// Descarta a janela do e-mail — chamado no login inteiramente bem-sucedido.
    void Zerar(string email);
}

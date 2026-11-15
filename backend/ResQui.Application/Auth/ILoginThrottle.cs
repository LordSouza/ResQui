namespace ResQui.Application.Auth;

public interface ILoginThrottle
{
    /// Consome um permit da janela do e-mail. Devolve false quando a janela já estourou.
    bool TentarConsumir(string email);

    /// Quanto falta para a janela do e-mail terminar; TimeSpan.Zero se não houver janela vigente.
    TimeSpan TempoAteLiberar(string email);

    /// Descarta a janela do e-mail — chamado no login inteiramente bem-sucedido.
    void Zerar(string email);
}

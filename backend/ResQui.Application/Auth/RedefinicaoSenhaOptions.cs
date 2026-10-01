namespace ResQui.Application.Auth;

public class RedefinicaoSenhaOptions
{
    public string UrlPublica { get; set; } = "";
    public int ValidadeMinutos { get; set; } = 60;
    public int MaxPorConta { get; set; } = 3;
    public int JanelaMinutosConta { get; set; } = 60;
    public int MaxPorIp { get; set; } = 5;
    public int JanelaMinutosIp { get; set; } = 15;
}

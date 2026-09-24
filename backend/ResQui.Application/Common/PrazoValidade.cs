namespace ResQui.Application.Common;

public static class PrazoValidade
{
    public static string Descrever(int diasRestantes) => diasRestantes switch
    {
        < 0 => $"venceu há {-diasRestantes} dia(s)",
        0 => "vence hoje",
        _ => $"vence em {diasRestantes} dia(s)",
    };
}

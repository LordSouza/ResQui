namespace ResQui.Application.Common;

public static class EmailDeEntrada
{
    // RFC 5321: o caminho tem 256 octetos contando os colchetes angulares.
    public const int MaxCaracteres = 254;

    /// Devolve o e-mail sem espaços nas pontas; lança ValidationException se vier ausente, em
    /// branco ou acima de MaxCaracteres.
    public static string Normalizar(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ValidationException("E-mail é obrigatório.");
        var limpo = email.Trim();
        if (limpo.Length > MaxCaracteres)
            throw new ValidationException($"O e-mail passa de {MaxCaracteres} caracteres.");
        return limpo;
    }
}

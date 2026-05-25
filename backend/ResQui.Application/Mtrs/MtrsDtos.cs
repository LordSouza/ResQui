namespace ResQui.Application.Mtrs;

public record MtrDto(
    int Id,
    string Numero,
    string Gerador,
    string Transportadora,
    string Status,
    DateTime DataEmissao,
    string? Destinador,
    string? CodigoIbama,
    decimal Massa,
    List<int> ResiduoIds
);

public record CriarMtrCmd(
    string Gerador,
    string Transportadora,
    string? Destinador,
    string? CodigoIbama,
    List<int> ResiduoIds
);

public record EnviarSinirResult(bool Sucesso, string Mensagem, string NovoStatus);

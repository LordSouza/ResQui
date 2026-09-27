namespace ResQui.Application.Mtrs;

public record MtrDto(
    int Id,
    string Numero,
    string Gerador,
    string Transportadora,
    DateTime DataEmissao,
    string? Destinador,
    string? CodigoIbama,
    decimal TotalLitros,
    decimal TotalQuilos,
    List<int> ResiduoIds,
    string? DataDestinacao,
    string? DestinadoPorId,
    string? DestinadoPorNome = null
);

public record CriarMtrCmd(
    string Gerador,
    string Transportadora,
    string? Destinador,
    string? CodigoIbama,
    List<int> ResiduoIds
);

// Data em "yyyy-MM-dd" — mesmo trânsito de CriarLoteCmd.Validade.
public record ConfirmarDestinacaoCmd(string Data);

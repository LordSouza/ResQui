namespace ResQui.Application.Pgrs;

public record ConfiguracaoPgrsDto(
    string RazaoSocial, string Cnpj, string Endereco, string Unidade,
    string RespTecnico, string RespCrq, string RespEmail, string RespTel,
    string GeradorPadrao, string TransportadorPadrao, string DestinadorPadrao, string CodigoIbamaPadrao,
    DateTime? AtualizadoEm);

public record AtualizarConfiguracaoPgrsCmd(
    string? RazaoSocial, string? Cnpj, string? Endereco, string? Unidade,
    string? RespTecnico, string? RespCrq, string? RespEmail, string? RespTel,
    string? GeradorPadrao, string? TransportadorPadrao, string? DestinadorPadrao, string? CodigoIbamaPadrao);

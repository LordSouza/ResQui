namespace ResQui.Application.Pgrs;

public record ConfiguracaoPgrsDto(
    string RazaoSocial, string Cnpj, string Endereco, string Unidade,
    string RespTecnico, string RespCrq, string RespEmail, string RespTel,
    string GeradorPadrao, string TransportadorPadrao, string DestinadorPadrao, string CodigoIbamaPadrao,
    DateTime? AtualizadoEm);

// Recorte legível por qualquer autenticado: identifica a instituição no cabeçalho do resumo de
// segurança (ResumoSeguranca.jsx). Deliberadamente sem CNPJ, endereço e contatos do responsável
// técnico — esses continuam só no ConfiguracaoPgrsDto, atrás da policy Tecnico.
public record IdentificacaoPgrsDto(string RazaoSocial, string Unidade);

public record AtualizarConfiguracaoPgrsCmd(
    string? RazaoSocial, string? Cnpj, string? Endereco, string? Unidade,
    string? RespTecnico, string? RespCrq, string? RespEmail, string? RespTel,
    string? GeradorPadrao, string? TransportadorPadrao, string? DestinadorPadrao, string? CodigoIbamaPadrao,
    DateTime? AtualizadoEmEsperado = null);

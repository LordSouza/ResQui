namespace ResQui.Domain.Entities;

/// <summary>
/// Configuração institucional do PGRS — linha única (Id = 1).
/// Campos opcionais: string vazia significa "não configurado".
/// </summary>
public class ConfiguracaoPgrs
{
    public int Id { get; set; } = 1;
    public string RazaoSocial { get; set; } = "";
    public string Cnpj { get; set; } = "";
    public string Endereco { get; set; } = "";
    public string Unidade { get; set; } = "";
    public string RespTecnico { get; set; } = "";
    public string RespCrq { get; set; } = "";
    public string RespEmail { get; set; } = "";
    public string RespTel { get; set; } = "";
    public string GeradorPadrao { get; set; } = "";
    public string TransportadorPadrao { get; set; } = "";
    public string DestinadorPadrao { get; set; } = "";
    public string CodigoIbamaPadrao { get; set; } = "";
    public DateTime? AtualizadoEm { get; set; }
    /// <summary>E-mail de quem editou por último — mesmo valor do "who" da auditoria, não um Id de usuário.</summary>
    public string? AtualizadoPor { get; set; }
}

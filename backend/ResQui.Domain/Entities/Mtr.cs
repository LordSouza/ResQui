using ResQui.Domain.Enums;

namespace ResQui.Domain.Entities;

public class Mtr
{
    public int Id { get; set; }
    public string Numero { get; set; } = "";
    public string Gerador { get; set; } = "";
    public string Transportadora { get; set; } = "";
    public string? ResponsavelId { get; set; }
    public MtrStatus Status { get; set; } = MtrStatus.Rascunho;
    public DateTime DataEmissao { get; set; } = DateTime.UtcNow;

    public string? Destinador { get; set; }
    public string? CodigoIbama { get; set; }
    public decimal Massa { get; set; }
}

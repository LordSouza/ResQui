namespace ResQui.Domain.Entities;

public class Mtr
{
    public int Id { get; set; }
    public string Numero { get; set; } = null!;
    public string Gerador { get; set; } = "";
    public string Transportadora { get; set; } = "";
    public string? ResponsavelId { get; set; }
    public DateTime DataEmissao { get; set; } = DateTime.UtcNow;

    public string? Destinador { get; set; }
    public string? CodigoIbama { get; set; }

    // Destinação final: o manifesto é a unidade do gesto — a carga sai e volta junta.
    // DateOnly (não DateTime) segue o padrão de Reagente.Validade: data sem hora e sem fuso.
    public DateOnly? DataDestinacao { get; set; }
    public string? DestinadoPorId { get; set; }
}

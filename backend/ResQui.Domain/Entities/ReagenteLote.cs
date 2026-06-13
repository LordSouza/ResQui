namespace ResQui.Domain.Entities;

// Frasco/lote físico de um reagente — desacopla a substância (catálogo) do item armazenado.
public class ReagenteLote
{
    public int Id { get; set; }
    public string ReagenteId { get; set; } = "";
    public string Codigo { get; set; } = "";
    public decimal Estoque { get; set; }
    public DateOnly Validade { get; set; }
    public DateOnly? Abertura { get; set; }
}

namespace ResQui.Domain.Entities;

public class RelatorioGerado
{
    public int Id { get; set; }
    public string Tipo { get; set; } = "";
    public string Titulo { get; set; } = "";
    public DateTime GeradoEm { get; set; } = DateTime.UtcNow;
    public string GeradoPorId { get; set; } = "";
    public int TotalLinhas { get; set; }
    public string Formato { get; set; } = "csv";
}

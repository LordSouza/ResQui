namespace ResQui.Domain.Entities;

public class Residuo
{
    public int Id { get; set; }
    public string Descricao { get; set; } = "";
    public int LaboratorioId { get; set; }
    public int? MtrId { get; set; }
    public string Status { get; set; } = "pendente";
    public DateTime DataRegistro { get; set; } = DateTime.UtcNow;
}

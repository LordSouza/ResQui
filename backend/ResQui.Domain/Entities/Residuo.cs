namespace ResQui.Domain.Entities;

public class Residuo
{
    public const int MaxMotivoRejeicao = 1000;

    public int Id { get; set; }
    public string Descricao { get; set; } = "";
    public string LaboratorioId { get; set; } = "";
    public int? MtrId { get; set; }
    public string Status { get; set; } = "solicitado";
    public DateTime DataRegistro { get; set; } = DateTime.UtcNow;

    public string Tipo { get; set; } = "";
    public decimal Volume { get; set; }
    public string Unidade { get; set; } = "L";
    public string Composicao { get; set; } = "";
    public string Risco { get; set; } = "medio";
    public string? Destino { get; set; }
    public List<int> ClassesReatividade { get; set; } = [];
    public string? MotivoRejeicao { get; set; }
}

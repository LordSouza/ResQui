namespace ResQui.Domain.Entities;

public class Laboratorio
{
    // null! para o EF detectar valor não-setado e usar o default do BD (sequência)
    public string Id { get; set; } = null!;
    public string Nome { get; set; } = "";
    public string Responsavel { get; set; } = "";
    public string? Email { get; set; }
    public List<string> Areas { get; set; } = [];
    public string Sala { get; set; } = "";
    public List<string> Armarios { get; set; } = [];
    public int Capacidade { get; set; }
    public decimal AreaM2 { get; set; }
    public string Ventilacao { get; set; } = "";
    public string Cor { get; set; } = "#1465c0";
    public DateOnly Criado { get; set; }
}

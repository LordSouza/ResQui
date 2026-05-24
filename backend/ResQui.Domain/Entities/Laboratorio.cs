namespace ResQui.Domain.Entities;

public class Laboratorio
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string Responsavel { get; set; } = "";
    public string? Email { get; set; }
    public List<string> AreasDeArmazenamento { get; set; } = [];
}

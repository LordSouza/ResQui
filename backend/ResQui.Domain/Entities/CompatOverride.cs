namespace ResQui.Domain.Entities;

public class CompatOverride
{
    public int ClasseA { get; set; }
    public int ClasseB { get; set; }
    public int Nivel { get; set; }
    public string Motivo { get; set; } = "";
    public string Autor { get; set; } = "";
    public DateTime DataEdicao { get; set; }
}

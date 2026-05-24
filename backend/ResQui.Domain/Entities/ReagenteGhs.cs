namespace ResQui.Domain.Entities;

public class ReagenteGhs
{
    public int Id { get; set; }
    public string ReagenteId { get; set; } = "";
    public List<string> Pictos { get; set; } = [];
    public string Signal { get; set; } = "";
    public List<string> FrasesH { get; set; } = [];
    public List<string> FrasesP { get; set; } = [];
}

namespace ResQui.Domain.Entities;

public class Reagente
{
    public string Id { get; set; } = null!;
    public string Nome { get; set; } = "";
    public string Cas { get; set; } = "";
    public string Formula { get; set; } = "";
    public string? Sinonimo { get; set; }
    public int ClasseReatividade { get; set; }
    public decimal Estoque { get; set; }
    public decimal? EstoqueMin { get; set; }
    public string Unidade { get; set; } = "";
    public DateOnly Validade { get; set; }
    public string Local { get; set; } = "";
    public string Responsavel { get; set; } = "";
    public bool Controlado { get; set; }
    public string? Lote { get; set; }
    public DateOnly? AberturaData { get; set; }

    public string ValidadeStatus
    {
        get
        {
            var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
            if (Validade < hoje) return "vencido";
            if (Validade <= hoje.AddDays(90)) return "vencendo";
            return "ok";
        }
    }

    public ReagenteGhs? Ghs { get; set; }
}

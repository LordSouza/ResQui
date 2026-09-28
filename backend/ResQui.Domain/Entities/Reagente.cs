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
    public string? LaboratorioId { get; set; }
    public Laboratorio? Laboratorio { get; set; }
    public string Armario { get; set; } = "";
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

    public string DescreverLocal()
    {
        if (Laboratorio is null)
            return string.IsNullOrWhiteSpace(Armario) ? "Sem laboratório" : $"Sem laboratório · {Armario}";
        return string.IsNullOrWhiteSpace(Armario) ? Laboratorio.Nome : $"{Laboratorio.Nome} · {Armario}";
    }
}

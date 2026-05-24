using ResQui.Domain.Enums;

namespace ResQui.Domain.Entities;

public class Chamado
{
    public int Id { get; set; }
    public string Titulo { get; set; } = "";
    public string Descricao { get; set; } = "";
    public ChamadoStatus Status { get; set; } = ChamadoStatus.Aberto;
    public int LaboratorioId { get; set; }
    public string AbertoPorId { get; set; } = "";
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}

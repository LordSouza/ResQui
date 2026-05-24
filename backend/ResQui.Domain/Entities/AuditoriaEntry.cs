using ResQui.Domain.Enums;

namespace ResQui.Domain.Entities;

public class AuditoriaEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Who { get; set; } = "";
    public string What { get; set; } = "";
    public string Where { get; set; } = "";
    public string Detail { get; set; } = "";
    public RiscoAuditoria Risk { get; set; } = RiscoAuditoria.Low;
}

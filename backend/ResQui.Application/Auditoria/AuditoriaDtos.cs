using ResQui.Domain.Enums;

namespace ResQui.Application.Auditoria;

public record AuditoriaItemDto(
    Guid Id,
    DateTime Timestamp,
    string Who,
    string What,
    string Where,
    string Detail,
    string Risk
);

public record AuditoriaFiltroDto(
    DateTime? From = null,
    DateTime? To = null,
    string? Risk = null,
    string? Who = null,
    string? What = null,
    string? Where = null
);

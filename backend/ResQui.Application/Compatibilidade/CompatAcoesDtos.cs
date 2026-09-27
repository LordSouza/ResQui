namespace ResQui.Application.Compatibilidade;

public record RegistrarParecerCmd(string ReagenteAId, string ReagenteBId, string? Parecer);
public record NotificarProfessoresCmd(string ReagenteAId, string ReagenteBId);

public record NotificarProfessoresResultDto(IReadOnlyList<NotificadoDto> Notificados);

public record NotificadoDto(string UsuarioId, string Nome);

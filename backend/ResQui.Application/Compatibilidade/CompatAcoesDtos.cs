namespace ResQui.Application.Compatibilidade;

public record RegistrarParecerCmd(string ReagenteAId, string ReagenteBId, string? Parecer);
public record NotificarResponsaveisCmd(string ReagenteAId, string ReagenteBId);

public record NotificarResponsaveisResultDto(
    IReadOnlyList<NotificadoDto> Notificados,
    IReadOnlyList<NaoResolvidoDto> NaoResolvidos);

public record NotificadoDto(string UsuarioId, string Nome);
public record NaoResolvidoDto(string Responsavel, string Motivo);

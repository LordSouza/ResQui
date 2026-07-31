namespace ResQui.Application.Compatibilidade;

public interface ICompatAcoesService
{
    Task RegistrarParecerAsync(string usuarioEmail, RegistrarParecerCmd cmd);
    Task<NotificarResponsaveisResultDto> NotificarResponsaveisAsync(string usuarioEmail, NotificarResponsaveisCmd cmd);
}

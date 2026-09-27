namespace ResQui.Application.Compatibilidade;

public interface ICompatAcoesService
{
    Task RegistrarParecerAsync(string usuarioEmail, RegistrarParecerCmd cmd);
    Task<NotificarProfessoresResultDto> NotificarProfessoresAsync(string usuarioEmail, NotificarProfessoresCmd cmd);
}

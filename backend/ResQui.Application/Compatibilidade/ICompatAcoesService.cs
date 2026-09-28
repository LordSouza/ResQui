using ResQui.Application.Common;

namespace ResQui.Application.Compatibilidade;

public interface ICompatAcoesService
{
    Task RegistrarParecerAsync(string usuarioEmail, RegistrarParecerCmd cmd);
    Task<NotificarProfessoresResultDto> NotificarProfessoresAsync(Solicitante solicitante, NotificarProfessoresCmd cmd);
}

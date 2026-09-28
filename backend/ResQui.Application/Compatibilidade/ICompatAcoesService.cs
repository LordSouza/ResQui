using ResQui.Application.Common;

namespace ResQui.Application.Compatibilidade;

public interface ICompatAcoesService
{
    Task RegistrarParecerAsync(Solicitante solicitante, RegistrarParecerCmd cmd);
    Task<NotificarProfessoresResultDto> NotificarProfessoresAsync(Solicitante solicitante, NotificarProfessoresCmd cmd);
}

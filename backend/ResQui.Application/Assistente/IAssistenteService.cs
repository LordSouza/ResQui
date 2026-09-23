using ResQui.Application.Common;

namespace ResQui.Application.Assistente;

public interface IAssistenteService
{
    Task<RespostaAssistenteDto> ResponderAsync(MensagemAssistenteCmd cmd, Solicitante solicitante);
}

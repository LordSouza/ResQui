namespace ResQui.Application.Assistente;

public interface IAssistenteService
{
    Task<RespostaAssistenteDto> ResponderAsync(MensagemAssistenteCmd cmd);
}

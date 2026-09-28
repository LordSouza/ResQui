using ResQui.Application.Common;

namespace ResQui.Application.Mtrs;

public interface IMtrsService
{
    Task<IEnumerable<MtrDto>> ListarAsync(Solicitante solicitante);
    Task<MtrDto?> ObterPorIdAsync(int id, Solicitante solicitante);
    Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string? usuarioId, string usuarioEmail);
    Task<(byte[] Pdf, string Filename)?> GerarPdfAsync(int id, Solicitante solicitante);
    Task<MtrDto?> ConfirmarDestinacaoAsync(int id, ConfirmarDestinacaoCmd cmd, string? usuarioId, string usuarioEmail);
    Task<bool> ReabrirDestinacaoAsync(int id, string usuarioEmail);
}

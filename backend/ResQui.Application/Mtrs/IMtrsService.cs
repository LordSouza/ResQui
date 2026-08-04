namespace ResQui.Application.Mtrs;

public interface IMtrsService
{
    Task<IEnumerable<MtrDto>> ListarAsync();
    Task<MtrDto?> ObterPorIdAsync(int id);
    Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string? usuarioId, string usuarioEmail);
    Task<(byte[] Pdf, string Filename)?> GerarPdfAsync(int id, string usuarioEmail);
    Task<MtrDto?> ConfirmarDestinacaoAsync(int id, ConfirmarDestinacaoCmd cmd, string? usuarioId, string usuarioEmail);
}

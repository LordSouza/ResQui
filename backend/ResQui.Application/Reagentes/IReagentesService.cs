using ResQui.Application.Common;

namespace ResQui.Application.Reagentes;

public interface IReagentesService
{
    Task<(IEnumerable<ReagenteListItemDto> Items, int Total)> ListarAsync(ReagentesFiltroDto filtro, Solicitante solicitante);
    Task<ReagenteDetalheDto?> ObterPorIdAsync(string id, Solicitante solicitante);
    Task<ReagenteDetalheDto> CriarAsync(CriarReagenteCmd cmd, Solicitante solicitante);
    Task<ReagenteDetalheDto?> AtualizarAsync(string id, AtualizarReagenteCmd cmd, Solicitante solicitante);
    Task<bool> DeletarAsync(string id, Solicitante solicitante);
    Task<ReagenteDetalheDto?> BaixaAsync(string id, BaixaCmd cmd, Solicitante solicitante);
    Task<ReagenteDetalheDto?> TransferirAsync(string id, TransferirReagenteCmd cmd, Solicitante solicitante);
    Task<byte[]?> GerarRotuloAsync(string id, Solicitante solicitante);
    Task<byte[]?> QrDoRotuloAsync(string id, Solicitante solicitante);
    Task<byte[]?> GerarRotuloLoteAsync(string reagenteId, int loteId, Solicitante solicitante);
    Task<IEnumerable<Auditoria.AuditoriaItemDto>?> ListarMovimentacoesAsync(string id, Solicitante solicitante, int limite = 20);
    Task<IEnumerable<LoteDto>?> ListarLotesAsync(string reagenteId, Solicitante solicitante);
    Task<LoteDto?> CriarLoteAsync(string reagenteId, CriarLoteCmd cmd, Solicitante solicitante);
    Task<LoteDto?> BaixaLoteAsync(string reagenteId, int loteId, BaixaCmd cmd, Solicitante solicitante);
    Task<ImportarLoteResultDto> ImportarLoteAsync(IEnumerable<CriarReagenteCmd> cmds, Solicitante solicitante);
}

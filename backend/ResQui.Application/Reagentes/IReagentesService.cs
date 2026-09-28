using ResQui.Application.Common;

namespace ResQui.Application.Reagentes;

public interface IReagentesService
{
    Task<(IEnumerable<ReagenteListItemDto> Items, int Total)> ListarAsync(ReagentesFiltroDto filtro);
    Task<ReagenteDetalheDto?> ObterPorIdAsync(string id);
    Task<ReagenteDetalheDto> CriarAsync(CriarReagenteCmd cmd, string usuarioEmail);
    Task<ReagenteDetalheDto?> AtualizarAsync(string id, AtualizarReagenteCmd cmd, string usuarioEmail);
    Task<bool> DeletarAsync(string id, string usuarioEmail);
    Task<ReagenteDetalheDto?> BaixaAsync(string id, BaixaCmd cmd, string usuarioEmail);
    Task<ReagenteDetalheDto?> TransferirAsync(string id, TransferirReagenteCmd cmd, string usuarioEmail);
    Task<byte[]?> GerarRotuloAsync(string id, string usuarioEmail);
    Task<byte[]?> QrDoRotuloAsync(string id);
    Task<byte[]?> GerarRotuloLoteAsync(string reagenteId, int loteId, string usuarioEmail);
    Task<IEnumerable<Auditoria.AuditoriaItemDto>?> ListarMovimentacoesAsync(string id, Solicitante solicitante, int limite = 20);
    Task<IEnumerable<LoteDto>?> ListarLotesAsync(string reagenteId);
    Task<LoteDto?> CriarLoteAsync(string reagenteId, CriarLoteCmd cmd, string usuarioEmail);
    Task<LoteDto?> BaixaLoteAsync(string reagenteId, int loteId, BaixaCmd cmd, string usuarioEmail);
    Task<ImportarLoteResultDto> ImportarLoteAsync(IEnumerable<CriarReagenteCmd> cmds, string usuarioEmail);
}

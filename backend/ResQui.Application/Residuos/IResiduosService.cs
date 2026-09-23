using ResQui.Application.Common;

namespace ResQui.Application.Residuos;

public interface IResiduosService
{
    Task<IEnumerable<ResiduoDto>> ListarAsync(string? labId, int? mtrId, string? status, Solicitante solicitante);
    Task<ResiduoDto> CriarAsync(CriarResiduoCmd cmd, Solicitante solicitante);
    Task<ResiduoDto?> AtualizarAsync(int id, AtualizarResiduoCmd cmd, Solicitante solicitante);
    Task<ResiduoDto?> AprovarAsync(int id, Solicitante solicitante);
    Task<ResiduoDto?> DesfazerAprovacaoAsync(int id, Solicitante solicitante);
    Task<ResiduoDto?> RejeitarAsync(int id, string? motivo, Solicitante solicitante);
    Task<ResiduosAnalyticsDto> AnalyticsAsync(int meses, Solicitante solicitante);
}

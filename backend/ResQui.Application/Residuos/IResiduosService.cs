namespace ResQui.Application.Residuos;

public interface IResiduosService
{
    Task<IEnumerable<ResiduoDto>> ListarAsync(string? labId, int? mtrId, string? status);
    Task<ResiduoDto> CriarAsync(CriarResiduoCmd cmd, string usuarioEmail);
    Task<ResiduoDto?> AtualizarAsync(int id, AtualizarResiduoCmd cmd, string usuarioEmail);
    Task<ResiduoDto?> AprovarAsync(int id, string usuarioEmail);
    Task<ResiduoDto?> DesfazerAprovacaoAsync(int id, string usuarioEmail);
    Task<ResiduoDto?> RejeitarAsync(int id, string? motivo, string usuarioEmail);
    Task<ResiduosAnalyticsDto> AnalyticsAsync(int meses);
}

namespace ResQui.Application.Residuos;

public interface IResiduosService
{
    Task<IEnumerable<ResiduoDto>> ListarAsync(int? labId, int? mtrId, string? status);
    Task<ResiduoDto> CriarAsync(CriarResiduoCmd cmd);
    Task<ResiduoDto?> AtualizarAsync(int id, AtualizarResiduoCmd cmd);
}

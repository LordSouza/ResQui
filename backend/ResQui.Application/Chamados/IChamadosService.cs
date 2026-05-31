namespace ResQui.Application.Chamados;

public interface IChamadosService
{
    Task<IEnumerable<ChamadoDto>> ListarAsync();
    Task<ChamadoDto> CriarAsync(CriarChamadoCmd cmd, string usuarioId);
    Task<ChamadoDto?> AtualizarStatusAsync(int id, AtualizarStatusCmd cmd);
    Task<ChamadoDto?> ComentarAsync(int id, ComentarChamadoCmd cmd, string autorId);
}

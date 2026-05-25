namespace ResQui.Application.Mtrs;

public interface IMtrsService
{
    Task<IEnumerable<MtrDto>> ListarAsync();
    Task<MtrDto?> ObterPorIdAsync(int id);
    Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string usuarioId);
    Task<EnviarSinirResult> EnviarSinirAsync(int id);
    Task<IEnumerable<EnviarSinirResult>> EnviarBatchAsync();
}

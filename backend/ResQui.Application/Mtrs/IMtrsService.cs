namespace ResQui.Application.Mtrs;

public interface IMtrsService
{
    Task<IEnumerable<MtrDto>> ListarAsync();
    Task<MtrDto?> ObterPorIdAsync(int id);
    Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string usuarioId, string usuarioEmail);
    Task<EnviarSinirResult> EnviarSinirAsync(int id, string usuarioEmail);
    Task<IEnumerable<EnviarSinirResult>> EnviarBatchAsync(string usuarioEmail);
}

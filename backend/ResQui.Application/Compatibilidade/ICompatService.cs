namespace ResQui.Application.Compatibilidade;

public interface ICompatService
{
    Task<CompatResultDto?> ConsultarParAsync(int classeA, int classeB);
    Task<CompatResultDto?> AvaliarMisturaAsync(IReadOnlyCollection<int> classes);
    Task<CompatMatrizDto> GetMatrizAsync();
    Task<IEnumerable<CompatOverrideDto>> GetOverridesAsync();
    Task<CompatOverrideDto> SalvarOverrideAsync(int classeA, int classeB, SalvarOverrideCmd cmd, string usuarioEmail);
    Task RemoverOverrideAsync(int classeA, int classeB, string usuarioEmail);
}

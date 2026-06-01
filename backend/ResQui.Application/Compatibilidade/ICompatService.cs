namespace ResQui.Application.Compatibilidade;

public interface ICompatService
{
    Task<CompatResultDto?> ConsultarParAsync(int classeA, int classeB);
    Task<CompatMatrizDto> GetMatrizAsync();
    Task<IEnumerable<CompatOverrideDto>> GetOverridesAsync();
    Task<CompatOverrideDto> SalvarOverrideAsync(int classeA, int classeB, SalvarOverrideCmd cmd);
    Task RemoverOverrideAsync(int classeA, int classeB);
}

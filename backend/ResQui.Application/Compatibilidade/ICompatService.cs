namespace ResQui.Application.Compatibilidade;

public interface ICompatService
{
    Task<CompatResultDto?> ConsultarParAsync(int classeA, int classeB);
    Task<CompatMatrizDto> GetMatrizAsync();
}

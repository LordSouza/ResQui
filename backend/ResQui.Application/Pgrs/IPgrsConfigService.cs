namespace ResQui.Application.Pgrs;

public interface IPgrsConfigService
{
    Task<ConfiguracaoPgrsDto> ObterAsync();
    Task<ConfiguracaoPgrsDto> SalvarAsync(AtualizarConfiguracaoPgrsCmd cmd, string usuarioEmail);
}

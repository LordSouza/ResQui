namespace ResQui.Application.Pgrs;

public interface IPgrsConfigService
{
    Task<ConfiguracaoPgrsDto> ObterAsync();
    Task<IdentificacaoPgrsDto> ObterIdentificacaoAsync();
    Task<ConfiguracaoPgrsDto> SalvarAsync(AtualizarConfiguracaoPgrsCmd cmd, string usuarioEmail);
}

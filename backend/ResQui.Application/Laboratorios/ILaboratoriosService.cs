namespace ResQui.Application.Laboratorios;

public interface ILaboratoriosService
{
    Task<IEnumerable<LaboratorioDto>> ListarAsync();
    Task<LaboratorioDto?> ObterPorIdAsync(string id);
    Task<LaboratorioDto> CriarAsync(CriarLaboratorioCmd cmd);
    Task<LaboratorioDto?> AtualizarAsync(string id, AtualizarLaboratorioCmd cmd);
    Task<bool> DeletarAsync(string id);
}

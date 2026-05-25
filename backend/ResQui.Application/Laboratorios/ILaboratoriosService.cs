namespace ResQui.Application.Laboratorios;

public interface ILaboratoriosService
{
    Task<IEnumerable<LaboratorioDto>> ListarAsync();
    Task<LaboratorioDto?> ObterPorIdAsync(int id);
    Task<LaboratorioDto> CriarAsync(CriarLaboratorioCmd cmd);
    Task<LaboratorioDto?> AtualizarAsync(int id, AtualizarLaboratorioCmd cmd);
    Task<bool> DeletarAsync(int id);
}

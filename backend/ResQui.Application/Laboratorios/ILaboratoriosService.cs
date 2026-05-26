namespace ResQui.Application.Laboratorios;

public interface ILaboratoriosService
{
    Task<IEnumerable<LaboratorioDto>> ListarAsync();
    Task<LaboratorioDto?> ObterPorIdAsync(string id);
    Task<LaboratorioDto> CriarAsync(CriarLaboratorioCmd cmd, string usuarioEmail);
    Task<LaboratorioDto?> AtualizarAsync(string id, AtualizarLaboratorioCmd cmd, string usuarioEmail);
    Task<bool> DeletarAsync(string id, string usuarioEmail);
}

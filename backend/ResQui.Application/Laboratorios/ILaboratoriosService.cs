using ResQui.Application.Common;

namespace ResQui.Application.Laboratorios;

public interface ILaboratoriosService
{
    Task<IEnumerable<LaboratorioDto>> ListarAsync(Solicitante solicitante);
    Task<LaboratorioDto?> ObterPorIdAsync(string id, Solicitante solicitante);
    Task<LaboratorioDto> CriarAsync(CriarLaboratorioCmd cmd, Solicitante solicitante);
    Task<LaboratorioDto?> AtualizarAsync(string id, AtualizarLaboratorioCmd cmd, Solicitante solicitante);
    Task<bool> DeletarAsync(string id, Solicitante solicitante);
}

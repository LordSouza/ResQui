using ResQui.Application.Common;

namespace ResQui.Application.Relatorios;

public interface IRelatoriosService
{
    Task<IEnumerable<RelatorioGeradoDto>> ListarAsync(Solicitante solicitante);
    Task<RelatorioGeradoDto> GerarAsync(GerarRelatorioCmd cmd, string? userId, Solicitante solicitante);
    Task<(string Csv, string Filename)?> DownloadAsync(int id, Solicitante solicitante);
}

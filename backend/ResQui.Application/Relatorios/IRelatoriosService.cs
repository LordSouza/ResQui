namespace ResQui.Application.Relatorios;

public interface IRelatoriosService
{
    Task<IEnumerable<RelatorioGeradoDto>> ListarAsync();
    Task<RelatorioGeradoDto> GerarAsync(GerarRelatorioCmd cmd, string? userId);
    Task<(string Csv, string Filename)?> DownloadAsync(int id);
}

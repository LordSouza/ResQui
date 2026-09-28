namespace ResQui.Application.Relatorios;

public record RelatorioGeradoDto(
    int Id, string Tipo, string Titulo,
    DateTime GeradoEm, string? GeradoPorId,
    int TotalLinhas, string Formato,
    IReadOnlyList<string>? LaboratorioIds = null);

public record GerarRelatorioCmd(string Tipo, List<string>? LaboratorioIds = null);

namespace ResQui.Application.Residuos;

public record ResiduoDto(
    int Id,
    string Descricao,
    string LaboratorioId,
    int? MtrId,
    string Status,
    DateTime DataRegistro,
    string Tipo,
    decimal Volume,
    string Unidade,
    string Composicao,
    string Risco,
    string? Destino,
    IList<int> ClassesReatividade
);

public record CriarResiduoCmd(
    string Descricao,
    string LaboratorioId,
    string Tipo,
    decimal Volume,
    string Unidade,
    string Composicao,
    string Risco,
    string? Destino,
    IList<int> ClassesReatividade
);

public record AtualizarResiduoCmd(
    string? Descricao,
    string? Tipo,
    decimal? Volume,
    string? Unidade,
    string? Composicao,
    string? Risco,
    string? Destino,
    IList<int>? ClassesReatividade = null
);

public record RejeitarResiduoCmd(string? Motivo = null);

public record MensalItem(string Mes, decimal Litros, decimal Quilos);
public record LabItem(string Lab, decimal Litros, decimal Quilos);
public record ResiduosAnalyticsDto(IList<MensalItem> Mensal, IList<LabItem> PorLab);

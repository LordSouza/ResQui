namespace ResQui.Application.Residuos;

public record ResiduoDto(
    int Id,
    string Descricao,
    int LaboratorioId,
    int? MtrId,
    string Status,
    DateTime DataRegistro,
    string Tipo,
    decimal Volume,
    string Unidade,
    string Composicao,
    string Risco,
    string? Destino
);

public record CriarResiduoCmd(
    string Descricao,
    int LaboratorioId,
    string Tipo,
    decimal Volume,
    string Unidade,
    string Composicao,
    string Risco,
    string? Destino
);

public record AtualizarResiduoCmd(
    string? Descricao,
    string? Tipo,
    decimal? Volume,
    string? Unidade,
    string? Composicao,
    string? Risco,
    string? Destino,
    string? Status,
    int? MtrId
);

public record MensalItem(string Mes, decimal Valor);
public record LabItem(string Lab, decimal Valor);
public record ResiduosAnalyticsDto(IList<MensalItem> Mensal, IList<LabItem> PorLab);

namespace ResQui.Application.Reagentes;

public record ReagenteListItemDto(
    string Id,
    string Nome,
    string Cas,
    string? Sinonimo,
    int ClasseReatividade,
    decimal Estoque,
    decimal? EstoqueMin,
    string Unidade,
    string Validade,
    string ValidadeStatus,
    string Local,
    string? LaboratorioId,
    string Armario,
    bool Controlado,
    GhsDto? Ghs
);

public record ReagenteDetalheDto(
    string Id,
    string Nome,
    string Cas,
    string Formula,
    string? Sinonimo,
    int ClasseReatividade,
    decimal Estoque,
    decimal? EstoqueMin,
    string Unidade,
    string Validade,
    string ValidadeStatus,
    string Local,
    string? LaboratorioId,
    string Armario,
    bool Controlado,
    string? Lote,
    string? AberturaData,
    GhsDto? Ghs
);

public record GhsDto(List<string> Pictos, string Signal, List<string> FrasesH, List<string> FrasesP);

public record CriarReagenteCmd(
    string? Id,
    string Nome,
    string Cas,
    string Formula,
    string? Sinonimo,
    int ClasseReatividade,
    decimal Estoque,
    decimal? EstoqueMin,
    string Unidade,
    string? Validade,
    string? LaboratorioId,
    string? Armario,
    bool Controlado,
    string? Lote,
    GhsDto? Ghs
);

// Sem Estoque: ele só muda por baixa ou lote. Reenviar o valor lido ao abrir o formulário
// sobrescrevia baixas feitas por outra pessoa nesse meio-tempo.
public record AtualizarReagenteCmd(
    string Nome,
    decimal? EstoqueMin,
    string? LaboratorioId,
    string? Armario,
    string? Validade
);

public record BaixaCmd(decimal Quantidade, string? Motivo = null)
{
    public const int MaxMotivo = 200;
}

public record TransferirReagenteCmd(string? LaboratorioId, string? Armario);

public record LoteDto(
    int Id,
    string Codigo,
    decimal Estoque,
    string Validade,
    string? Abertura,
    string ValidadeStatus
);

public record CriarLoteCmd(
    string Codigo,
    decimal Estoque,
    string Validade,
    string? Abertura
);

public record ReagentesFiltroDto(
    int Page = 1,
    int PageSize = 20,
    string? Q = null,
    int? Classe = null,
    bool Vencendo = false
);

public record ImportarLoteResultDto(int Total, int Importados, IReadOnlyList<ErroLinhaDto> Erros);

public record ErroLinhaDto(int Indice, string Motivo);

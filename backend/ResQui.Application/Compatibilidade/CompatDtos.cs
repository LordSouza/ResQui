namespace ResQui.Application.Compatibilidade;

public record CompatResultDto(int ClasseA, int ClasseB, int Nivel, string Descricao);
public record CompatMatrizDto(List<CompatEntryDto> Entries);
public record CompatEntryDto(int ClasseA, int ClasseB, int Nivel);

public record CompatOverrideDto(
    int ClasseA,
    int ClasseB,
    int Nivel,
    string Motivo,
    string Autor,
    string DataEdicao);

public record SalvarOverrideCmd(int Nivel, string Motivo, string Autor);

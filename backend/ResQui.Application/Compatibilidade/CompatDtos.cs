namespace ResQui.Application.Compatibilidade;

public record CompatResultDto(int ClasseA, int ClasseB, int Nivel, string Descricao);
public record CompatMatrizDto(List<CompatEntryDto> Entries, CompatFonteDto Fonte);
public record CompatEntryDto(int ClasseA, int ClasseB, int Nivel);
public record CompatFonteDto(
    string Fonte,
    string Referencia,
    string Url,
    string RevisadoEm);

public record CompatOverrideDto(
    int ClasseA,
    int ClasseB,
    int Nivel,
    string Motivo,
    string Autor,
    string DataEdicao);

public record SalvarOverrideCmd(int Nivel, string Motivo, string Autor);

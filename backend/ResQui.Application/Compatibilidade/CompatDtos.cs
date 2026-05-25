namespace ResQui.Application.Compatibilidade;

public record CompatResultDto(int ClasseA, int ClasseB, int Nivel, string Descricao);
public record CompatMatrizDto(List<CompatEntryDto> Entries);
public record CompatEntryDto(int ClasseA, int ClasseB, int Nivel);

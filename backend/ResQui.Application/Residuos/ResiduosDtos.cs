namespace ResQui.Application.Residuos;

public record ResiduoDto(int Id, string Descricao, int LaboratorioId, int? MtrId, string Status, DateTime DataRegistro);
public record CriarResiduoCmd(string Descricao, int LaboratorioId);
public record AtualizarResiduoCmd(string Status, int? MtrId);

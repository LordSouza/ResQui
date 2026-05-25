namespace ResQui.Application.Laboratorios;

public record LaboratorioDto(int Id, string Nome, string Responsavel, string? Email, List<string> Areas);
public record CriarLaboratorioCmd(string Nome, string Responsavel, string? Email, List<string> Areas);
public record AtualizarLaboratorioCmd(string Nome, string Responsavel, string? Email, List<string> Areas);

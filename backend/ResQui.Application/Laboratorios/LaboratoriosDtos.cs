namespace ResQui.Application.Laboratorios;

public record LaboratorioDto(
    string Id, string Nome, string Responsavel, string? Email,
    List<string> Areas, string Sala, List<string> Armarios,
    int Capacidade, decimal AreaM2, string Ventilacao, string Cor, DateOnly Criado
);

public record CriarLaboratorioCmd(
    string Nome, string Responsavel, string? Email,
    List<string> Areas, string Sala, List<string> Armarios,
    int Capacidade, decimal AreaM2, string Ventilacao, string Cor
);

public record AtualizarLaboratorioCmd(
    string Nome, string Responsavel, string? Email,
    List<string> Areas, string Sala, List<string> Armarios,
    int Capacidade, decimal AreaM2, string Ventilacao, string Cor
);

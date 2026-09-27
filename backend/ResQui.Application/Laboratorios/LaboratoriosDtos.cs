namespace ResQui.Application.Laboratorios;

public record LaboratorioDto(
    string Id, string Nome, string Responsavel,
    string Sala, List<string> Armarios, string Cor, DateOnly Criado
);

public record CriarLaboratorioCmd(
    string Nome, string Responsavel, string Sala, List<string> Armarios, string Cor
);

public record AtualizarLaboratorioCmd(
    string Nome, string Sala, List<string> Armarios
);

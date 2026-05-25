using ResQui.Domain.Enums;

namespace ResQui.Application.Chamados;

public record ChamadoDto(int Id, string Titulo, string Descricao, string Status, int LaboratorioId, string AbertoPorId, DateTime CriadoEm);
public record CriarChamadoCmd(string Titulo, string Descricao, int LaboratorioId);
public record AtualizarStatusCmd(string Status);

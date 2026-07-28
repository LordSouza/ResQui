namespace ResQui.Application.Chamados;

public record ComentarioDto(int Id, string Texto, string AutorId, DateTime CriadoEm);

public record ChamadoDto(
    int Id, string Titulo, string Descricao,
    string Status, string Tipo, string Severidade,
    string? LaboratorioId, string AbertoPorId,
    DateTime CriadoEm, IList<ComentarioDto> Comentarios);

public record CriarChamadoCmd(
    string Titulo, string Descricao, string? LaboratorioId,
    string Tipo, string Severidade);

public record AtualizarStatusCmd(string Status);

public record ComentarChamadoCmd(string Texto);

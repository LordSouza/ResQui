using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Chamados;

public class ChamadosService(IChamadosRepository repo) : IChamadosService
{
    public async Task<IEnumerable<ChamadoDto>> ListarAsync() =>
        (await repo.GetAllWithComentariosAsync()).Select(ToDto);

    public async Task<ChamadoDto> CriarAsync(CriarChamadoCmd cmd, string usuarioId)
    {
        var c = new Chamado
        {
            Titulo = cmd.Titulo,
            Descricao = cmd.Descricao,
            LaboratorioId = cmd.LaboratorioId,
            AbertoPorId = usuarioId,
            Tipo = Enum.TryParse<ChamadoTipo>(cmd.Tipo, ignoreCase: true, out var t) ? t : ChamadoTipo.Outro,
            Severidade = Enum.TryParse<ChamadoSeveridade>(cmd.Severidade, ignoreCase: true, out var s) ? s : ChamadoSeveridade.Media,
        };
        await repo.AddAsync(c);
        await repo.SaveChangesAsync();
        return ToDto(c);
    }

    public async Task<ChamadoDto?> AtualizarStatusAsync(int id, AtualizarStatusCmd cmd)
    {
        var c = await repo.GetByIdWithComentariosAsync(id);
        if (c is null) return null;
        if (Enum.TryParse<ChamadoStatus>(cmd.Status, ignoreCase: true, out var s)) c.Status = s;
        await repo.UpdateAsync(c);
        await repo.SaveChangesAsync();
        return ToDto(c);
    }

    public async Task<ChamadoDto?> ComentarAsync(int id, ComentarChamadoCmd cmd, string autorId)
    {
        var c = await repo.GetByIdWithComentariosAsync(id);
        if (c is null) return null;
        var comentario = new ChamadoComentario { ChamadoId = id, Texto = cmd.Texto, AutorId = autorId };
        await repo.AddComentarioAsync(comentario);
        await repo.SaveChangesAsync();
        c.Comentarios.Add(comentario);
        return ToDto(c);
    }

    private static ChamadoDto ToDto(Chamado c) => new(
        c.Id, c.Titulo, c.Descricao,
        c.Status.ToString().ToLower().Replace("emanalise", "em-analise"),
        c.Tipo.ToString().ToLower(),
        c.Severidade.ToString().ToLower(),
        c.LaboratorioId, c.AbertoPorId, c.CriadoEm,
        c.Comentarios.Select(x => new ComentarioDto(x.Id, x.Texto, x.AutorId, x.CriadoEm)).ToList());
}

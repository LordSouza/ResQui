using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Chamados;

public class ChamadosService(IChamadosRepository repo, ILaboratoriosRepository labRepo) : IChamadosService
{
    public async Task<IEnumerable<ChamadoDto>> ListarAsync() =>
        (await repo.GetAllWithComentariosAsync()).Select(ToDto);

    public async Task<ChamadoDto> CriarAsync(CriarChamadoCmd cmd, string usuarioId)
    {
        if (string.IsNullOrWhiteSpace(cmd.Titulo)) throw new ValidationException("Título é obrigatório.");
        if (string.IsNullOrWhiteSpace(cmd.Descricao)) throw new ValidationException("Descrição é obrigatória.");
        if (!string.IsNullOrEmpty(cmd.LaboratorioId))
        {
            var existe = (await labRepo.GetAllAsync()).Any(l => l.Id == cmd.LaboratorioId);
            if (!existe) throw new ValidationException($"Laboratório {cmd.LaboratorioId} não encontrado.");
        }

        var c = new Chamado
        {
            Titulo = cmd.Titulo,
            Descricao = cmd.Descricao,
            // Normaliza string vazia para null — "sem laboratório" nunca deve virar "".
            LaboratorioId = string.IsNullOrEmpty(cmd.LaboratorioId) ? null : cmd.LaboratorioId,
            AbertoPorId = usuarioId,
            Tipo = Enum.TryParse<ChamadoTipo>(cmd.Tipo, ignoreCase: true, out var t) ? t : ChamadoTipo.Outro,
            Severidade = Enum.TryParse<ChamadoSeveridade>(cmd.Severidade, ignoreCase: true, out var sv) ? sv : ChamadoSeveridade.Media,
        };
        await repo.AddAsync(c);
        await repo.SaveChangesAsync();
        return ToDto(c);
    }

    public async Task<ChamadoDto?> AtualizarStatusAsync(int id, AtualizarStatusCmd cmd)
    {
        var c = await repo.GetByIdWithComentariosAsync(id);
        if (c is null) return null;
        var normalized = cmd.Status.Replace("em-analise", "EmAnalise", StringComparison.OrdinalIgnoreCase);
        if (!Enum.TryParse<ChamadoStatus>(normalized, ignoreCase: true, out var s))
            throw new ValidationException($"Status inválido: {cmd.Status}");
        c.Status = s;
        await repo.UpdateAsync(c);
        await repo.SaveChangesAsync();
        return ToDto(c);
    }

    public async Task<ChamadoDto?> ComentarAsync(int id, ComentarChamadoCmd cmd, string autorId)
    {
        var c = await repo.GetByIdWithComentariosAsync(id);
        if (c is null) return null;
        if (string.IsNullOrWhiteSpace(cmd.Texto)) throw new ValidationException("Texto do comentário é obrigatório.");
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

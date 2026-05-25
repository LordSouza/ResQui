using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Chamados;

public class ChamadosService(IChamadosRepository repo) : IChamadosService
{
    public async Task<IEnumerable<ChamadoDto>> ListarAsync() =>
        (await repo.GetAllAsync()).Select(ToDto);

    public async Task<ChamadoDto> CriarAsync(CriarChamadoCmd cmd, string usuarioId)
    {
        var c = new Chamado { Titulo = cmd.Titulo, Descricao = cmd.Descricao, LaboratorioId = cmd.LaboratorioId, AbertoPorId = usuarioId };
        await repo.AddAsync(c);
        await repo.SaveChangesAsync();
        return ToDto(c);
    }

    public async Task<ChamadoDto?> AtualizarStatusAsync(int id, AtualizarStatusCmd cmd)
    {
        var c = await repo.GetByIdAsync(id);
        if (c is null) return null;
        if (Enum.TryParse<ChamadoStatus>(cmd.Status, ignoreCase: true, out var s)) c.Status = s;
        await repo.UpdateAsync(c);
        await repo.SaveChangesAsync();
        return ToDto(c);
    }

    private static ChamadoDto ToDto(Chamado c) =>
        new(c.Id, c.Titulo, c.Descricao, c.Status.ToString(), c.LaboratorioId, c.AbertoPorId, c.CriadoEm);
}

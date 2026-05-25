using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Laboratorios;

public class LaboratoriosService(ILaboratoriosRepository repo) : ILaboratoriosService
{
    public async Task<IEnumerable<LaboratorioDto>> ListarAsync() =>
        (await repo.GetAllAsync()).Select(ToDto);

    public async Task<LaboratorioDto?> ObterPorIdAsync(int id) =>
        (await repo.GetByIdAsync(id)) is { } l ? ToDto(l) : null;

    public async Task<LaboratorioDto> CriarAsync(CriarLaboratorioCmd cmd)
    {
        var l = new Laboratorio { Nome = cmd.Nome, Responsavel = cmd.Responsavel, Email = cmd.Email, AreasDeArmazenamento = cmd.Areas };
        await repo.AddAsync(l);
        await repo.SaveChangesAsync();
        return ToDto(l);
    }

    public async Task<LaboratorioDto?> AtualizarAsync(int id, AtualizarLaboratorioCmd cmd)
    {
        var l = await repo.GetByIdAsync(id);
        if (l is null) return null;
        l.Nome = cmd.Nome; l.Responsavel = cmd.Responsavel; l.Email = cmd.Email; l.AreasDeArmazenamento = cmd.Areas;
        await repo.UpdateAsync(l);
        await repo.SaveChangesAsync();
        return ToDto(l);
    }

    public async Task<bool> DeletarAsync(int id)
    {
        if (await repo.GetByIdAsync(id) is null) return false;
        await repo.DeleteAsync(id);
        await repo.SaveChangesAsync();
        return true;
    }

    private static LaboratorioDto ToDto(Laboratorio l) =>
        new(l.Id, l.Nome, l.Responsavel, l.Email, l.AreasDeArmazenamento);
}

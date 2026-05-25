using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Residuos;

public class ResiduosService(IResiduosRepository repo) : IResiduosService
{
    public async Task<IEnumerable<ResiduoDto>> ListarAsync(int? labId, int? mtrId, string? status)
    {
        var all = await repo.GetAllAsync();
        if (labId.HasValue) all = all.Where(r => r.LaboratorioId == labId.Value);
        if (mtrId.HasValue) all = all.Where(r => r.MtrId == mtrId.Value);
        if (!string.IsNullOrEmpty(status)) all = all.Where(r => r.Status == status);
        return all.Select(r => new ResiduoDto(r.Id, r.Descricao, r.LaboratorioId, r.MtrId, r.Status, r.DataRegistro));
    }

    public async Task<ResiduoDto> CriarAsync(CriarResiduoCmd cmd)
    {
        var r = new Residuo { Descricao = cmd.Descricao, LaboratorioId = cmd.LaboratorioId };
        await repo.AddAsync(r);
        await repo.SaveChangesAsync();
        return new ResiduoDto(r.Id, r.Descricao, r.LaboratorioId, r.MtrId, r.Status, r.DataRegistro);
    }

    public async Task<ResiduoDto?> AtualizarAsync(int id, AtualizarResiduoCmd cmd)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        r.Status = cmd.Status; r.MtrId = cmd.MtrId;
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        return new ResiduoDto(r.Id, r.Descricao, r.LaboratorioId, r.MtrId, r.Status, r.DataRegistro);
    }
}

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
        return all.Select(ToDto);
    }

    public async Task<ResiduoDto> CriarAsync(CriarResiduoCmd cmd)
    {
        var r = new Residuo
        {
            Descricao = cmd.Descricao,
            LaboratorioId = cmd.LaboratorioId,
            Tipo = cmd.Tipo,
            Volume = cmd.Volume,
            Unidade = cmd.Unidade,
            Composicao = cmd.Composicao,
            Risco = cmd.Risco,
            Destino = cmd.Destino,
        };
        await repo.AddAsync(r);
        await repo.SaveChangesAsync();
        return ToDto(r);
    }

    public async Task<ResiduoDto?> AtualizarAsync(int id, AtualizarResiduoCmd cmd)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        if (cmd.Descricao is not null) r.Descricao = cmd.Descricao;
        if (cmd.Tipo is not null) r.Tipo = cmd.Tipo;
        if (cmd.Volume is not null) r.Volume = cmd.Volume.Value;
        if (cmd.Unidade is not null) r.Unidade = cmd.Unidade;
        if (cmd.Composicao is not null) r.Composicao = cmd.Composicao;
        if (cmd.Risco is not null) r.Risco = cmd.Risco;
        if (cmd.Destino is not null) r.Destino = cmd.Destino;
        if (cmd.Status is not null) r.Status = cmd.Status;
        if (cmd.MtrId is not null) r.MtrId = cmd.MtrId;
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        return ToDto(r);
    }

    private static ResiduoDto ToDto(Residuo r) =>
        new(r.Id, r.Descricao, r.LaboratorioId, r.MtrId, r.Status, r.DataRegistro,
            r.Tipo, r.Volume, r.Unidade, r.Composicao, r.Risco, r.Destino);
}

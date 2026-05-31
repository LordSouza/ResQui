using ResQui.Application.Auditoria;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Residuos;

public class ResiduosService(
    IResiduosRepository repo,
    IAuditoriaService auditoria,
    ILaboratoriosRepository labRepo) : IResiduosService
{
    public async Task<IEnumerable<ResiduoDto>> ListarAsync(int? labId, int? mtrId, string? status)
    {
        var all = await repo.GetAllAsync();
        if (labId.HasValue) all = all.Where(r => r.LaboratorioId == labId.Value);
        if (mtrId.HasValue) all = all.Where(r => r.MtrId == mtrId.Value);
        if (!string.IsNullOrEmpty(status)) all = all.Where(r => r.Status == status);
        return all.Select(ToDto);
    }

    public async Task<ResiduoDto> CriarAsync(CriarResiduoCmd cmd, string usuarioEmail)
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
        await auditoria.RegistrarAsync(usuarioEmail, "residuo.criar", "Resíduos",
            $"Registrou resíduo {r.Id} — {r.Descricao}", RiscoAuditoria.Low);
        return ToDto(r);
    }

    public async Task<ResiduoDto?> AtualizarAsync(int id, AtualizarResiduoCmd cmd, string usuarioEmail)
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
        await auditoria.RegistrarAsync(usuarioEmail, "residuo.atualizar", "Resíduos",
            $"Editou resíduo {id}", RiscoAuditoria.Low);
        return ToDto(r);
    }

    public async Task<ResiduosAnalyticsDto> AnalyticsAsync(int meses)
    {
        var corte = DateTime.UtcNow.AddMonths(-meses);
        var residuos = (await repo.GetAllAsync())
            .Where(r => r.DataRegistro >= corte)
            .ToList();

        var labs = (await labRepo.GetAllAsync()).ToList();
        var labPorSeq = labs
            .Select(l => (Nome: l.Nome, Seq: ParseLabSeq(l.Id)))
            .Where(x => x.Seq >= 0)
            .ToDictionary(x => x.Seq, x => x.Nome);

        var mensal = residuos
            .GroupBy(r => r.DataRegistro.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .Select(g => new MensalItem(g.Key, g.Sum(r => NormalizarVolume(r.Volume, r.Unidade))))
            .ToList();

        var porLab = residuos
            .GroupBy(r => r.LaboratorioId)
            .Select(g => new LabItem(
                labPorSeq.TryGetValue(g.Key, out var nome) ? nome : $"Lab-{g.Key:D3}",
                g.Sum(r => NormalizarVolume(r.Volume, r.Unidade))))
            .OrderByDescending(x => x.Valor)
            .ToList();

        return new ResiduosAnalyticsDto(mensal, porLab);
    }

    private static int ParseLabSeq(string labId)
    {
        var parts = labId.Split('-');
        return parts.Length == 2 && int.TryParse(parts[1], out var n) ? n : -1;
    }

    private static decimal NormalizarVolume(decimal volume, string unidade) =>
        unidade.ToLower() switch
        {
            "ml" => volume / 1000,
            _ => volume,
        };

    private static ResiduoDto ToDto(Residuo r) =>
        new(r.Id, r.Descricao, r.LaboratorioId, r.MtrId, r.Status, r.DataRegistro,
            r.Tipo, r.Volume, r.Unidade, r.Composicao, r.Risco, r.Destino);
}

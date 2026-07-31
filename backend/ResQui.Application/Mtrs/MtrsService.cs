using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Mtrs;

public class MtrsService(IMtrsRepository repo, IResiduosRepository residuosRepo, IAuditoriaService auditoria, ICompatService compat, Pdf.IPdfService pdf) : IMtrsService
{
    public async Task<IEnumerable<MtrDto>> ListarAsync()
    {
        var mtrs = await repo.GetAllAsync();
        var residuos = await residuosRepo.GetAllAsync();
        return mtrs.Select(m => ToDto(m, residuos));
    }

    public async Task<MtrDto?> ObterPorIdAsync(int id)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;
        var residuos = await residuosRepo.GetAllAsync();
        return ToDto(m, residuos);
    }

    public async Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string? usuarioId, string usuarioEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.Gerador)) throw new ValidationException("Gerador é obrigatório.");
        if (string.IsNullOrWhiteSpace(cmd.Transportadora)) throw new ValidationException("Transportadora é obrigatória.");
        if (cmd.ResiduoIds is null || cmd.ResiduoIds.Count == 0)
            throw new ValidationException("Selecione ao menos um resíduo.");

        var residuos = new List<Residuo>();
        foreach (var rid in cmd.ResiduoIds)
        {
            var r = await residuosRepo.GetByIdAsync(rid)
                ?? throw new ValidationException($"Resíduo {rid} não encontrado.");
            // RF06 gate: só resíduos com descarte aprovado ("aguardando-coleta") podem ser coletados.
            if (r.Status != "aguardando-coleta")
                throw new ValidationException(
                    $"Resíduo {rid} não está aprovado para coleta (status atual: \"{r.Status}\"). " +
                    "Aprove a solicitação de descarte antes de emitir o MTR.");
            residuos.Add(r);
        }

        // No transporte conjunto, pares de classes em nível Proibido (3) bloqueiam o MTR.
        var classes = residuos.SelectMany(r => r.ClassesReatividade).Distinct().ToList();
        var pior = await compat.AvaliarMisturaAsync(classes);
        if (pior is not null && pior.Nivel >= 3)
        {
            await auditoria.RegistrarAsync(usuarioEmail, "mtr.agrupamento-bloqueado", "MTR",
                $"Agrupamento bloqueado — classes {pior.ClasseA} e {pior.ClasseB} (Proibido)", RiscoAuditoria.High);
            throw new ValidationException(
                $"Agrupamento incompatível: classes {pior.ClasseA} e {pior.ClasseB} têm nível \"Proibido\". " +
                "Emita MTRs separados para esses resíduos.");
        }

        var numero = $"MTR-{DateTime.UtcNow.Year}-{Random.Shared.Next(1000, 9999)}";
        var m = new Mtr
        {
            Numero = numero,
            Gerador = cmd.Gerador,
            Transportadora = cmd.Transportadora,
            Destinador = cmd.Destinador,
            CodigoIbama = cmd.CodigoIbama,
            ResponsavelId = usuarioId,
        };
        await repo.AddAsync(m);
        await repo.SaveChangesAsync();

        foreach (var r in residuos)
        {
            r.MtrId = m.Id;
            r.Status = "em-coleta";
            await residuosRepo.UpdateAsync(r);
        }
        m.Massa = CalcularMassa(residuos);
        await repo.UpdateAsync(m);
        await residuosRepo.SaveChangesAsync();
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "mtr.criar", "MTR",
            $"Criou MTR {m.Numero} com {residuos.Count} resíduo(s)", RiscoAuditoria.Medium);
        return ToDto(m, residuos);
    }

    public async Task<(byte[] Pdf, string Filename)?> GerarPdfAsync(int id, string usuarioEmail)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;
        var residuos = (await residuosRepo.GetAllAsync()).Where(r => r.MtrId == m.Id).ToList();
        var bytes = pdf.ManifestoMtr(m, residuos);
        await auditoria.RegistrarAsync(usuarioEmail, "mtr.pdf", "MTR",
            $"Gerou PDF do MTR {m.Numero}", RiscoAuditoria.Low);
        return (bytes, $"{m.Numero.ToLower()}.pdf");
    }

    private static decimal CalcularMassa(IEnumerable<Residuo> residuos)
    {
        var toKg = new Dictionary<string, decimal>
        {
            ["kg"] = 1m, ["g"] = 0.001m, ["L"] = 1.0m, ["mL"] = 0.001m, ["m³"] = 1000m,
        };
        return residuos.Sum(r => r.Volume * (toKg.TryGetValue(r.Unidade, out var f) ? f : 1m));
    }

    private static MtrDto ToDto(Mtr m, IEnumerable<Residuo> todosResíduos)
    {
        var ids = todosResíduos.Where(r => r.MtrId == m.Id).Select(r => r.Id).ToList();
        return new MtrDto(m.Id, m.Numero, m.Gerador, m.Transportadora,
            m.Status.ToString(), m.DataEmissao, m.Destinador, m.CodigoIbama, m.Massa, ids);
    }
}

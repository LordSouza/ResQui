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

    public async Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string usuarioId, string usuarioEmail)
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

    public async Task<EnviarSinirResult> EnviarSinirAsync(int id, string usuarioEmail)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return new EnviarSinirResult(false, "MTR não encontrado", "");
        if (m.Status != MtrStatus.Rascunho && m.Status != MtrStatus.PendenteSinir)
            return new EnviarSinirResult(false, "MTR não está em estado enviável", m.Status.ToString());

        var sucesso = Random.Shared.NextDouble() > 0.3;
        m.Status = sucesso ? MtrStatus.AceitoSinir : MtrStatus.PendenteSinir;
        await repo.UpdateAsync(m);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "mtr.enviar-sinir", "MTR",
            $"Enviou MTR {m.Numero} ao SINIR — {(sucesso ? "aceito" : "pendente")}", RiscoAuditoria.High);
        return new EnviarSinirResult(sucesso, sucesso ? "Aceito pelo SINIR" : "Pendente no SINIR", m.Status.ToString());
    }

    public async Task<IEnumerable<EnviarSinirResult>> EnviarBatchAsync(string usuarioEmail)
    {
        var rascunhos = (await repo.GetAllAsync()).Where(m => m.Status == MtrStatus.Rascunho).ToList();
        var results = new List<EnviarSinirResult>();
        foreach (var m in rascunhos)
            results.Add(await EnviarSinirAsync(m.Id, usuarioEmail));
        await auditoria.RegistrarAsync(usuarioEmail, "mtr.enviar-batch", "MTR",
            $"Enviou batch de {rascunhos.Count} MTR(s) ao SINIR", RiscoAuditoria.High);
        return results;
    }

    public async Task<(string Csv, string Filename)?> ExportarSinirAsync(int id, string usuarioEmail)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;
        var residuos = (await residuosRepo.GetAllAsync()).Where(r => r.MtrId == m.Id).ToList();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("manifesto;data_emissao;gerador;transportadora;destinador;codigo_ibama;massa_kg;status");
        sb.AppendLine(string.Join(';',
            Campo(m.Numero), m.DataEmissao.ToString("yyyy-MM-dd"), Campo(m.Gerador), Campo(m.Transportadora),
            Campo(m.Destinador ?? ""), Campo(m.CodigoIbama ?? ""),
            m.Massa.ToString("F3", System.Globalization.CultureInfo.InvariantCulture), m.Status.ToString()));
        sb.AppendLine();
        sb.AppendLine("residuo_id;descricao;tipo;quantidade;unidade;risco;classes_reatividade;acondicionamento");
        foreach (var r in residuos)
            sb.AppendLine(string.Join(';',
                r.Id, Campo(r.Descricao), Campo(r.Tipo),
                r.Volume.ToString("F3", System.Globalization.CultureInfo.InvariantCulture), r.Unidade,
                r.Risco, string.Join(',', r.ClassesReatividade), Campo(r.Destino ?? "")));

        await auditoria.RegistrarAsync(usuarioEmail, "mtr.export-sinir", "MTR",
            $"Exportou pré-MTR {m.Numero} (layout SINIR)", RiscoAuditoria.Medium);
        return (sb.ToString(), $"pre-mtr-{m.Numero.ToLower()}.csv");
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

    private static string Campo(string valor) =>
        valor.Contains(';') || valor.Contains('"')
            ? $"\"{valor.Replace("\"", "\"\"")}\""
            : valor;

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

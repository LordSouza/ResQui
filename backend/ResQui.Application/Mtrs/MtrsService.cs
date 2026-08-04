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
            var envolvidos = DescreverEnvolvidos(residuos, pior);
            await auditoria.RegistrarAsync(usuarioEmail, "mtr.agrupamento-bloqueado", "MTR",
                $"Agrupamento bloqueado — classes {pior.ClasseA} e {pior.ClasseB} (Proibido): {envolvidos}",
                RiscoAuditoria.High);
            throw new ValidationException(
                $"Agrupamento incompatível (nível \"{pior.Descricao}\", classes {pior.ClasseA} e {pior.ClasseB}): " +
                $"{envolvidos}. Emita MTRs separados para esses resíduos.");
        }

        // Numero é gerado pelo banco (DEFAULT da coluna, sequência mtrs_numero_seq) — ver
        // MtrConfiguration. Atribuir aqui sobrescreveria o valor único por um palpite.
        var m = new Mtr
        {
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

    public async Task<MtrDto?> ConfirmarDestinacaoAsync(int id, ConfirmarDestinacaoCmd cmd, string? usuarioId, string usuarioEmail)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;

        if (m.DataDestinacao is not null)
            throw new ValidationException(
                $"Manifesto já destinado em {m.DataDestinacao:dd/MM/yyyy}.");

        if (!DateOnly.TryParse(cmd.Data, out var data))
            throw new ValidationException("Data de destinação inválida.");

        // Comparações por DIA: DataEmissao é timestamp e a destinação é data sem hora — comparar
        // instantes recusaria confirmar no mesmo dia em que o manifesto foi emitido.
        if (data > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ValidationException("A data de destinação não pode estar no futuro.");
        if (data < DateOnly.FromDateTime(m.DataEmissao))
            throw new ValidationException(
                $"A destinação não pode ser anterior à emissão do manifesto ({m.DataEmissao:dd/MM/yyyy}).");

        var todos = (await residuosRepo.GetAllAsync()).ToList();
        // Só os que estão de fato em coleta: AtualizarResiduoCmd aceita Status e MtrId, então um
        // resíduo pode ter saído do fluxo por outro caminho e não deve ser arrastado de volta.
        var emColeta = todos.Where(r => r.MtrId == m.Id && r.Status == "em-coleta").ToList();
        if (emColeta.Count == 0)
            throw new ValidationException("Nenhum resíduo deste manifesto está em coleta.");

        foreach (var r in emColeta)
        {
            r.Status = "destinado";
            await residuosRepo.UpdateAsync(r);
        }
        m.DataDestinacao = data;
        m.DestinadoPorId = usuarioId;
        await repo.UpdateAsync(m);
        await residuosRepo.SaveChangesAsync();
        await repo.SaveChangesAsync();

        await auditoria.RegistrarAsync(usuarioEmail, "mtr.destinacao", "MTR",
            $"Destinação do MTR {m.Numero} confirmada em {data:yyyy-MM-dd} — {emColeta.Count} resíduo(s) encerrado(s)",
            RiscoAuditoria.Medium);
        return ToDto(m, todos);
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

    // Lista os resíduos do agrupamento que carregam alguma classe do par bloqueado, cada um com as
    // classes do par que possui — cobre tanto vários resíduos contribuindo uma classe cada quanto o
    // resíduo solitário que carrega o par inteiro.
    private static string DescreverEnvolvidos(IEnumerable<Residuo> residuos, CompatResultDto pior)
    {
        var par = new[] { pior.ClasseA, pior.ClasseB };
        var itens = residuos
            .Where(r => r.ClassesReatividade.Intersect(par).Any())
            .OrderBy(r => r.Id)
            .Select(r =>
            {
                var doPar = par.Where(c => r.ClassesReatividade.Contains(c)).ToList();
                return doPar.Count > 1
                    ? $"resíduo #{r.Id} (classes {string.Join(", ", doPar)})"
                    : $"resíduo #{r.Id} (classe {doPar[0]})";
            });
        return string.Join(", ", itens);
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
            m.DataEmissao, m.Destinador, m.CodigoIbama, m.Massa, ids,
            m.DataDestinacao?.ToString("yyyy-MM-dd"), m.DestinadoPorId);
    }
}

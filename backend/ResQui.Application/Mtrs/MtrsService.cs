using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Mtrs;

public class MtrsService(IMtrsRepository repo, IResiduosRepository residuosRepo, IAuditoriaService auditoria, ICompatService compat, Pdf.IPdfService pdf, IAuthRepository auth, IVisibilidadeUsuarios visibilidade) : IMtrsService
{
    public async Task<IEnumerable<MtrDto>> ListarAsync(Solicitante solicitante)
    {
        var residuos = (await residuosRepo.GetAllAsync()).ToList();
        var mtrs = (await repo.GetAllAsync()).Where(m => Enxerga(m, residuos, solicitante)).ToList();
        var nomes = new Dictionary<string, string?>();
        foreach (var id in mtrs.Select(m => m.DestinadoPorId).OfType<string>().Distinct())
            nomes[id] = await NomeDeQuemDestinouAsync(id, solicitante);
        return mtrs.Select(m => ToDto(m, residuos, solicitante,
            m.DestinadoPorId is null ? null : nomes[m.DestinadoPorId]));
    }

    public async Task<MtrDto?> ObterPorIdAsync(int id, Solicitante solicitante)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;
        var residuos = (await residuosRepo.GetAllAsync()).ToList();
        GarantirQueEnxerga(m, residuos, solicitante);
        return ToDto(m, residuos, solicitante, await NomeDeQuemDestinouAsync(m.DestinadoPorId, solicitante));
    }

    public async Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string? usuarioId, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(cmd.Gerador)) throw new ValidationException("Gerador é obrigatório.");
        if (string.IsNullOrWhiteSpace(cmd.Transportadora)) throw new ValidationException("Transportadora é obrigatória.");
        if (cmd.ResiduoIds is null || cmd.ResiduoIds.Count == 0)
            throw new ValidationException("Selecione ao menos um resíduo.");

        var residuos = new List<Residuo>();
        foreach (var rid in cmd.ResiduoIds.Distinct())
        {
            var r = await residuosRepo.GetByIdAsync(rid)
                ?? throw new ValidationException($"Resíduo {rid} não encontrado.");
            if (!solicitante.Responde(r.LaboratorioId))
                throw new AcessoNegadoException($"O resíduo {rid} é de um laboratório pelo qual você não responde.");
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
            await auditoria.RegistrarAsync(solicitante.Email, "mtr.agrupamento-bloqueado", "MTR",
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
        await repo.UpdateAsync(m);
        await residuosRepo.SaveChangesAsync();
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "mtr.criar", "MTR",
            $"Criou MTR {m.Numero} com {residuos.Count} resíduo(s)", RiscoAuditoria.Medium);
        return ToDto(m, residuos, solicitante);
    }

    public async Task<MtrDto?> ConfirmarDestinacaoAsync(int id, ConfirmarDestinacaoCmd cmd, string? usuarioId, Solicitante solicitante)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;
        var todos = (await residuosRepo.GetAllAsync()).ToList();
        GarantirQueRespondePorTodos(m, todos, solicitante);

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

        // Só os que estão de fato em coleta: um resíduo pode ter saído do fluxo por outro
        // caminho e não deve ser arrastado de volta.
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

        await auditoria.RegistrarAsync(solicitante.Email, "mtr.destinacao", "MTR",
            $"Destinação do MTR {m.Numero} confirmada em {data:yyyy-MM-dd} — {emColeta.Count} resíduo(s) encerrado(s)",
            RiscoAuditoria.Medium);
        return ToDto(m, todos, solicitante, await NomeDeQuemDestinouAsync(m.DestinadoPorId));
    }

    public async Task<bool> ReabrirDestinacaoAsync(int id, Solicitante solicitante)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return false;
        var todos = (await residuosRepo.GetAllAsync()).ToList();
        GarantirQueRespondePorTodos(m, todos, solicitante);
        if (m.DataDestinacao is null)
            throw new ValidationException("Manifesto não está destinado.");

        var destinados = todos.Where(r => r.MtrId == m.Id && r.Status == "destinado").ToList();
        foreach (var r in destinados)
        {
            r.Status = "em-coleta";
            await residuosRepo.UpdateAsync(r);
        }
        m.DataDestinacao = null;
        m.DestinadoPorId = null;
        await repo.UpdateAsync(m);
        await residuosRepo.SaveChangesAsync();
        await repo.SaveChangesAsync();

        // High: desfazer um registro de rastreabilidade não é operação corriqueira.
        await auditoria.RegistrarAsync(solicitante.Email, "mtr.destinacao-reaberta", "MTR",
            $"Reabriu o MTR {m.Numero} — {destinados.Count} resíduo(s) de volta para coleta",
            RiscoAuditoria.High);
        return true;
    }

    public async Task<(byte[] Pdf, string Filename)?> GerarPdfAsync(int id, Solicitante solicitante)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;
        var todos = (await residuosRepo.GetAllAsync()).ToList();
        GarantirQueEnxerga(m, todos, solicitante);
        var (proprios, deOutrosLaboratorios) = SepararPorEscopo(todos.Where(r => r.MtrId == m.Id), solicitante);

        var bytes = pdf.ManifestoMtr(m, proprios, deOutrosLaboratorios, await NomeDeQuemDestinouAsync(m.DestinadoPorId, solicitante));
        await auditoria.RegistrarAsync(solicitante.Email, "mtr.pdf", "MTR",
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

    private async Task<string?> NomeDeQuemDestinouAsync(string? usuarioId, Solicitante? quemConsulta = null)
    {
        if (usuarioId is null) return null;
        if (await auth.FindByIdIncluindoArquivadosAsync(usuarioId) is not { } u) return null;
        if (quemConsulta is not null && !await visibilidade.EnxergaAsync(quemConsulta, u)) return null;
        return u.Nome ?? u.Email;
    }

    private static bool Enxerga(Mtr m, IEnumerable<Residuo> todosResíduos, Solicitante solicitante) =>
        solicitante.VeTudo || todosResíduos.Any(r => r.MtrId == m.Id && solicitante.Responde(r.LaboratorioId));

    private static void GarantirQueEnxerga(Mtr m, IEnumerable<Residuo> todosResíduos, Solicitante solicitante)
    {
        if (!Enxerga(m, todosResíduos, solicitante))
            throw new AcessoNegadoException($"O manifesto {m.Numero} não tem resíduo de laboratório pelo qual você responde.");
    }

    private static void GarantirQueRespondePorTodos(Mtr m, IEnumerable<Residuo> todosResíduos, Solicitante solicitante)
    {
        GarantirQueEnxerga(m, todosResíduos, solicitante);
        if (todosResíduos.Any(r => r.MtrId == m.Id && !solicitante.Responde(r.LaboratorioId)))
            throw new AcessoNegadoException(
                $"O manifesto {m.Numero} tem resíduos de laboratórios pelos quais você não responde; só quem responde por todos confirma ou reabre a destinação.");
    }

    private static (List<Residuo> Proprios, List<Residuo> DeOutrosLaboratorios) SepararPorEscopo(
        IEnumerable<Residuo> doMtr, Solicitante solicitante)
    {
        var ordenados = doMtr.OrderBy(r => r.Id).ToList();
        return (ordenados.Where(r => solicitante.Responde(r.LaboratorioId)).ToList(),
                ordenados.Where(r => !solicitante.Responde(r.LaboratorioId)).ToList());
    }

    private static MtrDto ToDto(Mtr m, IEnumerable<Residuo> todosResíduos, Solicitante solicitante, string? destinadoPorNome = null)
    {
        var doMtr = todosResíduos.Where(r => r.MtrId == m.Id).ToList();
        var quantidade = QuantidadeResiduos.Somar(doMtr);
        var (proprios, deOutrosLaboratorios) = SepararPorEscopo(doMtr, solicitante);
        return new MtrDto(m.Id, m.Numero, m.Gerador, m.Transportadora,
            m.DataEmissao, m.Destinador, m.CodigoIbama, quantidade.Litros, quantidade.Quilos,
            proprios.Select(r => r.Id).ToList(),
            m.DataDestinacao?.ToString("yyyy-MM-dd"), m.DestinadoPorId, destinadoPorNome,
            deOutrosLaboratorios.Select(r => new ResiduoDeOutroLaboratorioDto(r.Volume, r.Unidade)).ToList());
    }
}

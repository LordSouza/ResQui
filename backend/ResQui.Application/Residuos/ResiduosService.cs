using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Residuos;

public class ResiduosService(
    IResiduosRepository repo,
    IAuditoriaService auditoria,
    ILaboratoriosRepository labRepo,
    ICompatService compat) : IResiduosService
{
    private static readonly string[] RiscosValidos = ["baixo", "medio", "alto"];
    private static readonly string[] UnidadesValidas = ["L", "mL", "kg", "g", "m³"];

    // Bloqueia misturas com par de classes em nível Perigo (2) ou Proibido (3).
    private async Task ValidarMisturaAsync(IList<int>? classes, string usuarioEmail)
    {
        if (classes is null || classes.Count < 2) return;
        var pior = await compat.AvaliarMisturaAsync(classes.ToList());
        if (pior is not null && pior.Nivel >= 2)
        {
            await auditoria.RegistrarAsync(usuarioEmail, "residuo.mistura-bloqueada", "Resíduos",
                $"Mistura bloqueada — classes {pior.ClasseA} e {pior.ClasseB} ({pior.Descricao})", RiscoAuditoria.High);
            throw new ValidationException(
                $"Mistura incompatível: classes {pior.ClasseA} e {pior.ClasseB} têm nível \"{pior.Descricao}\". " +
                "Segregue os componentes em resíduos separados.");
        }
    }
    private static void GarantirEscopo(Residuo r, Solicitante solicitante)
    {
        if (!solicitante.Responde(r.LaboratorioId))
            throw new AcessoNegadoException(
                $"O resíduo #{r.Id} é do laboratório {r.LaboratorioId}, pelo qual você não responde.");
    }

    public async Task<IEnumerable<ResiduoDto>> ListarAsync(string? labId, int? mtrId, string? status, Solicitante solicitante)
    {
        var all = await repo.GetAllAsync();
        if (!solicitante.VeTudo) all = all.Where(r => solicitante.LaboratorioIds.Contains(r.LaboratorioId));
        if (!string.IsNullOrEmpty(labId)) all = all.Where(r => r.LaboratorioId == labId);
        if (mtrId.HasValue) all = all.Where(r => r.MtrId == mtrId.Value);
        if (!string.IsNullOrEmpty(status)) all = all.Where(r => r.Status == status);
        return all.Select(ToDto);
    }

    public async Task<ResiduoDto> CriarAsync(CriarResiduoCmd cmd, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(cmd.Descricao)) throw new ValidationException("Descrição é obrigatória.");
        if (cmd.Volume <= 0) throw new ValidationException("Volume deve ser maior que zero.");
        if (!RiscosValidos.Contains(cmd.Risco)) throw new ValidationException("Risco inválido — use baixo, medio ou alto.");
        if (!UnidadesValidas.Contains(cmd.Unidade)) throw new ValidationException("Unidade inválida — use L, mL, kg, g ou m³.");
        var labExiste = (await labRepo.GetAllAsync()).Any(l => l.Id == cmd.LaboratorioId);
        if (!labExiste) throw new ValidationException($"Laboratório {cmd.LaboratorioId} não encontrado.");
        if (!solicitante.Responde(cmd.LaboratorioId))
            throw new ValidationException($"Você não responde pelo laboratório {cmd.LaboratorioId}.");
        if (cmd.ClassesReatividade is null || cmd.ClassesReatividade.Count == 0)
            throw new ValidationException("Classifique a reatividade do resíduo — selecione ao menos uma classe.");
        if (cmd.ClassesReatividade.Any(c => c is < 1 or > 12))
            throw new ValidationException("Classe de reatividade deve estar entre 1 e 12.");
        await ValidarMisturaAsync(cmd.ClassesReatividade, solicitante.Email);
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
            ClassesReatividade = cmd.ClassesReatividade.ToList(),
        };
        await repo.AddAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "residuo.criar", "Resíduos",
            $"Registrou resíduo {r.Id} — {r.Descricao}", RiscoAuditoria.Low);
        return ToDto(r);
    }

    public async Task<ResiduoDto?> AtualizarAsync(int id, AtualizarResiduoCmd cmd, Solicitante solicitante)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        GarantirEscopo(r, solicitante);
        if (cmd.Volume is <= 0) throw new ValidationException("Volume deve ser maior que zero.");
        if (cmd.Risco is not null && !RiscosValidos.Contains(cmd.Risco)) throw new ValidationException("Risco inválido — use baixo, medio ou alto.");
        if (cmd.Unidade is not null && !UnidadesValidas.Contains(cmd.Unidade)) throw new ValidationException("Unidade inválida — use L, mL, kg, g ou m³.");
        if (cmd.ClassesReatividade is { Count: 0 })
            throw new ValidationException("Classifique a reatividade do resíduo — selecione ao menos uma classe.");
        if (cmd.ClassesReatividade is not null && cmd.ClassesReatividade.Any(c => c is < 1 or > 12))
            throw new ValidationException("Classe de reatividade deve estar entre 1 e 12.");
        // Valida a mudança, não o estado: um resíduo gravado antes de uma revisão da matriz pode
        // ter par hoje bloqueado, e recusar a edição não o torna seguro — só impede o registro de
        // ficar correto. Comparação por conjunto: classes não têm ordem semântica.
        if (cmd.ClassesReatividade is not null && !r.ClassesReatividade.ToHashSet().SetEquals(cmd.ClassesReatividade))
            await ValidarMisturaAsync(cmd.ClassesReatividade, solicitante.Email);
        if (cmd.Descricao is not null) r.Descricao = cmd.Descricao;
        if (cmd.Tipo is not null) r.Tipo = cmd.Tipo;
        if (cmd.Volume is not null) r.Volume = cmd.Volume.Value;
        if (cmd.Unidade is not null) r.Unidade = cmd.Unidade;
        if (cmd.Composicao is not null) r.Composicao = cmd.Composicao;
        if (cmd.Risco is not null) r.Risco = cmd.Risco;
        if (cmd.Destino is not null) r.Destino = cmd.Destino;
        if (cmd.ClassesReatividade is not null) r.ClassesReatividade = cmd.ClassesReatividade.ToList();
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "residuo.atualizar", "Resíduos",
            $"Editou resíduo {id}", RiscoAuditoria.Low);
        return ToDto(r);
    }

    // RF06 — aprovação/rejeição de solicitação de descarte. Gate: só resíduos em "solicitado".
    // Aprovar move para o fluxo de coleta ("aguardando-coleta"); rejeitar encerra em "rejeitado".
    public async Task<ResiduoDto?> AprovarAsync(int id, Solicitante solicitante)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        GarantirEscopo(r, solicitante);
        if (r.Status != "solicitado")
            throw new ValidationException($"Só é possível aprovar resíduos com solicitação pendente (status atual: \"{r.Status}\").");
        r.Status = "aguardando-coleta";
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "residuo.aprovar", "Resíduos",
            $"Aprovou descarte do resíduo {id} — {r.Descricao}", RiscoAuditoria.Medium);
        return ToDto(r);
    }

    public async Task<ResiduoDto?> DesfazerAprovacaoAsync(int id, Solicitante solicitante)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        GarantirEscopo(r, solicitante);
        if (r.Status != "aguardando-coleta" || r.MtrId is not null)
            throw new ValidationException($"Só é possível desfazer a aprovação enquanto o resíduo aguarda coleta, antes de entrar num manifesto (status atual: \"{r.Status}\").");
        r.Status = "solicitado";
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "residuo.aprovacao-desfeita", "Resíduos",
            $"Desfez a aprovação do descarte do resíduo {id} — {r.Descricao}", RiscoAuditoria.Medium);
        return ToDto(r);
    }

    public async Task<ResiduoDto?> RejeitarAsync(int id, string? motivo, Solicitante solicitante)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        GarantirEscopo(r, solicitante);
        if (r.Status != "solicitado")
            throw new ValidationException($"Só é possível rejeitar resíduos com solicitação pendente (status atual: \"{r.Status}\").");
        var motivoInformado = motivo?.Trim() ?? "";
        if (motivoInformado.Length == 0)
            throw new ValidationException("Informe o motivo da rejeição: é ele que quem registrou o resíduo vê na lista.");
        if (motivoInformado.Length > Residuo.MaxMotivoRejeicao)
            throw new ValidationException($"O motivo da rejeição deve ter no máximo {Residuo.MaxMotivoRejeicao} caracteres.");
        r.Status = "rejeitado";
        r.MotivoRejeicao = motivoInformado;
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "residuo.rejeitar", "Resíduos",
            $"Rejeitou descarte do resíduo {id} — motivo: {motivoInformado}", RiscoAuditoria.Medium);
        return ToDto(r);
    }

    public async Task<ResiduosAnalyticsDto> AnalyticsAsync(int meses, Solicitante solicitante)
    {
        var corte = DateTime.UtcNow.AddMonths(-meses);
        var residuos = (await repo.GetAllAsync())
            .Where(r => r.DataRegistro >= corte)
            .Where(r => solicitante.VeTudo || solicitante.LaboratorioIds.Contains(r.LaboratorioId))
            .ToList();

        var labs = (await labRepo.GetAllAsync()).ToList();
        var nomePorId = labs.ToDictionary(l => l.Id, l => l.Nome);

        var mensal = residuos
            .GroupBy(r => r.DataRegistro.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var q = QuantidadeResiduos.Somar(g);
                return new MensalItem(g.Key, q.Litros, q.Quilos);
            })
            .ToList();

        var porLab = residuos
            .GroupBy(r => r.LaboratorioId)
            .Select(g =>
            {
                var q = QuantidadeResiduos.Somar(g);
                return new LabItem(nomePorId.TryGetValue(g.Key, out var nome) ? nome : g.Key, q.Litros, q.Quilos);
            })
            .OrderByDescending(x => x.Litros)
            .ThenByDescending(x => x.Quilos)
            .ToList();

        return new ResiduosAnalyticsDto(mensal, porLab);
    }

    private static ResiduoDto ToDto(Residuo r) =>
        new(r.Id, r.Descricao, r.LaboratorioId, r.MtrId, r.Status, r.DataRegistro,
            r.Tipo, r.Volume, r.Unidade, r.Composicao, r.Risco, r.Destino, r.ClassesReatividade, r.MotivoRejeicao);
}

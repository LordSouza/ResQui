using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Reagentes;

public class ReagentesService(IReagentesRepository repo, IAuditoriaService auditoria, Pdf.IPdfService pdf, IReagenteLotesRepository lotes, IVisibilidadeUsuarios visibilidade, ILaboratoriosRepository laboratorios) : IReagentesService
{
    public const string AutorDeOutroLaboratorio = "outro laboratório";

    // Movimentações = entradas de auditoria reagente.* cujo detail menciona o id (ids "R-00001" são únicos)
    public async Task<IEnumerable<Auditoria.AuditoriaItemDto>?> ListarMovimentacoesAsync(string id, Solicitante solicitante, int limite = 20)
    {
        if (await CarregarAsync(id, solicitante) is null) return null;
        var movimentacoes = (await auditoria.ListarAsync(
            new Auditoria.AuditoriaFiltroDto(What: "reagente.", Detail: id, Limite: limite))).ToList();

        var visiveis = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var autor in movimentacoes.Select(m => m.Who).Distinct(StringComparer.OrdinalIgnoreCase))
            visiveis[autor] = await visibilidade.EnxergaAutorAsync(solicitante, autor);

        return movimentacoes.Select(m => visiveis[m.Who] ? m : m with { Who = AutorDeOutroLaboratorio });
    }

    public async Task<byte[]?> GerarRotuloLoteAsync(string reagenteId, int loteId, Solicitante solicitante)
    {
        var r = await CarregarAsync(reagenteId, solicitante);
        var lote = await lotes.GetByIdAsync(loteId);
        if (r is null || lote is null || lote.ReagenteId != reagenteId) return null;
        var bytes = pdf.RotuloLote(r, lote);
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.lote.rotulo", "Inventário",
            $"Gerou etiqueta do lote {lote.Codigo} do reagente {r.Id}", RiscoAuditoria.Low);
        return bytes;
    }

    public async Task<IEnumerable<LoteDto>?> ListarLotesAsync(string reagenteId, Solicitante solicitante)
    {
        if (await CarregarAsync(reagenteId, solicitante) is null) return null;
        return (await lotes.GetByReagenteAsync(reagenteId)).Select(ToLoteDto);
    }

    public async Task<LoteDto?> CriarLoteAsync(string reagenteId, CriarLoteCmd cmd, Solicitante solicitante)
    {
        var r = await CarregarAsync(reagenteId, solicitante);
        if (r is null) return null;
        if (string.IsNullOrWhiteSpace(cmd.Codigo)) throw new ValidationException("Código do lote é obrigatório.");
        if (cmd.Estoque <= 0) throw new ValidationException("Estoque do lote deve ser maior que zero.");
        if (!DateOnly.TryParse(cmd.Validade, out var validade)) throw new ValidationException("Validade do lote inválida.");
        DateOnly? abertura = DateOnly.TryParse(cmd.Abertura, out var a) ? a : null;

        var lote = new ReagenteLote
        {
            ReagenteId = reagenteId,
            Codigo = cmd.Codigo,
            Estoque = cmd.Estoque,
            Validade = validade,
            Abertura = abertura,
        };
        await lotes.AddAsync(lote);
        r.Estoque += cmd.Estoque;
        await repo.UpdateAsync(r);
        await lotes.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.lote.criar", "Inventário",
            $"Registrou lote {lote.Codigo} ({cmd.Estoque} {r.Unidade}) do reagente {r.Id}", RiscoAuditoria.Low);
        return ToLoteDto(lote);
    }

    public async Task<LoteDto?> BaixaLoteAsync(string reagenteId, int loteId, BaixaCmd cmd, Solicitante solicitante)
    {
        var r = await CarregarAsync(reagenteId, solicitante);
        var lote = await lotes.GetByIdAsync(loteId);
        if (r is null || lote is null || lote.ReagenteId != reagenteId) return null;
        if (cmd.Quantidade <= 0) throw new ValidationException("Quantidade deve ser maior que zero.");
        if (cmd.Quantidade > lote.Estoque)
            throw new ValidationException($"Estoque insuficiente no lote {lote.Codigo}: disponível {lote.Estoque}, solicitado {cmd.Quantidade}.");
        if (cmd.Quantidade > r.Estoque)
            throw new ValidationException($"Estoque do reagente insuficiente: {r.Estoque} {r.Unidade} disponíveis, solicitado {cmd.Quantidade}, mas o lote {lote.Codigo} registra {lote.Estoque}. Os saldos estão descasados.");

        lote.Estoque = Math.Round(lote.Estoque - cmd.Quantidade, 3);
        r.Estoque = Math.Round(r.Estoque - cmd.Quantidade, 3);
        await lotes.UpdateAsync(lote);
        await repo.UpdateAsync(r);
        await lotes.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.lote.baixa", "Inventário",
            $"Baixa de {cmd.Quantidade} {r.Unidade} no lote {lote.Codigo} do reagente {r.Id}", RiscoAuditoria.Medium);
        return ToLoteDto(lote);
    }

    private static LoteDto ToLoteDto(ReagenteLote l)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        var status = l.Validade < hoje ? "vencido" : l.Validade <= hoje.AddDays(90) ? "vencendo" : "ok";
        return new LoteDto(l.Id, l.Codigo, l.Estoque,
            l.Validade.ToString("yyyy-MM-dd"), l.Abertura?.ToString("yyyy-MM-dd"), status);
    }

    public async Task<byte[]?> GerarRotuloAsync(string id, Solicitante solicitante)
    {
        var r = await CarregarAsync(id, solicitante);
        if (r is null) return null;
        var bytes = pdf.RotuloReagente(r);
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.rotulo", "Inventário",
            $"Gerou rótulo GHS do reagente {r.Id} — {r.Nome}", RiscoAuditoria.Low);
        return bytes;
    }

    public async Task<byte[]?> QrDoRotuloAsync(string id, Solicitante solicitante)
    {
        var r = await CarregarAsync(id, solicitante);
        return r is null ? null : QrCode.Png(r.Id);
    }

    public async Task<(IEnumerable<ReagenteListItemDto> Items, int Total)> ListarAsync(ReagentesFiltroDto filtro, Solicitante solicitante)
    {
        var all = (await repo.GetAllAsync()).Where(r => solicitante.Responde(r.LaboratorioId));

        if (!string.IsNullOrEmpty(filtro.Q))
        {
            var q = NormalizeSearch(filtro.Q);
            // "R-00001|L-x" é o conteúdo do QR da etiqueta de lote — busca pelo trecho antes do pipe
            var idBusca = filtro.Q.Split('|')[0].Trim();
            all = all.Where(r => NormalizeSearch(r.Nome).Contains(q, StringComparison.OrdinalIgnoreCase)
                              || r.Cas.Contains(filtro.Q)
                              || r.Id.Contains(idBusca, StringComparison.OrdinalIgnoreCase)
                              || (r.Sinonimo is not null && NormalizeSearch(r.Sinonimo).Contains(q, StringComparison.OrdinalIgnoreCase)));
        }

        if (filtro.Classe.HasValue)
            all = all.Where(r => r.ClasseReatividade == filtro.Classe.Value);

        if (filtro.Vencendo)
            all = all.Where(r => r.ValidadeStatus is "vencendo" or "vencido");

        var list = all.ToList();
        var total = list.Count;
        var items = list
            .Skip((filtro.Page - 1) * filtro.PageSize)
            .Take(filtro.PageSize)
            .Select(ToListItem);

        return (items, total);
    }

    public async Task<ReagenteDetalheDto?> ObterPorIdAsync(string id, Solicitante solicitante)
    {
        var r = await CarregarAsync(id, solicitante);
        return r is null ? null : ToDetalhe(r);
    }

    public async Task<ReagenteDetalheDto> CriarAsync(CriarReagenteCmd cmd, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nome)) throw new ValidationException("Nome é obrigatório.");
        if (cmd.Estoque < 0) throw new ValidationException("Estoque não pode ser negativo.");
        if (cmd.EstoqueMin is < 0) throw new ValidationException("Estoque mínimo não pode ser negativo.");
        if (cmd.ClasseReatividade is < 1 or > 12) throw new ValidationException("Classe de reatividade deve estar entre 1 e 12.");
        var validade = ParseValidade(cmd.Validade);
        var (laboratorio, armario) = await ResolverLocalAsync(cmd.LaboratorioId, cmd.Armario, solicitante);

        var r = new Reagente
        {
            Nome = cmd.Nome, Cas = cmd.Cas, Formula = cmd.Formula,
            Sinonimo = cmd.Sinonimo, ClasseReatividade = cmd.ClasseReatividade,
            Estoque = cmd.Estoque, EstoqueMin = cmd.EstoqueMin, Unidade = cmd.Unidade,
            Validade = validade ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            LaboratorioId = laboratorio.Id, Laboratorio = laboratorio, Armario = armario,
            Controlado = cmd.Controlado, Lote = cmd.Lote,
            Ghs = cmd.Ghs is null ? null : new ReagenteGhs
            {
                Pictos = cmd.Ghs.Pictos, Signal = cmd.Ghs.Signal,
                FrasesH = cmd.Ghs.FrasesH, FrasesP = cmd.Ghs.FrasesP
            }
        };
        await repo.AddAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.criar", "Inventário",
            $"Criou reagente {r.Id} — {r.Nome}", RiscoAuditoria.Low);
        return ToDetalhe(r);
    }

    public async Task<ImportarLoteResultDto> ImportarLoteAsync(IEnumerable<CriarReagenteCmd> cmds, Solicitante solicitante)
    {
        var lista = (cmds ?? Enumerable.Empty<CriarReagenteCmd>()).ToList();
        if (lista.Count == 0) throw new ValidationException("Nenhuma linha para importar.");

        var erros = new List<ErroLinhaDto>();
        var importados = 0;
        for (var i = 0; i < lista.Count; i++)
        {
            try
            {
                await CriarAsync(lista[i], solicitante);
                importados++;
            }
            catch (ValidationException ex)
            {
                erros.Add(new ErroLinhaDto(i, ex.Message));
            }
        }

        await auditoria.RegistrarAsync(solicitante.Email, "reagente.bulk-import", "Inventário",
            $"Importou {importados} reagente(s) em lote ({erros.Count} com erro)", RiscoAuditoria.Medium);

        return new ImportarLoteResultDto(lista.Count, importados, erros);
    }

    public async Task<ReagenteDetalheDto?> AtualizarAsync(string id, AtualizarReagenteCmd cmd, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nome)) throw new ValidationException("Nome é obrigatório.");
        if (cmd.Estoque < 0) throw new ValidationException("Estoque não pode ser negativo.");
        if (cmd.EstoqueMin is < 0) throw new ValidationException("Estoque mínimo não pode ser negativo.");

        var r = await CarregarAsync(id, solicitante);
        if (r is null) return null;
        var (laboratorio, armario) = MantemOLocal(r, cmd.LaboratorioId, cmd.Armario)
            ? (r.Laboratorio!, r.Armario)
            : await ResolverLocalAsync(cmd.LaboratorioId, cmd.Armario, solicitante);
        r.Nome = cmd.Nome; r.Estoque = cmd.Estoque; r.EstoqueMin = cmd.EstoqueMin;
        r.LaboratorioId = laboratorio.Id; r.Laboratorio = laboratorio; r.Armario = armario;
        if (ParseValidade(cmd.Validade) is { } validade) r.Validade = validade;
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.atualizar", "Inventário",
            $"Editou reagente {id}", RiscoAuditoria.Low);
        return ToDetalhe(r);
    }

    public async Task<bool> DeletarAsync(string id, Solicitante solicitante)
    {
        var r = await CarregarAsync(id, solicitante);
        if (r is null) return false;
        await repo.DeleteAsync(id);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.deletar", "Inventário",
            $"Removeu reagente {id}", RiscoAuditoria.High);
        return true;
    }

    public async Task<ReagenteDetalheDto?> BaixaAsync(string id, BaixaCmd cmd, Solicitante solicitante)
    {
        if (cmd.Quantidade <= 0) throw new ValidationException("Quantidade deve ser maior que zero.");
        var motivo = cmd.Motivo?.Trim();
        if (motivo?.Length > BaixaCmd.MaxMotivo)
            throw new ValidationException($"O motivo da baixa aceita até {BaixaCmd.MaxMotivo} caracteres.");
        var r = await CarregarAsync(id, solicitante);
        if (r is null) return null;
        if (cmd.Quantidade > r.Estoque)
            throw new ValidationException($"Estoque insuficiente: {r.Estoque} {r.Unidade} disponíveis.");
        r.Estoque = Math.Round(r.Estoque - cmd.Quantidade, 3);
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        var sufixoDoMotivo = string.IsNullOrEmpty(motivo) ? "" : $" · motivo: {motivo}";
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.baixa", "Inventário",
            $"Baixa de {cmd.Quantidade} {r.Unidade} de {r.Nome} (reagente {r.Id}){sufixoDoMotivo}", RiscoAuditoria.Medium);
        return ToDetalhe(r);
    }

    public async Task<ReagenteDetalheDto?> TransferirAsync(string id, TransferirReagenteCmd cmd, Solicitante solicitante)
    {
        var r = await CarregarAsync(id, solicitante);
        if (r is null) return null;
        var (laboratorio, armario) = await ResolverLocalAsync(cmd.LaboratorioId, cmd.Armario, solicitante);
        if (laboratorio.Id == r.LaboratorioId && armario == r.Armario)
            throw new ValidationException($"Reagente já está em {r.DescreverLocal()}.");

        var origem = r.DescreverLocal();
        r.LaboratorioId = laboratorio.Id; r.Laboratorio = laboratorio; r.Armario = armario;
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "reagente.transferencia", "Inventário",
            $"Transferiu {r.Nome} ({r.Id}) de {origem} para {r.DescreverLocal()}", RiscoAuditoria.Low);
        return ToDetalhe(r);
    }

    private async Task<Reagente?> CarregarAsync(string id, Solicitante solicitante)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        if (!solicitante.Responde(r.LaboratorioId))
            throw new AcessoNegadoException($"O reagente {id} é de um laboratório pelo qual você não responde.");
        return r;
    }

    private static bool MantemOLocal(Reagente r, string? laboratorioId, string? armario) =>
        r.Laboratorio is not null && r.LaboratorioId == laboratorioId && r.Armario == (armario ?? "").Trim();

    private async Task<(Laboratorio Laboratorio, string Armario)> ResolverLocalAsync(
        string? laboratorioId, string? armario, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(laboratorioId)) throw new ValidationException("Laboratório é obrigatório.");
        if (!solicitante.Responde(laboratorioId))
            throw new ValidationException($"Você não responde pelo laboratório {laboratorioId}.");
        var laboratorio = await laboratorios.GetByIdAsync(laboratorioId)
            ?? throw new ValidationException($"Laboratório {laboratorioId} não encontrado.");

        var armarioInformado = (armario ?? "").Trim();
        if (laboratorio.Armarios.Count == 0)
        {
            if (armarioInformado != "")
                throw new ValidationException($"O laboratório {laboratorio.Nome} não tem armários cadastrados.");
        }
        else if (!laboratorio.Armarios.Contains(armarioInformado))
        {
            throw new ValidationException(armarioInformado == ""
                ? $"Escolha um armário do laboratório {laboratorio.Nome}."
                : $"O armário {armarioInformado} não existe no laboratório {laboratorio.Nome}.");
        }
        return (laboratorio, armarioInformado);
    }

    private static DateOnly? ParseValidade(string? valor)
    {
        if (valor is null) return null;
        if (!DateOnly.TryParse(valor, out var data))
            throw new ValidationException("Data de validade inválida (use AAAA-MM-DD).");
        return data;
    }

    private static string NormalizeSearch(string s)
    {
        var normalized = s.Normalize(System.Text.NormalizationForm.FormD);
        return new string(normalized.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
            != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray());
    }

    private static ReagenteListItemDto ToListItem(Reagente r) => new(
        r.Id, r.Nome, r.Cas, r.Sinonimo, r.ClasseReatividade, r.Estoque, r.EstoqueMin, r.Unidade,
        r.Validade.ToString("yyyy-MM-dd"), r.ValidadeStatus, r.DescreverLocal(), r.LaboratorioId, r.Armario, r.Controlado,
        r.Ghs is null ? null : new GhsDto(r.Ghs.Pictos, r.Ghs.Signal, r.Ghs.FrasesH, r.Ghs.FrasesP));

    private static ReagenteDetalheDto ToDetalhe(Reagente r) => new(
        r.Id, r.Nome, r.Cas, r.Formula, r.Sinonimo, r.ClasseReatividade,
        r.Estoque, r.EstoqueMin, r.Unidade,
        r.Validade.ToString("yyyy-MM-dd"), r.ValidadeStatus,
        r.DescreverLocal(), r.LaboratorioId, r.Armario, r.Controlado,
        r.Lote, r.AberturaData?.ToString("yyyy-MM-dd"),
        r.Ghs is null ? null : new GhsDto(r.Ghs.Pictos, r.Ghs.Signal, r.Ghs.FrasesH, r.Ghs.FrasesP));
}

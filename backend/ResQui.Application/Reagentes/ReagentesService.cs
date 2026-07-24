using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Reagentes;

public class ReagentesService(IReagentesRepository repo, IAuditoriaService auditoria, Pdf.IPdfService pdf, IReagenteLotesRepository lotes) : IReagentesService
{
    // Movimentações = entradas de auditoria reagente.* cujo detail menciona o id (ids "R-00001" são únicos)
    public async Task<IEnumerable<Auditoria.AuditoriaItemDto>?> ListarMovimentacoesAsync(string id, int limite = 20)
    {
        if (await repo.GetByIdAsync(id) is null) return null;
        var entries = await auditoria.ListarAsync(new Auditoria.AuditoriaFiltroDto(What: "reagente."));
        return entries
            .Where(e => e.Detail.Contains(id, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(e => e.Timestamp)
            .Take(limite);
    }

    public async Task<byte[]?> GerarRotuloLoteAsync(string reagenteId, int loteId, string usuarioEmail)
    {
        var r = await repo.GetByIdAsync(reagenteId);
        var lote = await lotes.GetByIdAsync(loteId);
        if (r is null || lote is null || lote.ReagenteId != reagenteId) return null;
        var bytes = pdf.RotuloLote(r, lote);
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.lote.rotulo", "Inventário",
            $"Gerou etiqueta do lote {lote.Codigo} do reagente {r.Id}", RiscoAuditoria.Low);
        return bytes;
    }

    public async Task<IEnumerable<LoteDto>?> ListarLotesAsync(string reagenteId)
    {
        if (await repo.GetByIdAsync(reagenteId) is null) return null;
        return (await lotes.GetByReagenteAsync(reagenteId)).Select(ToLoteDto);
    }

    public async Task<LoteDto?> CriarLoteAsync(string reagenteId, CriarLoteCmd cmd, string usuarioEmail)
    {
        var r = await repo.GetByIdAsync(reagenteId);
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
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.lote.criar", "Inventário",
            $"Registrou lote {lote.Codigo} ({cmd.Estoque} {r.Unidade}) do reagente {r.Id}", RiscoAuditoria.Low);
        return ToLoteDto(lote);
    }

    public async Task<LoteDto?> BaixaLoteAsync(string reagenteId, int loteId, BaixaCmd cmd, string usuarioEmail)
    {
        var r = await repo.GetByIdAsync(reagenteId);
        var lote = await lotes.GetByIdAsync(loteId);
        if (r is null || lote is null || lote.ReagenteId != reagenteId) return null;
        if (cmd.Quantidade <= 0) throw new ValidationException("Quantidade deve ser maior que zero.");
        if (cmd.Quantidade > lote.Estoque)
            throw new ValidationException($"Estoque insuficiente no lote {lote.Codigo}: disponível {lote.Estoque}, solicitado {cmd.Quantidade}.");

        lote.Estoque -= cmd.Quantidade;
        r.Estoque = Math.Max(0, r.Estoque - cmd.Quantidade);
        await lotes.UpdateAsync(lote);
        await repo.UpdateAsync(r);
        await lotes.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.lote.baixa", "Inventário",
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

    public async Task<byte[]?> GerarRotuloAsync(string id, string usuarioEmail)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        var bytes = pdf.RotuloReagente(r);
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.rotulo", "Inventário",
            $"Gerou rótulo GHS do reagente {r.Id} — {r.Nome}", RiscoAuditoria.Low);
        return bytes;
    }

    public async Task<(IEnumerable<ReagenteListItemDto> Items, int Total)> ListarAsync(ReagentesFiltroDto filtro)
    {
        var all = (await repo.GetAllAsync()).AsEnumerable();

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

    public async Task<ReagenteDetalheDto?> ObterPorIdAsync(string id)
    {
        var r = await repo.GetByIdAsync(id);
        return r is null ? null : ToDetalhe(r);
    }

    public async Task<ReagenteDetalheDto> CriarAsync(CriarReagenteCmd cmd, string usuarioEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nome)) throw new ValidationException("Nome é obrigatório.");
        if (cmd.Estoque < 0) throw new ValidationException("Estoque não pode ser negativo.");
        if (cmd.EstoqueMin is < 0) throw new ValidationException("Estoque mínimo não pode ser negativo.");

        var r = new Reagente
        {
            Nome = cmd.Nome, Cas = cmd.Cas, Formula = cmd.Formula,
            Sinonimo = cmd.Sinonimo, ClasseReatividade = cmd.ClasseReatividade,
            Estoque = cmd.Estoque, EstoqueMin = cmd.EstoqueMin, Unidade = cmd.Unidade,
            Validade = cmd.Validade is not null ? DateOnly.Parse(cmd.Validade) : DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            Local = cmd.Local,
            Responsavel = cmd.Responsavel, Controlado = cmd.Controlado, Lote = cmd.Lote,
            Ghs = cmd.Ghs is null ? null : new ReagenteGhs
            {
                Pictos = cmd.Ghs.Pictos, Signal = cmd.Ghs.Signal,
                FrasesH = cmd.Ghs.FrasesH, FrasesP = cmd.Ghs.FrasesP
            }
        };
        await repo.AddAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.criar", "Inventário",
            $"Criou reagente {r.Id} — {r.Nome}", RiscoAuditoria.Low);
        return ToDetalhe(r);
    }

    public async Task<ImportarLoteResultDto> ImportarLoteAsync(IEnumerable<CriarReagenteCmd> cmds, string usuarioEmail)
    {
        var lista = (cmds ?? Enumerable.Empty<CriarReagenteCmd>()).ToList();
        if (lista.Count == 0) throw new ValidationException("Nenhuma linha para importar.");

        var erros = new List<ErroLinhaDto>();
        var importados = 0;
        for (var i = 0; i < lista.Count; i++)
        {
            try
            {
                await CriarAsync(lista[i], usuarioEmail);
                importados++;
            }
            catch (ValidationException ex)
            {
                erros.Add(new ErroLinhaDto(i, ex.Message));
            }
            catch (FormatException)
            {
                erros.Add(new ErroLinhaDto(i, "Data de validade inválida (use AAAA-MM-DD)."));
            }
        }

        await auditoria.RegistrarAsync(usuarioEmail, "reagente.bulk-import", "Inventário",
            $"Importou {importados} reagente(s) em lote ({erros.Count} com erro)", RiscoAuditoria.Medium);

        return new ImportarLoteResultDto(lista.Count, importados, erros);
    }

    public async Task<ReagenteDetalheDto?> AtualizarAsync(string id, AtualizarReagenteCmd cmd, string usuarioEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nome)) throw new ValidationException("Nome é obrigatório.");
        if (cmd.Estoque < 0) throw new ValidationException("Estoque não pode ser negativo.");
        if (cmd.EstoqueMin is < 0) throw new ValidationException("Estoque mínimo não pode ser negativo.");

        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        r.Nome = cmd.Nome; r.Estoque = cmd.Estoque; r.EstoqueMin = cmd.EstoqueMin;
        r.Local = cmd.Local; r.Responsavel = cmd.Responsavel;
        if (cmd.Validade is not null) r.Validade = DateOnly.Parse(cmd.Validade);
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.atualizar", "Inventário",
            $"Editou reagente {id}", RiscoAuditoria.Low);
        return ToDetalhe(r);
    }

    public async Task<bool> DeletarAsync(string id, string usuarioEmail)
    {
        var r = await repo.GetByIdAsync(id);
        if (r is null) return false;
        await repo.DeleteAsync(id);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.deletar", "Inventário",
            $"Removeu reagente {id}", RiscoAuditoria.High);
        return true;
    }

    public async Task<ReagenteDetalheDto?> BaixaAsync(string id, BaixaCmd cmd, string usuarioEmail)
    {
        if (cmd.Quantidade <= 0) throw new ValidationException("Quantidade deve ser maior que zero.");
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        if (cmd.Quantidade > r.Estoque)
            throw new ValidationException($"Estoque insuficiente: {r.Estoque} {r.Unidade} disponíveis.");
        r.Estoque = Math.Round(r.Estoque - cmd.Quantidade, 3);
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.baixa", "Inventário",
            $"Baixa de {cmd.Quantidade} {r.Unidade} de {r.Nome} (reagente {r.Id})", RiscoAuditoria.Medium);
        return ToDetalhe(r);
    }

    public async Task<ReagenteDetalheDto?> TransferirAsync(string id, TransferirReagenteCmd cmd, string usuarioEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.Destino)) throw new ValidationException("Destino é obrigatório.");
        var destino = cmd.Destino.Trim();
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        if (destino == r.Local) throw new ValidationException($"Reagente já está em {destino}.");

        var origem = r.Local;
        r.Local = destino;
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.transferencia", "Inventário",
            $"Transferiu {r.Nome} ({r.Id}) de {origem} para {destino}", RiscoAuditoria.Low);
        return ToDetalhe(r);
    }

    private static string NormalizeSearch(string s)
    {
        var normalized = s.Normalize(System.Text.NormalizationForm.FormD);
        return new string(normalized.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
            != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray());
    }

    private static ReagenteListItemDto ToListItem(Reagente r) => new(
        r.Id, r.Nome, r.Cas, r.ClasseReatividade, r.Estoque, r.Unidade,
        r.ValidadeStatus, r.Local, r.Controlado);

    private static ReagenteDetalheDto ToDetalhe(Reagente r) => new(
        r.Id, r.Nome, r.Cas, r.Formula, r.Sinonimo, r.ClasseReatividade,
        r.Estoque, r.EstoqueMin, r.Unidade,
        r.Validade.ToString("yyyy-MM-dd"), r.ValidadeStatus,
        r.Local, r.Responsavel, r.Controlado,
        r.Lote, r.AberturaData?.ToString("yyyy-MM-dd"),
        r.Ghs is null ? null : new GhsDto(r.Ghs.Pictos, r.Ghs.Signal, r.Ghs.FrasesH, r.Ghs.FrasesP));
}

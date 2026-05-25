using ResQui.Application.Auditoria;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Reagentes;

public class ReagentesService(IReagentesRepository repo, IAuditoriaService auditoria) : IReagentesService
{
    public async Task<(IEnumerable<ReagenteListItemDto> Items, int Total)> ListarAsync(ReagentesFiltroDto filtro)
    {
        var all = (await repo.GetAllAsync()).AsEnumerable();

        if (!string.IsNullOrEmpty(filtro.Q))
        {
            var q = NormalizeSearch(filtro.Q);
            all = all.Where(r => NormalizeSearch(r.Nome).Contains(q, StringComparison.OrdinalIgnoreCase)
                              || r.Cas.Contains(filtro.Q)
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

    public async Task<ReagenteDetalheDto?> AtualizarAsync(string id, AtualizarReagenteCmd cmd, string usuarioEmail)
    {
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
        var r = await repo.GetByIdAsync(id);
        if (r is null) return null;
        r.Estoque = Math.Max(0, Math.Round(r.Estoque - cmd.Quantidade, 3));
        await repo.UpdateAsync(r);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "reagente.baixa", "Inventário",
            $"Baixa de {cmd.Quantidade} {r.Unidade} de {r.Nome}", RiscoAuditoria.Medium);
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

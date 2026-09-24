// backend/ResQui.Application/Relatorios/RelatoriosService.cs
using System.Globalization;
using System.Text;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Relatorios;

public class RelatoriosService(
    IRelatoriosRepository relatoriosRepo,
    IReagentesRepository reagentesRepo,
    IResiduosRepository residuosRepo,
    IMtrsRepository mtrsRepo,
    ILaboratoriosRepository laboratoriosRepo,
    IPgrsConfigRepository pgrsConfigRepo) : IRelatoriosService
{
    private static readonly Dictionary<string, string> Titulos = new()
    {
        ["pgrs"]           = "PGRS Anual",
        ["inventario"]     = "Inventário de reagentes",
        ["residuos-ibama"] = "Resíduos por código IBAMA",
        ["mapa-risco"]     = "Mapa de risco químico",
        ["indicadores"]    = "Indicadores de geração",
    };

    public async Task<IEnumerable<RelatorioGeradoDto>> ListarAsync() =>
        (await relatoriosRepo.GetAllAsync()).Select(ToDto);

    public async Task<RelatorioGeradoDto> GerarAsync(GerarRelatorioCmd cmd, string? userId)
    {
        if (cmd.Tipo is null || !Titulos.TryGetValue(cmd.Tipo, out var titulo))
            throw new ValidationException($"Tipo de relatório desconhecido: {cmd.Tipo}.");
        var (csv, totalLinhas) = await GerarCsvAsync(cmd.Tipo);

        var r = new RelatorioGerado
        {
            Tipo = cmd.Tipo,
            Titulo = titulo,
            GeradoPorId = userId,
            TotalLinhas = totalLinhas,
            Formato = "csv",
        };
        await relatoriosRepo.AddAsync(r);
        await relatoriosRepo.SaveChangesAsync();
        return ToDto(r);
    }

    public async Task<(string Csv, string Filename)?> DownloadAsync(int id)
    {
        var r = await relatoriosRepo.GetByIdAsync(id);
        if (r is null) return null;
        // O histórico pode conter tipos que saíram do catálogo: baixar um deles é 404, não 500.
        if (!Titulos.ContainsKey(r.Tipo)) return null;
        var (csv, _) = await GerarCsvAsync(r.Tipo);
        var safeName = r.Titulo.Replace(' ', '-').ToLowerInvariant();
        return (csv, $"{safeName}.csv");
    }

    // ---------------------------------------------------------------
    // CSV generation
    // ---------------------------------------------------------------

    private async Task<(string Csv, int TotalLinhas)> GerarCsvAsync(string tipo) => tipo switch
    {
        "inventario"      => await GerarInventarioCsvAsync(),
        "mapa-risco"      => await GerarMapaRiscoCsvAsync(),
        "residuos-ibama"  => await GerarResiduosIbamaCsvAsync(),
        "indicadores"     => await GerarIndicadoresCsvAsync(),
        "pgrs"            => await GerarPgrsCsvAsync(),
        _                 => throw new ArgumentException($"Tipo desconhecido: {tipo}"),
    };

    private async Task<(string Csv, int TotalLinhas)> GerarInventarioCsvAsync()
    {
        var reagentes = (await reagentesRepo.GetAllAsync()).OrderBy(r => r.Nome).ToList();
        var sb = new StringBuilder();
        sb.AppendLine("Id,Nome,Local,Responsavel,Estoque,EstoqueMin,Validade,Classe,Status");
        foreach (var r in reagentes)
            sb.AppendLine($"{r.Id},{Esc(r.Nome)},{Esc(r.Local)},{Esc(r.Responsavel)}," +
                          $"{r.Estoque.ToString("F3", CultureInfo.InvariantCulture)}," +
                          $"{r.EstoqueMin?.ToString("F3", CultureInfo.InvariantCulture)}," +
                          $"{r.Validade:yyyy-MM-dd},{r.ClasseReatividade},{r.ValidadeStatus}");
        return (sb.ToString(), reagentes.Count);
    }

    private async Task<(string Csv, int TotalLinhas)> GerarMapaRiscoCsvAsync()
    {
        var reagentes = (await reagentesRepo.GetAllAsync())
            .OrderBy(r => r.ClasseReatividade).ThenBy(r => r.Nome).ToList();
        var sb = new StringBuilder();
        sb.AppendLine("Classe,Nome,Sinal GHS,Pictogramas,Estoque,Local");
        foreach (var r in reagentes)
        {
            var signal = r.Ghs?.Signal ?? "";
            var pictos = r.Ghs?.Pictos is { Count: > 0 } p ? string.Join("|", p) : "";
            sb.AppendLine($"{r.ClasseReatividade},{Esc(r.Nome)},{Esc(signal)},{Esc(pictos)}," +
                          $"{r.Estoque.ToString("F3", CultureInfo.InvariantCulture)},{Esc(r.Local)}");
        }
        return (sb.ToString(), reagentes.Count);
    }

    private async Task<(string Csv, int TotalLinhas)> GerarResiduosIbamaCsvAsync()
    {
        var residuos = (await residuosRepo.GetAllAsync()).ToList();
        var mtrs = (await mtrsRepo.GetAllAsync()).ToDictionary(m => m.Id);
        var labs = await BuildLabDictAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Cod. IBAMA,Descricao,Tipo,Volume,Unidade,Laboratorio,Data Registro,Status,Nr MTR");
        foreach (var r in residuos.OrderBy(r => r.DataRegistro))
        {
            var mtr = r.MtrId.HasValue && mtrs.TryGetValue(r.MtrId.Value, out var m) ? m : null;
            var ibama = mtr?.CodigoIbama ?? "";
            var nrMtr = mtr?.Numero ?? "";
            var lab = labs.TryGetValue(r.LaboratorioId, out var nome) ? nome : r.LaboratorioId;
            sb.AppendLine($"{Esc(ibama)},{Esc(r.Descricao)},{Esc(r.Tipo)}," +
                          $"{r.Volume.ToString("F3", CultureInfo.InvariantCulture)},{Esc(r.Unidade)}," +
                          $"{Esc(lab)},{r.DataRegistro:yyyy-MM-dd},{Esc(r.Status)},{Esc(nrMtr)}");
        }
        return (sb.ToString(), residuos.Count);
    }

    private async Task<(string Csv, int TotalLinhas)> GerarManifestosCsvAsync()
    {
        var mtrs = (await mtrsRepo.GetAllAsync())
            .OrderBy(m => m.DataEmissao)
            .ToList();
        var residuos = (await residuosRepo.GetAllAsync()).ToList();
        var sb = new StringBuilder();
        sb.AppendLine("Nr MTR,Gerador,Transportadora,Destinador,Cod. IBAMA,Data Emissao,Total (L),Total (kg)");
        foreach (var m in mtrs)
        {
            var q = QuantidadeResiduos.Somar(residuos.Where(r => r.MtrId == m.Id));
            sb.AppendLine($"{Esc(m.Numero)},{Esc(m.Gerador)},{Esc(m.Transportadora)},{Esc(m.Destinador)}," +
                          $"{Esc(m.CodigoIbama)},{m.DataEmissao:yyyy-MM-dd}," +
                          $"{q.Litros.ToString("F3", CultureInfo.InvariantCulture)}," +
                          $"{q.Quilos.ToString("F3", CultureInfo.InvariantCulture)}");
        }
        return (sb.ToString(), mtrs.Count);
    }

    private async Task<(string Csv, int TotalLinhas)> GerarIndicadoresCsvAsync()
    {
        var residuos = (await residuosRepo.GetAllAsync())
            .Where(r => r.DataRegistro >= DateTime.UtcNow.AddMonths(-12))
            .ToList();
        var labs = await BuildLabDictAsync();

        var mensal = residuos
            .GroupBy(r => r.DataRegistro.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .Select(g => (Mes: g.Key, Quantidade: QuantidadeResiduos.Somar(g)))
            .ToList();

        var porLab = residuos
            .GroupBy(r => r.LaboratorioId)
            .Select(g => (
                Lab: labs.TryGetValue(g.Key, out var n) ? n : g.Key,
                Quantidade: QuantidadeResiduos.Somar(g)))
            .OrderByDescending(x => x.Quantidade.Litros)
            .ThenByDescending(x => x.Quantidade.Quilos)
            .ToList();

        var sb = new StringBuilder();
        sb.AppendLine("Mes,Total (L),Total (kg)");
        foreach (var (mes, q) in mensal)
            sb.AppendLine($"{mes},{q.Litros.ToString("F3", CultureInfo.InvariantCulture)},{q.Quilos.ToString("F3", CultureInfo.InvariantCulture)}");
        sb.AppendLine();
        sb.AppendLine("Laboratorio,Total (L),Total (kg)");
        foreach (var (lab, q) in porLab)
            sb.AppendLine($"{Esc(lab)},{q.Litros.ToString("F3", CultureInfo.InvariantCulture)},{q.Quilos.ToString("F3", CultureInfo.InvariantCulture)}");

        return (sb.ToString(), mensal.Count + porLab.Count);
    }

    private async Task<(string Csv, int TotalLinhas)> GerarPgrsCsvAsync()
    {
        var sb = new StringBuilder();
        var total = 0;

        var ident = await GerarIdentificacaoCsvAsync();
        if (ident.TotalLinhas > 0)
        {
            sb.AppendLine("# IDENTIFICACAO"); sb.Append(ident.Csv); total += ident.TotalLinhas;
        }

        var inv = await GerarInventarioCsvAsync();
        sb.AppendLine("# INVENTARIO"); sb.Append(inv.Csv); total += inv.TotalLinhas;

        var risco = await GerarMapaRiscoCsvAsync();
        sb.AppendLine("# MAPA-RISCO"); sb.Append(risco.Csv); total += risco.TotalLinhas;

        var ibama = await GerarResiduosIbamaCsvAsync();
        sb.AppendLine("# RESIDUOS-IBAMA"); sb.Append(ibama.Csv); total += ibama.TotalLinhas;

        var manifestos = await GerarManifestosCsvAsync();
        sb.AppendLine("# MANIFESTOS"); sb.Append(manifestos.Csv); total += manifestos.TotalLinhas;

        var ind = await GerarIndicadoresCsvAsync();
        sb.AppendLine("# INDICADORES"); sb.Append(ind.Csv); total += ind.TotalLinhas;

        return (sb.ToString(), total);
    }

    private async Task<(string Csv, int TotalLinhas)> GerarIdentificacaoCsvAsync()
    {
        var cfg = await pgrsConfigRepo.GetAsync();
        if (cfg is null) return ("", 0);

        var campos = new (string Rotulo, string Valor)[]
        {
            ("Razao social", cfg.RazaoSocial),
            ("CNPJ", cfg.Cnpj),
            ("Endereco", cfg.Endereco),
            ("Unidade geradora", cfg.Unidade),
            ("Responsavel tecnico", cfg.RespTecnico),
            ("Registro CRQ", cfg.RespCrq),
            ("E-mail do responsavel", cfg.RespEmail),
            ("Telefone do responsavel", cfg.RespTel),
        };

        var preenchidos = campos.Where(c => !string.IsNullOrWhiteSpace(c.Valor)).ToList();
        if (preenchidos.Count == 0) return ("", 0);

        var sb = new StringBuilder();
        sb.AppendLine("Campo,Valor");
        foreach (var (rotulo, valor) in preenchidos) sb.AppendLine($"{Esc(rotulo)},{Esc(valor)}");
        sb.AppendLine();
        return (sb.ToString(), preenchidos.Count);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private async Task<Dictionary<string, string>> BuildLabDictAsync()
    {
        var labs = await laboratoriosRepo.GetAllAsync();
        return labs.ToDictionary(l => l.Id, l => l.Nome);
    }

    private static string Esc(string? s)
    {
        if (s is null) return "";
        if (s.Contains(',') || s.Contains('"') || s.Contains('\n'))
            return $"\"{s.Replace("\"", "\"\"")}\"";
        return s;
    }

    private static RelatorioGeradoDto ToDto(RelatorioGerado r) =>
        new(r.Id, r.Tipo, r.Titulo, r.GeradoEm, r.GeradoPorId, r.TotalLinhas, r.Formato);
}

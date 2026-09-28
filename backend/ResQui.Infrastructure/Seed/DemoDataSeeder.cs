using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Infrastructure.Data;

namespace ResQui.Infrastructure.Seed;

public static class DemoDataSeeder
{
    // Chaves de pictograma legadas (PT) → canônicas (usadas por Picto, PICTOS_GHS e PdfService)
    private static readonly Dictionary<string, string> PictoLegado = new()
    {
        ["inflamavel"] = "flame",
        ["corrosivo"] = "corrosion",
        ["exclamacao"] = "exclam",
        ["oxidante"] = "flame_circle",
        ["toxico"] = "skull",
        ["saude"] = "health",
        ["ambiente"] = "envir",
        ["explosivo"] = "explosion",
        ["gas"] = "bottle",
    };

    public static async Task SeedAsync(AppDbContext db, string adminId)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);

        await NormalizarPictogramasAsync(db);

        if (!await db.Laboratorios.AnyAsync())
        {
            db.Laboratorios.AddRange(
                new Laboratorio { Nome = "Química Analítica", Responsavel = "Profa. Ana Lima", Sala = "Bloco IMC · 2º andar · Sala 201", Armarios = ["Armário A", "Armário B"], Cor = "#1465c0", Criado = hoje.AddMonths(-8) },
                new Laboratorio { Nome = "Síntese Orgânica", Responsavel = "Prof. Renan Costa", Sala = "Bloco IMC · 2º andar · Sala 203", Armarios = ["Armário C"], Cor = "#0d9457", Criado = hoje.AddMonths(-6) },
                new Laboratorio { Nome = "Físico-Química", Responsavel = "Profa. Júlia Mendes", Sala = "Bloco IMC · 3º andar · Sala 205", Armarios = ["Armário A"], Cor = "#b3551c", Criado = hoje.AddMonths(-4) });
            await db.SaveChangesAsync();
        }

        var labIds = (await db.Laboratorios.AsNoTracking().ToListAsync())
            .Select(l => l.Id).OrderBy(id => id).ToList();
        if (labIds.Count < 3) return; // labs insuficientes — não criar dados dependentes
        var lab1 = labIds[0];
        var lab2 = labIds[1];
        var lab3 = labIds[2];

        if (!await db.Reagentes.AnyAsync())
        {
            db.Reagentes.AddRange(
                Reag("Ácido clorídrico 37%", "7647-01-0", "HCl", 1, 2.5m, 1m, "L", hoje.AddMonths(14), lab1, "Armário A", true, ["corrosion"], "Perigo", ["H314", "H335"], ["P280", "P303+P361+P353"]),
                Reag("Hidróxido de sódio P.A.", "1310-73-2", "NaOH", 3, 800m, 200m, "g", hoje.AddMonths(20), lab1, "Armário B", false, ["corrosion"], "Perigo", ["H314"], ["P280"]),
                Reag("Etanol absoluto", "64-17-5", "C2H6O", 5, 8m, 2m, "L", hoje.AddMonths(10), lab2, "Armário C", false, ["flame"], "Perigo", ["H225"], ["P210"]),
                Reag("Acetona P.A.", "67-64-1", "C3H6O", 5, 4m, 1m, "L", hoje.AddMonths(9), lab2, "Armário C", false, ["flame", "exclam"], "Perigo", ["H225", "H319"], ["P210", "P305+P351+P338"]),
                Reag("Peróxido de hidrogênio 30%", "7722-84-1", "H2O2", 4, 1.5m, 0.5m, "L", hoje.AddDays(20), lab1, "Armário A", false, ["flame_circle", "corrosion"], "Perigo", ["H271", "H314"], ["P280", "P210"]),
                Reag("Metanol P.A.", "67-56-1", "CH4O", 5, 5m, 1m, "L", hoje.AddDays(25), lab3, "Armário A", true, ["flame", "skull"], "Perigo", ["H225", "H301"], ["P210", "P280"]),
                Reag("Ácido sulfúrico 98%", "7664-93-9", "H2SO4", 1, 0.4m, 1m, "L", hoje.AddMonths(16), lab1, "Armário A", true, ["corrosion"], "Perigo", ["H314"], ["P280"]),
                Reag("Nitrato de prata", "7761-88-8", "AgNO3", 4, 20m, 50m, "g", hoje.AddMonths(22), lab3, "Armário A", true, ["flame_circle", "corrosion"], "Perigo", ["H272", "H314"], ["P210", "P280"]),
                Reag("Tolueno P.A.", "108-88-3", "C7H8", 5, 2m, 0.5m, "L", hoje.AddMonths(7), lab2, "Armário C", false, ["flame", "health"], "Perigo", ["H225", "H361d"], ["P210", "P280"]),
                Reag("Cloreto de potássio", "7447-40-7", "KCl", 7, 500m, 100m, "g", hoje.AddMonths(30), lab1, "Armário B", false, [], "Atenção", [], []));
            await db.SaveChangesAsync();
        }

        if (!await db.Mtrs.AnyAsync())
        {
            db.Mtrs.AddRange(
                new Mtr { Gerador = "Unifei", Transportadora = "EcoLog Transportes", Destinador = "EcoQuímica SA", CodigoIbama = "16 05 06*", ResponsavelId = adminId, DataEmissao = DateTime.UtcNow.AddDays(-5) },
                new Mtr { Gerador = "Unifei", Transportadora = "CleanWaste", Destinador = "Resitec Ambiental", CodigoIbama = "16 05 06*", ResponsavelId = adminId, DataEmissao = DateTime.UtcNow.AddDays(-20) });
            await db.SaveChangesAsync();
        }

        if (!await db.Residuos.AnyAsync())
        {
            var mtrIds = await db.Mtrs.AsNoTracking().OrderBy(m => m.Id).Select(m => m.Id).ToListAsync();
            var mtr1 = mtrIds.ElementAtOrDefault(0);
            db.Residuos.AddRange(
                new Residuo { Descricao = "Solvente halogenado usado", LaboratorioId = lab2, Tipo = "Solventes halogenados", Volume = 5m, Unidade = "L", Composicao = "60% diclorometano + 40% clorofórmio", Risco = "alto", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-10), ClassesReatividade = [6] },
                new Residuo { Descricao = "Mistura ácida de limpeza", LaboratorioId = lab1, Tipo = "Ácidos inorgânicos", Volume = 2m, Unidade = "L", Composicao = "HCl diluído + água de lavagem", Risco = "medio", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-3), ClassesReatividade = [1] },
                new Residuo { Descricao = "Acetona de lavagem", LaboratorioId = lab2, Tipo = "Solventes orgânicos não-halogenados", Volume = 8m, Unidade = "L", Composicao = "85% acetona + resíduos orgânicos", Risco = "medio", Status = "solicitado", DataRegistro = DateTime.UtcNow.AddDays(-1), ClassesReatividade = [5] },
                new Residuo { Descricao = "Sais de prata", LaboratorioId = lab3, Tipo = "Metais pesados", Volume = 300m, Unidade = "g", Composicao = "AgCl precipitado", Risco = "alto", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-2), ClassesReatividade = [7] },
                new Residuo { Descricao = "Solvente em coleta", LaboratorioId = lab2, Tipo = "Solventes orgânicos não-halogenados", Volume = 4m, Unidade = "L", Composicao = "etanol + acetato de etila", Risco = "baixo", Status = "em-coleta", MtrId = mtr1 == 0 ? null : mtr1, DataRegistro = DateTime.UtcNow.AddDays(-12), ClassesReatividade = [5] },
                new Residuo { Descricao = "Vidraria contaminada", LaboratorioId = lab1, Tipo = "Vidraria contaminada", Volume = 2.5m, Unidade = "kg", Composicao = "vidro + resíduos de ácidos", Risco = "medio", Status = "em-coleta", MtrId = mtr1 == 0 ? null : mtr1, DataRegistro = DateTime.UtcNow.AddDays(-15), ClassesReatividade = [1] });
            await db.SaveChangesAsync();
        }

        if (!await db.ReagenteLotes.AnyAsync())
        {
            var reagentes = await db.Reagentes.AsNoTracking().OrderBy(r => r.Id).Take(3).ToListAsync();
            foreach (var r in reagentes)
            {
                var metade = Math.Round(r.Estoque / 2, 2);
                db.ReagenteLotes.AddRange(
                    new ReagenteLote { ReagenteId = r.Id, Codigo = $"L-{r.Id}-A", Estoque = metade, Validade = r.Validade, Abertura = hoje.AddMonths(-1) },
                    new ReagenteLote { ReagenteId = r.Id, Codigo = $"L-{r.Id}-B", Estoque = r.Estoque - metade, Validade = r.Validade.AddMonths(6) });
            }
            await db.SaveChangesAsync();
        }

        if (!await db.ConfiguracaoPgrs.AnyAsync())
        {
            // Valores deliberadamente fictícios — não usar dados de instituição ou pessoa reais.
            db.ConfiguracaoPgrs.Add(new ConfiguracaoPgrs
            {
                Id = 1,
                RazaoSocial = "Instituição Demo de Ensino",
                Cnpj = "00.000.000/0001-00",
                Endereco = "Rua Demonstração, 100 · Cidade Demo/UF",
                Unidade = "Instituto Demo",
                RespTecnico = "Responsável Técnico Demo",
                RespCrq = "CRQ-00000",
                RespEmail = "demo@resqui.local",
                RespTel = "(00) 0000-0000",
                GeradorPadrao = "Instituição Demo de Ensino",
                TransportadorPadrao = "Transportadora Demo Ltda",
                DestinadorPadrao = "Destinadora Demo SA",
                CodigoIbamaPadrao = "16 05 06*",
            });
            await db.SaveChangesAsync();
        }
    }

    private static Reagente Reag(string nome, string cas, string formula, int classe, decimal estoque, decimal estoqueMin, string unidade, DateOnly validade, string laboratorioId, string armario, bool controlado, List<string> pictos, string signal, List<string> frasesH, List<string> frasesP) => new()
    {
        Nome = nome, Cas = cas, Formula = formula, ClasseReatividade = classe,
        Estoque = estoque, EstoqueMin = estoqueMin, Unidade = unidade, Validade = validade,
        LaboratorioId = laboratorioId, Armario = armario, Controlado = controlado,
        Ghs = new ReagenteGhs { Pictos = pictos, Signal = signal, FrasesH = frasesH, FrasesP = frasesP },
    };

    // Corrige reagentes já gravados com chaves de pictograma em português (idempotente)
    private static async Task NormalizarPictogramasAsync(AppDbContext db)
    {
        if (!await db.ReagentesGhs.AnyAsync()) return;
        var ghsList = await db.ReagentesGhs.ToListAsync();
        var alterou = false;
        foreach (var ghs in ghsList)
        {
            if (ghs.Pictos.Any(p => PictoLegado.ContainsKey(p)))
            {
                ghs.Pictos = ghs.Pictos.Select(p => PictoLegado.GetValueOrDefault(p, p)).ToList();
                alterou = true;
            }
        }
        if (alterou) await db.SaveChangesAsync();
    }
}

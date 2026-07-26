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
                new Laboratorio { Nome = "Química Analítica", Responsavel = "Profa. Ana Lima", Email = "ana.lima@instituto.example", Sala = "Bloco IMC · 2º andar · Sala 201", Armarios = ["Armário A", "Armário B"], Areas = ["Análise instrumental", "Cromatografia"], Capacidade = 30, AreaM2 = 55m, Ventilacao = "capela + exaustão", Cor = "#1465c0", Criado = hoje.AddMonths(-8) },
                new Laboratorio { Nome = "Síntese Orgânica", Responsavel = "Prof. Renan Costa", Email = "renan.costa@instituto.example", Sala = "Bloco IMC · 2º andar · Sala 203", Armarios = ["Armário C"], Areas = ["Síntese", "Purificação"], Capacidade = 20, AreaM2 = 42m, Ventilacao = "capela", Cor = "#0d9457", Criado = hoje.AddMonths(-6) },
                new Laboratorio { Nome = "Físico-Química", Responsavel = "Profa. Júlia Mendes", Email = "julia.mendes@instituto.example", Sala = "Bloco IMC · 3º andar · Sala 205", Armarios = ["Armário A"], Areas = ["Eletroquímica"], Capacidade = 15, AreaM2 = 38m, Ventilacao = "exaustão", Cor = "#b3551c", Criado = hoje.AddMonths(-4) });
            await db.SaveChangesAsync();
        }

        var labSeqs = (await db.Laboratorios.AsNoTracking().ToListAsync())
            .Select(l => ParseSeq(l.Id)).Where(s => s > 0).OrderBy(s => s).ToList();
        var lab1 = labSeqs.ElementAtOrDefault(0); // primeiro lab (ex.: Lab-001 → 1)
        var lab2 = labSeqs.ElementAtOrDefault(1);
        var lab3 = labSeqs.ElementAtOrDefault(2);
        if (labSeqs.Count < 3) return; // labs insuficientes — não criar dados dependentes com referência inválida

        if (!await db.Reagentes.AnyAsync())
        {
            db.Reagentes.AddRange(
                Reag("Ácido clorídrico 37%", "7647-01-0", "HCl", 1, 2.5m, 1m, "L", hoje.AddMonths(14), "Lab-201 · Armário A · Pra. 1", "Ana Lima", true, ["corrosion"], "Perigo", ["H314", "H335"], ["P280", "P303+P361+P353"]),
                Reag("Hidróxido de sódio P.A.", "1310-73-2", "NaOH", 2, 800m, 200m, "g", hoje.AddMonths(20), "Lab-201 · Armário B · Pra. 2", "Ana Lima", false, ["corrosion"], "Perigo", ["H314"], ["P280"]),
                Reag("Etanol absoluto", "64-17-5", "C2H6O", 3, 8m, 2m, "L", hoje.AddMonths(10), "Lab-203 · Armário C · Pra. 1", "Renan Costa", false, ["flame"], "Perigo", ["H225"], ["P210"]),
                Reag("Acetona P.A.", "67-64-1", "C3H6O", 3, 4m, 1m, "L", hoje.AddMonths(9), "Lab-203 · Armário C · Pra. 2", "Renan Costa", false, ["flame", "exclam"], "Perigo", ["H225", "H319"], ["P210", "P305+P351+P338"]),
                Reag("Peróxido de hidrogênio 30%", "7722-84-1", "H2O2", 4, 1.5m, 0.5m, "L", hoje.AddDays(20), "Lab-201 · Armário A · Pra. 3", "Ana Lima", false, ["flame_circle", "corrosion"], "Perigo", ["H271", "H314"], ["P280", "P210"]),
                Reag("Metanol P.A.", "67-56-1", "CH4O", 3, 5m, 1m, "L", hoje.AddDays(25), "Lab-205 · Armário A · Pra. 1", "Júlia Mendes", true, ["flame", "skull"], "Perigo", ["H225", "H301"], ["P210", "P280"]),
                Reag("Ácido sulfúrico 98%", "7664-93-9", "H2SO4", 1, 0.4m, 1m, "L", hoje.AddMonths(16), "Lab-201 · Armário A · Pra. 2", "Ana Lima", true, ["corrosion"], "Perigo", ["H314"], ["P280"]),
                Reag("Nitrato de prata", "7761-88-8", "AgNO3", 4, 20m, 50m, "g", hoje.AddMonths(22), "Lab-205 · Armário A · Pra. 2", "Júlia Mendes", true, ["flame_circle", "corrosion"], "Perigo", ["H272", "H314"], ["P210", "P280"]),
                Reag("Tolueno P.A.", "108-88-3", "C7H8", 3, 2m, 0.5m, "L", hoje.AddMonths(7), "Lab-203 · Armário C · Pra. 3", "Renan Costa", false, ["flame", "health"], "Perigo", ["H225", "H361d"], ["P210", "P280"]),
                Reag("Cloreto de potássio", "7447-40-7", "KCl", 12, 500m, 100m, "g", hoje.AddMonths(30), "Lab-209 · Armário B · Pra. 3", "Júlia Mendes", false, [], "Atenção", [], []));
            await db.SaveChangesAsync();
        }

        if (!await db.Mtrs.AnyAsync())
        {
            db.Mtrs.AddRange(
                new Mtr { Numero = "MTR-2026-1101", Gerador = "Unifei", Transportadora = "EcoLog Transportes", Destinador = "EcoQuímica SA", CodigoIbama = "A099", ResponsavelId = adminId, Status = MtrStatus.Rascunho, DataEmissao = DateTime.UtcNow.AddDays(-5), Massa = 6.5m },
                new Mtr { Numero = "MTR-2026-1102", Gerador = "Unifei", Transportadora = "CleanWaste", Destinador = "Resitec Ambiental", CodigoIbama = "A104", ResponsavelId = adminId, Status = MtrStatus.AceitoSinir, DataEmissao = DateTime.UtcNow.AddDays(-20), Massa = 12.3m });
            await db.SaveChangesAsync();
        }

        if (!await db.Residuos.AnyAsync())
        {
            var mtrIds = await db.Mtrs.AsNoTracking().OrderBy(m => m.Id).Select(m => m.Id).ToListAsync();
            var mtr1 = mtrIds.ElementAtOrDefault(0);
            db.Residuos.AddRange(
                new Residuo { Descricao = "Solvente halogenado usado", LaboratorioId = lab2, Tipo = "Solventes halogenados", Volume = 5m, Unidade = "L", Composicao = "60% diclorometano + 40% clorofórmio", Risco = "alto", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-10), ClassesReatividade = [6] },
                new Residuo { Descricao = "Mistura ácida de limpeza", LaboratorioId = lab1, Tipo = "Ácidos inorgânicos", Volume = 2m, Unidade = "L", Composicao = "HCl diluído + traços de metais", Risco = "medio", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-3), ClassesReatividade = [1, 7] },
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

        if (!await db.Chamados.AnyAsync())
        {
            db.Chamados.AddRange(
                new Chamado { Titulo = "Capela do Lab-201 com exaustão fraca", Descricao = "A capela principal não está puxando vapores adequadamente desde a última manutenção.", LaboratorioId = lab1, AbertoPorId = adminId, Tipo = ChamadoTipo.Conformidade, Severidade = ChamadoSeveridade.Alta, Status = ChamadoStatus.Aberto, Comentarios = [new ChamadoComentario { Texto = "Manutenção agendada para a próxima semana.", AutorId = adminId }] },
                new Chamado { Titulo = "Erro ao exportar CSV do inventário", Descricao = "O arquivo exportado vem sem o cabeçalho de colunas.", LaboratorioId = lab2, AbertoPorId = adminId, Tipo = ChamadoTipo.Bug, Severidade = ChamadoSeveridade.Media, Status = ChamadoStatus.EmAnalise, Comentarios = [] },
                new Chamado { Titulo = "Sugestão: filtro por responsável", Descricao = "Seria útil filtrar reagentes por responsável na tela de inventário.", LaboratorioId = lab3, AbertoPorId = adminId, Tipo = ChamadoTipo.Feature, Severidade = ChamadoSeveridade.Baixa, Status = ChamadoStatus.Aberto, Comentarios = [] });
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
                CodigoIbamaPadrao = "A099",
            });
            await db.SaveChangesAsync();
        }
    }

    private static Reagente Reag(string nome, string cas, string formula, int classe, decimal estoque, decimal estoqueMin, string unidade, DateOnly validade, string local, string responsavel, bool controlado, List<string> pictos, string signal, List<string> frasesH, List<string> frasesP) => new()
    {
        Nome = nome, Cas = cas, Formula = formula, ClasseReatividade = classe,
        Estoque = estoque, EstoqueMin = estoqueMin, Unidade = unidade, Validade = validade,
        Local = local, Responsavel = responsavel, Controlado = controlado,
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

    private static int ParseSeq(string labId)
    {
        var parts = labId.Split('-');
        return parts.Length == 2 && int.TryParse(parts[1], out var n) ? n : -1;
    }
}

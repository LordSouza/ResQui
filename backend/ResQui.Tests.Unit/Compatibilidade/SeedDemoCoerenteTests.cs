// Impede que o seed demo semeie uma combinação de classes que a própria matriz bloqueia —
// um resíduo assim nasce ineditável (ResiduosService.AtualizarAsync revalida as classes a cada
// edição) sem que nada no boot acuse o problema.
using System.Text.RegularExpressions;
using FluentAssertions;
using ResQui.Infrastructure.Seed;

namespace ResQui.Tests.Unit.Compatibilidade;

public class SeedDemoCoerenteTests
{
    private static string CaminhoDoSeeder()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "ResQui.slnx")))
            dir = dir.Parent;
        dir.Should().NotBeNull("o teste precisa achar a raiz do backend (ResQui.slnx)");
        return Path.Combine(dir!.FullName, "ResQui.Infrastructure", "Seed", "DemoDataSeeder.cs");
    }

    [Fact]
    public void ResiduosDemo_NaoUsamCombinacaoBloqueadaPelaMatriz()
    {
        var fonte = File.ReadAllText(CaminhoDoSeeder());
        var nivel = CompatMatrixData.GetAll().ToDictionary(e => (e.ClasseA, e.ClasseB), e => e.Nivel);

        var combinacoes = Regex.Matches(fonte, @"ClassesReatividade = \[([\d,\s]*)\]")
            .Select(m => m.Groups[1].Value
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(int.Parse).ToArray())
            .ToList();

        // "o regex casou algo" não é o mesmo que "casou todas as declarações": um resíduo novo com
        // outro formato de inicializador — ou sem ClassesReatividade — sairia da cobertura em
        // silêncio. Ancorar na contagem de `new Residuo` faz a divergência derrubar o teste.
        var declaracoes = Regex.Matches(fonte, @"new Residuo\b").Count;

        declaracoes.Should().BePositive(
            "o teste precisa achar as declarações de Residuo em DemoDataSeeder.cs");

        combinacoes.Should().HaveCount(declaracoes,
            $"o seed demo declara {declaracoes} resíduos, mas o regex de ClassesReatividade casou "
            + $"{combinacoes.Count} — toda declaração de Residuo tem que trazer ClassesReatividade "
            + "explícito, no formato esperado, para entrar nesta verificação");

        foreach (var classes in combinacoes)
        foreach (var a in classes)
        foreach (var b in classes)
        {
            if (a == b) continue;
            nivel[(a, b)].Should().BeLessThan(2,
                $"o seed demo semeia [{string.Join(",", classes)}], e o par ({a},{b}) é bloqueado "
                + "na criação e na edição de resíduo");
        }
    }
}

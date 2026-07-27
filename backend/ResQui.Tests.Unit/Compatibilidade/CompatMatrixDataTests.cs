// backend/ResQui.Tests.Unit/Compatibilidade/CompatMatrixDataTests.cs
using FluentAssertions;
using ResQui.Infrastructure.Seed;

namespace ResQui.Tests.Unit.Compatibilidade;

public class CompatMatrixDataTests
{
    [Fact]
    public void GetAll_Retorna144Celulas_ParaAs12Classes()
    {
        var todas = CompatMatrixData.GetAll().ToList();

        todas.Should().HaveCount(144);
        todas.Select(e => e.ClasseA).Distinct().Should().HaveCount(12);
        todas.Select(e => e.ClasseB).Distinct().Should().HaveCount(12);
    }

    [Fact]
    public void GetAll_TodosOsNiveisEstaoEntre0e3()
    {
        CompatMatrixData.GetAll().Should().OnlyContain(e => e.Nivel >= 0 && e.Nivel <= 3);
    }

    [Fact]
    public void GetAll_MatrizEhSimetrica()
    {
        var nivel = CompatMatrixData.GetAll().ToDictionary(e => (e.ClasseA, e.ClasseB), e => e.Nivel);

        foreach (var ((a, b), n) in nivel)
            nivel[(b, a)].Should().Be(n, $"o par ({a},{b}) deve ter o mesmo nível de ({b},{a})");
    }

    [Fact]
    public void GetAll_DiagonalEhZero()
    {
        // Simplificação declarada em docs/compatibilidade-proveniencia.md: classe consigo mesma
        // é tratada como compatível, o que não vale para peróxidos nem reativos com água.
        CompatMatrixData.GetAll()
            .Where(e => e.ClasseA == e.ClasseB)
            .Should().OnlyContain(e => e.Nivel == 0);
    }

    [Fact]
    public void GetAll_Classe12_EhProibidaComTodasAsOutrasClasses()
    {
        // RGN 107 no chart EPA-600/2-80-076: "extremamente reativo — não misturar com nenhum
        // produto químico ou resíduo". Ver docs/compatibilidade-proveniencia.md.
        var pares = CompatMatrixData.GetAll()
            .Where(e => (e.ClasseA == 12 || e.ClasseB == 12) && e.ClasseA != e.ClasseB)
            .ToList();

        pares.Should().HaveCount(22, "11 pares em cada direção");
        pares.Should().OnlyContain(e => e.Nivel == 3);
    }
}

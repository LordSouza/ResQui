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

    [Theory]
    [InlineData(2, 7, 2)]   // RGN 3×24, código S — mesma leitura de 3×7, que já é nível 2
    [InlineData(2, 10, 2)]  // RGN 3×105, códigos H GF
    [InlineData(6, 10, 3)]  // RGN 17×105, códigos H E — E (explosão) → nível 3
    [InlineData(6, 11, 3)]  // RGN 17×30, códigos H E
    public void GetAll_ParesDeRgnUnico_TemONivelDaFonte(int classeA, int classeB, int esperado)
    {
        // Pares com um único grupo de reatividade (RGN) de cada lado no chart EPA-600/2-80-076:
        // o nível é leitura direta dos códigos de consequência, sem teto de agregação.
        // Ver docs/compatibilidade-proveniencia.md e o spec da reconciliação de 2026-07-27.
        var nivel = CompatMatrixData.GetAll().ToDictionary(e => (e.ClasseA, e.ClasseB), e => e.Nivel);

        nivel[(classeA, classeB)].Should().Be(esperado);
        nivel[(classeB, classeA)].Should().Be(esperado, "a matriz é simétrica");
    }
}

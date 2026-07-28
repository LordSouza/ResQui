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

    [Theory]
    // Adoção do teto da EPA — nível 1 não aciona gate nenhum.
    [InlineData(5, 9, 1)]    // RGN 19×20 (cetonas × mercaptanas), código H
    [InlineData(6, 9, 1)]    // RGN 17×20, código H
    // Leitura direta: as duas metades da classe 1 sustentam o nível.
    [InlineData(1, 6, 2)]    // RGN 1×17 já dá GT sozinho; RGN 2×17 dá H,F GT
    // Adoção precaucional: o teto vem de METADE da classe agregada.
    [InlineData(1, 5, 2)]    // só de RGN 2 (ácidos oxidantes) × solventes: F H com todos os 8
    [InlineData(1, 7, 2)]    // só de RGN 2×24 (S); RGN 1×24 é célula vazia
    [InlineData(9, 10, 2)]   // só de RGN 20×105 (mercaptanas), códigos GF H; RGN 33×105 é vazio
    // Adoção do teto — E (explosão) de RGN 19×30, cetonas × peróxidos.
    [InlineData(5, 11, 3)]
    // Desvios declarados: ResQui fica ABAIXO do teto da EPA por decisão de projeto.
    [InlineData(2, 5, 1)]    // teto da fonte é 2 (P de RGN 3×4)
    [InlineData(5, 10, 2)]   // teto da fonte é 3 (E de RGN 16×105, aromáticos)
    public void GetAll_ParesComClasseAgregada_TemONivelDecidido(int classeA, int classeB, int esperado)
    {
        // Pares em que ao menos um lado agrega vários grupos de reatividade da EPA — o nível da
        // fonte é o pior caso do grupo, um teto. A decisão par a par (adotar o teto, adotar por
        // precaução quando ele vem de meia classe, ou declarar desvio) está em
        // docs/superpowers/specs/2026-07-28-reconciliacao-classes-agregadas-design.md.
        // Os dois desvios só podem mudar junto com a seção "Desvios declarados" de
        // docs/compatibilidade-proveniencia.md e o dict DESVIOS de docs/fontes/.../derive.py.
        var nivel = CompatMatrixData.GetAll().ToDictionary(e => (e.ClasseA, e.ClasseB), e => e.Nivel);

        nivel[(classeA, classeB)].Should().Be(esperado);
        nivel[(classeB, classeA)].Should().Be(esperado, "a matriz é simétrica");
    }
}

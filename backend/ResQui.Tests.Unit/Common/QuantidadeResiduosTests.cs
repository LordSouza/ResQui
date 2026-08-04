using FluentAssertions;
using ResQui.Application.Common;
using ResQui.Domain.Entities;

namespace ResQui.Tests.Unit.Common;

public class QuantidadeResiduosTests
{
    private static Residuo Fake(decimal volume, string unidade) => new()
    {
        Id = 1, Descricao = "Resíduo teste", LaboratorioId = "Lab-001", Tipo = "Solventes",
        Volume = volume, Unidade = unidade, Composicao = "acetona", Risco = "baixo",
    };

    [Theory]
    [InlineData(2, "L", 2)]
    [InlineData(500, "mL", 0.5)]
    [InlineData(1, "m³", 1000)]
    public void Somar_ConverteVolumeParaLitros(decimal volume, string unidade, decimal esperado)
    {
        var q = QuantidadeResiduos.Somar([Fake(volume, unidade)]);

        q.Litros.Should().Be(esperado);
        q.Quilos.Should().Be(0);
    }

    [Theory]
    [InlineData(3, "kg", 3)]
    [InlineData(250, "g", 0.25)]
    public void Somar_ConverteMassaParaQuilos(decimal volume, string unidade, decimal esperado)
    {
        var q = QuantidadeResiduos.Somar([Fake(volume, unidade)]);

        q.Quilos.Should().Be(esperado);
        q.Litros.Should().Be(0);
    }

    [Fact]
    public void Somar_NaoMisturaAsDuasDimensoes()
    {
        var q = QuantidadeResiduos.Somar([Fake(5, "L"), Fake(2, "kg"), Fake(300, "g"), Fake(250, "mL")]);

        q.Litros.Should().Be(5.25m);
        q.Quilos.Should().Be(2.3m);
    }

    [Fact]
    public void Somar_IgnoraUnidadeForaDoConjunto()
    {
        var q = QuantidadeResiduos.Somar([Fake(5, "L"), Fake(999, "barril"), Fake(7, "m3")]);

        q.Litros.Should().Be(5);
        q.Quilos.Should().Be(0);
    }

    [Fact]
    public void Somar_ListaVaziaDaZero()
    {
        var q = QuantidadeResiduos.Somar([]);

        q.Litros.Should().Be(0);
        q.Quilos.Should().Be(0);
    }

    [Fact]
    public void Somar_IgnoraCaixaDaUnidade()
    {
        var q = QuantidadeResiduos.Somar([Fake(2, "l"), Fake(1, "KG")]);

        q.Litros.Should().Be(2);
        q.Quilos.Should().Be(1);
    }

    [Fact]
    public void Formatar_MostraAsDuasDimensoesComTresCasas()
    {
        QuantidadeResiduos.Formatar(new QuantidadeAgregada(30m, 12.5m))
            .Should().Be("30,000 L · 12,500 kg");
    }

    [Fact]
    public void Formatar_OmiteDimensaoZerada()
    {
        QuantidadeResiduos.Formatar(new QuantidadeAgregada(30m, 0m)).Should().Be("30,000 L");
        QuantidadeResiduos.Formatar(new QuantidadeAgregada(0m, 2m)).Should().Be("2,000 kg");
    }

    [Fact]
    public void Formatar_SemQuantidadeDaTravessao()
    {
        QuantidadeResiduos.Formatar(new QuantidadeAgregada(0m, 0m)).Should().Be("—");
    }
}

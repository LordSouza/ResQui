using FluentAssertions;
using ResQui.Application.Common;

namespace ResQui.Tests.Unit.Common;

public class EmailDeEntradaTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalizar_Ausente_Recusa(string? email)
    {
        var act = () => EmailDeEntrada.Normalizar(email);

        act.Should().Throw<ValidationException>().WithMessage("*obrigatório*");
    }

    [Fact]
    public void Normalizar_AparaEspacos() =>
        EmailDeEntrada.Normalizar("  ana@lab.com ").Should().Be("ana@lab.com");

    [Fact]
    public void Normalizar_No254_Aceita() =>
        EmailDeEntrada.Normalizar(new string('a', 249) + "@x.co").Should().HaveLength(254);

    [Fact]
    public void Normalizar_Acima254_Recusa()
    {
        var act = () => EmailDeEntrada.Normalizar(new string('a', 250) + "@x.co");

        act.Should().Throw<ValidationException>().WithMessage("*254*");
    }

    [Fact]
    public void Normalizar_EspacosNasPontasNaoContamParaOLimite() =>
        EmailDeEntrada.Normalizar("  " + new string('a', 249) + "@x.co  ").Should().HaveLength(254);
}

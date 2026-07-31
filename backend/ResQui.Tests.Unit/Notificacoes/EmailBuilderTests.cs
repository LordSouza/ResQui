using FluentAssertions;
using ResQui.Application.Email;

namespace ResQui.Tests.Unit.Notificacoes;

public class EmailBuilderTests
{
    [Fact]
    public void BuildExpiry_RetornaSubjectEHtmlNaoVazios()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildExpiry("Acetona", "R-00001", 14);
        subject.Should().Contain("Acetona");
        html.Should().Contain("Acetona").And.Contain("14");
    }

    [Fact]
    public void BuildLowStock_RetornaSubjectEHtmlNaoVazios()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildLowStock("Etanol", "R-00002", 0.5m, 2m, "L");
        subject.Should().Contain("Etanol");
        html.Should().Contain("Etanol").And.Contain("2");
    }

    [Fact]
    public void BuildColeta_RetornaSubjectEHtmlComContagem()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildColeta(3);
        subject.Should().Contain("coleta");
        html.Should().Contain("3");
    }

    [Fact]
    public void BuildCompat_RetornaSubjectEHtmlComNomesReagentes()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildCompat("H₂O₂", "Etanol");
        subject.Should().Contain("compatibilidade");
        html.Should().Contain("H₂O₂").And.Contain("Etanol");
    }
}

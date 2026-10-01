using System.Globalization;
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
    public void BuildExpiry_ReagenteJaVencido_NaoDizPrestesAVencerNemDiasNegativos()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildExpiry("Éter", "R-00007", -45);

        subject.Should().Contain("vencido").And.NotContain("prestes a vencer");
        html.Should().Contain("venceu há 45 dia(s)").And.NotContain("-45");
    }

    [Fact]
    public void BuildLowStock_RetornaSubjectEHtmlNaoVazios()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildLowStock("Etanol", "R-00002", 0.5m, 2m, "L");
        subject.Should().Contain("Etanol");
        html.Should().Contain("Etanol").And.Contain("2");
    }

    [Fact]
    public void BuildLowStock_FormataQuantidadesComVirgulaDecimalIndependenteDaCulturaDoProcesso()
    {
        var culturaOriginal = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        try
        {
            var (_, html) = NotificacaoEmailBuilder.BuildLowStock("Ácido sulfúrico", "R-00003", 0.4m, 1m, "L");

            html.Should().Contain("0,40 L").And.Contain("1,00 L").And.NotContain("0.40");
        }
        finally
        {
            CultureInfo.CurrentCulture = culturaOriginal;
        }
    }

    [Fact]
    public void BuildColeta_IdentificaOResiduo()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildColeta(42, "Solvente halogenado");
        subject.Should().Contain("#42").And.NotContain("(s)");
        html.Should().Contain("#42").And.Contain("Solvente halogenado");
    }

    [Fact]
    public void BuildCompatLocal_EscapaTextoLivreNoHtml()
    {
        var (_, html) = NotificacaoEmailBuilder.BuildCompatLocal(
            "<a href=\"https://x\">Armario 3</a>", "<img src=x>", "Etanol & Cia", "Perigo");

        html.Should().NotContain("<a href").And.NotContain("<img")
            .And.Contain("&lt;a href=&quot;https://x&quot;&gt;Armario 3&lt;/a&gt;")
            .And.Contain("&lt;img src=x&gt;")
            .And.Contain("Etanol &amp; Cia");
    }

    [Fact]
    public void BuildColeta_EscapaDescricaoNoHtml()
    {
        var (_, html) = NotificacaoEmailBuilder.BuildColeta(1, "<script>alert(1)</script>");
        html.Should().NotContain("<script>").And.Contain("&lt;script&gt;");
    }

    [Fact]
    public void BuildRedefinicaoSenha_LinkEValidadeNoCorpo_ComOLinkEscapado()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildRedefinicaoSenha("https://resqui.com.br/?redefinir=abc&x=\"y", 60);

        subject.Should().Contain("Redefinição de senha");
        html.Should().Contain("https://resqui.com.br/?redefinir=abc&amp;x=&quot;y").And.Contain("60 minutos");
    }

    [Fact]
    public void BuildSenhaRedefinida_AvisaQueAsSessoesForamEncerradas()
    {
        var (subject, html) = NotificacaoEmailBuilder.BuildSenhaRedefinida();

        subject.Should().Contain("senha foi redefinida");
        html.Should().Contain("sessões abertas foram encerradas");
    }
}

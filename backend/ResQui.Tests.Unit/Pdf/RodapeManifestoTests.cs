using FluentAssertions;
using ResQui.Application.Auditoria;
using ResQui.Application.Pdf;

namespace ResQui.Tests.Unit.Pdf;

public class RodapeManifestoTests
{
    private static readonly DateTime Emissao = new(2026, 11, 15, 14, 30, 0, DateTimeKind.Utc);

    public RodapeManifestoTests() =>
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

    [Fact]
    public void ComAncora_PublicaSequenciaEPrefixoDoHash()
    {
        var hash = "0123456789abcdef" + new string('f', 48);

        var rodape = PdfService.RodapeManifesto(Emissao, new AncoraAuditoriaDto(1234, hash));

        rodape.Should().Contain("15/11/2026 14:30 UTC");
        rodape.Should().Contain("Âncora da auditoria: seq. 1234 · hash 0123456789abcdef");
        rodape.Should().NotContain(new string('f', 48));
    }

    [Fact]
    public void SemAncora_MantemSoODisclaimer()
    {
        var rodape = PdfService.RodapeManifesto(Emissao, null);

        rodape.Should().Contain("não substitui o MTR oficial");
        rodape.Should().NotContain("Âncora");
    }

    [Fact]
    public void ManifestoMtr_ComAncora_GeraPdf()
    {
        var mtr = new ResQui.Domain.Entities.Mtr { Numero = "MTR-1", Destinador = "Destinador", Transportadora = "Transp" };

        var pdf = new PdfService().ManifestoMtr(mtr, [], [], null, new AncoraAuditoriaDto(7, new string('a', 64)));

        pdf.Should().NotBeEmpty();
    }
}

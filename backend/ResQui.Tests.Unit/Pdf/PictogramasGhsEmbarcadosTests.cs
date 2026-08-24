// backend/ResQui.Tests.Unit/Pdf/PictogramasGhsEmbarcadosTests.cs
using System.Linq;
using System.Reflection;
using FluentAssertions;
using ResQui.Application.Pdf;

namespace ResQui.Tests.Unit.Pdf;

/// <summary>
/// PdfService resolve a arte de cada pictograma por nome de recurso embarcado
/// ("ResQui.Application.Assets.ghs.{kind}.svg") e cai num quadro de texto quando não encontra —
/// silenciosamente, sem exceção nem log. Mexer no RootNamespace, mover Assets/ghs/ ou perder o
/// glob de EmbeddedResource no csproj faria todo rótulo impresso regredir ao quadro de texto sem
/// que nada acusasse. Este teste trava o acoplamento entre as chaves do domínio e os recursos.
/// </summary>
public class PictogramasGhsEmbarcadosTests
{
    private static readonly string[] Kinds =
        ["explosion", "flame", "flame_circle", "bottle", "corrosion", "skull", "exclam", "health", "envir"];

    [Fact]
    public void CadaKindTemSvgEmbarcado()
    {
        var recursos = typeof(PdfService).Assembly.GetManifestResourceNames();

        foreach (var kind in Kinds)
            recursos.Should().Contain($"ResQui.Application.Assets.ghs.{kind}.svg", because: kind);
    }

    [Fact]
    public void KindsCobremOCatalogoDoPdfService()
    {
        var catalogo = (System.Collections.IDictionary)typeof(PdfService)
            .GetField("PictosGhs", BindingFlags.NonPublic | BindingFlags.Static)!
            .GetValue(null)!;

        catalogo.Keys.Cast<string>().Should().BeEquivalentTo(Kinds);
    }

    [Fact]
    public void SvgEmbarcadoEUmLosangoValido()
    {
        using var recurso = typeof(PdfService).Assembly
            .GetManifestResourceStream("ResQui.Application.Assets.ghs.corrosion.svg")!;
        using var leitor = new StreamReader(recurso);
        var svg = leitor.ReadToEnd();

        svg.Should().StartWith("<?xml");
        svg.Should().Contain("<svg");
        svg.Should().Contain("#f00");
    }
}

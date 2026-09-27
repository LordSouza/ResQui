using System.Text;
using System.Text.RegularExpressions;
using FluentAssertions;
using ResQui.Application.Pdf;
using ResQui.Domain.Entities;

namespace ResQui.Tests.Unit.Pdf;

public class RotuloReagenteTests
{
    private static readonly string[] OsNovePictogramas =
        ["explosion", "flame", "flame_circle", "bottle", "corrosion", "skull", "exclam", "health", "envir"];

    public RotuloReagenteTests() =>
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

    private static Reagente Reagente(IEnumerable<string> pictos) => new()
    {
        Id = "R-00001",
        Nome = "Substância de teste",
        Cas = "0-00-0",
        Formula = "X",
        ClasseReatividade = 1,
        Validade = new DateOnly(2027, 1, 1),
        Local = "Lab-001",
        Responsavel = "Ana Lima",
        Ghs = new ReagenteGhs { Pictos = pictos.ToList(), Signal = "Perigo", FrasesH = ["H225"], FrasesP = ["P210"] },
    };

    private static int ContarPaginas(byte[] pdf) =>
        Regex.Matches(Encoding.Latin1.GetString(pdf), @"/Type\s*/Page[^s]").Count;

    [Fact]
    public void RotuloReagente_ComOsNovePictogramas_GeraUmaPaginaSo()
    {
        var pdf = new PdfService().RotuloReagente(Reagente(OsNovePictogramas));

        ContarPaginas(pdf).Should().Be(1);
    }

    [Fact]
    public void RotuloReagente_MaisPictogramasProduzemDocumentoMaior()
    {
        var comQuatro = new PdfService().RotuloReagente(Reagente(OsNovePictogramas.Take(4)));
        var comNove = new PdfService().RotuloReagente(Reagente(OsNovePictogramas));

        comNove.Length.Should().BeGreaterThan(comQuatro.Length);
    }
}

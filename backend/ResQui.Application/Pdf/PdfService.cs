using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ResQui.Domain.Entities;

namespace ResQui.Application.Pdf;

public class PdfService : IPdfService
{
    private static readonly Dictionary<string, (string Code, string Label)> PictosGhs = new()
    {
        ["explosion"] = ("GHS01", "Explosivo"),
        ["flame"] = ("GHS02", "Inflamável"),
        ["flame_circle"] = ("GHS03", "Oxidante"),
        ["bottle"] = ("GHS04", "Gás sob pressão"),
        ["corrosion"] = ("GHS05", "Corrosivo"),
        ["skull"] = ("GHS06", "Tóxico agudo"),
        ["exclam"] = ("GHS07", "Nocivo / irritante"),
        ["health"] = ("GHS08", "Perigo à saúde"),
        ["envir"] = ("GHS09", "Perigoso ao ambiente"),
    };

    private static byte[] QrPng(string conteudo)
    {
        using var gen = new QRCoder.QRCodeGenerator();
        using var data = gen.CreateQrCode(conteudo, QRCoder.QRCodeGenerator.ECCLevel.Q);
        return new QRCoder.PngByteQRCode(data).GetGraphic(8);
    }

    public byte[] RotuloLote(Reagente r, ReagenteLote lote)
    {
        return Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A7.Landscape());
            page.Margin(10);
            page.DefaultTextStyle(t => t.FontSize(8));

            page.Content().Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text(r.Nome).Bold().FontSize(11);
                    col.Item().Text($"CAS {r.Cas} · {r.Formula}").FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingTop(4).Text($"Lote: {lote.Codigo}").Bold();
                    col.Item().Text($"Conteúdo: {lote.Estoque:0.##} {r.Unidade}");
                    col.Item().Text($"Validade: {lote.Validade:dd/MM/yyyy}");
                    if (lote.Abertura is not null)
                        col.Item().Text($"Aberto em: {lote.Abertura:dd/MM/yyyy}");
                    col.Item().Text($"Local: {r.Local}");
                    col.Item().Text($"Resp.: {r.Responsavel}");
                });
                row.ConstantItem(80).AlignMiddle().Column(c =>
                {
                    c.Item().Image(QrPng($"{r.Id}|{lote.Codigo}"));
                    c.Item().AlignCenter().Text($"{r.Id}|{lote.Codigo}").FontSize(6);
                });
            });

            page.Footer().Text("ResQui · etiqueta de frasco").FontSize(5).FontColor(Colors.Grey.Darken1);
        })).GeneratePdf();
    }

    public byte[] RotuloReagente(Reagente r)
    {
        var ghs = r.Ghs;
        return Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A6.Landscape());
            page.Margin(12);
            page.DefaultTextStyle(t => t.FontSize(9));

            page.Header().Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text(r.Nome).Bold().FontSize(14);
                    if (!string.IsNullOrEmpty(r.Sinonimo))
                        col.Item().Text(r.Sinonimo).Italic().FontColor(Colors.Grey.Darken1);
                });
                if (!string.IsNullOrEmpty(ghs?.Signal))
                    row.ConstantItem(90).AlignRight().Text(ghs.Signal.ToUpper())
                        .Bold().FontSize(12).FontColor(Colors.Red.Darken2);
            });

            page.Content().PaddingVertical(6).Column(col =>
            {
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(info =>
                    {
                        info.Item().Text($"CAS: {r.Cas}    Fórmula: {r.Formula}");
                        info.Item().Text($"ID: {r.Id}    Classe de reatividade: {r.ClasseReatividade}");
                        info.Item().Text($"Validade: {r.Validade:dd/MM/yyyy}    Local: {r.Local}");
                        info.Item().Text($"Responsável: {r.Responsavel}");
                        if (!string.IsNullOrEmpty(r.Lote))
                            info.Item().Text($"Lote: {r.Lote}");
                    });

                    if (ghs is not null && ghs.Pictos.Count > 0)
                        row.ConstantItem(160).AlignRight().Row(pictos =>
                        {
                            foreach (var p in ghs.Pictos.Take(4))
                            {
                                var (code, label) = PictosGhs.GetValueOrDefault(p, (p, p));
                                pictos.ConstantItem(38).Padding(2).Rotate(0)
                                    .Border(1.5f).BorderColor(Colors.Red.Darken2)
                                    .Padding(3).Column(c =>
                                    {
                                        c.Item().AlignCenter().Text(code).Bold().FontSize(7);
                                        c.Item().AlignCenter().Text(label).FontSize(5);
                                    });
                            }
                        });
                });

                if (ghs is not null && ghs.FrasesH.Count > 0)
                {
                    col.Item().PaddingTop(6).Text("Frases H").Bold().FontSize(8);
                    foreach (var h in ghs.FrasesH)
                        col.Item().Text(h).FontSize(7);
                }
                if (ghs is not null && ghs.FrasesP.Count > 0)
                {
                    col.Item().PaddingTop(4).Text("Frases P").Bold().FontSize(8);
                    foreach (var p in ghs.FrasesP)
                        col.Item().Text(p).FontSize(7);
                }
            });

            page.Footer().Row(row =>
            {
                row.RelativeItem().AlignBottom().Text($"ResQui · rótulo gerado em {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC")
                    .FontSize(6).FontColor(Colors.Grey.Darken1);
                row.ConstantItem(42).Image(QrPng(r.Id));
            });
        })).GeneratePdf();
    }

    public byte[] ManifestoMtr(Mtr m, IList<Residuo> residuos)
    {
        return Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(t => t.FontSize(10));

            page.Header().Column(col =>
            {
                col.Item().Text("Manifesto de Transporte de Resíduos (Pré-MTR)").Bold().FontSize(16);
                col.Item().Text(m.Numero).FontSize(12).FontColor(Colors.Blue.Darken2);
            });

            page.Content().PaddingVertical(12).Column(col =>
            {
                col.Item().Table(t =>
                {
                    t.ColumnsDefinition(c => { c.ConstantColumn(130); c.RelativeColumn(); });
                    void Linha(string k, string v)
                    {
                        t.Cell().Padding(2).Text(k).Bold();
                        t.Cell().Padding(2).Text(v);
                    }
                    Linha("Data de emissão", m.DataEmissao.ToString("dd/MM/yyyy"));
                    Linha("Gerador", m.Gerador);
                    Linha("Transportadora", m.Transportadora);
                    Linha("Destinador", m.Destinador ?? "—");
                    Linha("Código IBAMA", m.CodigoIbama ?? "—");
                    Linha("Massa total (kg)", m.Massa.ToString("F3"));
                    Linha("Status", m.Status.ToString());
                });

                col.Item().PaddingTop(12).Text($"Resíduos ({residuos.Count})").Bold().FontSize(12);
                col.Item().PaddingTop(4).Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(30);
                        c.RelativeColumn(3);
                        c.RelativeColumn(2);
                        c.ConstantColumn(70);
                        c.ConstantColumn(45);
                        c.ConstantColumn(60);
                    });
                    t.Header(h =>
                    {
                        foreach (var titulo in new[] { "ID", "Descrição", "Tipo", "Quantidade", "Risco", "Classes" })
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(3).Text(titulo).Bold().FontSize(8);
                    });
                    foreach (var r in residuos)
                    {
                        t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(r.Id.ToString()).FontSize(8);
                        t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(r.Descricao).FontSize(8);
                        t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(r.Tipo).FontSize(8);
                        t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(3).Text($"{r.Volume:F2} {r.Unidade}").FontSize(8);
                        t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(r.Risco).FontSize(8);
                        t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(3)
                            .Text(r.ClassesReatividade.Count > 0 ? string.Join(", ", r.ClassesReatividade) : "—").FontSize(8);
                    }
                });

                col.Item().PaddingTop(30).Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().PaddingTop(20).LineHorizontal(0.5f);
                        c.Item().AlignCenter().Text("Responsável pelo gerador").FontSize(8);
                    });
                    row.ConstantItem(40);
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().PaddingTop(20).LineHorizontal(0.5f);
                        c.Item().AlignCenter().Text("Responsável pelo transporte").FontSize(8);
                    });
                });
            });

            page.Footer().Text($"ResQui · documento gerado em {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC — uso interno, não substitui o MTR oficial do SINIR")
                .FontSize(7).FontColor(Colors.Grey.Darken1);
        })).GeneratePdf();
    }
}

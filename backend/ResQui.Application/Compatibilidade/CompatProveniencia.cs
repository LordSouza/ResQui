namespace ResQui.Application.Compatibilidade;

/// <summary>
/// Proveniência da matriz de compatibilidade. Fonte única do projeto: consumida pelo DTO da
/// matriz (e, por ele, pela UI e pelo CSV exportado) e citada pelo seed em CompatMatrixData.
/// O mapeamento das 12 classes do ResQui para os grupos de reatividade da EPA, a regra de
/// conversão consequência → nível e as divergências conhecidas estão em Detalhamento.
/// </summary>
public static class CompatProveniencia
{
    public const string Fonte =
        "EPA-600/2-80-076 — A Method for Determining the Compatibility of Hazardous Wastes (EPA, 1980)";

    public const string Referencia =
        "Johnson, L. E. & Farr, J. K. (2008). CRW 2.0: A representative-compound approach to " +
        "functionality-based prediction of reactive chemical hazards. Process Safety Progress, 27(3), 212–218.";

    public const string Url =
        "https://www.epa.gov/sites/default/files/2016-03/documents/compat-haz-waste.pdf";

    public const string RevisadoEm = "2026-07-28";

    public const string Detalhamento = "docs/compatibilidade-proveniencia.md";

    public static CompatFonteDto ToDto() => new(Fonte, Referencia, Url, RevisadoEm, Detalhamento);
}

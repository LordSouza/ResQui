using System.Globalization;
using ResQui.Domain.Entities;

namespace ResQui.Application.Common;

public readonly record struct QuantidadeAgregada(decimal Litros, decimal Quilos);

public static class QuantidadeResiduos
{
    private static readonly Dictionary<string, decimal> FatorLitros =
        new(StringComparer.OrdinalIgnoreCase) { ["L"] = 1m, ["mL"] = 0.001m, ["m³"] = 1000m };

    private static readonly Dictionary<string, decimal> FatorQuilos =
        new(StringComparer.OrdinalIgnoreCase) { ["kg"] = 1m, ["g"] = 0.001m };

    private static readonly CultureInfo Leitura = CultureInfo.GetCultureInfo("pt-BR");

    public static QuantidadeAgregada Somar(IEnumerable<Residuo> residuos)
    {
        var litros = 0m;
        var quilos = 0m;
        foreach (var r in residuos)
        {
            var unidade = r.Unidade ?? "";
            if (FatorLitros.TryGetValue(unidade, out var paraLitros)) litros += r.Volume * paraLitros;
            else if (FatorQuilos.TryGetValue(unidade, out var paraQuilos)) quilos += r.Volume * paraQuilos;
        }
        return new QuantidadeAgregada(litros, quilos);
    }

    public static string Formatar(QuantidadeAgregada q)
    {
        var partes = new List<string>();
        if (q.Litros > 0) partes.Add($"{q.Litros.ToString("F3", Leitura)} L");
        if (q.Quilos > 0) partes.Add($"{q.Quilos.ToString("F3", Leitura)} kg");
        return partes.Count > 0 ? string.Join(" · ", partes) : "—";
    }
}

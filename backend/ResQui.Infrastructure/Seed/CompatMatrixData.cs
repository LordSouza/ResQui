using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Seed;

public static class CompatMatrixData
{
    // Níveis: 0=compatível 1=cautela 2=perigo 3=proibido.
    // Proveniência (fonte, referência e mapeamento classe → grupo de reatividade da EPA):
    // ResQui.Application.Compatibilidade.CompatProveniencia.
    // A matriz é simétrica com diagonal zero — propriedades travadas por CompatMatrixDataTests.
    // Divergências em relação à fonte:
    // 19 pares são mais restritivos que a EPA (que não documenta reação para eles) e 2 são
    // desvios de projeto declarados — 2x5 em nível 1 contra teto 2, e 5x10 em nível 2 contra
    // teto 3. Nenhum par é mais permissivo que a fonte sem declaração.
    // 2026-07-27: reconciliados todos os pares de RGN único — os 8 da classe 12 (RGN 107, "não
    // misturar com nenhum produto químico ou resíduo"), 2x7 e 2x10 para 2 (RGN 3x24 e 3x105) e
    // 6x10 e 6x11 para 3 (RGN 17x105 e 17x30, código E = explosão).
    // 2026-07-28: reconciliados os 9 pares com classe agregada, em que o nível da fonte é teto do
    // pior membro do grupo — 5x9, 6x9 e 2x5 para 1; 1x5, 1x6, 1x7, 9x10 e 5x10 para 2; 5x11 para
    // 3. A decomposição por sub-RGN que sustenta cada decisão está no spec de 2026-07-28.
    private static readonly int[,] Matrix =
    {
        {   0, 1, 3, 2, 2, 2, 2, 3, 3, 2, 3, 3 }, // 1
        {   1, 0, 3, 2, 1, 0, 2, 3, 2, 2, 2, 3 }, // 2
        {   3, 3, 0, 2, 1, 2, 2, 2, 1, 1, 2, 3 }, // 3
        {   2, 2, 2, 0, 3, 2, 1, 3, 3, 3, 2, 3 }, // 4
        {   2, 1, 1, 3, 0, 0, 0, 1, 1, 2, 3, 3 }, // 5
        {   2, 0, 2, 2, 0, 0, 0, 1, 1, 3, 3, 3 }, // 6
        {   2, 2, 2, 1, 0, 0, 0, 3, 2, 1, 1, 3 }, // 7
        {   3, 3, 2, 3, 1, 1, 3, 0, 1, 2, 3, 3 }, // 8
        {   3, 2, 1, 3, 1, 1, 2, 1, 0, 2, 2, 3 }, // 9
        {   2, 2, 1, 3, 2, 3, 1, 2, 2, 0, 3, 3 }, // 10
        {   3, 2, 2, 2, 3, 3, 1, 3, 2, 3, 0, 3 }, // 11
        {   3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0 }, // 12
    };

    public static IEnumerable<CompatEntry> GetAll()
    {
        for (int a = 1; a <= 12; a++)
        for (int b = 1; b <= 12; b++)
            yield return new CompatEntry { ClasseA = a, ClasseB = b, Nivel = Matrix[a - 1, b - 1] };
    }
}

using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Seed;

public static class CompatMatrixData
{
    // Níveis: 0=compatível 1=cautela 2=perigo 3=proibido.
    // Proveniência (fonte, referência e mapeamento classe → grupo de reatividade da EPA):
    // ResQui.Application.Compatibilidade.CompatProveniencia e docs/compatibilidade-proveniencia.md.
    // A matriz é simétrica com diagonal zero — propriedades travadas por CompatMatrixDataTests.
    // Há divergências conhecidas em relação à fonte, listadas no documento acima; restam 9
    // pares mais permissivos que a fonte, não reconciliados aqui (ver DEBITOS-TECNICOS.md §3).
    // 2026-07-27: reconciliados com a fonte todos os pares de RGN único (sem agregação de
    // classes) — os 8 da classe 12 (RGN 107, "não misturar com nenhum produto químico ou
    // resíduo"), 2x7 e 2x10 para nível 2 (RGN 3x24 e 3x105) e 6x10 e 6x11 para nível 3
    // (RGN 17x105 e 17x30, código E = explosão). As 9 divergências permissivas que restam
    // envolvem classe agregada, em que o nível da fonte é teto do pior membro do grupo, e
    // exigem decisão caso a caso (ver docs/compatibilidade-proveniencia.md).
    private static readonly int[,] Matrix =
    {
        {   0, 1, 3, 2, 1, 1, 1, 3, 3, 2, 3, 3 }, // 1
        {   1, 0, 3, 2, 0, 0, 2, 3, 2, 2, 2, 3 }, // 2
        {   3, 3, 0, 2, 1, 2, 2, 2, 1, 1, 2, 3 }, // 3
        {   2, 2, 2, 0, 3, 2, 1, 3, 3, 3, 2, 3 }, // 4
        {   1, 0, 1, 3, 0, 0, 0, 1, 0, 0, 2, 3 }, // 5
        {   1, 0, 2, 2, 0, 0, 0, 1, 0, 3, 3, 3 }, // 6
        {   1, 2, 2, 1, 0, 0, 0, 3, 2, 1, 1, 3 }, // 7
        {   3, 3, 2, 3, 1, 1, 3, 0, 1, 2, 3, 3 }, // 8
        {   3, 2, 1, 3, 0, 0, 2, 1, 0, 1, 2, 3 }, // 9
        {   2, 2, 1, 3, 0, 3, 1, 2, 1, 0, 3, 3 }, // 10
        {   3, 2, 2, 2, 2, 3, 1, 3, 2, 3, 0, 3 }, // 11
        {   3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0 }, // 12
    };

    public static IEnumerable<CompatEntry> GetAll()
    {
        for (int a = 1; a <= 12; a++)
        for (int b = 1; b <= 12; b++)
            yield return new CompatEntry { ClasseA = a, ClasseB = b, Nivel = Matrix[a - 1, b - 1] };
    }
}

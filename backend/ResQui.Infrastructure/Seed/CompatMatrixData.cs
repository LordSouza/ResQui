using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Seed;

public static class CompatMatrixData
{
    // 0=compatível 1=cautela 2=perigo 3=proibido
    private static readonly int[,] Matrix =
    {
        {   0, 1, 3, 2, 1, 1, 1, 3, 3, 2, 3, 3 }, // 1
        {   1, 0, 3, 2, 0, 0, 1, 3, 2, 1, 2, 1 }, // 2
        {   3, 3, 0, 2, 1, 2, 2, 2, 1, 1, 2, 3 }, // 3
        {   2, 2, 2, 0, 3, 2, 1, 3, 3, 3, 2, 2 }, // 4
        {   1, 0, 1, 3, 0, 0, 0, 1, 0, 0, 2, 1 }, // 5
        {   1, 0, 2, 2, 0, 0, 0, 1, 0, 2, 2, 1 }, // 6
        {   1, 1, 2, 1, 0, 0, 0, 3, 2, 1, 1, 1 }, // 7
        {   3, 3, 2, 3, 1, 1, 3, 0, 1, 2, 3, 2 }, // 8
        {   3, 2, 1, 3, 0, 0, 2, 1, 0, 1, 2, 2 }, // 9
        {   2, 1, 1, 3, 0, 2, 1, 2, 1, 0, 3, 1 }, // 10
        {   3, 2, 2, 2, 2, 2, 1, 3, 2, 3, 0, 3 }, // 11
        {   3, 1, 3, 2, 1, 1, 1, 2, 2, 1, 3, 0 }, // 12
    };

    public static IEnumerable<CompatEntry> GetAll()
    {
        for (int a = 1; a <= 12; a++)
        for (int b = 1; b <= 12; b++)
            yield return new CompatEntry { ClasseA = a, ClasseB = b, Nivel = Matrix[a - 1, b - 1] };
    }
}

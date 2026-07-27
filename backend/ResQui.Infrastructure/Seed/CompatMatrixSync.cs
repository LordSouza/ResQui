using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Seed;

/// <summary>Células a gravar para alinhar o banco à matriz base.</summary>
public record CompatMatrixDiff(List<CompatEntry> Inserir, List<CompatEntry> Atualizar);

/// <summary>
/// Compara a matriz de compatibilidade persistida com a matriz base de <see cref="CompatMatrixData"/>.
/// Sem acesso a banco: o DbSeeder aplica o resultado. As entradas de
/// <c>Atualizar</c> são as próprias instâncias recebidas em <paramref name="existentes"/>, já com o
/// nível corrigido, para que o change tracking do EF persista a alteração.
/// Overrides institucionais vivem em CompatOverride e não são afetados.
/// </summary>
public static class CompatMatrixSync
{
    public static CompatMatrixDiff Diff(
        IEnumerable<CompatEntry> existentes,
        IEnumerable<CompatEntry> baseMatriz)
    {
        var atuais = existentes.ToDictionary(e => (e.ClasseA, e.ClasseB));
        var inserir = new List<CompatEntry>();
        var atualizar = new List<CompatEntry>();

        foreach (var esperada in baseMatriz)
        {
            if (!atuais.TryGetValue((esperada.ClasseA, esperada.ClasseB), out var atual))
            {
                inserir.Add(esperada);
            }
            else if (atual.Nivel != esperada.Nivel)
            {
                atual.Nivel = esperada.Nivel;
                atualizar.Add(atual);
            }
        }

        return new CompatMatrixDiff(inserir, atualizar);
    }
}

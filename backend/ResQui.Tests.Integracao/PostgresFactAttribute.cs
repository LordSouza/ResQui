namespace ResQui.Tests.Integracao;

/// <summary>
/// Teste que exige um PostgreSQL real, apontado por RESQUI_TESTES_POSTGRES (connection string de um
/// usuário que pode criar bancos). Sem a variável o teste é pulado; o CI sempre a define.
/// </summary>
public sealed class PostgresFactAttribute : FactAttribute
{
    public const string VariavelDeAmbiente = "RESQUI_TESTES_POSTGRES";

    public static string? ConnectionString => Environment.GetEnvironmentVariable(VariavelDeAmbiente);

    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(ConnectionString))
            Skip = $"Defina {VariavelDeAmbiente} para rodar os testes contra PostgreSQL.";
    }
}

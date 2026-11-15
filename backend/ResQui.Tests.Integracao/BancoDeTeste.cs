using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using ResQui.Infrastructure.Data;

namespace ResQui.Tests.Integracao;

/// <summary>Banco PostgreSQL descartável, criado vazio e removido no Dispose.</summary>
public sealed class BancoDeTeste : IAsyncDisposable
{
    private readonly string _servidor;
    private readonly string _nome = $"resqui_teste_{Guid.NewGuid():N}";

    public string ConnectionString { get; }

    private BancoDeTeste(string servidor)
    {
        _servidor = servidor;
        ConnectionString = new NpgsqlConnectionStringBuilder(servidor) { Database = _nome, Pooling = false }.ConnectionString;
    }

    public static async Task<BancoDeTeste> CriarAsync(string? ateMigracao = null)
    {
        var banco = new BancoDeTeste(PostgresFactAttribute.ConnectionString!);
        await banco.ExecutarNoServidorAsync($"CREATE DATABASE \"{banco._nome}\"");
        await using var db = banco.NovoContexto();
        await db.GetService<IMigrator>().MigrateAsync(ateMigracao);
        return banco;
    }

    public AppDbContext NovoContexto(string? connectionString = null) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString ?? ConnectionString).Options);

    public async Task MigrarAsync()
    {
        await using var db = NovoContexto();
        await db.Database.MigrateAsync();
    }

    public async Task ExecutarAsync(string sql)
    {
        await using var conexao = new NpgsqlConnection(ConnectionString);
        await conexao.OpenAsync();
        await using var comando = new NpgsqlCommand(sql, conexao);
        await comando.ExecuteNonQueryAsync();
    }

    private async Task ExecutarNoServidorAsync(string sql)
    {
        await using var conexao = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(_servidor) { Pooling = false }.ConnectionString);
        await conexao.OpenAsync();
        await using var comando = new NpgsqlCommand(sql, conexao);
        await comando.ExecuteNonQueryAsync();
    }

    public async ValueTask DisposeAsync() =>
        await ExecutarNoServidorAsync($"DROP DATABASE IF EXISTS \"{_nome}\" WITH (FORCE)");
}

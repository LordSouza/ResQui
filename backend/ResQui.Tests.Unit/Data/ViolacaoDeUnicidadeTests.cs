using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ResQui.Infrastructure.Data.Repositories;

namespace ResQui.Tests.Unit.Data;

public class ViolacaoDeUnicidadeTests
{
    private static DbUpdateException ComSqlState(string sqlState) =>
        new("falha ao gravar", new PostgresException("duplicate key value", "ERROR", "ERROR", sqlState));

    [Fact]
    public void Detecta_ChaveDuplicada_RetornaTrue() =>
        ViolacaoDeUnicidade.Detecta(ComSqlState("23505")).Should().BeTrue();

    [Fact]
    public void Detecta_OutroErroDoPostgres_RetornaFalse() =>
        ViolacaoDeUnicidade.Detecta(ComSqlState("23514")).Should().BeFalse();

    [Fact]
    public void Detecta_SemCausaDoPostgres_RetornaFalse() =>
        ViolacaoDeUnicidade.Detecta(new DbUpdateException("falha ao gravar")).Should().BeFalse();
}

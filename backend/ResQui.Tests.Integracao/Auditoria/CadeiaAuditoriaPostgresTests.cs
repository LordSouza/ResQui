using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ResQui.Application.Auditoria;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Infrastructure.Data;
using ResQui.Infrastructure.Data.Repositories;

namespace ResQui.Tests.Integracao.Auditoria;

public class CadeiaAuditoriaPostgresTests
{
    private const string MigracaoAnterior = "20261001233208_AddRedefinicaoSenha";

    private static AuditoriaService Servico(AppDbContext db) => new(new EfAuditoriaRepository(db));

    private static async Task<VerificacaoCadeiaDto> VerificarAsync(BancoDeTeste banco)
    {
        await using var db = banco.NovoContexto();
        return await Servico(db).VerificarCadeiaAsync("teste@resqui.local");
    }

    private static async Task<List<AuditoriaEntry>> CadeiaAsync(BancoDeTeste banco)
    {
        await using var db = banco.NovoContexto();
        return await db.Auditoria.AsNoTracking().OrderBy(a => a.Sequencia).ToListAsync();
    }

    [PostgresFact]
    public async Task Inclusoes_GeramCadeiaValidaComSequenciaContinua()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            var svc = Servico(db);
            await svc.RegistrarAsync("a@resqui.local", "reagente.criar", "Inventário", "Ácido | sulfúrico \\ 98%", RiscoAuditoria.Low);
            await svc.RegistrarAsync("b@resqui.local", "residuo.criar", "Resíduos", "ção 🧪", RiscoAuditoria.Medium);
            await svc.RegistrarAsync("c@resqui.local", "user.excluir", "Usuários", "", RiscoAuditoria.High);
        }

        var cadeia = await CadeiaAsync(banco);
        cadeia.Select(e => e.Sequencia).Should().Equal(1, 2, 3);
        cadeia[0].HashAnterior.Should().Be(CadeiaAuditoria.HashInicial);
        cadeia[1].HashAnterior.Should().Be(cadeia[0].Hash);
        cadeia.Should().AllSatisfy(e => e.Hash.Should().Be(CadeiaAuditoria.CalcularHash(e)));

        var r = await VerificarAsync(banco);
        r.Should().Be(new VerificacaoCadeiaDto(true, 3, 3, cadeia[2].Hash, null));
    }

    [PostgresFact]
    public async Task ValoresEnviadosPelaAplicacao_SaoSobrescritosPeloGatilho()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            db.Auditoria.Add(new AuditoriaEntry { Who = "x", Sequencia = 999, HashAnterior = "forjado", Hash = "forjado" });
            await db.SaveChangesAsync();
        }

        var elo = (await CadeiaAsync(banco)).Single();
        elo.Sequencia.Should().Be(1);
        elo.Hash.Should().Be(CadeiaAuditoria.CalcularHash(elo));
    }

    [PostgresFact]
    public async Task VariasInclusoesNoMesmoSaveChanges_EncadeiamEmOrdem()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            for (var i = 0; i < 5; i++) db.Auditoria.Add(new AuditoriaEntry { Who = $"u{i}", What = "lote" });
            await db.SaveChangesAsync();
        }

        (await CadeiaAsync(banco)).Select(e => e.Sequencia).Should().Equal(1, 2, 3, 4, 5);
        (await VerificarAsync(banco)).Integra.Should().BeTrue();
    }

    [PostgresFact]
    public async Task InclusoesConcorrentes_NaoBifurcamACadeia()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        const int total = 40;

        await Task.WhenAll(Enumerable.Range(0, total).Select(i => Task.Run(async () =>
        {
            await using var db = banco.NovoContexto();
            await Servico(db).RegistrarAsync($"u{i}@resqui.local", "reagente.baixa", "Inventário", $"concorrente {i}", RiscoAuditoria.Low);
        })));

        var cadeia = await CadeiaAsync(banco);
        cadeia.Select(e => e.Sequencia).Should().Equal(Enumerable.Range(1, total).Select(i => (long)i));
        cadeia.Select(e => e.HashAnterior).Should().OnlyHaveUniqueItems();
        var r = await VerificarAsync(banco);
        r.Integra.Should().BeTrue();
        r.TotalRegistros.Should().Be(total);
    }

    [PostgresFact]
    public async Task FusoDaSessaoDiferenteDeUtc_NaoAlteraOHash()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        var emSaoPaulo = new NpgsqlConnectionStringBuilder(banco.ConnectionString) { Timezone = "America/Sao_Paulo" }.ConnectionString;
        await using (var db = banco.NovoContexto(emSaoPaulo))
            await Servico(db).RegistrarAsync("a@resqui.local", "reagente.criar", "Inventário", "fuso", RiscoAuditoria.Low);

        (await VerificarAsync(banco)).Integra.Should().BeTrue();
    }

    [PostgresFact]
    public async Task HashCalculadoNoSql_IgualAoCSharpParaValorFixo()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await banco.ExecutarAsync("""
            INSERT INTO "Auditoria" ("Id", "Timestamp", "Who", "What", "Where", "Detail", "Risk")
            VALUES ('00000000-0000-0000-0000-000000000001', '2026-01-02 03:04:05.123456+00', 'a', 'b', 'Onde', 'Detalhe', 2)
            """);

        var elo = (await CadeiaAsync(banco)).Single();

        CadeiaAuditoria.FormatarTimestamp(elo.Timestamp).Should().Be("2026-01-02T03:04:05.123456Z");
        elo.Hash.Should().Be(CadeiaAuditoria.CalcularHash(elo));
    }

    [PostgresFact]
    public async Task UpdateDeleteETruncateDiretos_SaoRecusadosPeloBanco()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
            await Servico(db).RegistrarAsync("a@resqui.local", "reagente.criar", "Inventário", "original", RiscoAuditoria.Low);

        foreach (var sql in new[]
        {
            """UPDATE "Auditoria" SET "Detail" = 'alterado'""",
            """DELETE FROM "Auditoria" """,
            """TRUNCATE "Auditoria" """,
        })
        {
            var tentativa = () => banco.ExecutarAsync(sql);
            (await tentativa.Should().ThrowAsync<PostgresException>())
                .Which.MessageText.Should().Contain("somente de inclusão");
        }

        (await CadeiaAsync(banco)).Single().Detail.Should().Be("original");
    }

    [PostgresFact]
    public async Task GatilhoDesabilitadoPeloDono_AdulteracaoEDetectada()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            var svc = Servico(db);
            for (var i = 1; i <= 5; i++)
                await svc.RegistrarAsync("a@resqui.local", "reagente.criar", "Inventário", $"registro {i}", RiscoAuditoria.Low);
        }

        await banco.ExecutarAsync("""
            ALTER TABLE "Auditoria" DISABLE TRIGGER auditoria_bloquear_update_delete;
            UPDATE "Auditoria" SET "Detail" = 'adulterado' WHERE "Sequencia" = 3;
            ALTER TABLE "Auditoria" ENABLE TRIGGER auditoria_bloquear_update_delete;
            """);

        var r = await VerificarAsync(banco);
        r.Integra.Should().BeFalse();
        r.PrimeiraSequenciaInvalida.Should().Be(3);
    }

    [PostgresFact]
    public async Task Migracao_EncadeiaRegistrosExistentesEmOrdemDeTimestampEId()
    {
        await using var banco = await BancoDeTeste.CriarAsync(MigracaoAnterior);
        await banco.ExecutarAsync("""
            INSERT INTO "Auditoria" ("Id", "Timestamp", "Who", "What", "Where", "Detail", "Risk") VALUES
              ('00000000-0000-0000-0000-000000000003', '2026-05-01 12:00:00.000001+00', 'c', 'mtr.pdf', 'MTR', 'terceiro', 0),
              ('00000000-0000-0000-0000-000000000002', '2026-05-01 12:00:00+00', 'b', 'x', 'Y', 'mesmo instante, Id maior', 1),
              ('00000000-0000-0000-0000-000000000001', '2026-05-01 12:00:00+00', 'a', 'x', 'Y', 'mesmo instante | Id menor \ ç', 2);
            """);

        await banco.MigrarAsync();

        var cadeia = await CadeiaAsync(banco);
        cadeia.Select(e => e.Who).Should().Equal("a", "b", "c");
        cadeia.Select(e => e.Sequencia).Should().Equal(1, 2, 3);
        (await VerificarAsync(banco)).Integra.Should().BeTrue();

        await using (var db = banco.NovoContexto())
            await Servico(db).RegistrarAsync("d@resqui.local", "reagente.criar", "Inventário", "depois da migração", RiscoAuditoria.Low);
        var r = await VerificarAsync(banco);
        r.Integra.Should().BeTrue();
        // 4 é o registro da verificação anterior; 5, a inclusão feita depois da migração.
        r.UltimaSequencia.Should().Be(5);
    }
}

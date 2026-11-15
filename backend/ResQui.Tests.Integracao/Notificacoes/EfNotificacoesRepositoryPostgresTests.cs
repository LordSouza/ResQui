using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Data.Repositories;
using ResQui.Infrastructure.Identity;

namespace ResQui.Tests.Integracao.Notificacoes;

public class EfNotificacoesRepositoryPostgresTests
{
    private static Notificacao Nova(string usuarioId, bool lida, DateTime criadaEm, string referenciaId = "R-1") => new()
    {
        UsuarioId = usuarioId, Mensagem = "m", Lida = lida, CriadaEm = criadaEm,
        Tipo = "expiry", ReferenciaId = referenciaId, Severidade = "amber",
    };

    private static async Task InserirAsync(BancoDeTeste banco, params Notificacao[] notificacoes)
    {
        await using var db = banco.NovoContexto();
        foreach (var usuarioId in notificacoes.Select(n => n.UsuarioId).Distinct())
            db.Users.Add(new Usuario { Id = usuarioId, UserName = usuarioId });
        db.Notificacoes.AddRange(notificacoes);
        await db.SaveChangesAsync();
    }

    [PostgresFact]
    public async Task ExisteAsync_NotificacaoJaLida_ContaComoExistente()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await InserirAsync(banco, Nova("u-1", lida: true, DateTime.UtcNow));

        await using var db = banco.NovoContexto();
        var repo = new EfNotificacoesRepository(db);

        (await repo.ExisteAsync("u-1", "expiry", "R-1")).Should().BeTrue();
        (await repo.ExisteAsync("u-1", "expiry", "R-2")).Should().BeFalse();
        (await repo.ExisteAsync("u-2", "expiry", "R-1")).Should().BeFalse();
    }

    [PostgresFact]
    public async Task GetByUsuarioAsync_LimitaA50ComNaoLidasPrimeiro()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        var agora = DateTime.UtcNow;
        var naoLidasAntigas = Enumerable.Range(0, 3).Select(i => Nova("u-1", lida: false, agora.AddDays(-30 - i), $"N-{i}"));
        var lidasRecentes = Enumerable.Range(0, 60).Select(i => Nova("u-1", lida: true, agora.AddMinutes(-i), $"L-{i}"));
        var deOutroUsuario = Nova("u-2", lida: false, agora);
        await InserirAsync(banco, [.. naoLidasAntigas, .. lidasRecentes, deOutroUsuario]);

        await using var db = banco.NovoContexto();
        var lista = (await new EfNotificacoesRepository(db).GetByUsuarioAsync("u-1")).ToList();

        lista.Should().HaveCount(50);
        lista.Should().OnlyContain(n => n.UsuarioId == "u-1");
        lista.Take(3).Select(n => n.ReferenciaId).Should().Equal("N-0", "N-1", "N-2");
        lista.Skip(3).Should().OnlyContain(n => n.Lida).And.BeInDescendingOrder(n => n.CriadaEm);
    }

    [PostgresFact]
    public async Task ExcluirLidasCriadasAntesDeAsync_ExcluiSoAsLidasAntigas()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        var agora = DateTime.UtcNow;
        await InserirAsync(banco,
            Nova("u-1", lida: true, agora.AddDays(-100), "lida-antiga"),
            Nova("u-1", lida: true, agora.AddDays(-10), "lida-recente"),
            Nova("u-1", lida: false, agora.AddDays(-100), "nao-lida-antiga"));

        await using (var db = banco.NovoContexto())
        {
            var excluidas = await new EfNotificacoesRepository(db).ExcluirLidasCriadasAntesDeAsync(agora.AddDays(-90));
            excluidas.Should().Be(1);
        }

        await using var leitura = banco.NovoContexto();
        (await leitura.Notificacoes.Select(n => n.ReferenciaId).ToListAsync())
            .Should().BeEquivalentTo("lida-recente", "nao-lida-antiga");
    }
}

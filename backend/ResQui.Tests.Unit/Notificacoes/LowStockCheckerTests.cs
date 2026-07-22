using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Tests.Unit.Notificacoes;

public class LowStockCheckerTests
{
    private readonly IReagentesRepository _reagentes = Substitute.For<IReagentesRepository>();
    private readonly INotificacoesRepository _notifs = Substitute.For<INotificacoesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly LowStockChecker _sut;

    private static readonly UsuarioInfo Admin = new("u-admin", "admin@x.com", "Admin", null, "Admin", ["Admin"], false);

    public LowStockCheckerTests() => _sut = new LowStockChecker(_reagentes, _notifs, _auth, _email, NullLogger<LowStockChecker>.Instance);

    [Fact]
    public async Task RunAsync_EstoqueAbaixoMinimo_InsereNotificacao()
    {
        var r = new Reagente { Id = "R-00002", Nome = "Etanol", Estoque = 0.5m, EstoqueMin = 2m, Unidade = "L", Validade = DateOnly.MaxValue, Local = "Lab-201", Responsavel = "Ana" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteNaoLidaAsync("u-admin", "low-stock", "R-00002").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.Tipo == "low-stock" && n.ReferenciaId == "R-00002" && n.Severidade == "red"));
    }

    [Fact]
    public async Task RunAsync_EstoqueMinNulo_NaoInsere()
    {
        var r = new Reagente { Id = "R-00003", Nome = "Acetona", Estoque = 5m, EstoqueMin = null, Unidade = "L", Validade = DateOnly.MaxValue, Local = "Lab-201", Responsavel = "Ana" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }
}

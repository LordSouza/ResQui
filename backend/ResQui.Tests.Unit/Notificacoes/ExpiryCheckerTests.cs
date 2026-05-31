using FluentAssertions;
using NSubstitute;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Tests.Unit.Notificacoes;

public class ExpiryCheckerTests
{
    private readonly IReagentesRepository _reagentes = Substitute.For<IReagentesRepository>();
    private readonly INotificacoesRepository _notifs = Substitute.For<INotificacoesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly ExpiryChecker _sut;

    private static readonly UsuarioInfo Admin = new("u-admin", "admin@x.com", "Admin", null, "Admin", ["Admin"], false);
    private static readonly UsuarioInfo Viewer = new("u-view", "view@x.com", "View", null, "Visualizador", ["Visualizador"], false);

    public ExpiryCheckerTests() => _sut = new ExpiryChecker(_reagentes, _notifs, _auth, _email);

    [Fact]
    public async Task RunAsync_ReagenteVencendoSemNotifPrevia_InsereNotificacao()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), Estoque = 5, Unidade = "L", Local = "Lab-201", Responsavel = "Ana" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteNaoLidaAsync("u-admin", "expiry", "R-00001").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-admin" && n.Tipo == "expiry" && n.ReferenciaId == "R-00001"));
        await _notifs.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task RunAsync_NotifNaoLidaJaExiste_NaoInsere()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), Estoque = 5, Unidade = "L", Local = "Lab-201", Responsavel = "Ana" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteNaoLidaAsync("u-admin", "expiry", "R-00001").Returns(true);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }

    [Fact]
    public async Task RunAsync_VisualizadorNaoRecebeNotificacao()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)), Estoque = 5, Unidade = "L", Local = "Lab-201", Responsavel = "Ana" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Viewer]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }

    [Fact]
    public async Task RunAsync_ReagenteValidoSem30Dias_NaoInsere()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(60)), Estoque = 5, Unidade = "L", Local = "Lab-201", Responsavel = "Ana" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }
}

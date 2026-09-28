using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
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
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly ExpiryChecker _sut;

    private static readonly UsuarioInfo Admin = new("u-admin", "admin@x.com", "Professor", null, "Professor", ["Professor"], false);
    private static readonly UsuarioInfo Viewer = new("u-view", "view@x.com", "View", null, "Aluno", ["Aluno"], false);

    public ExpiryCheckerTests()
    {
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["u-admin"] = ["Lab-201"],
        });
        _sut = new ExpiryChecker(_reagentes, _notifs, _auth, _email, _usuarioLabs, NullLogger<ExpiryChecker>.Instance);
    }

    [Fact]
    public async Task RunAsync_ReagenteVencendoSemNotifPrevia_InsereNotificacao()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteNaoLidaAsync("u-admin", "expiry", "R-00001").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-admin" && n.Tipo == "expiry" && n.ReferenciaId == "R-00001"));
        await _notifs.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task RunAsync_ReagenteJaVencido_NaoAnunciaDiasNegativos()
    {
        var r = new Reagente { Id = "R-00007", Nome = "Éter", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-45)), Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteNaoLidaAsync("u-admin", "expiry", "R-00007").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(
            n => n.Mensagem.Contains("venceu há 45 dia(s)") && !n.Mensagem.Contains("-45")));
    }

    [Fact]
    public async Task RunAsync_NotifNaoLidaJaExiste_NaoInsere()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteNaoLidaAsync("u-admin", "expiry", "R-00001").Returns(true);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }

    [Fact]
    public async Task RunAsync_VisualizadorNaoRecebeNotificacao()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)), Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Viewer]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }

    [Fact]
    public async Task RunAsync_ReagenteValidoSem30Dias_NaoInsere()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(60)), Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }

    [Fact]
    public async Task RunAsync_AvisaSoOProfessorDoLaboratorioDoReagente()
    {
        var professorDeOutroLaboratorio = new UsuarioInfo("u-outro", "outro@x.com", "Outro", null, "Professor", ["Professor"], false);
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin, professorDeOutroLaboratorio]);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-admin"));
        await _notifs.DidNotReceive().AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-outro"));
    }

    [Fact]
    public async Task RunAsync_ReagenteSemLaboratorio_AvisaOsAdmins()
    {
        var administrador = new UsuarioInfo("u-adm", "adm@x.com", "Adm", null, "Admin", ["Admin"], false);
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), Estoque = 5, Unidade = "L" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin, administrador]);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-adm"));
        await _notifs.DidNotReceive().AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-admin"));
    }
}

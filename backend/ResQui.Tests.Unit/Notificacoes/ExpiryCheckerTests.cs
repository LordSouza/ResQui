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
        _notifs.ExisteAsync("u-admin", "expiry", "R-00001").Returns(false);

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
        _notifs.ExisteAsync("u-admin", "expiry", "R-00007").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(
            n => n.Mensagem.Contains("venceu há 45 dia(s)") && !n.Mensagem.Contains("-45")));
    }

    [Fact]
    public async Task RunAsync_NotifJaExiste_NaoInsere()
    {
        var r = new Reagente { Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201" };
        _reagentes.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteAsync("u-admin", "expiry", "R-00001").Returns(true);

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

    private static Reagente Vencendo() => new()
    {
        Id = "R-00001", Nome = "Acetona", Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
        Estoque = 5, Unidade = "L", LaboratorioId = "Lab-201",
    };

    private static readonly UsuarioInfo Colega = new("u-colega", "colega@x.com", "Colega", null, "Professor", ["Professor"], false);

    private void DoisProfessoresComEmailLigado()
    {
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["u-admin"] = ["Lab-201"],
            ["u-colega"] = ["Lab-201"],
        });
        _auth.GetAllAsync().Returns([Admin, Colega]);
        _auth.GetNotificacaoPrefsJsonAsync(Arg.Any<string>()).Returns("{\"expiry\":true}");
    }

    [Fact]
    public async Task RunAsync_SalvaAsNotificacoesAntesDeEnviarOsEmails()
    {
        _reagentes.GetAllAsync().Returns([Vencendo()]);
        DoisProfessoresComEmailLigado();

        await _sut.RunAsync();

        Received.InOrder(() =>
        {
            _notifs.SaveChangesAsync();
            _email.SendAsync("admin@x.com", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
            _email.SendAsync("colega@x.com", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        });
    }

    [Fact]
    public async Task RunAsync_FalhaAoSalvar_NaoEnviaEmail()
    {
        _reagentes.GetAllAsync().Returns([Vencendo()]);
        DoisProfessoresComEmailLigado();
        _notifs.SaveChangesAsync().Returns(Task.FromException(new InvalidOperationException("banco fora")));

        var act = () => _sut.RunAsync();

        await act.Should().ThrowAsync<InvalidOperationException>();
        await _email.DidNotReceiveWithAnyArgs().SendAsync(default!, default!, default!, default);
    }

    [Fact]
    public async Task RunAsync_FalhaNoPrimeiroEmail_AindaEnviaOsSeguintes()
    {
        _reagentes.GetAllAsync().Returns([Vencendo()]);
        DoisProfessoresComEmailLigado();
        _email.SendAsync("admin@x.com", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromException(new InvalidOperationException("smtp fora")));

        await _sut.RunAsync();

        await _email.Received(1).SendAsync("colega@x.com", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task RunAsync_RepassaOCancellationTokenAoEnvio()
    {
        _reagentes.GetAllAsync().Returns([Vencendo()]);
        DoisProfessoresComEmailLigado();
        using var cts = new CancellationTokenSource();

        await _sut.RunAsync(cts.Token);

        await _email.Received(2).SendAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), cts.Token);
    }

    [Fact]
    public async Task RunAsync_CanceladoDuranteOsEnvios_PropagaEInterrompe()
    {
        _reagentes.GetAllAsync().Returns([Vencendo()]);
        DoisProfessoresComEmailLigado();
        using var cts = new CancellationTokenSource();
        _email.SendAsync("admin@x.com", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(_ => { cts.Cancel(); return Task.FromException(new OperationCanceledException(cts.Token)); });

        var act = () => _sut.RunAsync(cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        await _email.DidNotReceive().SendAsync("colega@x.com", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }
}

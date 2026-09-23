using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Tests.Unit.Notificacoes;

public class ColetaCheckerTests
{
    private readonly IResiduosRepository _residuos = Substitute.For<IResiduosRepository>();
    private readonly INotificacoesRepository _notifs = Substitute.For<INotificacoesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly ColetaChecker _sut;

    private static readonly UsuarioInfo Professor = new("u-prof", "prof@x.com", "Professor", null, "Professor", ["Professor"], false);
    private static readonly UsuarioInfo Outro = new("u-outro", "outro@x.com", "Outro", null, "Professor", ["Professor"], false);
    private static readonly UsuarioInfo Admin = new("u-adm", "adm@x.com", "Admin", null, "Admin", ["Admin"], false);

    private static Residuo Atrasado(int id = 10, string labId = "Lab-001") => new()
    {
        Id = id, Descricao = "Solvente", Status = "aguardando-coleta",
        DataRegistro = DateTime.UtcNow.AddDays(-10), LaboratorioId = labId,
        Tipo = "solvente", Volume = 5, Unidade = "L", Composicao = "", Risco = "medio",
    };

    private void Vinculos(Dictionary<string, IReadOnlyList<string>> mapa) =>
        _usuarioLabs.DeTodosAsync().Returns(mapa);

    public ColetaCheckerTests()
    {
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["u-prof"] = ["Lab-001"],
        });
        _sut = new ColetaChecker(_residuos, _notifs, _auth, _email, _usuarioLabs, NullLogger<ColetaChecker>.Instance);
    }

    [Fact]
    public async Task RunAsync_ResiduoAtrasadoSemNotif_InsereParaProfessor()
    {
        var r = new Residuo { Id = 10, Descricao = "Solvente", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-10), LaboratorioId = "Lab-001", Tipo = "solvente", Volume = 5, Unidade = "L", Composicao = "", Risco = "medio" };
        _residuos.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Professor]);
        _notifs.ExisteNaoLidaAsync("u-prof", "coleta", "10").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.Tipo == "coleta" && n.ReferenciaId == "10" && n.UsuarioId == "u-prof"));
    }

    [Fact]
    public async Task RunAsync_ResiduoRecente_NaoInsere()
    {
        var r = new Residuo { Id = 11, Descricao = "Ácido", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-2), LaboratorioId = "Lab-001", Tipo = "acido", Volume = 2, Unidade = "L", Composicao = "", Risco = "alto" };
        _residuos.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Professor]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }

    [Fact]
    public async Task RunAsync_NotificaSoQuemRespondePeloLaboratorioDoResiduo()
    {
        _residuos.GetAllAsync().Returns([Atrasado(10, "Lab-001")]);
        _auth.GetAllAsync().Returns([Professor, Outro]);
        Vinculos(new Dictionary<string, IReadOnlyList<string>>
        {
            ["u-prof"] = ["Lab-001"],
            ["u-outro"] = ["Lab-002"],
        });
        _notifs.ExisteNaoLidaAsync(Arg.Any<string>(), "coleta", "10").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-prof"));
        await _notifs.DidNotReceive().AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-outro"));
    }

    [Fact]
    public async Task RunAsync_LaboratorioSemProfessor_NotificaOsAdmins()
    {
        _residuos.GetAllAsync().Returns([Atrasado(12, "Lab-009")]);
        _auth.GetAllAsync().Returns([Professor, Admin]);
        Vinculos(new Dictionary<string, IReadOnlyList<string>> { ["u-prof"] = ["Lab-001"] });
        _notifs.ExisteNaoLidaAsync(Arg.Any<string>(), "coleta", "12").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-adm"));
        await _notifs.DidNotReceive().AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-prof"));
    }

    [Fact]
    public async Task RunAsync_ProfessorArquivado_NaoRecebe()
    {
        var arquivado = new UsuarioInfo("u-prof", "prof@x.com", "Professor", null, "Professor", ["Professor"], true);
        _residuos.GetAllAsync().Returns([Atrasado()]);
        _auth.GetAllAsync().Returns([arquivado]);
        _notifs.ExisteNaoLidaAsync(Arg.Any<string>(), "coleta", "10").Returns(false);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-prof"));
    }
}

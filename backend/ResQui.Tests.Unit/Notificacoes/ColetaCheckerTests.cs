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
    private readonly ColetaChecker _sut;

    private static readonly UsuarioInfo Admin = new("u-admin", "admin@x.com", "Professor", null, "Professor", ["Professor"], false);

    public ColetaCheckerTests() => _sut = new ColetaChecker(_residuos, _notifs, _auth, _email, NullLogger<ColetaChecker>.Instance);

    [Fact]
    public async Task RunAsync_ResiduoAtrasadoSemNotif_InsereParaAdminGestor()
    {
        var r = new Residuo { Id = 10, Descricao = "Solvente", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-10), LaboratorioId = "Lab-001", Tipo = "solvente", Volume = 5, Unidade = "L", Composicao = "", Risco = "medio" };
        _residuos.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);
        _notifs.ExisteNaoLidaAsync("u-admin", "coleta", "10").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.Tipo == "coleta" && n.ReferenciaId == "10" && n.UsuarioId == "u-admin"));
    }

    [Fact]
    public async Task RunAsync_ResiduoRecente_NaoInsere()
    {
        var r = new Residuo { Id = 11, Descricao = "Ácido", Status = "aguardando-coleta", DataRegistro = DateTime.UtcNow.AddDays(-2), LaboratorioId = "Lab-001", Tipo = "acido", Volume = 2, Unidade = "L", Composicao = "", Risco = "alto" };
        _residuos.GetAllAsync().Returns([r]);
        _auth.GetAllAsync().Returns([Admin]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }
}

using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Tests.Unit.Notificacoes;

public class SinirCheckerTests
{
    private readonly IMtrsRepository _mtrs = Substitute.For<IMtrsRepository>();
    private readonly INotificacoesRepository _notifs = Substitute.For<INotificacoesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly SinirChecker _sut;

    private static readonly UsuarioInfo Gestor = new("u-ges", "ges@x.com", "Gestor", null, "Gestor", ["Gestor"], false);
    private static readonly UsuarioInfo Tecnico = new("u-tec", "tec@x.com", "Tec", null, "Tecnico", ["Tecnico"], false);

    public SinirCheckerTests() => _sut = new SinirChecker(_mtrs, _notifs, _auth, _email, NullLogger<SinirChecker>.Instance);

    [Fact]
    public async Task RunAsync_MtrRascunhoAntigoSemNotif_InsereParaGestores()
    {
        var mtr = new Mtr { Id = 1, Numero = "MTR-2026-001", Status = MtrStatus.Rascunho, DataEmissao = DateTime.UtcNow.AddDays(-3), Gerador = "Lab", Transportadora = "Trans" };
        _mtrs.GetAllAsync().Returns([mtr]);
        _auth.GetAllAsync().Returns([Gestor, Tecnico]);
        _notifs.ExisteNaoLidaAsync("u-ges", "sinir", "1").Returns(false);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-ges" && n.Tipo == "sinir" && n.ReferenciaId == "1"));
        await _notifs.DidNotReceive().AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-tec"));
    }

    [Fact]
    public async Task RunAsync_MtrRecente_NaoInsere()
    {
        var mtr = new Mtr { Id = 2, Numero = "MTR-2026-002", Status = MtrStatus.Rascunho, DataEmissao = DateTime.UtcNow.AddHours(-1), Gerador = "Lab", Transportadora = "Trans" };
        _mtrs.GetAllAsync().Returns([mtr]);
        _auth.GetAllAsync().Returns([Gestor]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }
}

using ResQui.Tests.Unit.Common;
// backend/ResQui.Tests.Unit/Notificacoes/NotificacoesServiceTests.cs
using FluentAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ResQui.Domain.Enums;
using ResQui.Application.Auditoria;
using ResQui.Application.Notificacoes;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Notificacoes;

public class NotificacoesServiceTests
{
    private readonly INotificacoesRepository _repo = Substitute.For<INotificacoesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly NotificacoesService _sut;

    private readonly IAuditoriaService _auditoria = Substitute.For<IAuditoriaService>();

    private readonly ILogger<NotificacoesService> _logger = Substitute.For<ILogger<NotificacoesService>>();

    public NotificacoesServiceTests() => _sut = new NotificacoesService(_repo, _auth, _auditoria, _logger, new TransacoesDiretas());

    [Fact]
    public async Task CriarAsync_PersisteNotificacaoComOsCamposInformados()
    {
        Notificacao? capturada = null;
        await _repo.AddAsync(Arg.Do<Notificacao>(n => capturada = n));

        await _sut.CriarAsync("u-1", "Mensagem de teste", "compat", "R-1|R-2", "red");

        capturada.Should().NotBeNull();
        capturada!.UsuarioId.Should().Be("u-1");
        capturada.Mensagem.Should().Be("Mensagem de teste");
        capturada.Tipo.Should().Be("compat");
        capturada.ReferenciaId.Should().Be("R-1|R-2");
        capturada.Severidade.Should().Be("red");
        capturada.Lida.Should().BeFalse();
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task MarcarComoLidaAsync_RepassaDonoAoRepositorio()
    {
        await _sut.MarcarComoLidaAsync(5, "u-1");

        await _repo.Received(1).MarkAsReadAsync(5, "u-1");
    }

    [Fact]
    public async Task GetPrefsAsync_JsonVazio_RetornaTudoDesligado()
    {
        _auth.GetNotificacaoPrefsJsonAsync("u-1").Returns("");

        var prefs = await _sut.GetPrefsAsync("u-1");

        prefs.Should().Be(new NotificacaoPrefsDto(false, false, false, false));
    }

    [Fact]
    public async Task GetPrefsAsync_JsonInvalido_RetornaTudoDesligadoELogaAviso()
    {
        _auth.GetNotificacaoPrefsJsonAsync("u-1").Returns("{corrompido");

        var prefs = await _sut.GetPrefsAsync("u-1");

        prefs.Should().Be(new NotificacaoPrefsDto(false, false, false, false));
        _logger.ReceivedCalls()
            .Where(c => c.GetMethodInfo().Name == nameof(ILogger.Log) && (LogLevel)c.GetArguments()[0]! == LogLevel.Warning)
            .Should().ContainSingle()
            .Which.GetArguments()[2]!.ToString().Should().Contain("u-1");
    }

    [Fact]
    public async Task SavePrefsAsync_RegistraAuditoriaComOsValoresGravados()
    {
        _auth.FindByIdAsync("u-1").Returns(new UsuarioInfo("u-1", "ana@lab.com", "Ana", null, "Aluno", [], false));

        await _sut.SavePrefsAsync("u-1", new NotificacaoPrefsDto(true, false, true, false));

        await _auditoria.Received(1).RegistrarAsync("ana@lab.com", "user.notificacao-prefs", "Conta",
            "Alterou preferências de e-mail: expiry=on, low-stock=off, compat=on, coleta=off", RiscoAuditoria.Low);
    }

    [Fact]
    public async Task MarcarComoLidaAsync_QuandoMuda_RegistraAuditoria()
    {
        _repo.MarkAsReadAsync(5, "u-1").Returns(true);
        _auth.FindByIdAsync("u-1").Returns(new UsuarioInfo("u-1", "ana@lab.com", "Ana", null, "Aluno", [], false));

        await _sut.MarcarComoLidaAsync(5, "u-1");

        await _auditoria.Received(1).RegistrarAsync("ana@lab.com", "notificacao.lida", "Conta",
            "Marcou a notificação 5 como lida", RiscoAuditoria.Low);
    }

    [Fact]
    public async Task MarcarComoLidaAsync_JaLidaOuAlheia_NaoRegistra()
    {
        _repo.MarkAsReadAsync(5, "u-1").Returns(false);

        await _sut.MarcarComoLidaAsync(5, "u-1");

        await _auditoria.DidNotReceive().RegistrarAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task MarcarTodasLidasAsync_RegistraQuantidade()
    {
        _repo.MarcarTodasLidasAsync("u-1").Returns(3);
        _auth.FindByIdAsync("u-1").Returns(new UsuarioInfo("u-1", "ana@lab.com", "Ana", null, "Aluno", [], false));

        await _sut.MarcarTodasLidasAsync("u-1");

        await _auditoria.Received(1).RegistrarAsync("ana@lab.com", "notificacao.todas-lidas", "Conta",
            "Marcou 3 notificação(ões) como lida(s)", RiscoAuditoria.Low);
    }

    [Fact]
    public async Task MarcarTodasLidasAsync_NadaPendente_NaoRegistra()
    {
        _repo.MarcarTodasLidasAsync("u-1").Returns(0);

        await _sut.MarcarTodasLidasAsync("u-1");

        await _auditoria.DidNotReceive().RegistrarAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }
}

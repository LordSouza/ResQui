// backend/ResQui.Tests.Unit/Notificacoes/NotificacoesServiceTests.cs
using FluentAssertions;
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

    public NotificacoesServiceTests() => _sut = new NotificacoesService(_repo, _auth, _auditoria);

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
    public async Task GetPrefsAsync_JsonInvalido_RetornaTudoDesligado()
    {
        _auth.GetNotificacaoPrefsJsonAsync("u-1").Returns("{corrompido");

        var prefs = await _sut.GetPrefsAsync("u-1");

        prefs.Should().Be(new NotificacaoPrefsDto(false, false, false, false));
    }

    [Fact]
    public async Task SavePrefsAsync_RegistraAuditoriaComOsValoresGravados()
    {
        _auth.FindByIdAsync("u-1").Returns(new UsuarioInfo("u-1", "ana@lab.com", "Ana", null, "Aluno", [], false));

        await _sut.SavePrefsAsync("u-1", new NotificacaoPrefsDto(true, false, true, false));

        await _auditoria.Received(1).RegistrarAsync("ana@lab.com", "user.notificacao-prefs", "Conta",
            "Alterou preferências de e-mail: expiry=on, low-stock=off, compat=on, coleta=off", RiscoAuditoria.Low);
    }
}

// backend/ResQui.Tests.Unit/Notificacoes/NotificacoesServiceTests.cs
using FluentAssertions;
using NSubstitute;
using ResQui.Application.Notificacoes;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Notificacoes;

public class NotificacoesServiceTests
{
    private readonly INotificacoesRepository _repo = Substitute.For<INotificacoesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly NotificacoesService _sut;

    public NotificacoesServiceTests() => _sut = new NotificacoesService(_repo, _auth);

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
}

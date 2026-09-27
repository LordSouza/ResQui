using FluentAssertions;
using ResQui.Application.Auth;

namespace ResQui.Tests.Unit.Auth;

public class FalhasLoginPorIpTests
{
    private sealed class RelogioFake : TimeProvider
    {
        public DateTimeOffset Agora { get; set; } = new(2026, 9, 27, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Agora;
    }

    private readonly RelogioFake _relogio = new();

    private FalhasLoginPorIp Criar(int max = 3) =>
        new(max, TimeSpan.FromMinutes(10), _relogio);

    [Fact]
    public void EstaBloqueado_AbaixoDoTeto_NaoBloqueia()
    {
        var sut = Criar(max: 3);
        sut.RegistrarFalha("10.0.0.1");
        sut.RegistrarFalha("10.0.0.1");

        sut.EstaBloqueado("10.0.0.1").Should().BeFalse();
    }

    [Fact]
    public void EstaBloqueado_NoTeto_Bloqueia()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 3; i++) sut.RegistrarFalha("10.0.0.1");

        sut.EstaBloqueado("10.0.0.1").Should().BeTrue();
    }

    [Fact]
    public void RegistrarFalha_SoAFalhaQueAtingeOTetoDevolveTrue()
    {
        var sut = Criar(max: 3);

        var retornos = Enumerable.Range(0, 5).Select(_ => sut.RegistrarFalha("10.0.0.1")).ToList();

        retornos.Should().Equal(false, false, true, false, false);
    }

    [Fact]
    public void EstaBloqueado_ContaPorIp_NaoMisturaEnderecos()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 3; i++) sut.RegistrarFalha("10.0.0.1");

        sut.EstaBloqueado("10.0.0.2").Should().BeFalse();
    }

    [Fact]
    public void EstaBloqueado_DepoisDaJanela_Libera()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 3; i++) sut.RegistrarFalha("10.0.0.1");

        _relogio.Agora += TimeSpan.FromMinutes(10);

        sut.EstaBloqueado("10.0.0.1").Should().BeFalse();
    }

    [Fact]
    public void RegistrarFalha_AcimaDoGate_PodaJanelasExpiradas()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 1024; i++) sut.RegistrarFalha($"ip-{i}");

        _relogio.Agora += TimeSpan.FromMinutes(10);
        sut.RegistrarFalha("10.0.0.1");

        sut.EntradasEmMemoria.Should().Be(1);
    }
}

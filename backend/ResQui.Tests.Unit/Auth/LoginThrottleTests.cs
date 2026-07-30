using FluentAssertions;
using ResQui.Application.Auth;

namespace ResQui.Tests.Unit.Auth;

public class LoginThrottleTests
{
    private sealed class RelogioFake : TimeProvider
    {
        public DateTimeOffset Agora { get; set; } = new(2026, 7, 30, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Agora;
    }

    private readonly RelogioFake _relogio = new();

    private LoginThrottle Criar(int max = 3) =>
        new(max, TimeSpan.FromSeconds(60), _relogio);

    [Fact]
    public void TentarConsumir_DentroDoLimite_Permite()
    {
        var sut = Criar(max: 3);
        sut.TentarConsumir("ana@lab.com").Should().BeTrue();
        sut.TentarConsumir("ana@lab.com").Should().BeTrue();
        sut.TentarConsumir("ana@lab.com").Should().BeTrue();
    }

    [Fact]
    public void TentarConsumir_AcimaDoLimite_Recusa()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 3; i++) sut.TentarConsumir("ana@lab.com");
        sut.TentarConsumir("ana@lab.com").Should().BeFalse();
    }

    [Fact]
    public void TentarConsumir_ContaPorEmail_NaoMisturaContas()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 3; i++) sut.TentarConsumir("ana@lab.com");
        sut.TentarConsumir("bruno@lab.com").Should().BeTrue();
    }

    [Fact]
    public void TentarConsumir_NormalizaCaixaEEspacos()
    {
        var sut = Criar(max: 3);
        sut.TentarConsumir("ana@lab.com");
        sut.TentarConsumir("  ANA@Lab.com  ");
        sut.TentarConsumir("Ana@LAB.com");
        // as três acima são a mesma chave → a quarta estoura o limite de 3
        sut.TentarConsumir("ana@lab.com").Should().BeFalse();
    }

    [Fact]
    public void Zerar_DevolveOsPermits()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 3; i++) sut.TentarConsumir("ana@lab.com");
        sut.Zerar("ana@lab.com");
        sut.TentarConsumir("ana@lab.com").Should().BeTrue();
    }

    [Fact]
    public void TentarConsumir_JanelaExpirada_Reabre()
    {
        var sut = Criar(max: 3);
        for (var i = 0; i < 3; i++) sut.TentarConsumir("ana@lab.com");
        sut.TentarConsumir("ana@lab.com").Should().BeFalse();

        _relogio.Agora = _relogio.Agora.AddSeconds(61);

        sut.TentarConsumir("ana@lab.com").Should().BeTrue();
    }

    [Fact]
    public void TentarConsumir_PodaJanelasExpiradas()
    {
        var sut = Criar(max: 3);
        // Acima do gate de poda (1024) para que a varredura seja acionada.
        for (var i = 0; i < 1100; i++) sut.TentarConsumir($"user{i}@lab.com");
        sut.EntradasEmMemoria.Should().Be(1100);

        _relogio.Agora = _relogio.Agora.AddSeconds(61);
        sut.TentarConsumir("novo@lab.com");

        // as 1100 expiraram e foram removidas; sobra apenas a nova
        sut.EntradasEmMemoria.Should().Be(1);
    }
}

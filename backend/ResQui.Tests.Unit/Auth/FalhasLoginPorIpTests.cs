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

    private FalhasLoginPorIp Criar(int maxPorEmail = 3, int maxEmails = 4) =>
        new(maxPorEmail, maxEmails, TimeSpan.FromMinutes(10), _relogio);

    private static void Falhar(FalhasLoginPorIp sut, string ip, string email, int vezes)
    {
        for (var i = 0; i < vezes; i++) sut.RegistrarFalha(ip, email);
    }

    [Fact]
    public void TempoAteLiberar_AbaixoDoTetoDoPar_NaoBloqueia()
    {
        var sut = Criar(maxPorEmail: 3);
        Falhar(sut, "10.0.0.1", "ana@lab.com", 2);

        sut.TempoAteLiberar("10.0.0.1", "ana@lab.com").Should().BeNull();
    }

    [Fact]
    public void TempoAteLiberar_NoTetoDoPar_BloqueiaComORestanteDaJanela()
    {
        var sut = Criar(maxPorEmail: 3);
        Falhar(sut, "10.0.0.1", "ana@lab.com", 3);
        _relogio.Agora += TimeSpan.FromMinutes(4);

        sut.TempoAteLiberar("10.0.0.1", "ana@lab.com").Should().Be(TimeSpan.FromMinutes(6));
    }

    [Fact]
    public void TempoAteLiberar_ParBloqueado_NaoAfetaOutroEmailDaMesmaRede()
    {
        var sut = Criar(maxPorEmail: 3);
        Falhar(sut, "10.0.0.1", "ana@lab.com", 3);

        sut.TempoAteLiberar("10.0.0.1", "bia@lab.com").Should().BeNull();
    }

    [Fact]
    public void TempoAteLiberar_ParBloqueado_NaoAfetaOMesmoEmailDeOutraRede()
    {
        var sut = Criar(maxPorEmail: 3);
        Falhar(sut, "10.0.0.1", "ana@lab.com", 3);

        sut.TempoAteLiberar("10.0.0.2", "ana@lab.com").Should().BeNull();
    }

    [Fact]
    public void TempoAteLiberar_NormalizaCaixaEEspacosDoEmail()
    {
        var sut = Criar(maxPorEmail: 3);
        sut.RegistrarFalha("10.0.0.1", "Ana@Lab.com");
        sut.RegistrarFalha("10.0.0.1", " ana@lab.com ");
        sut.RegistrarFalha("10.0.0.1", "ANA@LAB.COM");

        sut.TempoAteLiberar("10.0.0.1", "ana@lab.com").Should().NotBeNull();
    }

    [Fact]
    public void TempoAteLiberar_MuitosEmailsDistintosFalhando_BloqueiaARedeInteira()
    {
        var sut = Criar(maxEmails: 4);
        for (var i = 0; i < 4; i++) sut.RegistrarFalha("10.0.0.1", $"u{i}@lab.com");

        sut.TempoAteLiberar("10.0.0.1", "quem-nunca-errou@lab.com").Should().NotBeNull();
        sut.TempoAteLiberar("10.0.0.2", "quem-nunca-errou@lab.com").Should().BeNull();
    }

    [Fact]
    public void TempoAteLiberar_MesmoEmailRepetido_NaoContaComoEmailDistinto()
    {
        var sut = Criar(maxPorEmail: 100, maxEmails: 4);
        Falhar(sut, "10.0.0.1", "ana@lab.com", 10);

        sut.TempoAteLiberar("10.0.0.1", "bia@lab.com").Should().BeNull();
    }

    [Fact]
    public void RegistrarFalha_SoAFalhaQueAtingeOTetoDeEmailsDevolveTrue()
    {
        var sut = Criar(maxPorEmail: 100, maxEmails: 3);

        var retornos = new[] { "a", "a", "b", "c", "d", "c" }
            .Select(e => sut.RegistrarFalha("10.0.0.1", $"{e}@lab.com")).ToList();

        retornos.Should().Equal(false, false, false, true, false, false);
    }

    [Fact]
    public void TempoAteLiberar_DepoisDaJanela_Libera()
    {
        var sut = Criar(maxPorEmail: 3, maxEmails: 1);
        Falhar(sut, "10.0.0.1", "ana@lab.com", 3);

        _relogio.Agora += TimeSpan.FromMinutes(10);

        sut.TempoAteLiberar("10.0.0.1", "ana@lab.com").Should().BeNull();
    }

    [Fact]
    public void TempoAteLiberar_Ipv6_AgrupaPorPrefixo64()
    {
        var sut = Criar(maxPorEmail: 3);
        sut.RegistrarFalha("2001:db8:1:2::a", "ana@lab.com");
        sut.RegistrarFalha("2001:db8:1:2::b", "ana@lab.com");
        sut.RegistrarFalha("2001:db8:1:2:ffff:ffff:ffff:ffff", "ana@lab.com");

        sut.TempoAteLiberar("2001:db8:1:2::c", "ana@lab.com").Should().NotBeNull();
        sut.TempoAteLiberar("2001:db8:1:3::a", "ana@lab.com").Should().BeNull();
    }

    [Fact]
    public void TempoAteLiberar_Ipv4MapeadoEmIpv6_ContaComoOProprioIpv4()
    {
        var sut = Criar(maxPorEmail: 3);
        Falhar(sut, "::ffff:10.0.0.1", "ana@lab.com", 3);

        sut.TempoAteLiberar("10.0.0.1", "ana@lab.com").Should().NotBeNull();
        sut.TempoAteLiberar("::ffff:10.0.0.2", "ana@lab.com").Should().BeNull();
    }

    [Fact]
    public void RegistrarFalha_OrigemNoTetoDeEmails_NaoGuardaEmailsNovos()
    {
        var sut = Criar(maxPorEmail: 100, maxEmails: 3);
        for (var i = 0; i < 50; i++) sut.RegistrarFalha("10.0.0.1", $"u{i}@lab.com");

        // 1 janela da origem + 3 pares: o resto da rajada não ocupa memória.
        sut.EntradasEmMemoria.Should().Be(4);
    }

    [Fact]
    public void RegistrarFalha_AcimaDoGate_PodaJanelasExpiradas()
    {
        var sut = Criar();
        for (var i = 0; i < 1024; i++) sut.RegistrarFalha($"ip-{i}", "ana@lab.com");

        _relogio.Agora += TimeSpan.FromMinutes(10);
        sut.RegistrarFalha("10.0.0.1", "ana@lab.com");

        sut.EntradasEmMemoria.Should().Be(2);
    }
}

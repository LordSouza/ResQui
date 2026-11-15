using ResQui.Tests.Unit.Common;
using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Auth;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auth;

public class AuthSegurancaTests
{
    private readonly IAuthRepository _repo = Substitute.For<IAuthRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ISessoesRepository _sessoes = Substitute.For<ISessoesRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly ILoginThrottle _throttle = Substitute.For<ILoginThrottle>();
    private readonly JwtOptions _jwt = new() { Key = "secret-key-32-chars-long-enough!!", Issuer = "resqui", Audience = "resqui-app", ExpirationHours = 8 };
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly AuthService _sut;

    public AuthSegurancaTests()
    {
        _sut = new AuthService(_repo, _jwt, _audit, _sessoes, _email, _throttle, _usuarioLabs, Substitute.For<ILaboratoriosRepository>(), Substitute.For<IFalhasLoginPorIp>(), new TransacoesDiretas());
        // Sem isto, TentarConsumir devolve false (default de bool) e todo login destes testes
        // morre no throttle.
        _throttle.TentarConsumir(Arg.Any<string>()).Returns(true);
    }

    private static UsuarioInfo User2fa(bool twoFactor) =>
        new("u1", "ana@lab.com", "Ana", "M1", "Professor", ["Professor"], false, twoFactor);

    [Fact]
    public async Task Login_Com2faSemCodigo_RetornaRequires2fa()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User2fa(true));
        _repo.CheckPasswordAsync("u1", "ok").Returns(true);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "ok"));

        r!.Requires2fa.Should().BeTrue();
        r.Token.Should().BeNull();
        await _sessoes.DidNotReceive().AddAsync(Arg.Any<SessaoToken>());
    }

    [Fact]
    public async Task Login_Com2faCodigoInvalido_RetornaNull()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User2fa(true));
        _repo.CheckPasswordAsync("u1", "ok").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("u1", "000000").Returns(false);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "ok", "000000"));

        r.Should().BeNull();
    }

    [Fact]
    public async Task Login_Com2faCodigoValido_EmiteTokenECriaSessao()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User2fa(true));
        _repo.CheckPasswordAsync("u1", "ok").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("u1", "123456").Returns(true);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "ok", "123456"), "Chrome");

        r!.Requires2fa.Should().BeFalse();
        r.Token!.Token.Should().NotBeNullOrEmpty();
        await _sessoes.Received(1).AddAsync(Arg.Is<SessaoToken>(s => s.UsuarioId == "u1" && s.UserAgent == "Chrome"));
    }

    [Fact]
    public async Task Login_SemTwoFactor_NaoExigeCodigo()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User2fa(false));
        _repo.CheckPasswordAsync("u1", "ok").Returns(true);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "ok"));

        r!.Requires2fa.Should().BeFalse();
        r.Token.Should().NotBeNull();
    }

    [Fact]
    public async Task AlterarSenha_SenhaAtualErrada_LancaValidationException()
    {
        _repo.ChangePasswordAsync("u1", "errada", "NovaSenha@1").Returns(false);
        var act = () => _sut.AlterarSenhaAsync("u1", new AlterarSenhaCmd("errada", "NovaSenha@1"), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AlterarSenha_Sucesso_RegistraAuditoria()
    {
        _repo.ChangePasswordAsync("u1", "atual", "NovaSenha@1").Returns(true);
        await _sut.AlterarSenhaAsync("u1", new AlterarSenhaCmd("atual", "NovaSenha@1"), "ana@lab.com");
        await _audit.Received(1).RegistrarAsync("ana@lab.com", "user.alterar-senha", "Auth", Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task Ativar2fa_CodigoInvalido_NaoHabilita()
    {
        _repo.FindByIdAsync("u1").Returns(User2fa(false));
        _repo.VerifyTwoFactorCodeAsync("u1", "bad").Returns(false);
        var act = () => _sut.Ativar2faAsync("u1", "bad", "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().SetTwoFactorEnabledAsync(Arg.Any<string>(), Arg.Any<bool>());
    }

    [Fact]
    public async Task Ativar2fa_CodigoValido_Habilita()
    {
        _repo.FindByIdAsync("u1").Returns(User2fa(false));
        _repo.VerifyTwoFactorCodeAsync("u1", "123456").Returns(true);
        await _sut.Ativar2faAsync("u1", "123456", "ana@lab.com");
        await _repo.Received(1).SetTwoFactorEnabledAsync("u1", true);
    }

    [Fact]
    public async Task Desativar2fa_Com2faAtivo_Desativa()
    {
        _repo.FindByIdAsync("u1").Returns(User2fa(true));
        _repo.VerifyTwoFactorCodeAsync("u1", "123456").Returns(true);
        await _sut.Desativar2faAsync("u1", "123456", "ana@lab.com");
        await _repo.Received(1).SetTwoFactorEnabledAsync("u1", false);
    }

    // Um POST repetido em /2fa/desativar não pode queimar um código de recuperação (o resgate é
    // destrutivo e o Identity não apaga os códigos ao desligar a flag) nem gravar auditoria High.
    [Fact]
    public async Task Desativar2fa_Com2faJaDesativado_NaoResgataCodigoNemAudita()
    {
        _repo.FindByIdAsync("u1").Returns(User2fa(false));
        _repo.ResgatarCodigoRecuperacaoAsync("u1", Arg.Any<string>()).Returns(true);

        var act = () => _sut.Desativar2faAsync("u1", "abcd-efgh", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().ResgatarCodigoRecuperacaoAsync(Arg.Any<string>(), Arg.Any<string>());
        await _repo.DidNotReceive().SetTwoFactorEnabledAsync(Arg.Any<string>(), Arg.Any<bool>());
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), "user.2fa-desativado", Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task RevogarSessao_DeOutroUsuario_NaoRevoga()
    {
        _sessoes.GetByJtiAsync("jx").Returns(new SessaoToken { Jti = "jx", UsuarioId = "outro" });
        var ok = await _sut.RevogarSessaoAsync("u1", "jx", "ana@lab.com");
        ok.Should().BeFalse();
        await _sessoes.DidNotReceive().UpdateAsync(Arg.Any<SessaoToken>());
    }

    [Fact]
    public async Task RevogarOutras_MantemSessaoAtual()
    {
        _sessoes.GetAtivasByUsuarioAsync("u1").Returns(new[]
        {
            new SessaoToken { Jti = "atual", UsuarioId = "u1" },
            new SessaoToken { Jti = "outra1", UsuarioId = "u1" },
            new SessaoToken { Jti = "outra2", UsuarioId = "u1" },
        });

        var n = await _sut.RevogarOutrasSessoesAsync("u1", "atual", "ana@lab.com");

        n.Should().Be(2);
        await _sessoes.DidNotReceive().UpdateAsync(Arg.Is<SessaoToken>(s => s.Jti == "atual"));
    }
}

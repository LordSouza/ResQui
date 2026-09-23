using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Auth;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auth;

public class LoginLockoutTests
{
    private readonly IAuthRepository _repo = Substitute.For<IAuthRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ISessoesRepository _sessoes = Substitute.For<ISessoesRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly ILoginThrottle _throttle = Substitute.For<ILoginThrottle>();
    private readonly JwtOptions _jwt = new()
    {
        Key = "secret-key-32-chars-long-enough!!",
        Issuer = "resqui",
        Audience = "resqui-app",
        ExpirationHours = 8
    };
    private readonly AuthService _sut;

    public LoginLockoutTests()
    {
        _sut = new AuthService(_repo, _jwt, _audit, _sessoes, _email, _throttle, Substitute.For<IUsuarioLaboratoriosRepository>(), Substitute.For<ILaboratoriosRepository>());
        _throttle.TentarConsumir(Arg.Any<string>()).Returns(true);
    }

    private static UsuarioInfo User(bool doisFatores = false) => new(
        "user-1", "ana@lab.com", "Ana Silva", "M-001", "Professor",
        new List<string> { "Professor" }, false, doisFatores);

    [Fact]
    public async Task Login_ThrottleEsgotado_RecusaSemConsultarUsuario()
    {
        _throttle.TentarConsumir("ana@lab.com").Returns(false);

        var act = () => _sut.LoginAsync(new LoginCmd("ana@lab.com", "qualquer", null));

        (await act.Should().ThrowAsync<ValidationException>())
            .WithMessage("*Muitas tentativas*");
        await _repo.DidNotReceive().FindByEmailAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task Login_ThrottleEsgotado_MesmaRespostaParaEmailInexistente()
    {
        _throttle.TentarConsumir("fantasma@lab.com").Returns(false);
        _repo.FindByEmailAsync("fantasma@lab.com").Returns((UsuarioInfo?)null);

        var act = () => _sut.LoginAsync(new LoginCmd("fantasma@lab.com", "qualquer", null));

        (await act.Should().ThrowAsync<ValidationException>())
            .WithMessage("*Muitas tentativas*");
    }

    [Fact]
    public async Task Login_ContaBloqueada_RecusaSemVerificarSenha()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User());
        _repo.EstaBloqueadoAsync("user-1").Returns(true);

        var act = () => _sut.LoginAsync(new LoginCmd("ana@lab.com", "Senha@123", null));

        (await act.Should().ThrowAsync<ValidationException>())
            .WithMessage("*bloqueada*");
        await _repo.DidNotReceive().CheckPasswordAsync(Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Login_SenhaErrada_RegistraFalha()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User());
        _repo.EstaBloqueadoAsync("user-1").Returns(false);
        _repo.CheckPasswordAsync("user-1", "errada").Returns(false);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "errada", null));

        r.Should().BeNull();
        await _repo.Received(1).RegistrarFalhaLoginAsync("user-1");
    }

    // O TOTP de 6 dígitos é o alvo mais barato do sistema. Se o contador não subir aqui, o lockout
    // protege só a senha e a fatia inteira falha em seu objetivo declarado.
    [Fact]
    public async Task Login_SenhaCertaMasTotpErrado_RegistraFalha()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User(doisFatores: true));
        _repo.EstaBloqueadoAsync("user-1").Returns(false);
        _repo.CheckPasswordAsync("user-1", "Senha@123").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("user-1", "000000").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "000000").Returns(false);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "Senha@123", "000000"));

        r.Should().BeNull();
        await _repo.Received(1).RegistrarFalhaLoginAsync("user-1");
        await _repo.DidNotReceive().ZerarFalhasLoginAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task Login_FalhaQueAcionaBloqueio_AuditaHigh()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User());
        // Primeira consulta (antes da senha) livre; depois de registrar a falha, bloqueada.
        _repo.EstaBloqueadoAsync("user-1").Returns(false, true);
        _repo.CheckPasswordAsync("user-1", "errada").Returns(false);

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "errada", null));

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "user.login-bloqueado", "Auth",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task Login_FalhaSemAcionarBloqueio_NaoAudita()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User());
        _repo.EstaBloqueadoAsync("user-1").Returns(false);
        _repo.CheckPasswordAsync("user-1", "errada").Returns(false);

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "errada", null));

        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), "user.login-bloqueado", Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task Login_BemSucedido_ZeraContadorETrottle()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User());
        _repo.EstaBloqueadoAsync("user-1").Returns(false);
        _repo.CheckPasswordAsync("user-1", "Senha@123").Returns(true);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "Senha@123", null));

        r!.Token.Should().NotBeNull();
        await _repo.Received(1).ZerarFalhasLoginAsync("user-1");
        _throttle.Received(1).Zerar("ana@lab.com");
    }

    // requires2fa é a primeira etapa de um fluxo de duas, não uma tentativa de credencial.
    [Fact]
    public async Task Login_Requires2fa_NaoRegistraFalhaNemZera()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(User(doisFatores: true));
        _repo.EstaBloqueadoAsync("user-1").Returns(false);
        _repo.CheckPasswordAsync("user-1", "Senha@123").Returns(true);

        var r = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "Senha@123", null));

        r!.Requires2fa.Should().BeTrue();
        await _repo.DidNotReceive().RegistrarFalhaLoginAsync(Arg.Any<string>());
        await _repo.DidNotReceive().ZerarFalhasLoginAsync(Arg.Any<string>());
        _throttle.DidNotReceive().Zerar(Arg.Any<string>());
    }
}

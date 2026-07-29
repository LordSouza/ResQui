using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Auth;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auth;

public class AuthServiceTests
{
    private readonly IAuthRepository _repo = Substitute.For<IAuthRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ISessoesRepository _sessoes = Substitute.For<ISessoesRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly JwtOptions _jwt = new()
    {
        Key = "secret-key-32-chars-long-enough!!",
        Issuer = "resqui",
        Audience = "resqui-app",
        ExpirationHours = 8
    };
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _sut = new AuthService(_repo, _jwt, _audit, _sessoes, _email);
    }

    private static UsuarioInfo FakeUser() => new(
        "user-1", "ana@lab.com", "Ana Silva", "M-001", "Gestor",
        new List<string> { "Gestor" }, false);

    [Fact]
    public async Task LoginAsync_CredenciaisValidas_RegistraAuditoria()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.GetRolesAsync("user-1").Returns(new List<string> { "Gestor" });

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "senha123"));

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "user.login", "Auth",
            Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task LoginAsync_CredenciaisInvalidas_NaoRegistraAuditoria()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns((UsuarioInfo?)null);

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "errada"));

        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task LoginAsync_SenhaErrada_NaoRegistraAuditoria()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser());
        _repo.CheckPasswordAsync("user-1", "errada").Returns(false);

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "errada"));

        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task RegisterAsync_RegistraAuditoria()
    {
        _repo.CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
            Arg.Any<string>(), Arg.Any<string?>()).Returns("new-user-id");
        _repo.AddToRoleAsync(Arg.Any<string>(), Arg.Any<string>()).Returns(Task.CompletedTask);
        _repo.GetRolesAsync("new-user-id").Returns(new List<string> { "Tecnico" });

        var cmd = new RegisterCmd("novo@lab.com", "senha123", null, "Tecnico", "Novo User");
        await _sut.RegisterAsync(cmd, "admin@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.criar", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    // Keeping existing tests
    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsToken()
    {
        var user = new UsuarioInfo("u1", "admin@resqui.local", null, null, "Admin", ["Admin"], false);
        _repo.FindByEmailAsync("admin@resqui.local").Returns(user);
        _repo.CheckPasswordAsync("u1", "Admin@123").Returns(true);

        var result = await _sut.LoginAsync(new LoginCmd("admin@resqui.local", "Admin@123"));

        result.Should().NotBeNull();
        result!.Requires2fa.Should().BeFalse();
        result.Token!.Token.Should().NotBeNullOrEmpty();
        result.Token.User.Email.Should().Be("admin@resqui.local");
        result.Token.ExpireAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ReturnsNull()
    {
        var user = new UsuarioInfo("u1", "admin@resqui.local", null, null, "Admin", ["Admin"], false);
        _repo.FindByEmailAsync("admin@resqui.local").Returns(user);
        _repo.CheckPasswordAsync("u1", "wrong").Returns(false);

        var result = await _sut.LoginAsync(new LoginCmd("admin@resqui.local", "wrong"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_UnknownEmail_ReturnsNull()
    {
        _repo.FindByEmailAsync("nobody@resqui.local").Returns((UsuarioInfo?)null);

        var result = await _sut.LoginAsync(new LoginCmd("nobody@resqui.local", "any"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetMeAsync_ExistingId_ReturnsProfile()
    {
        var user = new UsuarioInfo("u1", "admin@resqui.local", "Admin Resqui", "MAT-001", "Admin", ["Admin"], false);
        _repo.FindByIdAsync("u1").Returns(user);

        var result = await _sut.GetMeAsync("u1");

        result.Should().NotBeNull();
        result!.Matricula.Should().Be("MAT-001");
        result.Nome.Should().Be("Admin Resqui");
    }

    [Theory]
    [InlineData("sem-arroba")]
    [InlineData("")]
    [InlineData("  ")]
    public async Task RegisterAsync_EmailInvalido_LancaValidationException(string email)
    {
        var cmd = new RegisterCmd(email, "Senha@123", null, "Tecnico", "Ana");
        var act = () => _sut.RegisterAsync(cmd, "admin@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*E-mail*");
    }

    [Fact]
    public async Task RegisterAsync_SenhaVazia_LancaValidationException()
    {
        var cmd = new RegisterCmd("ana@x.com", "", null, "Tecnico", "Ana");
        var act = () => _sut.RegisterAsync(cmd, "admin@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Senha*");
    }

    [Fact]
    public async Task RegisterAsync_PapelInvalido_LancaValidationException()
    {
        var cmd = new RegisterCmd("ana@x.com", "Senha@123", null, "SuperAdmin", "Ana");
        var act = () => _sut.RegisterAsync(cmd, "admin@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Papel*");
    }

    [Fact]
    public async Task RegisterAsync_ValidCmd_ReturnsProfile()
    {
        _repo.CreateAsync("new@resqui.local", "Pass@123", "MAT-002", "Tecnico", "Novo Usuário")
             .Returns("u2");
        _repo.GetRolesAsync("u2").Returns((IList<string>)["Tecnico"]);

        var result = await _sut.RegisterAsync(
            new RegisterCmd("new@resqui.local", "Pass@123", "MAT-002", "Tecnico", "Novo Usuário"),
            "admin@resqui.local");

        result.Email.Should().Be("new@resqui.local");
        result.Papel.Should().Be("Tecnico");
        result.Nome.Should().Be("Novo Usuário");
        result.Roles.Should().Contain("Tecnico");
        await _repo.Received(1).AddToRoleAsync("u2", "Tecnico");
    }

    [Theory]
    [InlineData("Professor")]
    [InlineData("Pesquisador")]
    public async Task RegisterAsync_PapelNovo_Aceito(string papel)
    {
        _repo.CreateAsync("novo@resqui.local", "Pass@123", null, papel, "Novo")
             .Returns("u9");
        _repo.GetRolesAsync("u9").Returns((IList<string>)[papel]);

        var result = await _sut.RegisterAsync(
            new RegisterCmd("novo@resqui.local", "Pass@123", null, papel, "Novo"),
            "admin@resqui.local");

        result.Papel.Should().Be(papel);
        await _repo.Received(1).AddToRoleAsync("u9", papel);
    }

    [Fact]
    public async Task AtualizarPerfilAsync_NomeVazio_LancaValidation()
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _sut.AtualizarPerfilAsync("u1", new AtualizarPerfilCmd("  ", "novo@x.com"), "req@x.com"));
        ex.Message.Should().Be("Nome é obrigatório.");
        await _repo.DidNotReceive().UpdateProfileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task AtualizarPerfilAsync_EmailSemArroba_LancaValidation()
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _sut.AtualizarPerfilAsync("u1", new AtualizarPerfilCmd("Ana", "invalido"), "req@x.com"));
        ex.Message.Should().Be("E-mail inválido.");
        await _repo.DidNotReceive().UpdateProfileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task AtualizarPerfilAsync_EmailEmUsoPorOutro_LancaValidation()
    {
        _repo.FindByIdAsync("u1").Returns(new UsuarioInfo("u1", "ana@x.com", "Ana", null, "Tecnico", new List<string>(), false));
        _repo.FindByEmailAsync("outro@x.com").Returns(new UsuarioInfo("u2", "outro@x.com", "Bea", null, "Tecnico", new List<string>(), false));

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _sut.AtualizarPerfilAsync("u1", new AtualizarPerfilCmd("Ana", "outro@x.com"), "req@x.com"));
        ex.Message.Should().Be("E-mail já em uso.");
        await _repo.DidNotReceive().UpdateProfileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task AtualizarPerfilAsync_UsuarioNaoExiste_LancaValidation()
    {
        // _repo.FindByIdAsync("u1") não é configurado → Substitute retorna null (padrão)
        await Assert.ThrowsAsync<ValidationException>(() =>
            _sut.AtualizarPerfilAsync("u1", new AtualizarPerfilCmd("Ana", "ana@x.com"), "req@x.com"));
        await _repo.DidNotReceive().UpdateProfileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task AtualizarPerfilAsync_Valido_PersisteEAudita()
    {
        // FindByIdAsync é chamado tanto na checagem inicial quanto no GetMeAsync final;
        // já retorna o estado pós-atualização (nome/e-mail novos) para refletir o que
        // aconteceria após UpdateProfileAsync persistir no repositório real.
        _repo.FindByIdAsync("u1").Returns(new UsuarioInfo("u1", "ana@x.com", "Ana Souza", null, "Tecnico", new List<string> { "Tecnico" }, false));

        var result = await _sut.AtualizarPerfilAsync("u1", new AtualizarPerfilCmd("Ana Souza", "ana@x.com"), "req@x.com");

        await _repo.Received(1).UpdateProfileAsync("u1", "Ana Souza", "ana@x.com");
        await _audit.Received(1).RegistrarAsync("req@x.com", "user.perfil-atualizar",
            "Conta", Arg.Any<string>(), RiscoAuditoria.Low);

        result.Nome.Should().Be("Ana Souza");
        result.Email.Should().Be("ana@x.com");
    }

    [Fact]
    public async Task AtualizarPerfilAsync_EmailMudouEDisponivel_PersisteComNovoEmail()
    {
        _repo.FindByIdAsync("u1").Returns(new UsuarioInfo("u1", "ana@x.com", "Ana", null, "Tecnico", new List<string> { "Tecnico" }, false));
        _repo.FindByEmailAsync("nova@x.com").Returns((UsuarioInfo?)null);

        await _sut.AtualizarPerfilAsync("u1", new AtualizarPerfilCmd("Ana", "nova@x.com"), "req@x.com");

        await _repo.Received(1).UpdateProfileAsync("u1", "Ana", "nova@x.com");
        await _repo.Received().FindByEmailAsync("nova@x.com");
        await _audit.Received(1).RegistrarAsync("req@x.com", "user.perfil-atualizar",
            "Conta", Arg.Any<string>(), RiscoAuditoria.Low);
    }

    private static UsuarioInfo FakeUser2fa() => new(
        "user-1", "ana@lab.com", "Ana Silva", "M-001", "Gestor",
        new List<string> { "Gestor" }, false, true);

    [Fact]
    public async Task LoginAsync_TotpValido_NaoTentaResgatarCodigoDeRecuperacao()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser2fa());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("user-1", "123456").Returns(true);

        var res = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "senha123", "123456"));

        res!.Token.Should().NotBeNull();
        await _repo.DidNotReceive().ResgatarCodigoRecuperacaoAsync(
            Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task LoginAsync_TotpInvalidoMasCodigoDeRecuperacaoValido_Autentica()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser2fa());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("user-1", "abcd-efgh").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "abcd-efgh").Returns(true);

        var res = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "senha123", "abcd-efgh"));

        res!.Requires2fa.Should().BeFalse();
        res.Token.Should().NotBeNull();
    }

    [Fact]
    public async Task LoginAsync_CodigoDeRecuperacaoUsado_RegistraAuditoriaHigh()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser2fa());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("user-1", "abcd-efgh").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "abcd-efgh").Returns(true);

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "senha123", "abcd-efgh"));

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "user.2fa-recuperacao-usada", "Auth",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task LoginAsync_TotpEResgateFalham_Retorna401()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser2fa());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("user-1", "000000").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "000000").Returns(false);

        var res = await _sut.LoginAsync(new LoginCmd("ana@lab.com", "senha123", "000000"));

        res.Should().BeNull();
        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "user.login-2fa-falha", "Auth",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task GetMeAsync_Com2faAtivo_ReportaCodigosRestantes()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());
        _repo.ContarCodigosRecuperacaoAsync("user-1").Returns(7);

        var perfil = await _sut.GetMeAsync("user-1");

        perfil!.CodigosRecuperacaoRestantes.Should().Be(7);
    }

    [Fact]
    public async Task GetMeAsync_Sem2fa_NaoConsultaContagem()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());

        var perfil = await _sut.GetMeAsync("user-1");

        perfil!.CodigosRecuperacaoRestantes.Should().Be(0);
        await _repo.DidNotReceive().ContarCodigosRecuperacaoAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task LoginAsync_CodigoDeRecuperacaoUsado_EnviaAlertaPorEmail()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser2fa());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("user-1", "abcd-efgh").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "abcd-efgh").Returns(true);
        _repo.ContarCodigosRecuperacaoAsync("user-1").Returns(9);

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "senha123", "abcd-efgh"));

        await _email.Received(1).SendAsync(
            "ana@lab.com",
            Arg.Any<string>(),
            Arg.Is<string>(html => html.Contains("9")));
    }

    [Fact]
    public async Task LoginAsync_TotpValido_NaoEnviaEmail()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser2fa());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.VerifyTwoFactorCodeAsync("user-1", "123456").Returns(true);

        await _sut.LoginAsync(new LoginCmd("ana@lab.com", "senha123", "123456"));

        await _email.DidNotReceive().SendAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Ativar2faAsync_CodigoValido_DevolveDezCodigosDeRecuperacao()
    {
        _repo.VerifyTwoFactorCodeAsync("user-1", "123456").Returns(true);
        _repo.GerarCodigosRecuperacaoAsync("user-1", 10)
            .Returns(Enumerable.Range(1, 10).Select(i => $"cod-{i}"));

        var codigos = await _sut.Ativar2faAsync("user-1", "123456", "ana@lab.com");

        codigos.Should().HaveCount(10);
        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "user.2fa-codigos-gerados", "Auth",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task Ativar2faAsync_CodigoInvalido_NaoGeraCodigos()
    {
        _repo.VerifyTwoFactorCodeAsync("user-1", "000000").Returns(false);

        var act = () => _sut.Ativar2faAsync("user-1", "000000", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().GerarCodigosRecuperacaoAsync(
            Arg.Any<string>(), Arg.Any<int>());
    }
}

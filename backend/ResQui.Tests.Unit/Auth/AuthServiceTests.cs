using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Auth;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Enums;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auth;

public class AuthServiceTests
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
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly ILaboratoriosRepository _labRepo = Substitute.For<ILaboratoriosRepository>();
    private readonly AuthService _sut;

    private static Solicitante Quem(string email, string papel, params string[] labs) =>
        new("quem", email, papel, labs);

    public AuthServiceTests()
    {
        _sut = new AuthService(_repo, _jwt, _audit, _sessoes, _email, _throttle, _usuarioLabs, _labRepo, Substitute.For<IFalhasLoginPorIp>());
        // Sem isto, TentarConsumir devolve false (default de bool) e todo login destes testes
        // morre no throttle.
        _throttle.TentarConsumir(Arg.Any<string>()).Returns(true);
        _labRepo.GetAllAsync().Returns([
            new Laboratorio { Id = "Lab-001", Nome = "A" },
            new Laboratorio { Id = "Lab-002", Nome = "B" },
        ]);
    }

    private static UsuarioInfo FakeUser() => new(
        "user-1", "ana@lab.com", "Ana Silva", "M-001", "Professor",
        new List<string> { "Professor" }, false);

    [Fact]
    public async Task LoginAsync_CredenciaisValidas_RegistraAuditoria()
    {
        _repo.FindByEmailAsync("ana@lab.com").Returns(FakeUser());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.GetRolesAsync("user-1").Returns(new List<string> { "Professor" });

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
        _repo.GetRolesAsync("new-user-id").Returns(new List<string> { "Professor" });

        var cmd = new RegisterCmd("novo@lab.com", "senha123", null, "Professor", "Novo User");
        await _sut.RegisterAsync(cmd, Quem("admin@lab.com", "Admin"));

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.criar", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    // Keeping existing tests
    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsToken()
    {
        var user = new UsuarioInfo("u1", "admin@resqui.local", null, null, "Professor", ["Professor"], false);
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
        var user = new UsuarioInfo("u1", "admin@resqui.local", null, null, "Professor", ["Professor"], false);
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
        var user = new UsuarioInfo("u1", "admin@resqui.local", "Admin Resqui", "MAT-001", "Professor", ["Professor"], false);
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
        var cmd = new RegisterCmd(email, "Senha@123", null, "Professor", "Ana");
        var act = () => _sut.RegisterAsync(cmd, Quem("admin@x.com", "Admin"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*E-mail*");
    }

    [Fact]
    public async Task RegisterAsync_SenhaVazia_LancaValidationException()
    {
        var cmd = new RegisterCmd("ana@x.com", "", null, "Professor", "Ana");
        var act = () => _sut.RegisterAsync(cmd, Quem("admin@x.com", "Admin"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Senha*");
    }

    [Fact]
    public async Task RegisterAsync_PapelInvalido_LancaValidationException()
    {
        var cmd = new RegisterCmd("ana@x.com", "Senha@123", null, "SuperAdmin", "Ana");
        var act = () => _sut.RegisterAsync(cmd, Quem("admin@x.com", "Admin"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Papel*");
    }

    [Fact]
    public async Task RegisterAsync_ValidCmd_ReturnsProfile()
    {
        _repo.CreateAsync("new@resqui.local", "Pass@123", "MAT-002", "Professor", "Novo Usuário")
             .Returns("u2");
        _repo.GetRolesAsync("u2").Returns((IList<string>)["Professor"]);

        var result = await _sut.RegisterAsync(
            new RegisterCmd("new@resqui.local", "Pass@123", "MAT-002", "Professor", "Novo Usuário"), Quem("admin@resqui.local", "Admin"));

        result.Email.Should().Be("new@resqui.local");
        result.Papel.Should().Be("Professor");
        result.Nome.Should().Be("Novo Usuário");
        result.Roles.Should().Contain("Professor");
        await _repo.Received(1).AddToRoleAsync("u2", "Professor");
    }

    [Theory]
    [InlineData("Professor")]
    [InlineData("Aluno")]
    public async Task RegisterAsync_PapelNovo_Aceito(string papel)
    {
        _repo.CreateAsync("novo@resqui.local", "Pass@123", null, papel, "Novo")
             .Returns("u9");
        _repo.GetRolesAsync("u9").Returns((IList<string>)[papel]);

        var result = await _sut.RegisterAsync(
            new RegisterCmd("novo@resqui.local", "Pass@123", null, papel, "Novo"), Quem("admin@resqui.local", "Admin"));

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
        _repo.FindByIdAsync("u1").Returns(new UsuarioInfo("u1", "ana@x.com", "Ana", null, "Professor", new List<string>(), false));
        _repo.FindByEmailAsync("outro@x.com").Returns(new UsuarioInfo("u2", "outro@x.com", "Bea", null, "Professor", new List<string>(), false));

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
        _repo.FindByIdAsync("u1").Returns(new UsuarioInfo("u1", "ana@x.com", "Ana Souza", null, "Professor", new List<string> { "Professor" }, false));

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
        _repo.FindByIdAsync("u1").Returns(new UsuarioInfo("u1", "ana@x.com", "Ana", null, "Professor", new List<string> { "Professor" }, false));
        _repo.FindByEmailAsync("nova@x.com").Returns((UsuarioInfo?)null);

        await _sut.AtualizarPerfilAsync("u1", new AtualizarPerfilCmd("Ana", "nova@x.com"), "req@x.com");

        await _repo.Received(1).UpdateProfileAsync("u1", "Ana", "nova@x.com");
        await _repo.Received().FindByEmailAsync("nova@x.com");
        await _audit.Received(1).RegistrarAsync("req@x.com", "user.perfil-atualizar",
            "Conta", Arg.Any<string>(), RiscoAuditoria.Low);
    }

    private static UsuarioInfo FakeUser2fa() => new(
        "user-1", "ana@lab.com", "Ana Silva", "M-001", "Professor",
        new List<string> { "Professor" }, false, true);

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
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
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
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
        _repo.VerifyTwoFactorCodeAsync("user-1", "000000").Returns(false);

        var act = () => _sut.Ativar2faAsync("user-1", "000000", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().GerarCodigosRecuperacaoAsync(
            Arg.Any<string>(), Arg.Any<int>());
    }

    // Reativar o 2FA já ativo substituiria os 10 códigos que o usuário guardou — um TOTP válido
    // faria a troca passar despercebida.
    [Fact]
    public async Task Ativar2faAsync_Com2faJaAtivo_NaoSubstituiOsCodigosExistentes()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());
        _repo.VerifyTwoFactorCodeAsync("user-1", "123456").Returns(true);

        var act = () => _sut.Ativar2faAsync("user-1", "123456", "ana@lab.com");

        (await act.Should().ThrowAsync<ValidationException>())
            .Which.Message.Should().Contain("Gerar novos códigos");
        await _repo.DidNotReceive().GerarCodigosRecuperacaoAsync(
            Arg.Any<string>(), Arg.Any<int>());
        await _repo.DidNotReceive().SetTwoFactorEnabledAsync(Arg.Any<string>(), Arg.Any<bool>());
    }

    [Fact]
    public async Task Desativar2faAsync_AceitaCodigoDeRecuperacao()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());
        _repo.VerifyTwoFactorCodeAsync("user-1", "abcd-efgh").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "abcd-efgh").Returns(true);

        await _sut.Desativar2faAsync("user-1", "abcd-efgh", "ana@lab.com");

        await _repo.Received(1).SetTwoFactorEnabledAsync("user-1", false);
    }

    [Fact]
    public async Task Desativar2faAsync_CodigoInvalido_LancaValidationExceptionENaoDesativa()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());
        _repo.VerifyTwoFactorCodeAsync("user-1", "000000").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "000000").Returns(false);

        var act = () => _sut.Desativar2faAsync("user-1", "000000", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().SetTwoFactorEnabledAsync(Arg.Any<string>(), Arg.Any<bool>());
    }

    // Sem rotação, a chave que o atacante exfiltrou continua batendo com TOTP(K) depois de
    // desativar — reativar via /2fa/ativar pula o gate de senha do /2fa/setup por inteiro.
    [Fact]
    public async Task Desativar2faAsync_CaminhoFeliz_RotacionaAChaveDoAutenticador()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());
        _repo.VerifyTwoFactorCodeAsync("user-1", "123456").Returns(true);

        await _sut.Desativar2faAsync("user-1", "123456", "ana@lab.com");

        await _repo.Received(1).ResetAuthenticatorKeyAsync("user-1");
    }

    // UserStoreBase.RedeemCodeAsync do Identity faz "".Split(';').Contains(code): com o
    // conjunto de códigos esgotado, um código vazio resgata com sucesso. Sem esta guarda, um
    // JWT roubado desativa o 2FA de uma conta sem códigos restantes mandando Codigo: "".
    [Fact]
    public async Task Desativar2faAsync_CodigoVazio_LancaValidationExceptionSemDesativarNemResgatar()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());

        var act = () => _sut.Desativar2faAsync("user-1", "   ", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().SetTwoFactorEnabledAsync(Arg.Any<string>(), Arg.Any<bool>());
        await _repo.DidNotReceive().ResgatarCodigoRecuperacaoAsync(Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task GerarCodigosRecuperacaoAsync_Com2faAtivoECodigoValido_DevolveDez()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());
        _repo.VerifyTwoFactorCodeAsync("user-1", "123456").Returns(true);
        _repo.GerarCodigosRecuperacaoAsync("user-1", 10)
            .Returns(Enumerable.Range(1, 10).Select(i => $"cod-{i}"));

        var codigos = await _sut.GerarCodigosRecuperacaoAsync("user-1", "123456", "ana@lab.com");

        codigos.Should().HaveCount(10);
        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "user.2fa-codigos-gerados", "Auth",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task GerarCodigosRecuperacaoAsync_Sem2faAtivo_LancaValidationException()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());

        var act = () => _sut.GerarCodigosRecuperacaoAsync("user-1", "123456", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*2FA não está ativo*");
    }

    [Fact]
    public async Task GerarCodigosRecuperacaoAsync_CodigoInvalido_LancaValidationException()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser2fa());
        _repo.VerifyTwoFactorCodeAsync("user-1", "000000").Returns(false);
        _repo.ResgatarCodigoRecuperacaoAsync("user-1", "000000").Returns(false);

        var act = () => _sut.GerarCodigosRecuperacaoAsync("user-1", "000000", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().GerarCodigosRecuperacaoAsync(
            Arg.Any<string>(), Arg.Any<int>());
    }

    // ---------- Setup 2FA: senha obrigatória + chave rotacionada ----------

    [Fact]
    public async Task Setup2faAsync_SenhaIncorreta_LancaValidationException()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
        _repo.CheckPasswordAsync("user-1", "errada").Returns(false);

        var act = () => _sut.Setup2faAsync("user-1", "errada");

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Senha incorreta*");
        await _repo.DidNotReceive().ResetAuthenticatorKeyAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task Setup2faAsync_SenhaVazia_LancaValidationExceptionSemConsultarRepo()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());

        var act = () => _sut.Setup2faAsync("user-1", "   ");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().ResetAuthenticatorKeyAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task Setup2faAsync_Com2faJaAtivo_LancaValidationException()
    {
        var comMfa = FakeUser() with { TwoFactorEnabled = true };
        _repo.FindByIdAsync("user-1").Returns(comMfa);
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);

        var act = () => _sut.Setup2faAsync("user-1", "senha123");

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*já está ativo*");
        await _repo.DidNotReceive().ResetAuthenticatorKeyAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task Setup2faAsync_CaminhoFeliz_RotacionaChaveEMontaOtpauth()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.ResetAuthenticatorKeyAsync("user-1").Returns("CHAVENOVA123");

        var dto = await _sut.Setup2faAsync("user-1", "senha123");

        dto!.Secret.Should().Be("CHAVENOVA123");
        dto.OtpauthUri.Should().Contain("secret=CHAVENOVA123")
            .And.Contain("otpauth://totp/ResQui:ana%40lab.com");
        await _repo.Received(1).ResetAuthenticatorKeyAsync("user-1");
    }

    [Fact]
    public async Task Setup2faAsync_DevolveQrPngDaMesmaOtpauthUri()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
        _repo.CheckPasswordAsync("user-1", "senha123").Returns(true);
        _repo.ResetAuthenticatorKeyAsync("user-1").Returns("CHAVENOVA123");

        var dto = await _sut.Setup2faAsync("user-1", "senha123");

        var png = Convert.FromBase64String(dto!.QrPngBase64);
        png.Take(8).Should().Equal(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
        png.Should().Equal(QrCode.Png(dto.OtpauthUri, 6));
    }

    [Fact]
    public async Task Setup2faAsync_UsuarioInexistente_RetornaNull()
    {
        _repo.FindByIdAsync("fantasma").Returns((UsuarioInfo?)null);

        var dto = await _sut.Setup2faAsync("fantasma", "senha123");

        dto.Should().BeNull();
    }

    // ---------- Reset de 2FA por Admin ----------

    private static UsuarioInfo AlvoComMfa() => new(
        "alvo-9", "bruno@lab.com", "Bruno Lima", "M-009", "Professor",
        new List<string> { "Professor" }, false, true);

    [Fact]
    public async Task ResetarSegundoFatorAsync_ProprioUsuario_LancaSemEfeitoColateral()
    {
        var act = () => _sut.ResetarSegundoFatorAsync("admin-1", "admin-1", "admin@lab.com");

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*própria conta*");
        await _repo.DidNotReceive().SetTwoFactorEnabledAsync(Arg.Any<string>(), Arg.Any<bool>());
        await _repo.DidNotReceive().ResetAuthenticatorKeyAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task ResetarSegundoFatorAsync_AlvoInexistente_RetornaFalse()
    {
        _repo.FindByIdIncluindoArquivadosAsync("fantasma").Returns((UsuarioInfo?)null);

        var ok = await _sut.ResetarSegundoFatorAsync("fantasma", "admin-1", "admin@lab.com");

        ok.Should().BeFalse();
        await _repo.DidNotReceive().SetTwoFactorEnabledAsync(Arg.Any<string>(), Arg.Any<bool>());
    }

    [Fact]
    public async Task ResetarSegundoFatorAsync_CaminhoFeliz_LimpaEstadoDoAlvo()
    {
        _repo.FindByIdIncluindoArquivadosAsync("alvo-9").Returns(AlvoComMfa());
        _sessoes.GetAtivasByUsuarioAsync("alvo-9").Returns(new List<Domain.Entities.SessaoToken>());

        var ok = await _sut.ResetarSegundoFatorAsync("alvo-9", "admin-1", "admin@lab.com");

        ok.Should().BeTrue();
        await _repo.Received(1).SetTwoFactorEnabledAsync("alvo-9", false);
        await _repo.Received(1).ResetAuthenticatorKeyAsync("alvo-9");
        // Nem desligar a flag nem rotacionar a chave apagam os códigos no Identity:
        // zerar é passo explícito.
        await _repo.Received(1).GerarCodigosRecuperacaoAsync("alvo-9", 0);
    }

    [Fact]
    public async Task ResetarSegundoFatorAsync_RevogaTodasAsSessoesDoAlvo()
    {
        var s1 = new Domain.Entities.SessaoToken { UsuarioId = "alvo-9", Jti = "j1" };
        var s2 = new Domain.Entities.SessaoToken { UsuarioId = "alvo-9", Jti = "j2" };
        _repo.FindByIdIncluindoArquivadosAsync("alvo-9").Returns(AlvoComMfa());
        _sessoes.GetAtivasByUsuarioAsync("alvo-9").Returns(new List<Domain.Entities.SessaoToken> { s1, s2 });

        await _sut.ResetarSegundoFatorAsync("alvo-9", "admin-1", "admin@lab.com");

        s1.Revogada.Should().BeTrue();
        s2.Revogada.Should().BeTrue();
        await _sessoes.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task ResetarSegundoFatorAsync_AuditaHighEAvisaODono()
    {
        _repo.FindByIdIncluindoArquivadosAsync("alvo-9").Returns(AlvoComMfa());
        _sessoes.GetAtivasByUsuarioAsync("alvo-9").Returns(new List<Domain.Entities.SessaoToken>());

        await _sut.ResetarSegundoFatorAsync("alvo-9", "admin-1", "admin@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.2fa-reset-admin", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
        await _email.Received(1).SendAsync("bruno@lab.com", Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task ResetarSegundoFatorAsync_AlvoArquivado_ResetaNormalmente()
    {
        var arquivado = AlvoComMfa() with { Arquivado = true };
        _repo.FindByIdIncluindoArquivadosAsync("alvo-9").Returns(arquivado);
        _sessoes.GetAtivasByUsuarioAsync("alvo-9").Returns(new List<Domain.Entities.SessaoToken>());

        var ok = await _sut.ResetarSegundoFatorAsync("alvo-9", "admin-1", "admin@lab.com");

        ok.Should().BeTrue();
        await _repo.Received(1).SetTwoFactorEnabledAsync("alvo-9", false);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Professor")]
    [InlineData("Aluno")]
    public async Task RegisterAsync_AdminCriaQualquerPapel(string papel)
    {
        _repo.CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), papel, Arg.Any<string?>())
            .Returns("u1");

        var perfil = await _sut.RegisterAsync(
            new RegisterCmd("nova@resqui.local", "Senh@123", null, papel, "Nova"), Quem("admin@resqui.local", "Admin"));

        perfil.Papel.Should().Be(papel);
    }

    [Fact]
    public async Task RegisterAsync_ProfessorCriaAluno()
    {
        _repo.CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), "Aluno", Arg.Any<string?>())
            .Returns("u1");

        var perfil = await _sut.RegisterAsync(
            new RegisterCmd("aluno@resqui.local", "Senh@123", null, "Aluno", "Aluno", ["Lab-001"]),
            Quem("prof@resqui.local", "Professor", "Lab-001"));

        perfil.Papel.Should().Be("Aluno");
    }

    [Fact]
    public async Task RegisterAsync_ProfessorSemLaboratorio_RecusaAntesDeCriarAConta()
    {
        var act = () => _sut.RegisterAsync(
            new RegisterCmd("aluno@resqui.local", "Senh@123", null, "Aluno", "Aluno"),
            Quem("prof@resqui.local", "Professor", "Lab-001"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*pelo menos um laboratório*");
        await _repo.DidNotReceive().CreateAsync(Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string?>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    [Theory]
    [InlineData("Professor")]
    [InlineData("Admin")]
    public async Task RegisterAsync_ProfessorNaoCriaAlemDeAluno(string papelAlvo)
    {
        var act = () => _sut.RegisterAsync(
            new RegisterCmd("nova@resqui.local", "Senh@123", null, papelAlvo, "Nova"), Quem("prof@resqui.local", "Professor"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*só o Admin*");
    }

    [Theory]
    [InlineData("Gestor")]
    [InlineData("Tecnico")]
    [InlineData("Pesquisador")]
    [InlineData("Visualizador")]
    public async Task RegisterAsync_RecusaOsPapeisExtintos(string papel)
    {
        var act = () => _sut.RegisterAsync(
            new RegisterCmd("nova@resqui.local", "Senh@123", null, papel, "Nova"), Quem("admin@resqui.local", "Admin"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Papel inválido*");
    }

    [Fact]
    public async Task RegisterAsync_GravaOsLaboratoriosPedidos()
    {
        _repo.CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), "Aluno", Arg.Any<string?>())
            .Returns("u1");

        var perfil = await _sut.RegisterAsync(
            new RegisterCmd("aluno@resqui.local", "Senh@123", null, "Aluno", "Aluno", ["Lab-001"]),
            Quem("prof@resqui.local", "Professor", "Lab-001"));

        perfil.LaboratorioIds.Should().Equal("Lab-001");
        await _usuarioLabs.Received(1).DefinirAsync("u1",
            Arg.Is<IEnumerable<string>>(ids => ids.SequenceEqual(new[] { "Lab-001" })));
    }

    [Fact]
    public async Task RegisterAsync_ProfessorNaoAtribuiLaboratorioQueNaoTem()
    {
        var act = () => _sut.RegisterAsync(
            new RegisterCmd("aluno@resqui.local", "Senh@123", null, "Aluno", "Aluno", ["Lab-002"]),
            Quem("prof@resqui.local", "Professor", "Lab-001"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Lab-002*");
        await _repo.DidNotReceive().CreateAsync(Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string?>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    [Fact]
    public async Task RegisterAsync_ComoAdmin_AtribuiQualquerLaboratorio()
    {
        _repo.CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), "Aluno", Arg.Any<string?>())
            .Returns("u1");

        var perfil = await _sut.RegisterAsync(
            new RegisterCmd("aluno@resqui.local", "Senh@123", null, "Aluno", "Aluno", ["Lab-002"]),
            Quem("admin@resqui.local", "Admin"));

        perfil.LaboratorioIds.Should().Equal("Lab-002");
    }

    [Fact]
    public async Task GetMeAsync_DevolveOsLaboratoriosDoUsuario()
    {
        _repo.FindByIdAsync("u1").Returns(new UsuarioInfo(
            "u1", "ana@lab.com", "Ana", null, "Professor", new List<string> { "Professor" }, false));
        _usuarioLabs.DoUsuarioAsync("u1").Returns(new List<string> { "Lab-001", "Lab-003" });

        var perfil = await _sut.GetMeAsync("u1");

        perfil!.LaboratorioIds.Should().Equal("Lab-001", "Lab-003");
    }

    [Fact]
    public async Task RegisterAsync_LaboratorioInexistente_RecusaAntesDeCriarAConta()
    {
        var act = () => _sut.RegisterAsync(
            new RegisterCmd("aluno@resqui.local", "Senh@123", null, "Aluno", "Aluno", ["Lab-999"]),
            Quem("admin@resqui.local", "Admin"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Lab-999*");
        await _repo.DidNotReceive().CreateAsync(Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string?>(), Arg.Any<string>(), Arg.Any<string?>());
    }
}

using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Auth;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auth;

public class AuthServiceTests
{
    private readonly IAuthRepository _repo = Substitute.For<IAuthRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
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
        _sut = new AuthService(_repo, _jwt, _audit);
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
        result!.Token.Should().NotBeNullOrEmpty();
        result.User.Email.Should().Be("admin@resqui.local");
        result.ExpireAt.Should().BeAfter(DateTime.UtcNow);
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
}

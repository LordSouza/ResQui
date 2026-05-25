using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auth;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auth;

public class AuthServiceTests
{
    private readonly IAuthRepository _repo = Substitute.For<IAuthRepository>();
    private readonly JwtOptions _jwt = new()
    {
        Key = "super_secret_key_for_testing_32ch!",
        Issuer = "resqui",
        Audience = "resqui-frontend",
        ExpirationHours = 8
    };
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _sut = new AuthService(_repo, _jwt);
    }

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
            new RegisterCmd("new@resqui.local", "Pass@123", "MAT-002", "Tecnico", "Novo Usuário"));

        result.Email.Should().Be("new@resqui.local");
        result.Papel.Should().Be("Tecnico");
        result.Nome.Should().Be("Novo Usuário");
        result.Roles.Should().Contain("Tecnico");
        await _repo.Received(1).AddToRoleAsync("u2", "Tecnico");
    }
}

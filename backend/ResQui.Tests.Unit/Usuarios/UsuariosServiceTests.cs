using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Usuarios;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Usuarios;

public class UsuariosServiceTests
{
    private readonly IAuthRepository _repo = Substitute.For<IAuthRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly UsuariosService _sut;

    public UsuariosServiceTests()
    {
        _sut = new UsuariosService(_repo, _audit);
    }

    private static UsuarioInfo FakeUser(string id = "user-1") => new(
        id, "ana@lab.com", "Ana", "M001", "Tecnico",
        new List<string> { "Tecnico" }, false);

    [Fact]
    public async Task AlterarPapelAsync_UsuarioExistente_RegistraAuditoria()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
        _repo.UpdateRoleAsync(Arg.Any<string>(), Arg.Any<string>()).Returns(Task.CompletedTask);

        await _sut.AlterarPapelAsync("user-1", new AlterarPapelCmd("Gestor"), "admin@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.papel", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task AlterarPapelAsync_UsuarioInexistente_NaoRegistraAuditoria()
    {
        _repo.FindByIdAsync("user-999").Returns((UsuarioInfo?)null);

        await _sut.AlterarPapelAsync("user-999", new AlterarPapelCmd("Gestor"), "admin@lab.com");

        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task ArquivarAsync_UsuarioExistente_RegistraAuditoria()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
        _repo.SoftDeleteAsync(Arg.Any<string>()).Returns(Task.CompletedTask);

        await _sut.ArquivarAsync("user-1", "admin@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.arquivar", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task ArquivarAsync_UsuarioInexistente_NaoRegistraAuditoria()
    {
        _repo.FindByIdAsync("user-999").Returns((UsuarioInfo?)null);

        await _sut.ArquivarAsync("user-999", "admin@lab.com");

        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }
}

using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Usuarios;
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

    [Fact]
    public async Task AlterarPapelAsync_RegistraAuditoria()
    {
        _repo.UpdateRoleAsync(Arg.Any<string>(), Arg.Any<string>()).Returns(Task.CompletedTask);

        await _sut.AlterarPapelAsync("user-1", new AlterarPapelCmd("Gestor"), "admin@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.papel", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task ArquivarAsync_RegistraAuditoria()
    {
        _repo.SoftDeleteAsync(Arg.Any<string>()).Returns(Task.CompletedTask);

        await _sut.ArquivarAsync("user-1", "admin@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.arquivar", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }
}

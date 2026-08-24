using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
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

    [Fact]
    public async Task ExcluirAsync_UsuarioExistente_HardDeletaERegistraAuditoria()
    {
        _repo.HardDeleteAsync("user-1").Returns(true);

        await _sut.ExcluirAsync("user-1", "admin-id", "admin@lab.com");

        await _repo.Received(1).HardDeleteAsync("user-1");
        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.excluir", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task ExcluirAsync_UsuarioInexistente_NaoAuditaSeHardDeleteRetornaFalse()
    {
        _repo.HardDeleteAsync("user-999").Returns(false);

        await _sut.ExcluirAsync("user-999", "admin-id", "admin@lab.com");

        await _repo.Received(1).HardDeleteAsync("user-999");
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task ExcluirAsync_Autoexclusao_LancaValidationException()
    {
        var act = async () => await _sut.ExcluirAsync("user-1", "user-1", "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*própria conta*");
        await _repo.DidNotReceive().HardDeleteAsync(Arg.Any<string>());
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task ExcluirAsync_UsuarioArquivado_HardDeletaERegistraAuditoria()
    {
        _repo.HardDeleteAsync("user-arq").Returns(true);

        await _sut.ExcluirAsync("user-arq", "admin-id", "admin@lab.com");

        await _repo.Received(1).HardDeleteAsync("user-arq");
        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.excluir", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task ListarAsync_ExpoeEstadoDo2fa()
    {
        _repo.GetAllAsync().Returns(new List<UsuarioInfo>
        {
            new("u-1", "com@lab.com", "Com MFA", null, "Tecnico", new List<string>(), false, true),
            new("u-2", "sem@lab.com", "Sem MFA", null, "Tecnico", new List<string>(), false, false),
        });

        var lista = (await _sut.ListarAsync()).ToList();

        lista.Single(u => u.Id == "u-1").TwoFactorEnabled.Should().BeTrue();
        lista.Single(u => u.Id == "u-2").TwoFactorEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task ListarNomesAsync_OmiteArquivados()
    {
        _repo.GetAllAsync().Returns(new List<UsuarioInfo>
        {
            new("u-1", "ativa@lab.com", "Ana Lima", null, "Tecnico", new List<string>(), false, false),
            new("u-2", "saiu@lab.com", "Renan Costa", null, "Tecnico", new List<string>(), true, false),
        });

        var nomes = (await _sut.ListarNomesAsync()).ToList();

        nomes.Should().ContainSingle().Which.Nome.Should().Be("Ana Lima");
    }

    [Fact]
    public async Task ListarNomesAsync_UsaEmailQuandoNomeEstaVazio()
    {
        _repo.GetAllAsync().Returns(new List<UsuarioInfo>
        {
            new("u-1", "sem.nome@lab.com", null, null, "Tecnico", new List<string>(), false, false),
        });

        var nomes = (await _sut.ListarNomesAsync()).ToList();

        nomes.Single().Nome.Should().Be("sem.nome@lab.com");
    }

    [Fact]
    public void UsuarioNomeDto_NaoExpoePapelNem2fa()
    {
        typeof(UsuarioNomeDto).GetProperties().Select(p => p.Name)
            .Should().BeEquivalentTo("Id", "Nome", "Email");
    }
}

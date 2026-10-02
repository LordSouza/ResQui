using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using NSubstitute;
using ResQui.Infrastructure.Identity;
using ResQui.Infrastructure.Seed;

namespace ResQui.Tests.Unit.Data;

public class DbSeederTests
{
    private readonly UserManager<Usuario> _userManager =
        Substitute.For<UserManager<Usuario>>(Substitute.For<IUserStore<Usuario>>(), null, null, null, null, null, null, null, null);

    [Fact]
    public async Task GarantirAdmin_ComAdminDeEmailTrocado_NaoCriaOutro()
    {
        var adminRenomeado = new Usuario { Id = "admin-1", Email = "dono@resqui.com.br", Papel = "Admin" };
        _userManager.GetUsersInRoleAsync("Admin").Returns([adminRenomeado]);

        var adminId = await DbSeeder.GarantirAdminAsync(_userManager, "Senha@123");

        adminId.Should().Be("admin-1");
        await _userManager.DidNotReceive().CreateAsync(Arg.Any<Usuario>(), Arg.Any<string>());
    }

    [Fact]
    public async Task GarantirAdmin_SemNenhumAdmin_CriaOAdminInicial()
    {
        _userManager.GetUsersInRoleAsync("Admin").Returns([]);
        _userManager.CreateAsync(Arg.Any<Usuario>(), "Senha@123").Returns(IdentityResult.Success);

        var adminId = await DbSeeder.GarantirAdminAsync(_userManager, "Senha@123");

        await _userManager.Received(1).CreateAsync(
            Arg.Is<Usuario>(u => u.Email == DbSeeder.EmailAdminInicial && u.Papel == "Admin"), "Senha@123");
        await _userManager.Received(1).AddToRoleAsync(Arg.Is<Usuario>(u => u.Id == adminId), "Admin");
    }

    [Fact]
    public async Task GarantirAdmin_SenhaForaDaPolitica_FalhaNomeandoAVariavel()
    {
        _userManager.GetUsersInRoleAsync("Admin").Returns([]);
        _userManager.CreateAsync(Arg.Any<Usuario>(), Arg.Any<string>())
            .Returns(IdentityResult.Failed(new IdentityError { Description = "Senha curta." }));

        var acao = () => DbSeeder.GarantirAdminAsync(_userManager, "fraca");

        await acao.Should().ThrowAsync<InvalidOperationException>().WithMessage("*ADMIN_PASSWORD*");
    }
}

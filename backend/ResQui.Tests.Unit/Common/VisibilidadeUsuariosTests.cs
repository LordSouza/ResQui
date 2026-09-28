using FluentAssertions;
using NSubstitute;
using ResQui.Application.Common;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Common;

public class VisibilidadeUsuariosTests
{
    private readonly IAuthRepository _usuarios = Substitute.For<IAuthRepository>();
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly VisibilidadeUsuarios _sut;

    public VisibilidadeUsuariosTests()
    {
        _sut = new VisibilidadeUsuarios(_usuarios, _usuarioLabs);
    }

    private static UsuarioInfo Usuario(string id, string email, string papel) =>
        new(id, email, id, null, papel, new List<string> { papel }, false);

    [Fact]
    public async Task EmailsQueEnxergaAsync_Admin_NaoRecorta()
    {
        var emails = await _sut.EmailsQueEnxergaAsync(new Solicitante("adm", "adm@lab.com", "Admin", []));

        emails.Should().BeNull();
        await _usuarios.DidNotReceive().GetAllAsync();
    }

    [Fact]
    public async Task EmailsQueEnxergaAsync_Professor_DevolveOsDoLaboratorioEmMinusculas()
    {
        _usuarios.GetAllAsync().Returns(new List<UsuarioInfo>
        {
            Usuario("prof-1", "Prof@Lab.com", "Professor"),
            Usuario("aluno-a", "Aluno.A@lab.com", "Aluno"),
            Usuario("aluno-b", "aluno.b@lab.com", "Aluno"),
            Usuario("adm", "adm@lab.com", "Admin"),
        });
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["prof-1"] = ["Lab-001"],
            ["aluno-a"] = ["Lab-001"],
            ["aluno-b"] = ["Lab-002"],
            ["adm"] = ["Lab-001"],
        });

        var emails = await _sut.EmailsQueEnxergaAsync(new Solicitante("prof-1", "Prof@Lab.com", "Professor", ["Lab-001"]));

        emails.Should().BeEquivalentTo(["prof@lab.com", "aluno.a@lab.com"]);
    }

    [Fact]
    public async Task EnxergaAutorAsync_AutorSemConta_NaoEnxerga()
    {
        _usuarios.FindByEmailIncluindoArquivadosAsync("sumiu@lab.com").Returns((UsuarioInfo?)null);

        var enxerga = await _sut.EnxergaAutorAsync(new Solicitante("prof-1", "prof@lab.com", "Professor", ["Lab-001"]), "sumiu@lab.com");

        enxerga.Should().BeFalse();
    }
}

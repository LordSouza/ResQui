using ResQui.Tests.Unit.Common;
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
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly ILaboratoriosRepository _labRepo = Substitute.For<ILaboratoriosRepository>();
    private readonly ISessoesRepository _sessoes = Substitute.For<ISessoesRepository>();
    private readonly UsuariosService _sut;

    public UsuariosServiceTests()
    {
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>());
        _labRepo.GetAllAsync().Returns([
            new Laboratorio { Id = "Lab-001", Nome = "A" },
            new Laboratorio { Id = "Lab-002", Nome = "B" },
        ]);
        _sessoes.GetAtivasByUsuarioAsync(Arg.Any<string>()).Returns([]);
        _sut = new UsuariosService(_repo, _audit, _usuarioLabs, _labRepo, _sessoes, new TransacoesDiretas());
    }

    private static Solicitante Professor(params string[] labs) =>
        new("prof-1", "prof@lab.com", "Professor", labs);

    private static Solicitante Admin() =>
        new("adm", "admin@lab.com", "Admin", []);

    private static UsuarioInfo Aluno(string id = "aluno-1") => new(
        id, "aluno@lab.com", "Aluno Um", "M002", "Aluno",
        new List<string> { "Aluno" }, false);

    private static UsuarioInfo FakeUser(string id = "user-1") => new(
        id, "ana@lab.com", "Ana", "M001", "Professor",
        new List<string> { "Professor" }, false);

    [Fact]
    public async Task AlterarPapelAsync_UsuarioExistente_RegistraAuditoria()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());
        _repo.UpdateRoleAsync(Arg.Any<string>(), Arg.Any<string>()).Returns(Task.CompletedTask);

        await _sut.AlterarPapelAsync("user-1", new AlterarPapelCmd("Professor"), "admin@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.papel", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task AlterarPapelAsync_UsuarioInexistente_NaoRegistraAuditoria()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-999").Returns((UsuarioInfo?)null);

        await _sut.AlterarPapelAsync("user-999", new AlterarPapelCmd("Professor"), "admin@lab.com");

        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Theory]
    [InlineData("Gestor")]
    [InlineData("")]
    [InlineData(null)]
    public async Task AlterarPapelAsync_PapelForaDaLista_NaoRemoveAsRolesDaConta(string? papel)
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());

        var act = () => _sut.AlterarPapelAsync("user-1", new AlterarPapelCmd(papel!), "admin@lab.com");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().UpdateRoleAsync(Arg.Any<string>(), Arg.Any<string>());
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task AlterarPapelAsync_UsuarioArquivado_AlteraEmVezDeSairEmSilencio()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-arq").Returns(new UsuarioInfo(
            "user-arq", "arq@lab.com", "Arq", null, "Professor", new List<string> { "Professor" }, true));

        await _sut.AlterarPapelAsync("user-arq", new AlterarPapelCmd("Aluno"), "admin@lab.com");

        await _repo.Received(1).UpdateRoleAsync("user-arq", "Aluno");
    }

    [Fact]
    public async Task AlterarPapelAsync_RevogaAsSessoesDoAlvo()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());
        var sessao = new SessaoToken { Jti = "j1", UsuarioId = "user-1" };
        _sessoes.GetAtivasByUsuarioAsync("user-1").Returns([sessao]);

        await _sut.AlterarPapelAsync("user-1", new AlterarPapelCmd("Aluno"), "admin@lab.com");

        sessao.Revogada.Should().BeTrue();
        await _sessoes.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task ArquivarAsync_RevogaAsSessoesDoAlvo()
    {
        _repo.FindByIdAsync("aluno-1").Returns(Aluno());
        var sessao = new SessaoToken { Jti = "j2", UsuarioId = "aluno-1" };
        _sessoes.GetAtivasByUsuarioAsync("aluno-1").Returns([sessao]);

        await _sut.ArquivarAsync("aluno-1", Admin());

        sessao.Revogada.Should().BeTrue();
        await _sessoes.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task ArquivarAsync_UsuarioExistente_RegistraAuditoria()
    {
        _repo.FindByIdAsync("user-1").Returns(FakeUser());
        _repo.SoftDeleteAsync(Arg.Any<string>()).Returns(Task.CompletedTask);

        await _sut.ArquivarAsync("user-1", Admin());

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "user.arquivar", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task ArquivarAsync_UsuarioInexistente_NaoRegistraAuditoria()
    {
        _repo.FindByIdAsync("user-999").Returns((UsuarioInfo?)null);

        await _sut.ArquivarAsync("user-999", Admin());

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
            new("u-1", "com@lab.com", "Com MFA", null, "Professor", new List<string>(), false, true),
            new("u-2", "sem@lab.com", "Sem MFA", null, "Professor", new List<string>(), false, false),
        });

        var lista = (await _sut.ListarAsync(Admin())).ToList();

        lista.Single(u => u.Id == "u-1").TwoFactorEnabled.Should().BeTrue();
        lista.Single(u => u.Id == "u-2").TwoFactorEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task ArquivarAsync_ProfessorArquivaAluno()
    {
        _repo.FindByIdAsync("aluno-1").Returns(new UsuarioInfo(
            "aluno-1", "aluno@lab.com", "Aluno", null, "Aluno", new List<string> { "Aluno" }, false));
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-001" });

        await _sut.ArquivarAsync("aluno-1", Professor("Lab-001"));

        await _repo.Received(1).SoftDeleteAsync("aluno-1");
    }

    [Fact]
    public async Task ArquivarAsync_ProfessorNaoArquivaAlunoDeOutroLaboratorio()
    {
        _repo.FindByIdAsync("aluno-1").Returns(Aluno());
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-002" });

        var act = () => _sut.ArquivarAsync("aluno-1", Professor("Lab-001"));

        await act.Should().ThrowAsync<AcessoNegadoException>();
        await _repo.DidNotReceive().SoftDeleteAsync("aluno-1");
    }

    [Fact]
    public async Task ArquivarAsync_ProfessorNaoArquivaColegaProfessor()
    {
        _repo.FindByIdAsync("alvo-1").Returns(new UsuarioInfo(
            "alvo-1", "colega@lab.com", "Colega", null, "Professor", new List<string> { "Professor" }, false));
        _usuarioLabs.DoUsuarioAsync("alvo-1").Returns(new List<string> { "Lab-001" });

        var act = () => _sut.ArquivarAsync("alvo-1", Professor("Lab-001"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*só o Admin*");
        await _repo.DidNotReceive().SoftDeleteAsync("alvo-1");
    }

    [Fact]
    public async Task ArquivarAsync_ProfessorNaoEnxergaAdmin()
    {
        _repo.FindByIdAsync("alvo-1").Returns(new UsuarioInfo(
            "alvo-1", "adm@lab.com", "Admin", null, "Admin", new List<string> { "Admin" }, false));
        _usuarioLabs.DoUsuarioAsync("alvo-1").Returns(new List<string> { "Lab-001" });

        var act = () => _sut.ArquivarAsync("alvo-1", Professor("Lab-001"));

        await act.Should().ThrowAsync<AcessoNegadoException>();
        await _repo.DidNotReceive().SoftDeleteAsync("alvo-1");
    }

    [Fact]
    public async Task ArquivarAsync_AdminArquivaProfessor()
    {
        _repo.FindByIdAsync("prof-1").Returns(new UsuarioInfo(
            "prof-1", "prof@lab.com", "Prof", null, "Professor", new List<string> { "Professor" }, false));

        await _sut.ArquivarAsync("prof-1", Admin());

        await _repo.Received(1).SoftDeleteAsync("prof-1");
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ComoAdmin_AceitaQualquerAlvoEQualquerLaboratorio()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());

        await _sut.DefinirLaboratoriosAsync("user-1", new DefinirLaboratoriosCmd(["Lab-001", "Lab-002"]), Admin());

        await _usuarioLabs.Received(1).DefinirAsync("user-1",
            Arg.Is<IEnumerable<string>>(ids => ids.SequenceEqual(new[] { "Lab-001", "Lab-002" })));
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ProfessorParaAluno_AceitaOsProprios()
    {
        _repo.FindByIdIncluindoArquivadosAsync("aluno-1").Returns(Aluno());
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-001" });

        await _sut.DefinirLaboratoriosAsync("aluno-1", new DefinirLaboratoriosCmd(["Lab-001"]), Professor("Lab-001"));

        await _usuarioLabs.Received(1).DefinirAsync("aluno-1", Arg.Any<IEnumerable<string>>());
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ProfessorParaAluno_RecusaLaboratorioQueNaoTem()
    {
        _repo.FindByIdIncluindoArquivadosAsync("aluno-1").Returns(Aluno());
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-001" });

        var act = () => _sut.DefinirLaboratoriosAsync("aluno-1",
            new DefinirLaboratoriosCmd(["Lab-002"]), Professor("Lab-001"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Lab-002*");
        await _usuarioLabs.DidNotReceive().DefinirAsync(Arg.Any<string>(), Arg.Any<IEnumerable<string>>());
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ProfessorParaProfessor_Recusa()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());
        _usuarioLabs.DoUsuarioAsync("user-1").Returns(new List<string> { "Lab-001" });

        var act = () => _sut.DefinirLaboratoriosAsync("user-1",
            new DefinirLaboratoriosCmd(["Lab-001"]), Professor("Lab-001"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Professor*");
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ProfessorParaSiMesmo_Recusa()
    {
        _repo.FindByIdIncluindoArquivadosAsync("prof-1").Returns(FakeUser("prof-1"));

        var act = () => _sut.DefinirLaboratoriosAsync("prof-1",
            new DefinirLaboratoriosCmd(["Lab-001", "Lab-002"]), Professor("Lab-001"));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_LaboratorioInexistente_Recusa()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());

        var act = () => _sut.DefinirLaboratoriosAsync("user-1",
            new DefinirLaboratoriosCmd(["Lab-999"]), Admin());

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Lab-999*");
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_AlvoInexistente_NaoFazNada()
    {
        _repo.FindByIdIncluindoArquivadosAsync("sumiu").Returns((UsuarioInfo?)null);

        await _sut.DefinirLaboratoriosAsync("sumiu", new DefinirLaboratoriosCmd(["Lab-001"]), Admin());

        await _usuarioLabs.DidNotReceive().DefinirAsync(Arg.Any<string>(), Arg.Any<IEnumerable<string>>());
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ListaVazia_DeixaUsuarioSemLaboratorio()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());

        await _sut.DefinirLaboratoriosAsync("user-1", new DefinirLaboratoriosCmd([]), Admin());

        await _usuarioLabs.Received(1).DefinirAsync("user-1",
            Arg.Is<IEnumerable<string>>(ids => !ids.Any()));
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_Audita()
    {
        _repo.FindByIdIncluindoArquivadosAsync("user-1").Returns(FakeUser());

        await _sut.DefinirLaboratoriosAsync("user-1", new DefinirLaboratoriosCmd(["Lab-001"]), Admin());

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "usuario.laboratorios", "Usuários",
            Arg.Is<string>(d => d.Contains("user-1") && d.Contains("Lab-001")), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task ListarAsync_IncluiOsLaboratoriosDeCadaUsuario()
    {
        _repo.GetAllAsync().Returns([FakeUser()]);
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["user-1"] = ["Lab-001", "Lab-002"],
        });

        var lista = await _sut.ListarAsync(Admin());

        lista.Should().ContainSingle().Which.LaboratorioIds.Should().Equal("Lab-001", "Lab-002");
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_Professor_PreservaLaboratoriosQueNaoSaoDele()
    {
        _repo.FindByIdIncluindoArquivadosAsync("aluno-1").Returns(Aluno());
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-001", "Lab-002" });

        await _sut.DefinirLaboratoriosAsync("aluno-1", new DefinirLaboratoriosCmd([]), Professor("Lab-001"));

        await _usuarioLabs.Received(1).DefinirAsync("aluno-1",
            Arg.Is<IEnumerable<string>>(ids => ids.SequenceEqual(new[] { "Lab-002" })));
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_Admin_SubstituiOConjuntoInteiro()
    {
        _repo.FindByIdIncluindoArquivadosAsync("aluno-1").Returns(Aluno());
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-001", "Lab-002" });

        await _sut.DefinirLaboratoriosAsync("aluno-1", new DefinirLaboratoriosCmd(["Lab-001"]), Admin());

        await _usuarioLabs.Received(1).DefinirAsync("aluno-1",
            Arg.Is<IEnumerable<string>>(ids => ids.SequenceEqual(new[] { "Lab-001" })));
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ProfessorParaAlunoDeOutroLaboratorio_Recusa()
    {
        _repo.FindByIdIncluindoArquivadosAsync("aluno-1").Returns(Aluno());
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-002" });

        var act = () => _sut.DefinirLaboratoriosAsync("aluno-1", new DefinirLaboratoriosCmd(["Lab-001"]), Professor("Lab-001"));

        await act.Should().ThrowAsync<AcessoNegadoException>();
        await _usuarioLabs.DidNotReceive().DefinirAsync(Arg.Any<string>(), Arg.Any<IEnumerable<string>>());
    }

    [Fact]
    public async Task DefinirLaboratoriosAsync_ProfessorDeixandoAlunoSemLaboratorio_Recusa()
    {
        _repo.FindByIdIncluindoArquivadosAsync("aluno-1").Returns(Aluno());
        _usuarioLabs.DoUsuarioAsync("aluno-1").Returns(new List<string> { "Lab-001" });

        var act = () => _sut.DefinirLaboratoriosAsync("aluno-1", new DefinirLaboratoriosCmd([]), Professor("Lab-001"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*sem laboratório*");
        await _usuarioLabs.DidNotReceive().DefinirAsync(Arg.Any<string>(), Arg.Any<IEnumerable<string>>());
    }

    [Fact]
    public async Task ListarAsync_ProfessorVeSoQuemCompartilhaLaboratorioEASiMesmo()
    {
        _repo.GetAllAsync().Returns(new List<UsuarioInfo>
        {
            new("prof-1", "prof@lab.com", "Eu", null, "Professor", new List<string>(), false),
            new("aluno-a", "a@lab.com", "Do meu lab", null, "Aluno", new List<string>(), false),
            new("prof-b", "b@lab.com", "Colega do meu lab", null, "Professor", new List<string>(), false),
            new("aluno-c", "c@lab.com", "De outro lab", null, "Aluno", new List<string>(), false),
            new("aluno-d", "d@lab.com", "Sem lab", null, "Aluno", new List<string>(), false),
            new("adm", "adm@lab.com", "Admin", null, "Admin", new List<string>(), false),
        });
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["prof-1"] = ["Lab-001"],
            ["aluno-a"] = ["Lab-001", "Lab-002"],
            ["prof-b"] = ["Lab-001"],
            ["aluno-c"] = ["Lab-002"],
            ["adm"] = ["Lab-001"],
        });

        var doProfessor = await _sut.ListarAsync(Professor("Lab-001"));
        var doAdmin = await _sut.ListarAsync(Admin());

        doProfessor.Select(u => u.Id).Should().Equal("prof-1", "aluno-a", "prof-b");
        doAdmin.Should().HaveCount(6);
    }
}

using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Laboratorios;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Laboratorios;

public class LaboratoriosServiceTests
{
    private readonly ILaboratoriosRepository _repo = Substitute.For<ILaboratoriosRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly IResiduosRepository _residuosRepo = Substitute.For<IResiduosRepository>();
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly LaboratoriosService _sut;

    public LaboratoriosServiceTests()
    {
        _residuosRepo.GetAllAsync().Returns([]);
        _sut = new LaboratoriosService(_repo, _audit, _residuosRepo, _usuarioLabs);
    }

    private static Solicitante Dono(string email = "admin@lab.com") =>
        new("u1", email, "Professor", ["Lab-001", "Lab-003"]);

    private static Solicitante Alheio(string email = "outro@lab.com") =>
        new("u2", email, "Professor", ["Lab-002"]);

    private static Solicitante Admin(string email = "admin@resqui.local") =>
        new("adm", email, "Admin", []);

    private static Laboratorio FakeLab(string id = "Lab-001") => new()
    {
        Id = id, Nome = "Química Geral", Responsavel = "Profa. Ana",
        Sala = "B201", Armarios = ["A1"],
        Cor = "#3b82f6", Criado = DateOnly.FromDateTime(DateTime.UtcNow),
    };

    private static CriarLaboratorioCmd CriarCmd(string nome = "Química Geral") =>
        new(nome, "Profa. Ana", "B201", ["A1"], "#3b82f6");

    [Fact]
    public async Task CriarAsync_RegistraAuditoria()
    {
        _repo.AddAsync(Arg.Any<Laboratorio>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.CriarAsync(CriarCmd(), Dono("admin@lab.com"));

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com",
            "lab.criar",
            "Laboratórios",
            Arg.Any<string>(),
            RiscoAuditoria.Low);
    }

    [Fact]
    public async Task AtualizarAsync_LabInexistente_NaoRegistraAuditoria()
    {
        _repo.GetByIdAsync("Lab-999").Returns((Laboratorio?)null);

        var result = await _sut.AtualizarAsync("Lab-999", new AtualizarLaboratorioCmd("X", "S1", []), Dono("admin@lab.com"));

        result.Should().BeNull();
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task AtualizarAsync_LabExistente_RegistraAuditoria()
    {
        var lab = FakeLab();
        _repo.GetByIdAsync("Lab-001").Returns(lab);
        _repo.UpdateAsync(Arg.Any<Laboratorio>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.AtualizarAsync("Lab-001", new AtualizarLaboratorioCmd("Novo Nome", "B201", ["A1"]), Dono("admin@lab.com"));

        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "lab.atualizar", "Laboratórios",
            Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task DeletarAsync_LabExistente_RegistraAuditoria()
    {
        var lab = FakeLab();
        _repo.GetByIdAsync("Lab-001").Returns(lab);
        _repo.DeleteAsync("Lab-001").Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var ok = await _sut.DeletarAsync("Lab-001", Dono("admin@lab.com"));

        ok.Should().BeTrue();
        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "lab.deletar", "Laboratórios",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task DeletarAsync_LabInexistente_NaoRegistraAuditoria()
    {
        _repo.GetByIdAsync("Lab-999").Returns((Laboratorio?)null);

        var ok = await _sut.DeletarAsync("Lab-999", Dono("admin@lab.com"));

        ok.Should().BeFalse();
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public async Task CriarAsync_NomeVazio_LancaValidationException(string? nome)
    {
        var act = () => _sut.CriarAsync(CriarCmd(nome!), Dono("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Nome*");
    }

    [Fact]
    public async Task AtualizarAsync_PreservaResponsavelECor()
    {
        _repo.GetByIdAsync("Lab-001").Returns(FakeLab());
        _repo.UpdateAsync(Arg.Any<Laboratorio>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.AtualizarAsync("Lab-001",
            new AtualizarLaboratorioCmd("Novo Nome", "Sala 9", ["A2"]), Dono());

        result!.Responsavel.Should().Be("Profa. Ana");
        result.Cor.Should().Be("#3b82f6");
        result.Sala.Should().Be("Sala 9");
        result.Armarios.Should().Equal("A2");
    }

    [Fact]
    public async Task Deletar_ComResiduosVinculados_Bloqueia()
    {
        var labRepo = Substitute.For<ILaboratoriosRepository>();
        labRepo.GetByIdAsync("Lab-001").Returns(new Laboratorio { Id = "Lab-001", Nome = "Química" });
        var residuosRepo = Substitute.For<IResiduosRepository>();
        residuosRepo.GetAllAsync().Returns([
            new Residuo { Id = 1, LaboratorioId = "Lab-001" },
            new Residuo { Id = 2, LaboratorioId = "Lab-002" },
        ]);
        var svc = new LaboratoriosService(labRepo, Substitute.For<IAuditoriaService>(), residuosRepo, Substitute.For<IUsuarioLaboratoriosRepository>());

        var act = () => svc.DeletarAsync("Lab-001", Dono("gestor@resqui.local"));

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*1 resíduo*");
        await labRepo.DidNotReceive().DeleteAsync("Lab-001");
    }

    [Fact]
    public async Task Deletar_SemVinculos_Exclui()
    {
        var labRepo = Substitute.For<ILaboratoriosRepository>();
        labRepo.GetByIdAsync("Lab-003").Returns(new Laboratorio { Id = "Lab-003", Nome = "Vazio" });
        var residuosRepo = Substitute.For<IResiduosRepository>();
        residuosRepo.GetAllAsync().Returns([new Residuo { Id = 1, LaboratorioId = "Lab-001" }]);
        var svc = new LaboratoriosService(labRepo, Substitute.For<IAuditoriaService>(), residuosRepo, Substitute.For<IUsuarioLaboratoriosRepository>());

        var ok = await svc.DeletarAsync("Lab-003", Dono("gestor@resqui.local"));

        ok.Should().BeTrue();
        await labRepo.Received().DeleteAsync("Lab-003");
    }

    [Fact]
    public async Task AtualizarAsync_LaboratorioAlheio_LancaAcessoNegado()
    {
        _repo.GetByIdAsync("Lab-001").Returns(FakeLab());

        var act = () => _sut.AtualizarAsync("Lab-001", new AtualizarLaboratorioCmd("Novo Nome", "B201", []), Alheio());

        await act.Should().ThrowAsync<AcessoNegadoException>().WithMessage("*Lab-001*");
    }

    [Fact]
    public async Task AtualizarAsync_ComoAdmin_Aceita()
    {
        _repo.GetByIdAsync("Lab-001").Returns(FakeLab());
        _repo.UpdateAsync(Arg.Any<Laboratorio>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.AtualizarAsync("Lab-001", new AtualizarLaboratorioCmd("Novo Nome", "B201", []), Admin());

        result!.Nome.Should().Be("Novo Nome");
    }

    [Fact]
    public async Task DeletarAsync_LaboratorioAlheio_LancaAcessoNegado()
    {
        _repo.GetByIdAsync("Lab-001").Returns(FakeLab());

        var act = () => _sut.DeletarAsync("Lab-001", Alheio());

        await act.Should().ThrowAsync<AcessoNegadoException>();
    }

    [Fact]
    public async Task DeletarAsync_LaboratorioAlheio_NaoRevelaQuantosResiduosEleTem()
    {
        _repo.GetByIdAsync("Lab-001").Returns(FakeLab());

        var act = () => _sut.DeletarAsync("Lab-001", Alheio());

        (await act.Should().ThrowAsync<AcessoNegadoException>())
            .Which.Message.Should().NotContain("resíduo");
    }

    [Fact]
    public async Task CriarAsync_AssociaOCriadorAoLaboratorio()
    {
        _repo.AddAsync(Arg.Any<Laboratorio>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var criado = await _sut.CriarAsync(CriarCmd(), Dono());

        await _usuarioLabs.Received(1).AdicionarAsync("u1", criado.Id);
    }

    [Fact]
    public async Task ListarAsync_NaoEscopa_DevolveTodos()
    {
        _repo.GetAllAsync().Returns([FakeLab("Lab-001"), FakeLab("Lab-002")]);

        (await _sut.ListarAsync()).Should().HaveCount(2);
    }
}

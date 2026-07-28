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
    private readonly IChamadosRepository _chamadosRepo = Substitute.For<IChamadosRepository>();
    private readonly LaboratoriosService _sut;

    public LaboratoriosServiceTests()
    {
        _residuosRepo.GetAllAsync().Returns([]);
        _chamadosRepo.GetAllWithComentariosAsync().Returns([]);
        _sut = new LaboratoriosService(_repo, _audit, _residuosRepo, _chamadosRepo);
    }

    private static Laboratorio FakeLab(string id = "Lab-001") => new()
    {
        Id = id, Nome = "Química Geral", Responsavel = "Profa. Ana",
        Sala = "B201", Areas = ["Síntese"], Armarios = ["A1"],
        Capacidade = 30, AreaM2 = 60m, Ventilacao = "Exaustão forçada",
        Cor = "#3b82f6", Criado = DateOnly.FromDateTime(DateTime.UtcNow),
    };

    private static CriarLaboratorioCmd CriarCmd() => new(
        "Química Geral", "Profa. Ana", null,
        ["Síntese"], "B201", ["A1"],
        30, 60m, "Exaustão forçada", "#3b82f6");

    [Fact]
    public async Task CriarAsync_RegistraAuditoria()
    {
        _repo.AddAsync(Arg.Any<Laboratorio>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.CriarAsync(CriarCmd(), "admin@lab.com");

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

        var result = await _sut.AtualizarAsync("Lab-999", new AtualizarLaboratorioCmd(
            "X", "Y", null, [], "S1", [], 10, 20m, "Natural", "#fff"), "admin@lab.com");

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

        await _sut.AtualizarAsync("Lab-001", new AtualizarLaboratorioCmd(
            "Novo Nome", "Profa. Ana", null, ["Síntese"], "B201", ["A1"],
            30, 60m, "Exaustão forçada", "#3b82f6"), "admin@lab.com");

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

        var ok = await _sut.DeletarAsync("Lab-001", "admin@lab.com");

        ok.Should().BeTrue();
        await _audit.Received(1).RegistrarAsync(
            "admin@lab.com", "lab.deletar", "Laboratórios",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task DeletarAsync_LabInexistente_NaoRegistraAuditoria()
    {
        _repo.GetByIdAsync("Lab-999").Returns((Laboratorio?)null);

        var ok = await _sut.DeletarAsync("Lab-999", "admin@lab.com");

        ok.Should().BeFalse();
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    private static CriarLaboratorioCmd FakeLabCmd(string nome = "Lab Teste", int capacidade = 10, decimal areaM2 = 40m) =>
        new(nome, "Ana", null, [], "Sala 1", [], capacidade, areaM2, "capela", "#1465c0");

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public async Task CriarAsync_NomeVazio_LancaValidationException(string? nome)
    {
        var act = () => _sut.CriarAsync(FakeLabCmd(nome: nome!), "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Nome*");
    }

    [Fact]
    public async Task CriarAsync_CapacidadeNegativa_LancaValidationException()
    {
        var act = () => _sut.CriarAsync(FakeLabCmd(capacidade: -1), "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Capacidade*");
    }

    [Fact]
    public async Task CriarAsync_AreaNegativa_LancaValidationException()
    {
        var act = () => _sut.CriarAsync(FakeLabCmd(areaM2: -5m), "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Área*");
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
        var chamadosRepo = Substitute.For<IChamadosRepository>();
        chamadosRepo.GetAllWithComentariosAsync().Returns([]);
        var svc = new LaboratoriosService(labRepo, Substitute.For<IAuditoriaService>(), residuosRepo, chamadosRepo);

        var act = () => svc.DeletarAsync("Lab-001", "gestor@resqui.local");

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
        var chamadosRepo = Substitute.For<IChamadosRepository>();
        chamadosRepo.GetAllWithComentariosAsync().Returns([new Chamado { Id = 1, LaboratorioId = "Lab-002" }]);
        var svc = new LaboratoriosService(labRepo, Substitute.For<IAuditoriaService>(), residuosRepo, chamadosRepo);

        var ok = await svc.DeletarAsync("Lab-003", "gestor@resqui.local");

        ok.Should().BeTrue();
        await labRepo.Received().DeleteAsync("Lab-003");
    }
}

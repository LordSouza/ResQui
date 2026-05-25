using FluentAssertions;
using NSubstitute;
using ResQui.Application.Mtrs;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Mtrs;

public class MtrsServiceTests
{
    private readonly IMtrsRepository _repo = Substitute.For<IMtrsRepository>();
    private readonly IResiduosRepository _residuosRepo = Substitute.For<IResiduosRepository>();
    private readonly MtrsService _sut;

    public MtrsServiceTests()
    {
        _sut = new MtrsService(_repo, _residuosRepo);
    }

    private static Mtr FakeMtr(int id = 1, MtrStatus status = MtrStatus.Rascunho) => new()
    {
        Id = id, Numero = $"MTR-2026-{id:D4}", Gerador = "Unifei",
        Transportadora = "EcoLog", ResponsavelId = "user1",
        Status = status, Destinador = "EcoQuímica SA", CodigoIbama = "A099",
    };

    private static Residuo FakeResiduo(int id, int? mtrId = null) => new()
    {
        Id = id, Descricao = "Resíduo", LaboratorioId = 1,
        MtrId = mtrId, Status = "aguardando-coleta",
        Tipo = "Solventes", Volume = 5.0m, Unidade = "L",
        Composicao = "Acetona", Risco = "medio",
    };

    [Fact]
    public async Task ListarAsync_RetornaComResiduoIds()
    {
        var mtr = FakeMtr(1);
        _repo.GetAllAsync().Returns([mtr]);
        _residuosRepo.GetAllAsync().Returns([FakeResiduo(10, mtrId: 1), FakeResiduo(11, mtrId: null)]);

        var result = await _sut.ListarAsync();

        result.Should().HaveCount(1);
        result.First().ResiduoIds.Should().Equal([10]);
    }

    [Fact]
    public async Task CriarAsync_VinculaResiduosECalculaMassa()
    {
        var r1 = FakeResiduo(10);
        var r2 = FakeResiduo(11);
        _residuosRepo.GetByIdAsync(10).Returns(r1);
        _residuosRepo.GetByIdAsync(11).Returns(r2);
        _residuosRepo.GetAllAsync().Returns([r1, r2]);
        _repo.AddAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _repo.UpdateAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        _residuosRepo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _residuosRepo.SaveChangesAsync().Returns(Task.CompletedTask);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", "EcoQuímica SA", "A099", [10, 11]);
        var result = await _sut.CriarAsync(cmd, "user1");

        r1.Status.Should().Be("em-coleta");
        r2.Status.Should().Be("em-coleta");
        result.Massa.Should().Be(10.0m); // 5L + 5L × fator 1.0
        result.ResiduoIds.Should().Contain(10);
        result.ResiduoIds.Should().Contain(11);
    }

    [Fact]
    public async Task EnviarSinirAsync_MtrInexistente_RetornaFalso()
    {
        _repo.GetByIdAsync(999).Returns((Mtr?)null);

        var result = await _sut.EnviarSinirAsync(999);

        result.Sucesso.Should().BeFalse();
        result.Mensagem.Should().Be("MTR não encontrado");
    }

    [Fact]
    public async Task EnviarSinirAsync_StatusAceitoSinir_NaoPermiteReenvio()
    {
        _repo.GetByIdAsync(1).Returns(FakeMtr(1, MtrStatus.AceitoSinir));

        var result = await _sut.EnviarSinirAsync(1);

        result.Sucesso.Should().BeFalse();
        result.Mensagem.Should().Contain("não está em estado enviável");
    }

    [Fact]
    public async Task EnviarBatchAsync_SoProcessaRascunhos()
    {
        _repo.GetAllAsync().Returns([
            FakeMtr(1, MtrStatus.Rascunho),
            FakeMtr(2, MtrStatus.AceitoSinir),
        ]);
        _repo.GetByIdAsync(1).Returns(FakeMtr(1, MtrStatus.Rascunho));
        _repo.UpdateAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var results = (await _sut.EnviarBatchAsync()).ToList();

        results.Should().HaveCount(1); // só o rascunho
    }
}

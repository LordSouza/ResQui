using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Mtrs;
using ResQui.Application.Pdf;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Mtrs;

public class MtrsServiceTests
{
    private readonly IMtrsRepository _repo = Substitute.For<IMtrsRepository>();
    private readonly IResiduosRepository _residuosRepo = Substitute.For<IResiduosRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ICompatService _compat = Substitute.For<ICompatService>();
    private readonly IPdfService _pdf = Substitute.For<IPdfService>();
    private readonly MtrsService _sut;

    public MtrsServiceTests()
    {
        _sut = new MtrsService(_repo, _residuosRepo, _audit, _compat, _pdf);
    }

    private static Mtr FakeMtr(int id = 1) => new()
    {
        Id = id, Numero = $"MTR-2026-{id:D4}", Gerador = "Unifei",
        Transportadora = "EcoLog", ResponsavelId = "user1",
        Destinador = "EcoQuímica SA", CodigoIbama = "A099",
    };

    private static Residuo FakeResiduo(int id, int? mtrId = null) => new()
    {
        Id = id, Descricao = "Resíduo", LaboratorioId = "Lab-001",
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
        var result = await _sut.CriarAsync(cmd, "user1", "user1@lab.com");

        r1.Status.Should().Be("em-coleta");
        r2.Status.Should().Be("em-coleta");
        result.Massa.Should().Be(10.0m); // 5L + 5L × fator 1.0
        result.ResiduoIds.Should().Contain(10);
        result.ResiduoIds.Should().Contain(11);
    }

    [Fact]
    public async Task CriarAsync_ResiduoNaoAprovado_LancaValidationException()
    {
        var r = FakeResiduo(10);
        r.Status = "solicitado"; // descarte ainda não aprovado (RF06 gate)
        _residuosRepo.GetByIdAsync(10).Returns(r);
        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [10]);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*não está aprovado para coleta*");
        await _repo.DidNotReceive().AddAsync(Arg.Any<Mtr>());
    }

    [Fact]
    public async Task CriarAsync_RegistraAuditoria()
    {
        var r = FakeResiduo(10);
        _repo.AddAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        _repo.UpdateAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _residuosRepo.GetByIdAsync(10).Returns(r);
        _residuosRepo.GetAllAsync().Returns(new List<Residuo> { r }.AsEnumerable());
        _residuosRepo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _residuosRepo.SaveChangesAsync().Returns(Task.CompletedTask);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", "EcoQuím", "A099", [10]);
        await _sut.CriarAsync(cmd, "user-1", "ana@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "mtr.criar", "MTR",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task CriarAsync_NaoAtribuiNumero_DeixaParaOBanco()
    {
        var r = FakeResiduo(10);
        Mtr? gravado = null;
        _repo.AddAsync(Arg.Do<Mtr>(m => gravado = m)).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        _repo.UpdateAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _residuosRepo.GetByIdAsync(10).Returns(r);
        _residuosRepo.GetAllAsync().Returns(new List<Residuo> { r }.AsEnumerable());
        _residuosRepo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _residuosRepo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.CriarAsync(new CriarMtrCmd("Unifei", "EcoLog", null, null, [10]), "u1", "ana@lab.com");

        // O número é DEFAULT da coluna (sequência mtrs_numero_seq): o serviço não pode inventá-lo,
        // senão o valor sorteado sobrescreve o do banco e a unicidade volta a depender de sorte.
        gravado.Should().NotBeNull();
        gravado!.Numero.Should().BeNull();
    }

    [Theory]
    [InlineData("", "Transp")]
    [InlineData("Gerador", "")]
    public async Task CriarAsync_GeradorOuTransportadoraVazios_LancaValidationException(string gerador, string transp)
    {
        var cmd = new CriarMtrCmd(gerador, transp, null, null, [1]);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CriarAsync_ResiduoIdsVazio_LancaValidationException()
    {
        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, []);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*resíduo*");
    }

    [Fact]
    public async Task CriarAsync_ResiduoInexistente_LancaValidationException()
    {
        _residuosRepo.GetByIdAsync(7).Returns((Residuo?)null);
        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [7]);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*7*");
        await _repo.DidNotReceive().AddAsync(Arg.Any<Mtr>());
    }
}

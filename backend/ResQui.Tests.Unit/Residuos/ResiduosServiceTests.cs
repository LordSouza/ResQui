using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Residuos;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Residuos;

public class ResiduosServiceTests
{
    private readonly IResiduosRepository _repo = Substitute.For<IResiduosRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ResiduosService _sut;

    public ResiduosServiceTests()
    {
        _sut = new ResiduosService(_repo, _audit);
    }

    private static Residuo FakeResiduo(int id = 1, int? mtrId = null, string status = "aguardando-coleta") => new()
    {
        Id = id,
        Descricao = "Resíduo teste",
        LaboratorioId = 1,
        MtrId = mtrId,
        Status = status,
        Tipo = "Solventes orgânicos não-halogenados",
        Volume = 4.2m,
        Unidade = "L",
        Composicao = "Acetona + Etanol",
        Risco = "medio",
    };

    [Fact]
    public async Task ListarAsync_SemFiltro_RetornaTodos()
    {
        _repo.GetAllAsync().Returns([FakeResiduo(1), FakeResiduo(2)]);

        var result = await _sut.ListarAsync(null, null, null);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarAsync_FiltroStatus_RetornaApenasCombinantes()
    {
        _repo.GetAllAsync().Returns([
            FakeResiduo(1, status: "aguardando-coleta"),
            FakeResiduo(2, status: "destinado"),
        ]);

        var result = await _sut.ListarAsync(null, null, "aguardando-coleta");

        result.Should().HaveCount(1);
        result.First().Status.Should().Be("aguardando-coleta");
    }

    [Fact]
    public async Task ListarAsync_FiltroMtrId_RetornaVinculados()
    {
        _repo.GetAllAsync().Returns([
            FakeResiduo(1, mtrId: 5),
            FakeResiduo(2, mtrId: null),
        ]);

        var result = await _sut.ListarAsync(null, 5, null);

        result.Should().HaveCount(1);
        result.First().MtrId.Should().Be(5);
    }

    [Fact]
    public async Task CriarAsync_PersisteTodosOsCampos()
    {
        var cmd = new CriarResiduoCmd(
            Descricao: "Ácido clorídrico usado",
            LaboratorioId: 2,
            Tipo: "Ácidos inorgânicos",
            Volume: 2.0m,
            Unidade: "L",
            Composicao: "HCl diluído",
            Risco: "alto",
            Destino: null
        );
        _repo.AddAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.CriarAsync(cmd);

        result.Tipo.Should().Be("Ácidos inorgânicos");
        result.Volume.Should().Be(2.0m);
        result.Risco.Should().Be("alto");
        result.Status.Should().Be("aguardando-coleta");
        await _repo.Received(1).AddAsync(Arg.Any<Residuo>());
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task AtualizarAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdAsync(999).Returns((Residuo?)null);

        var result = await _sut.AtualizarAsync(999, new AtualizarResiduoCmd(null, null, null, null, null, null, null, null, null));

        result.Should().BeNull();
    }

    [Fact]
    public async Task AtualizarAsync_AtualizaCamposNaoNulos()
    {
        var r = FakeResiduo(1);
        _repo.GetByIdAsync(1).Returns(r);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.AtualizarAsync(1, new AtualizarResiduoCmd(
            Descricao: null, Tipo: "Metais pesados", Volume: 0.8m,
            Unidade: null, Composicao: null, Risco: "alto",
            Destino: null, Status: null, MtrId: null));

        result!.Tipo.Should().Be("Metais pesados");
        result.Volume.Should().Be(0.8m);
        result.Risco.Should().Be("alto");
        result.Unidade.Should().Be("L"); // campo não alterado permanece
    }
}

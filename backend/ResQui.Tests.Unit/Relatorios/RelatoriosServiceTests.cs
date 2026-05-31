// backend/ResQui.Tests.Unit/Relatorios/RelatoriosServiceTests.cs
using FluentAssertions;
using NSubstitute;
using ResQui.Application.Relatorios;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Relatorios;

public class RelatoriosServiceTests
{
    private readonly IRelatoriosRepository _repo = Substitute.For<IRelatoriosRepository>();
    private readonly IReagentesRepository _reagentesRepo = Substitute.For<IReagentesRepository>();
    private readonly IResiduosRepository _residuosRepo = Substitute.For<IResiduosRepository>();
    private readonly IMtrsRepository _mtrsRepo = Substitute.For<IMtrsRepository>();
    private readonly ILaboratoriosRepository _labsRepo = Substitute.For<ILaboratoriosRepository>();
    private readonly RelatoriosService _sut;

    public RelatoriosServiceTests() =>
        _sut = new RelatoriosService(_repo, _reagentesRepo, _residuosRepo, _mtrsRepo, _labsRepo);

    private static RelatorioGerado FakeRelatorio(int id = 1) => new()
    {
        Id = id, Tipo = "inventario", Titulo = "Inventário de reagentes",
        GeradoPorId = "u1", TotalLinhas = 3, Formato = "csv",
        GeradoEm = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc),
    };

    private static Reagente FakeReagente(string id = "R-00001") => new()
    {
        Id = id, Nome = "Etanol", Local = "Armário A", Responsavel = "João",
        Estoque = 500, EstoqueMin = 100, Validade = new DateOnly(2027, 6, 1),
        ClasseReatividade = 3,
    };

    private static Residuo FakeResiduo(int id = 1, int? mtrId = null) => new()
    {
        Id = id, Descricao = "Solvente usado", LaboratorioId = 1,
        MtrId = mtrId, Status = "aguardando-coleta", Tipo = "solvente",
        Volume = 10, Unidade = "L", DataRegistro = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
    };

    private static Mtr FakeMtr(int id = 1, MtrStatus status = MtrStatus.AceitoSinir) => new()
    {
        Id = id, Numero = "MTR-2026-001", Gerador = "UniLab",
        Transportadora = "EcoTrans", Status = status, Massa = 12.5m,
        DataEmissao = new DateTime(2026, 2, 10, 0, 0, 0, DateTimeKind.Utc),
        CodigoIbama = "001-1",
    };

    private static Laboratorio FakeLab(string id = "Lab-001", string nome = "Lab Química") => new()
    {
        Id = id, Nome = nome,
    };

    // --- ListarAsync ---

    [Fact]
    public async Task ListarAsync_RetornaListaDtos()
    {
        _repo.GetAllAsync().Returns([FakeRelatorio(1), FakeRelatorio(2)]);
        var result = await _sut.ListarAsync();
        result.Should().HaveCount(2);
        result.First().Tipo.Should().Be("inventario");
    }

    [Fact]
    public async Task ListarAsync_VazioRetornaLista()
    {
        _repo.GetAllAsync().Returns([]);
        var result = await _sut.ListarAsync();
        result.Should().BeEmpty();
    }

    // --- GerarAsync ---

    [Fact]
    public async Task GerarAsync_Inventario_PersisteTipoETitulo()
    {
        _reagentesRepo.GetAllAsync().Returns([FakeReagente()]);
        _repo.AddAsync(Arg.Any<RelatorioGerado>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.GerarAsync(new GerarRelatorioCmd("inventario"), "u1");

        result.Tipo.Should().Be("inventario");
        result.Titulo.Should().Be("Inventário de reagentes");
        result.GeradoPorId.Should().Be("u1");
        result.Formato.Should().Be("csv");
        result.TotalLinhas.Should().Be(1);
        await _repo.Received(1).AddAsync(Arg.Any<RelatorioGerado>());
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task GerarAsync_Sinir_FiltradoPorAceitoSinir()
    {
        _mtrsRepo.GetAllAsync().Returns([
            FakeMtr(1, MtrStatus.AceitoSinir),
            FakeMtr(2, MtrStatus.Rascunho),
        ]);
        _repo.AddAsync(Arg.Any<RelatorioGerado>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.GerarAsync(new GerarRelatorioCmd("sinir"), "u1");

        result.TotalLinhas.Should().Be(1);
    }

    [Fact]
    public async Task GerarAsync_TipoDesconhecido_LancaArgumentException()
    {
        var act = async () => await _sut.GerarAsync(new GerarRelatorioCmd("invalido"), "u1");
        await act.Should().ThrowAsync<ArgumentException>();
    }

    // --- DownloadAsync ---

    [Fact]
    public async Task DownloadAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdAsync(999).Returns((RelatorioGerado?)null);
        var result = await _sut.DownloadAsync(999);
        result.Should().BeNull();
    }

    [Fact]
    public async Task DownloadAsync_Inventario_RetornaCsvComCabecalho()
    {
        _repo.GetByIdAsync(1).Returns(FakeRelatorio(1));
        _reagentesRepo.GetAllAsync().Returns([FakeReagente("R-00001")]);

        var result = await _sut.DownloadAsync(1);

        result.Should().NotBeNull();
        result!.Value.Csv.Should().Contain("Id,Nome");
        result!.Value.Csv.Should().Contain("R-00001");
        result!.Value.Filename.Should().EndWith(".csv");
    }
}

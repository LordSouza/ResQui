// backend/ResQui.Tests.Unit/Relatorios/RelatoriosServiceTests.cs
using System.Globalization;
using FluentAssertions;
using NSubstitute;
using ResQui.Application.Common;
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
    private readonly IPgrsConfigRepository _pgrsRepo = Substitute.For<IPgrsConfigRepository>();
    private readonly RelatoriosService _sut;

    public RelatoriosServiceTests() =>
        _sut = new RelatoriosService(_repo, _reagentesRepo, _residuosRepo, _mtrsRepo, _labsRepo, _pgrsRepo);

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
        Id = id, Descricao = "Solvente usado", LaboratorioId = "Lab-001",
        MtrId = mtrId, Status = "aguardando-coleta", Tipo = "solvente",
        Volume = 10, Unidade = "L", DataRegistro = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
    };

    private static Mtr FakeMtr(int id = 1) => new()
    {
        Id = id, Numero = $"MTR-2026-{id:D3}", Gerador = "UniLab",
        Transportadora = "EcoTrans",
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
    public async Task DownloadAsync_Pgrs_IncluiTodosOsManifestos()
    {
        _repo.GetByIdAsync(1).Returns(new RelatorioGerado
        {
            Id = 1, Tipo = "pgrs", Titulo = "PGRS Anual",
            GeradoPorId = "u1", TotalLinhas = 0, Formato = "csv",
        });
        _mtrsRepo.GetAllAsync().Returns([FakeMtr(1), FakeMtr(2)]);

        var result = await _sut.DownloadAsync(1);

        result.Should().NotBeNull();
        var csv = result!.Value.Csv;
        csv.Should().Contain("# MANIFESTOS");
        // sem filtro de status: os dois manifestos entram
        csv.Should().Contain("MTR-2026-001").And.Contain("MTR-2026-002");
    }

    [Fact]
    public async Task DownloadAsync_Pgrs_ManifestosTrazemAsDuasDimensoes()
    {
        _repo.GetByIdAsync(1).Returns(FakeRelatorioPgrs());
        var liquido = FakeResiduo(10, mtrId: 1);
        var solido = FakeResiduo(11, mtrId: 1);
        solido.Volume = 2.5m;
        solido.Unidade = "kg";
        _mtrsRepo.GetAllAsync().Returns([FakeMtr(1)]);
        _residuosRepo.GetAllAsync().Returns([liquido, solido]);
        _labsRepo.GetAllAsync().Returns([FakeLab()]);
        _reagentesRepo.GetAllAsync().Returns([]);
        _pgrsRepo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var result = await _sut.DownloadAsync(1);

        result.Should().NotBeNull();
        result!.Value.Csv.Should().Contain("Total (L),Total (kg)");
        result.Value.Csv.Should().Contain("10.000,2.500");
    }

    [Fact]
    public async Task DownloadAsync_Indicadores_SeparaLitrosDeQuilosSemSomarDimensoes()
    {
        _repo.GetByIdAsync(1).Returns(new RelatorioGerado
        {
            Id = 1, Tipo = "indicadores", Titulo = "Indicadores de geração",
            GeradoPorId = "u1", TotalLinhas = 0, Formato = "csv",
        });
        var metroCubico = FakeResiduo(10);
        metroCubico.Volume = 2m;
        metroCubico.Unidade = "m³";
        var solido = FakeResiduo(11);
        solido.Volume = 5m;
        solido.Unidade = "kg";
        var mililitros = FakeResiduo(12);
        mililitros.Volume = 500m;
        mililitros.Unidade = "mL";
        _residuosRepo.GetAllAsync().Returns([metroCubico, solido, mililitros]);
        _labsRepo.GetAllAsync().Returns([FakeLab()]);

        var result = await _sut.DownloadAsync(1);

        var csv = result!.Value.Csv;
        csv.Should().Contain("Total (L),Total (kg)");
        csv.Should().Contain("2026-03,2000.500,5.000");
        csv.Should().Contain("Lab Química,2000.500,5.000");
        csv.Should().NotContain("7.500");
    }

    [Fact]
    public async Task DownloadAsync_TipoQueNaoExisteMais_RetornaNull()
    {
        _repo.GetByIdAsync(7).Returns(new RelatorioGerado
        {
            Id = 7, Tipo = "tipo-descontinuado", Titulo = "Relatório de um tipo que não existe mais",
            GeradoPorId = "u1", TotalLinhas = 2, Formato = "csv",
        });

        var result = await _sut.DownloadAsync(7);

        result.Should().BeNull();
    }

    [Theory]
    [InlineData("invalido")]
    [InlineData("")]
    [InlineData(null)]
    public async Task GerarAsync_TipoForaDoCatalogo_LancaValidationExceptionSemGravar(string? tipo)
    {
        var act = async () => await _sut.GerarAsync(new GerarRelatorioCmd(tipo!), "u1");

        await act.Should().ThrowAsync<ValidationException>();
        await _repo.DidNotReceive().AddAsync(Arg.Any<RelatorioGerado>());
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

    private static RelatorioGerado FakeRelatorioPgrs() => new()
    {
        Id = 1, Tipo = "pgrs", Titulo = "PGRS Anual",
        GeradoPorId = "u1", TotalLinhas = 0, Formato = "csv",
        GeradoEm = new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc),
    };

    [Fact]
    public async Task DownloadAsync_Pgrs_IncluiIdentificacaoQuandoConfigurado()
    {
        _repo.GetByIdAsync(1).Returns(FakeRelatorioPgrs());
        _reagentesRepo.GetAllAsync().Returns([]);
        _residuosRepo.GetAllAsync().Returns([]);
        _mtrsRepo.GetAllAsync().Returns([]);
        _labsRepo.GetAllAsync().Returns([]);
        _pgrsRepo.GetAsync().Returns(new ConfiguracaoPgrs
        {
            Id = 1, RazaoSocial = "Instituição Teste", Cnpj = "12.345.678/0001-95",
            RespTecnico = "Resp. Teste", RespCrq = "CRQ-123",
        });

        var result = await _sut.DownloadAsync(1);

        result.Should().NotBeNull();
        result!.Value.Csv.Should().Contain("# IDENTIFICACAO");
        result.Value.Csv.Should().Contain("Instituição Teste");
        result.Value.Csv.Should().Contain("12.345.678/0001-95");
        result.Value.Csv.Should().Contain("CRQ-123");
    }

    [Fact]
    public async Task DownloadAsync_Pgrs_SemConfiguracao_OmiteIdentificacao()
    {
        _repo.GetByIdAsync(1).Returns(FakeRelatorioPgrs());
        _reagentesRepo.GetAllAsync().Returns([]);
        _residuosRepo.GetAllAsync().Returns([]);
        _mtrsRepo.GetAllAsync().Returns([]);
        _labsRepo.GetAllAsync().Returns([]);
        _pgrsRepo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var result = await _sut.DownloadAsync(1);

        result.Should().NotBeNull();
        result!.Value.Csv.Should().NotContain("# IDENTIFICACAO");
    }

    [Fact]
    public async Task DownloadAsync_Pgrs_ConfiguracaoComCamposVazios_OmiteIdentificacao()
    {
        _repo.GetByIdAsync(1).Returns(FakeRelatorioPgrs());
        _reagentesRepo.GetAllAsync().Returns([]);
        _residuosRepo.GetAllAsync().Returns([]);
        _mtrsRepo.GetAllAsync().Returns([]);
        _labsRepo.GetAllAsync().Returns([]);
        _pgrsRepo.GetAsync().Returns(new ConfiguracaoPgrs());

        var result = await _sut.DownloadAsync(1);

        result.Should().NotBeNull();
        result!.Value.Csv.Should().NotContain("# IDENTIFICACAO");
    }

    [Theory]
    [InlineData("pt-BR")]
    [InlineData("en-US")]
    [InlineData("")]
    public async Task DownloadAsync_Inventario_DataEmIsoENumeroComPontoIndependenteDaCultura(string cultura)
    {
        var anterior = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(cultura);
        try
        {
            _repo.GetByIdAsync(1).Returns(FakeRelatorio());
            _reagentesRepo.GetAllAsync().Returns([FakeReagente()]);

            var result = await _sut.DownloadAsync(1);

            var linha = result!.Value.Csv.Split('\n').First(l => l.StartsWith("R-00001"));
            linha.Should().Contain("2027-06-01");
            linha.Should().Contain("500.000");
            linha.Should().Contain("100.000");
        }
        finally
        {
            CultureInfo.CurrentCulture = anterior;
        }
    }
}

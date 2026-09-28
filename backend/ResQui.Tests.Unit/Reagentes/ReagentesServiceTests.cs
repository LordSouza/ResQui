using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Pdf;
using ResQui.Application.Reagentes;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Reagentes;

public class ReagentesServiceTests
{
    private readonly IReagentesRepository _repo = Substitute.For<IReagentesRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly IPdfService _pdf = Substitute.For<IPdfService>();
    private readonly IReagenteLotesRepository _lotes = Substitute.For<IReagenteLotesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly ILaboratoriosRepository _laboratorios = Substitute.For<ILaboratoriosRepository>();
    private readonly ReagentesService _sut;

    private static readonly Solicitante Admin = new("adm", "admin@lab.com", "Admin", []);

    public ReagentesServiceTests()
    {
        _laboratorios.GetByIdAsync("Lab-001").Returns(LabQuimica);
        _laboratorios.GetByIdAsync("Lab-002").Returns(LabInflamaveis);
        _laboratorios.GetByIdAsync("Lab-003").Returns(LabSemArmario);
        _sut = new ReagentesService(_repo, _audit, _pdf, _lotes, new VisibilidadeUsuarios(_auth, _usuarioLabs), _laboratorios);
    }

    private static readonly Laboratorio LabQuimica = new() { Id = "Lab-001", Nome = "Química", Armarios = ["Armário A", "Armário B"] };
    private static readonly Laboratorio LabInflamaveis = new() { Id = "Lab-002", Nome = "Inflamáveis", Armarios = ["Armário C"] };
    private static readonly Laboratorio LabSemArmario = new() { Id = "Lab-003", Nome = "Bancada", Armarios = [] };

    private static Solicitante Quem(string email) => new("u-ana", email, "Professor", ["Lab-001", "Lab-002", "Lab-003"]);

    private static readonly Solicitante DeOutroLaboratorio = new("u-out", "outro@lab.com", "Professor", ["Lab-009"]);

    private static Reagente FakeReagente(string id = "R-001") => new()
    {
        Id = id, Nome = "Ácido Clorídrico", Cas = "7647-01-0",
        Formula = "HCl", ClasseReatividade = 1,
        Estoque = 2.4m, Unidade = "L",
        Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(200)),
        LaboratorioId = "Lab-001", Laboratorio = LabQuimica, Armario = "Armário A", Controlado = true
    };

    [Fact]
    public async Task ListarMovimentacoes_PedeIdEtetoAoFiltro_EmVezDeVarrerAAuditoriaInteira()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));
        _audit.ListarAsync(Arg.Any<ResQui.Application.Auditoria.AuditoriaFiltroDto>()).Returns(new[]
        {
            new ResQui.Application.Auditoria.AuditoriaItemDto(Guid.NewGuid(), DateTime.UtcNow, "ana", "reagente.baixa", "Inventário", "Baixa de 1 L (reagente R-001)", "medium"),
        });

        var movs = await _sut.ListarMovimentacoesAsync("R-001", Admin, 20);

        movs.Should().NotBeNull();
        movs!.Should().ContainSingle();
        await _audit.Received(1).ListarAsync(Arg.Is<ResQui.Application.Auditoria.AuditoriaFiltroDto>(
            f => f.What == "reagente." && f.Detail == "R-001" && f.Limite == 20));
    }

    [Fact]
    public async Task ListarMovimentacoes_ReagenteInexistente_RetornaNull()
    {
        _repo.GetByIdAsync("R-404").Returns((Reagente?)null);
        (await _sut.ListarMovimentacoesAsync("R-404", Admin)).Should().BeNull();
    }

    [Fact]
    public async Task ListarMovimentacoes_MascaraOAutorDeOutroLaboratorio_SemEsconderAMovimentacao()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));
        _audit.ListarAsync(Arg.Any<ResQui.Application.Auditoria.AuditoriaFiltroDto>()).Returns(new[]
        {
            new ResQui.Application.Auditoria.AuditoriaItemDto(Guid.NewGuid(), DateTime.UtcNow, "colega@lab.com", "reagente.baixa", "Inventário", "Baixa (reagente R-001)", "medium"),
            new ResQui.Application.Auditoria.AuditoriaItemDto(Guid.NewGuid(), DateTime.UtcNow, "estranho@lab.com", "reagente.baixa", "Inventário", "Baixa (reagente R-001)", "medium"),
        });
        _auth.FindByEmailIncluindoArquivadosAsync("colega@lab.com").Returns(
            new UsuarioInfo("u-1", "colega@lab.com", "Colega", null, "Aluno", [], false));
        _auth.FindByEmailIncluindoArquivadosAsync("estranho@lab.com").Returns(
            new UsuarioInfo("u-2", "estranho@lab.com", "Estranho", null, "Aluno", [], false));
        _usuarioLabs.DoUsuarioAsync("u-1").Returns(new List<string> { "Lab-001" });
        _usuarioLabs.DoUsuarioAsync("u-2").Returns(new List<string> { "Lab-002" });
        var professor = new Solicitante("prof-1", "prof@lab.com", "Professor", ["Lab-001"]);

        var movs = (await _sut.ListarMovimentacoesAsync("R-001", professor))!.ToList();

        movs.Select(m => m.Who).Should().Equal("colega@lab.com", ReagentesService.AutorDeOutroLaboratorio);
    }

    [Fact]
    public async Task ListarAsync_SemFiltro_RetornaTodos()
    {
        _repo.GetAllAsync().Returns([FakeReagente("R-001"), FakeReagente("R-002")]);

        var (items, total) = await _sut.ListarAsync(new ReagentesFiltroDto(), Admin);

        total.Should().Be(2);
        items.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarAsync_FiltroQ_RetornaApenasCombinantes()
    {
        _repo.GetAllAsync().Returns([FakeReagente("R-001"), FakeReagente("R-002")]);

        var (items, total) = await _sut.ListarAsync(new ReagentesFiltroDto(Q: "cloridrico"), Admin);

        items.Should().HaveCount(2); // ambos são "Ácido Clorídrico"
    }

    [Fact]
    public async Task BaixaAsync_EstoqueSuficiente_DescontaERegistraAuditoria()
    {
        var r = FakeReagente();
        _repo.GetByIdAsync("R-001").Returns(r);

        var result = await _sut.BaixaAsync("R-001", new BaixaCmd(0.5m), Quem("ana@lab.com"));

        result.Should().NotBeNull();
        result!.Estoque.Should().Be(1.9m);
        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com",
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<ResQui.Domain.Enums.RiscoAuditoria>());
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task BaixaAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdAsync("X-999").Returns((Reagente?)null);

        var result = await _sut.BaixaAsync("X-999", new BaixaCmd(1m), Quem("user"));

        result.Should().BeNull();
    }

    private static CriarReagenteCmd FakeCmd(string nome = "Ácido X", decimal estoque = 1m, decimal? estoqueMin = 0.5m, int classe = 1) =>
        new(null, nome, "123-45-6", "HX", null, classe, estoque, estoqueMin, "L", null, "Lab-001", "Armário A", false, null, null);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CriarAsync_NomeVazioOuNulo_LancaValidationException(string? nome)
    {
        var act = () => _sut.CriarAsync(FakeCmd(nome: nome!), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Nome*");
    }

    [Fact]
    public async Task CriarAsync_EstoqueNegativo_LancaValidationException()
    {
        var act = () => _sut.CriarAsync(FakeCmd(estoque: -1m), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Estoque*");
    }

    [Fact]
    public async Task CriarAsync_EstoqueMinNegativo_LancaValidationException()
    {
        var act = () => _sut.CriarAsync(FakeCmd(estoqueMin: -2m), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*mínimo*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    [InlineData(-1)]
    public async Task CriarAsync_ClasseForaDaFaixa_LancaValidationException(int classe)
    {
        var act = () => _sut.CriarAsync(FakeCmd(classe: classe), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Classe de reatividade*");
    }

    [Theory]
    [InlineData(1)]
    [InlineData(12)]
    public async Task CriarAsync_ClasseNosLimitesDaFaixa_CriaComAClasseInformada(int classe)
    {
        (await _sut.CriarAsync(FakeCmd(classe: classe), Quem("ana@lab.com"))).ClasseReatividade.Should().Be(classe);
    }

    [Theory]
    [InlineData("amanhã")]
    [InlineData("")]
    public async Task CriarAsync_ValidadeMalFormatada_LancaValidationExceptionEmVezDeFormatException(string validade)
    {
        var cmd = FakeCmd() with { Validade = validade };

        var act = () => _sut.CriarAsync(cmd, Quem("ana@lab.com"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*validade*");
    }

    [Fact]
    public async Task AtualizarAsync_ValidadeMalFormatada_LancaValidationExceptionEmVezDeFormatException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());

        var act = () => _sut.AtualizarAsync(
            "R-001", new AtualizarReagenteCmd("Ácido X", 1m, 0.5m, "Lab-001", "Armário A", "31/12/2026 ou nada"), Quem("ana@lab.com"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*validade*");
    }

    [Fact]
    public async Task BaixaAsync_QuantidadeZero_LancaValidationException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());
        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(0m), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*maior que zero*");
    }

    [Fact]
    public async Task BaixaAsync_QuantidadeNegativa_LancaValidationException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());
        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(-0.5m), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*maior que zero*");
    }

    [Fact]
    public async Task BaixaAsync_QuantidadeMaiorQueEstoque_LancaValidationException()
    {
        var r = FakeReagente();
        r.Estoque = 0.3m;
        _repo.GetByIdAsync("R-001").Returns(r);
        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(1.0m), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*insuficiente*");
    }

    [Fact]
    public async Task BaixaAsync_ComMotivo_GravaOMotivoNoDetalheDaAuditoria()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());

        await _sut.BaixaAsync("R-001", new BaixaCmd(0.5m, "  Uso em prática didática  "), Quem("ana@lab.com"));

        await _audit.Received(1).RegistrarAsync("ana@lab.com", "reagente.baixa", "Inventário",
            Arg.Is<string>(d => d.Contains("(reagente R-001)") && d.EndsWith("· motivo: Uso em prática didática")),
            RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task BaixaAsync_SemMotivo_NaoAcrescentaMotivoAoDetalhe()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());

        await _sut.BaixaAsync("R-001", new BaixaCmd(0.5m, "   "), Quem("ana@lab.com"));

        await _audit.Received(1).RegistrarAsync("ana@lab.com", "reagente.baixa", "Inventário",
            Arg.Is<string>(d => !d.Contains("motivo")), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task BaixaAsync_MotivoAcimaDoLimite_LancaValidationExceptionSemDescontar()
    {
        var r = FakeReagente();
        _repo.GetByIdAsync("R-001").Returns(r);
        var motivoLongo = new string('x', BaixaCmd.MaxMotivo + 1);

        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(0.5m, motivoLongo), Quem("ana@lab.com"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*motivo*");
        r.Estoque.Should().Be(2.4m);
        await _repo.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task TransferirAsync_MudaLaboratorioEArmarioMantemEstoqueERegistraAuditoria()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 2.4m;
        _repo.GetByIdAsync("R-001").Returns(r);

        var result = await _sut.TransferirAsync("R-001",
            new TransferirReagenteCmd("Lab-002", "Armário C"), Quem("ana@lab.com"));

        result.Should().NotBeNull();
        result!.LaboratorioId.Should().Be("Lab-002");
        result.Armario.Should().Be("Armário C");
        result.Local.Should().Be("Inflamáveis · Armário C");
        result.Estoque.Should().Be(2.4m);
        await _audit.Received(1).RegistrarAsync("ana@lab.com", "reagente.transferencia",
            "Inventário",
            Arg.Is<string>(d => d.Contains("Química · Armário A") && d.Contains("Inflamáveis · Armário C")),
            ResQui.Domain.Enums.RiscoAuditoria.Low);
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task TransferirAsync_SemLaboratorio_LancaValidationException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));

        var act = () => _sut.TransferirAsync("R-001",
            new TransferirReagenteCmd("   ", "Armário C"), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Laboratório*");
    }

    [Fact]
    public async Task TransferirAsync_DestinoIgualAoAtual_LancaValidationException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));

        var act = () => _sut.TransferirAsync("R-001",
            new TransferirReagenteCmd("Lab-001", "Armário A"), Quem("ana@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*já está*");
    }

    [Fact]
    public async Task TransferirAsync_DestinoForaDoEscopo_LancaValidationException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));
        var soDaQuimica = new Solicitante("u-1", "p@lab.com", "Professor", ["Lab-001"]);

        var act = () => _sut.TransferirAsync("R-001",
            new TransferirReagenteCmd("Lab-002", "Armário C"), soDaQuimica);
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Lab-002*");
        await _repo.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task TransferirAsync_ReagenteInexistente_RetornaNull()
    {
        _repo.GetByIdAsync("X-999").Returns((Reagente?)null);

        var result = await _sut.TransferirAsync("X-999",
            new TransferirReagenteCmd("Lab-002", "Armário C"), Quem("ana"));
        result.Should().BeNull();
    }

    // Nome distinto de FakeCmd (já existente acima, com 3 parâmetros) para evitar
    // ambiguidade de overload — mesmos valores/semântica especificados na brief.
    private static CriarReagenteCmd FakeImportCmd(string nome = "Reagente", decimal estoque = 1m, string? validade = null) =>
        new(null, nome, "64-17-5", "C2H6O", null, 12, estoque, null, "L", validade, "Lab-001", "Armário A", false, null, null);

    [Fact]
    public async Task ImportarLoteAsync_ImportaValidasEReportaInvalidas()
    {
        var cmds = new[]
        {
            FakeImportCmd(nome: "Etanol"),
            FakeImportCmd(nome: ""),        // inválida: Nome obrigatório
            FakeImportCmd(nome: "Acetona"),
        };

        var result = await _sut.ImportarLoteAsync(cmds, Quem("u@x.com"));

        result.Total.Should().Be(3);
        result.Importados.Should().Be(2);
        result.Erros.Should().ContainSingle();
        result.Erros[0].Indice.Should().Be(1);
        result.Erros[0].Motivo.Should().Contain("Nome");
    }

    [Fact]
    public async Task ImportarLoteAsync_ValidadeInvalida_ReportaErroDeLinhaSemAbortarLote()
    {
        var cmds = new[]
        {
            FakeImportCmd(nome: "Etanol", validade: "amanhã"),
            FakeImportCmd(nome: "Acetona"),
        };

        var result = await _sut.ImportarLoteAsync(cmds, Quem("u@x.com"));

        result.Total.Should().Be(2);
        result.Importados.Should().Be(1);
        result.Erros.Should().ContainSingle();
        result.Erros[0].Indice.Should().Be(0);
        result.Erros[0].Motivo.Should().Contain("validade", "a mensagem deve indicar o campo inválido (substring literal em minúsculas — Contain é case-sensitive)");
    }

    [Fact]
    public async Task ImportarLoteAsync_ListaVazia_LancaValidationException()
    {
        var act = () => _sut.ImportarLoteAsync(Array.Empty<CriarReagenteCmd>(), Quem("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ImportarLoteAsync_RegistraAuditoria()
    {
        await _sut.ImportarLoteAsync(new[] { FakeImportCmd() }, Quem("u@x.com"));

        await _audit.Received().RegistrarAsync("u@x.com", "reagente.bulk-import", "Inventário",
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task ListarAsync_ItensTrazemOsCamposQueATelaDeInventarioRende()
    {
        var r = FakeReagente("R-001");
        r.Sinonimo = "HCl concentrado";
        r.EstoqueMin = 5m;
        r.Ghs = new ReagenteGhs { Pictos = ["GHS05"], Signal = "Perigo" };
        _repo.GetAllAsync().Returns([r]);

        var (items, _) = await _sut.ListarAsync(new ReagentesFiltroDto(), Admin);

        var item = items.Single();
        item.Sinonimo.Should().Be("HCl concentrado");
        item.EstoqueMin.Should().Be(5m);
        item.Validade.Should().Be(r.Validade.ToString("yyyy-MM-dd"));
        item.Ghs!.Pictos.Should().Equal("GHS05");
        item.Ghs.Signal.Should().Be("Perigo");
    }

    private ReagenteLote PrepararLoteDoReagente(Reagente r, decimal estoqueDoLote)
    {
        var lote = new ReagenteLote
        {
            Id = 7, ReagenteId = r.Id, Codigo = "L-001", Estoque = estoqueDoLote,
            Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(200)),
        };
        _repo.GetByIdAsync(r.Id).Returns(r);
        _lotes.GetByIdAsync(lote.Id).Returns(lote);
        return lote;
    }

    [Fact]
    public async Task BaixaLote_DecrementaLoteEReagente()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 5m;
        var lote = PrepararLoteDoReagente(r, 3m);

        var loteAtualizado = await _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(1.5m), Quem("ana@resqui.local"));

        loteAtualizado!.Estoque.Should().Be(1.5m);
        lote.Estoque.Should().Be(1.5m);
        r.Estoque.Should().Be(3.5m);
    }

    [Fact]
    public async Task BaixaLote_RecusaQuantidadeAcimaDoSaldoDoLote()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 10m;
        var lote = PrepararLoteDoReagente(r, 3m);

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(4m), Quem("ana@resqui.local"));

        await acao.Should().ThrowAsync<ValidationException>().WithMessage("*lote L-001*");
        lote.Estoque.Should().Be(3m);
        r.Estoque.Should().Be(10m);
    }

    [Fact]
    public async Task BaixaLote_RecusaQuandoOEstoqueDoReagenteNaoCobreOLote()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 1m;
        var lote = PrepararLoteDoReagente(r, 3m);

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(2m), Quem("ana@resqui.local"));

        await acao.Should().ThrowAsync<ValidationException>().WithMessage("*descasados*");
        r.Estoque.Should().Be(1m);
        lote.Estoque.Should().Be(3m);
    }

    [Fact]
    public async Task BaixaLote_RecusaQuantidadeNaoPositiva()
    {
        var r = FakeReagente("R-001");
        var lote = PrepararLoteDoReagente(r, 3m);

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(0m), Quem("ana@resqui.local"));

        await acao.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task BaixaLote_ComOsDoisSaldosEstourados_ReclamaDoLotePrimeiro()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 1m;
        var lote = PrepararLoteDoReagente(r, 3m);

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(5m), Quem("ana@resqui.local"));

        var erro = await acao.Should().ThrowAsync<ValidationException>();
        erro.WithMessage("*lote L-001*");
        erro.Which.Message.Should().NotContain("descasados");
    }

    [Fact]
    public async Task BaixaLote_AceitaEsvaziarOLoteQuandoAQuantidadeIgualaOsSaldos()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 3m;
        var lote = PrepararLoteDoReagente(r, 3m);

        var loteAtualizado = await _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(3m), Quem("ana@resqui.local"));

        loteAtualizado!.Estoque.Should().Be(0m);
        r.Estoque.Should().Be(0m);
    }

    [Fact]
    public async Task BaixaLote_ArredondaOsDoisSaldosATresCasas()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 5m;
        var lote = PrepararLoteDoReagente(r, 3m);

        await _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(0.0006m), Quem("ana@resqui.local"));

        lote.Estoque.Should().Be(2.999m);
        r.Estoque.Should().Be(4.999m);
    }

    [Fact]
    public async Task QrDoRotuloAsync_ReagenteInexistente_DevolveNull()
    {
        _repo.GetByIdAsync("R-99999").Returns((Reagente?)null);

        var png = await _sut.QrDoRotuloAsync("R-99999", Admin);

        png.Should().BeNull();
    }

    [Fact]
    public async Task QrDoRotuloAsync_ReagenteExistente_DevolvePng()
    {
        _repo.GetByIdAsync("R-00007").Returns(new Reagente { Id = "R-00007", Nome = "Metanol" });

        var png = await _sut.QrDoRotuloAsync("R-00007", Admin);

        png.Should().StartWith(new byte[] { 0x89, 0x50, 0x4E, 0x47 });
    }

    [Fact]
    public async Task ListarAsync_DevolveSoOsReagentesDosLaboratoriosDoSolicitante()
    {
        var doOutroLaboratorio = FakeReagente("R-002");
        doOutroLaboratorio.LaboratorioId = "Lab-009";
        var semLaboratorio = FakeReagente("R-003");
        semLaboratorio.LaboratorioId = null;
        semLaboratorio.Laboratorio = null;
        _repo.GetAllAsync().Returns([FakeReagente("R-001"), doOutroLaboratorio, semLaboratorio]);
        var professor = new Solicitante("u-1", "p@lab.com", "Professor", ["Lab-001"]);

        var (items, total) = await _sut.ListarAsync(new ReagentesFiltroDto(), professor);

        items.Select(r => r.Id).Should().Equal("R-001");
        total.Should().Be(1);
        (await _sut.ListarAsync(new ReagentesFiltroDto(), Admin)).Total.Should().Be(3);
    }

    [Fact]
    public async Task ObterPorIdAsync_ReagenteDeOutroLaboratorio_LancaAcessoNegado()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));

        var act = () => _sut.ObterPorIdAsync("R-001", DeOutroLaboratorio);

        await act.Should().ThrowAsync<AcessoNegadoException>().WithMessage("*R-001*");
    }

    [Fact]
    public async Task ObterPorIdAsync_Inexistente_DevolveNullAntesDoEscopo()
    {
        _repo.GetByIdAsync("R-404").Returns((Reagente?)null);

        (await _sut.ObterPorIdAsync("R-404", DeOutroLaboratorio)).Should().BeNull();
    }

    [Fact]
    public async Task ObterPorIdAsync_ReagenteSemLaboratorio_SoOAdminEnxerga()
    {
        var semLaboratorio = FakeReagente("R-001");
        semLaboratorio.LaboratorioId = null;
        semLaboratorio.Laboratorio = null;
        semLaboratorio.Armario = "Lab-201 · Armário A";
        _repo.GetByIdAsync("R-001").Returns(semLaboratorio);

        (await _sut.ObterPorIdAsync("R-001", Admin))!.Local.Should().Be("Sem laboratório · Lab-201 · Armário A");
        var act = () => _sut.ObterPorIdAsync("R-001", Quem("ana@lab.com"));
        await act.Should().ThrowAsync<AcessoNegadoException>();
    }

    [Fact]
    public async Task BaixaAsync_ReagenteDeOutroLaboratorio_LancaAcessoNegadoSemGravar()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));

        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(1m), DeOutroLaboratorio);

        await act.Should().ThrowAsync<AcessoNegadoException>();
        await _repo.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task CriarAsync_DerivaOLocalDoLaboratorioEDoArmario()
    {
        var criado = await _sut.CriarAsync(FakeCmd(), Quem("ana@lab.com"));

        criado.LaboratorioId.Should().Be("Lab-001");
        criado.Armario.Should().Be("Armário A");
        criado.Local.Should().Be("Química · Armário A");
    }

    [Fact]
    public async Task CriarAsync_LaboratorioForaDoEscopo_LancaValidationException()
    {
        var soDaQuimica = new Solicitante("u-1", "p@lab.com", "Professor", ["Lab-001"]);
        var cmd = FakeCmd() with { LaboratorioId = "Lab-002", Armario = "Armário C" };

        var act = () => _sut.CriarAsync(cmd, soDaQuimica);

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Lab-002*");
        await _repo.DidNotReceive().AddAsync(Arg.Any<Reagente>());
    }

    [Theory]
    [InlineData("Lab-001", "Armário Z", "*Armário Z*")]
    [InlineData("Lab-001", "", "*Escolha um armário*")]
    [InlineData("Lab-003", "Armário A", "*não tem armários*")]
    [InlineData("", "Armário A", "*Laboratório é obrigatório*")]
    public async Task CriarAsync_ArmarioInvalidoParaOLaboratorio_LancaValidationException(
        string laboratorioId, string armario, string mensagem)
    {
        var cmd = FakeCmd() with { LaboratorioId = laboratorioId, Armario = armario };

        var act = () => _sut.CriarAsync(cmd, Quem("ana@lab.com"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage(mensagem);
    }

    [Fact]
    public async Task CriarAsync_LaboratorioSemArmarios_AceitaArmarioVazio()
    {
        var cmd = FakeCmd() with { LaboratorioId = "Lab-003", Armario = null };

        var criado = await _sut.CriarAsync(cmd, Quem("ana@lab.com"));

        criado.Local.Should().Be("Bancada");
    }

    [Fact]
    public async Task ImportarLoteAsync_LinhaDeLaboratorioForaDoEscopo_ViraErroDaLinhaSemDerrubarOLote()
    {
        var soDaQuimica = new Solicitante("u-1", "p@lab.com", "Professor", ["Lab-001"]);
        var cmds = new[]
        {
            FakeImportCmd(nome: "Etanol"),
            FakeImportCmd(nome: "Acetona") with { LaboratorioId = "Lab-002", Armario = "Armário C" },
        };

        var result = await _sut.ImportarLoteAsync(cmds, soDaQuimica);

        result.Importados.Should().Be(1);
        result.Erros.Should().ContainSingle(e => e.Indice == 1 && e.Motivo.Contains("Lab-002"));
    }
}

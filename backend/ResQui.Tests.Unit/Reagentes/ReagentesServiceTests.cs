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
    private readonly ReagentesService _sut;

    public ReagentesServiceTests()
    {
        _sut = new ReagentesService(_repo, _audit, _pdf, _lotes);
    }

    private static Reagente FakeReagente(string id = "R-001") => new()
    {
        Id = id, Nome = "Ácido Clorídrico", Cas = "7647-01-0",
        Formula = "HCl", ClasseReatividade = 1,
        Estoque = 2.4m, Unidade = "L",
        Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(200)),
        Local = "Lab-201", Responsavel = "Ana", Controlado = true
    };

    [Fact]
    public async Task ListarMovimentacoes_PedeIdEtetoAoFiltro_EmVezDeVarrerAAuditoriaInteira()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));
        _audit.ListarAsync(Arg.Any<ResQui.Application.Auditoria.AuditoriaFiltroDto>()).Returns(new[]
        {
            new ResQui.Application.Auditoria.AuditoriaItemDto(Guid.NewGuid(), DateTime.UtcNow, "ana", "reagente.baixa", "Inventário", "Baixa de 1 L (reagente R-001)", "medium"),
        });

        var movs = await _sut.ListarMovimentacoesAsync("R-001", 20);

        movs.Should().NotBeNull();
        movs!.Should().ContainSingle();
        await _audit.Received(1).ListarAsync(Arg.Is<ResQui.Application.Auditoria.AuditoriaFiltroDto>(
            f => f.What == "reagente." && f.Detail == "R-001" && f.Limite == 20));
    }

    [Fact]
    public async Task ListarMovimentacoes_ReagenteInexistente_RetornaNull()
    {
        _repo.GetByIdAsync("R-404").Returns((Reagente?)null);
        (await _sut.ListarMovimentacoesAsync("R-404")).Should().BeNull();
    }

    [Fact]
    public async Task ListarAsync_SemFiltro_RetornaTodos()
    {
        _repo.GetAllAsync().Returns([FakeReagente("R-001"), FakeReagente("R-002")]);

        var (items, total) = await _sut.ListarAsync(new ReagentesFiltroDto());

        total.Should().Be(2);
        items.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarAsync_FiltroQ_RetornaApenasCombinantes()
    {
        _repo.GetAllAsync().Returns([FakeReagente("R-001"), FakeReagente("R-002")]);

        var (items, total) = await _sut.ListarAsync(new ReagentesFiltroDto(Q: "cloridrico"));

        items.Should().HaveCount(2); // ambos são "Ácido Clorídrico"
    }

    [Fact]
    public async Task BaixaAsync_EstoqueSuficiente_DescontaERegistraAuditoria()
    {
        var r = FakeReagente();
        _repo.GetByIdAsync("R-001").Returns(r);

        var result = await _sut.BaixaAsync("R-001", new BaixaCmd(0.5m), "ana@lab.com");

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

        var result = await _sut.BaixaAsync("X-999", new BaixaCmd(1m), "user");

        result.Should().BeNull();
    }

    private static CriarReagenteCmd FakeCmd(string nome = "Ácido X", decimal estoque = 1m, decimal? estoqueMin = 0.5m, int classe = 1) =>
        new(null, nome, "123-45-6", "HX", null, classe, estoque, estoqueMin, "L", null, "Lab-201", "Ana", false, null, null);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CriarAsync_NomeVazioOuNulo_LancaValidationException(string? nome)
    {
        var act = () => _sut.CriarAsync(FakeCmd(nome: nome!), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Nome*");
    }

    [Fact]
    public async Task CriarAsync_EstoqueNegativo_LancaValidationException()
    {
        var act = () => _sut.CriarAsync(FakeCmd(estoque: -1m), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Estoque*");
    }

    [Fact]
    public async Task CriarAsync_EstoqueMinNegativo_LancaValidationException()
    {
        var act = () => _sut.CriarAsync(FakeCmd(estoqueMin: -2m), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*mínimo*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    [InlineData(-1)]
    public async Task CriarAsync_ClasseForaDaFaixa_LancaValidationException(int classe)
    {
        var act = () => _sut.CriarAsync(FakeCmd(classe: classe), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Classe de reatividade*");
    }

    [Theory]
    [InlineData(1)]
    [InlineData(12)]
    public async Task CriarAsync_ClasseNosLimitesDaFaixa_CriaComAClasseInformada(int classe)
    {
        (await _sut.CriarAsync(FakeCmd(classe: classe), "ana@lab.com")).ClasseReatividade.Should().Be(classe);
    }

    [Theory]
    [InlineData("amanhã")]
    [InlineData("")]
    public async Task CriarAsync_ValidadeMalFormatada_LancaValidationExceptionEmVezDeFormatException(string validade)
    {
        var cmd = FakeCmd() with { Validade = validade };

        var act = () => _sut.CriarAsync(cmd, "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*validade*");
    }

    [Fact]
    public async Task AtualizarAsync_ValidadeMalFormatada_LancaValidationExceptionEmVezDeFormatException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());

        var act = () => _sut.AtualizarAsync(
            "R-001", new AtualizarReagenteCmd("Ácido X", 1m, 0.5m, "Lab-201", "Ana", "31/12/2026 ou nada"), "ana@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*validade*");
    }

    [Fact]
    public async Task BaixaAsync_QuantidadeZero_LancaValidationException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());
        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(0m), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*maior que zero*");
    }

    [Fact]
    public async Task BaixaAsync_QuantidadeNegativa_LancaValidationException()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente());
        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(-0.5m), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*maior que zero*");
    }

    [Fact]
    public async Task BaixaAsync_QuantidadeMaiorQueEstoque_LancaValidationException()
    {
        var r = FakeReagente();
        r.Estoque = 0.3m;
        _repo.GetByIdAsync("R-001").Returns(r);
        var act = () => _sut.BaixaAsync("R-001", new BaixaCmd(1.0m), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*insuficiente*");
    }

    [Fact]
    public async Task TransferirAsync_MudaLocalMantemEstoqueERegistraAuditoria()
    {
        var r = FakeReagente("R-001");
        r.Local = "Lab-201 · Armário A · Pra. 1";
        r.Estoque = 2.4m;
        _repo.GetByIdAsync("R-001").Returns(r);

        var result = await _sut.TransferirAsync("R-001",
            new TransferirReagenteCmd("Lab-203 · Armário Inflamáveis · Pra. 1"), "ana@lab.com");

        result.Should().NotBeNull();
        result!.Local.Should().Be("Lab-203 · Armário Inflamáveis · Pra. 1");
        result.Estoque.Should().Be(2.4m);
        await _audit.Received(1).RegistrarAsync("ana@lab.com", "reagente.transferencia",
            "Inventário",
            Arg.Is<string>(d => d.Contains("Lab-201") && d.Contains("Lab-203")),
            ResQui.Domain.Enums.RiscoAuditoria.Low);
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task TransferirAsync_DestinoVazio_LancaValidationException()
    {
        var act = () => _sut.TransferirAsync("R-001",
            new TransferirReagenteCmd("   "), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Destino*");
    }

    [Fact]
    public async Task TransferirAsync_DestinoIgualAoAtual_LancaValidationException()
    {
        var r = FakeReagente("R-001");
        r.Local = "Lab-201 · Armário A · Pra. 1";
        _repo.GetByIdAsync("R-001").Returns(r);

        var act = () => _sut.TransferirAsync("R-001",
            new TransferirReagenteCmd("Lab-201 · Armário A · Pra. 1"), "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*já está*");
    }

    [Fact]
    public async Task TransferirAsync_ReagenteInexistente_RetornaNull()
    {
        _repo.GetByIdAsync("X-999").Returns((Reagente?)null);

        var result = await _sut.TransferirAsync("X-999",
            new TransferirReagenteCmd("Lab-203 · Armário Inflamáveis · Pra. 1"), "ana");
        result.Should().BeNull();
    }

    // Nome distinto de FakeCmd (já existente acima, com 3 parâmetros) para evitar
    // ambiguidade de overload — mesmos valores/semântica especificados na brief.
    private static CriarReagenteCmd FakeImportCmd(string nome = "Reagente", decimal estoque = 1m, string? validade = null) =>
        new(null, nome, "64-17-5", "C2H6O", null, 12, estoque, null, "L", validade, "Lab-201", "Ana", false, null, null);

    [Fact]
    public async Task ImportarLoteAsync_ImportaValidasEReportaInvalidas()
    {
        var cmds = new[]
        {
            FakeImportCmd(nome: "Etanol"),
            FakeImportCmd(nome: ""),        // inválida: Nome obrigatório
            FakeImportCmd(nome: "Acetona"),
        };

        var result = await _sut.ImportarLoteAsync(cmds, "u@x.com");

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

        var result = await _sut.ImportarLoteAsync(cmds, "u@x.com");

        result.Total.Should().Be(2);
        result.Importados.Should().Be(1);
        result.Erros.Should().ContainSingle();
        result.Erros[0].Indice.Should().Be(0);
        result.Erros[0].Motivo.Should().Contain("validade", "a mensagem deve indicar o campo inválido (substring literal em minúsculas — Contain é case-sensitive)");
    }

    [Fact]
    public async Task ImportarLoteAsync_ListaVazia_LancaValidationException()
    {
        var act = () => _sut.ImportarLoteAsync(Array.Empty<CriarReagenteCmd>(), "u@x.com");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ImportarLoteAsync_RegistraAuditoria()
    {
        await _sut.ImportarLoteAsync(new[] { FakeImportCmd() }, "u@x.com");

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

        var (items, _) = await _sut.ListarAsync(new ReagentesFiltroDto());

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

        var loteAtualizado = await _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(1.5m), "ana@resqui.local");

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

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(4m), "ana@resqui.local");

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

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(2m), "ana@resqui.local");

        await acao.Should().ThrowAsync<ValidationException>().WithMessage("*descasados*");
        r.Estoque.Should().Be(1m);
        lote.Estoque.Should().Be(3m);
    }

    [Fact]
    public async Task BaixaLote_RecusaQuantidadeNaoPositiva()
    {
        var r = FakeReagente("R-001");
        var lote = PrepararLoteDoReagente(r, 3m);

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(0m), "ana@resqui.local");

        await acao.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task BaixaLote_ComOsDoisSaldosEstourados_ReclamaDoLotePrimeiro()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 1m;
        var lote = PrepararLoteDoReagente(r, 3m);

        var acao = () => _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(5m), "ana@resqui.local");

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

        var loteAtualizado = await _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(3m), "ana@resqui.local");

        loteAtualizado!.Estoque.Should().Be(0m);
        r.Estoque.Should().Be(0m);
    }

    [Fact]
    public async Task BaixaLote_ArredondaOsDoisSaldosATresCasas()
    {
        var r = FakeReagente("R-001");
        r.Estoque = 5m;
        var lote = PrepararLoteDoReagente(r, 3m);

        await _sut.BaixaLoteAsync(r.Id, lote.Id, new BaixaCmd(0.0006m), "ana@resqui.local");

        lote.Estoque.Should().Be(2.999m);
        r.Estoque.Should().Be(4.999m);
    }
}

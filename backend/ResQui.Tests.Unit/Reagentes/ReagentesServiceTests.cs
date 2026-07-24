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
    public async Task ListarMovimentacoes_FiltraPorIdNoDetail()
    {
        _repo.GetByIdAsync("R-001").Returns(FakeReagente("R-001"));
        _audit.ListarAsync(Arg.Any<ResQui.Application.Auditoria.AuditoriaFiltroDto>()).Returns(new[]
        {
            new ResQui.Application.Auditoria.AuditoriaItemDto(Guid.NewGuid(), DateTime.UtcNow, "ana", "reagente.baixa", "Inventário", "Baixa de 1 L (reagente R-001)", "medium"),
            new ResQui.Application.Auditoria.AuditoriaItemDto(Guid.NewGuid(), DateTime.UtcNow, "ana", "reagente.baixa", "Inventário", "Baixa de 2 L (reagente R-999)", "medium"),
        });

        var movs = await _sut.ListarMovimentacoesAsync("R-001");

        movs.Should().NotBeNull();
        movs!.Should().ContainSingle();
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

    private static CriarReagenteCmd FakeCmd(string nome = "Ácido X", decimal estoque = 1m, decimal? estoqueMin = 0.5m) =>
        new(null, nome, "123-45-6", "HX", null, 1, estoque, estoqueMin, "L", null, "Lab-201", "Ana", false, null, null);

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
            FakeImportCmd(nome: "Etanol", validade: "amanhã"), // inválida: FormatException no DateOnly.Parse
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
}

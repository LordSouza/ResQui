using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Pdf;
using ResQui.Application.Reagentes;
using ResQui.Domain.Entities;
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
}

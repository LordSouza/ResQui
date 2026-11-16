using ResQui.Tests.Unit.Common;
// backend/ResQui.Tests.Unit/Compatibilidade/CompatServiceTests.cs
using FluentAssertions;
using NSubstitute;
using ResQui.Domain.Enums;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Compatibilidade;

public class CompatServiceTests
{
    private readonly ICompatibilidadeRepository _repo = Substitute.For<ICompatibilidadeRepository>();
    private readonly ICompatOverridesRepository _overridesRepo = Substitute.For<ICompatOverridesRepository>();
    private readonly IAuditoriaService _auditoria = Substitute.For<IAuditoriaService>();
    private readonly CompatService _sut;

    public CompatServiceTests() =>
        _sut = new CompatService(_repo, _overridesRepo, _auditoria, new TransacoesDiretas());

    // --- ConsultarParAsync ---

    [Fact]
    public async Task ConsultarParAsync_RetornaOverride_QuandoOverrideExiste()
    {
        _overridesRepo.GetAsync(1, 3).Returns(new CompatOverride
            { ClasseA = 1, ClasseB = 3, Nivel = 3, Motivo = "Regra UNIFEI", Autor = "Sistema", DataEdicao = DateTime.UtcNow });

        var result = await _sut.ConsultarParAsync(1, 3);

        result.Should().NotBeNull();
        result!.Nivel.Should().Be(3);
        result.Descricao.Should().Be("Proibido");
        await _repo.DidNotReceive().GetNivelAsync(Arg.Any<int>(), Arg.Any<int>());
    }

    [Fact]
    public async Task ConsultarParAsync_RetornaBase_QuandoOverrideNaoExiste()
    {
        _overridesRepo.GetAsync(1, 2).Returns((CompatOverride?)null);
        _repo.GetNivelAsync(1, 2).Returns(new CompatEntry { ClasseA = 1, ClasseB = 2, Nivel = 1 });

        var result = await _sut.ConsultarParAsync(1, 2);

        result.Should().NotBeNull();
        result!.Nivel.Should().Be(1);
        result.Descricao.Should().Be("Cautela");
    }

    [Fact]
    public async Task ConsultarParAsync_RetornaNull_QuandoParNaoEncontrado()
    {
        _overridesRepo.GetAsync(99, 99).Returns((CompatOverride?)null);
        _repo.GetNivelAsync(99, 99).Returns((CompatEntry?)null);

        var result = await _sut.ConsultarParAsync(99, 99);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ConsultarParAsync_AchaOverride_QuandoClassesVemNaOrdemInversa()
    {
        _overridesRepo.GetAsync(5, 10).Returns(new CompatOverride
            { ClasseA = 5, ClasseB = 10, Nivel = 3, Motivo = "Revisão institucional", Autor = "Ana", DataEdicao = DateTime.UtcNow });

        var result = await _sut.ConsultarParAsync(10, 5);

        result.Should().NotBeNull();
        result!.Nivel.Should().Be(3);
        result.ClasseA.Should().Be(10);
        result.ClasseB.Should().Be(5);
        await _repo.DidNotReceive().GetNivelAsync(Arg.Any<int>(), Arg.Any<int>());
    }

    // --- GetMatrizAsync ---

    [Fact]
    public async Task GetMatrizAsync_SubstituiNivelBase_QuandoOverrideExiste()
    {
        _repo.GetAllAsync().Returns(new[]
        {
            new CompatEntry { ClasseA = 1, ClasseB = 3, Nivel = 3 },
            new CompatEntry { ClasseA = 1, ClasseB = 2, Nivel = 1 },
        });
        _overridesRepo.GetAllAsync().Returns(new[]
        {
            new CompatOverride { ClasseA = 1, ClasseB = 3, Nivel = 2, Motivo = "Revisado", Autor = "Ana", DataEdicao = DateTime.UtcNow },
        });

        var result = await _sut.GetMatrizAsync();

        result.Entries.Should().HaveCount(2);
        result.Entries.First(e => e.ClasseA == 1 && e.ClasseB == 3).Nivel.Should().Be(2);
        result.Entries.First(e => e.ClasseA == 1 && e.ClasseB == 2).Nivel.Should().Be(1);
    }

    [Fact]
    public async Task GetMatrizAsync_AplicaOverride_NasDuasCelulasEspelhadas()
    {
        _repo.GetAllAsync().Returns(new[]
        {
            new CompatEntry { ClasseA = 5, ClasseB = 10, Nivel = 2 },
            new CompatEntry { ClasseA = 10, ClasseB = 5, Nivel = 2 },
        });
        _overridesRepo.GetAllAsync().Returns(new[]
        {
            new CompatOverride { ClasseA = 5, ClasseB = 10, Nivel = 3, Motivo = "Revisado", Autor = "Ana", DataEdicao = DateTime.UtcNow },
        });

        var result = await _sut.GetMatrizAsync();

        result.Entries.First(e => e.ClasseA == 5 && e.ClasseB == 10).Nivel.Should().Be(3);
        result.Entries.First(e => e.ClasseA == 10 && e.ClasseB == 5).Nivel.Should().Be(3);
    }

    // --- GetOverridesAsync ---

    [Fact]
    public async Task GetOverridesAsync_RetornaListaDtos()
    {
        var dt = new DateTime(2024, 8, 12, 0, 0, 0, DateTimeKind.Utc);
        _overridesRepo.GetAllAsync().Returns(new[]
        {
            new CompatOverride { ClasseA = 1, ClasseB = 3, Nivel = 3, Motivo = "Risco alto", Autor = "Ana", DataEdicao = dt },
        });

        var result = (await _sut.GetOverridesAsync()).ToList();

        result.Should().HaveCount(1);
        result[0].ClasseA.Should().Be(1);
        result[0].Motivo.Should().Be("Risco alto");
        result[0].DataEdicao.Should().Be("2024-08-12");
    }

    // --- SalvarOverrideAsync ---

    [Fact]
    public async Task SalvarOverrideAsync_ChamaUpsertERetornaDto()
    {
        var cmd = new SalvarOverrideCmd(2, "Nova regra", "Carlos");

        var result = await _sut.SalvarOverrideAsync(1, 3, cmd, "admin@resqui.local");

        await _overridesRepo.Received(1).UpsertAsync(Arg.Is<CompatOverride>(e =>
            e.ClasseA == 1 && e.ClasseB == 3 && e.Nivel == 2 && e.Motivo == "Nova regra"));
        result.ClasseA.Should().Be(1);
        result.Nivel.Should().Be(2);
    }

    [Fact]
    public async Task SalvarOverrideAsync_GravaParOrdenado_QuandoClassesVemNaOrdemInversa()
    {
        var cmd = new SalvarOverrideCmd(3, "Revisão institucional", "Carlos");

        var result = await _sut.SalvarOverrideAsync(10, 5, cmd, "admin@resqui.local");

        await _overridesRepo.Received(1).UpsertAsync(Arg.Is<CompatOverride>(e =>
            e.ClasseA == 5 && e.ClasseB == 10 && e.Nivel == 3));
        result.ClasseA.Should().Be(5);
        result.ClasseB.Should().Be(10);
    }

    [Fact]
    public async Task SalvarOverrideAsync_MesmaClasseNosDoisLados_LancaValidationException()
    {
        var cmd = new SalvarOverrideCmd(2, "x", "Carlos");

        var act = () => _sut.SalvarOverrideAsync(5, 5, cmd, "admin@resqui.local");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*iferentes*");
        await _overridesRepo.DidNotReceive().UpsertAsync(Arg.Any<CompatOverride>());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(4)]
    public async Task SalvarOverrideAsync_NivelForaDaFaixa_LancaValidationException(int nivel)
    {
        var cmd = new SalvarOverrideCmd(nivel, "x", "Carlos");

        var act = () => _sut.SalvarOverrideAsync(1, 3, cmd, "admin@resqui.local");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*ível*");
        await _overridesRepo.DidNotReceive().UpsertAsync(Arg.Any<CompatOverride>());
    }

    [Theory]
    [InlineData(0, 3)]
    [InlineData(13, 3)]
    [InlineData(1, 0)]
    [InlineData(1, 13)]
    public async Task SalvarOverrideAsync_ClasseForaDaFaixa_LancaValidationException(int classeA, int classeB)
    {
        var cmd = new SalvarOverrideCmd(2, "x", "Carlos");

        var act = () => _sut.SalvarOverrideAsync(classeA, classeB, cmd, "admin@resqui.local");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*lasse*");
        await _overridesRepo.DidNotReceive().UpsertAsync(Arg.Any<CompatOverride>());
    }

    // --- RemoverOverrideAsync ---

    [Fact]
    public async Task RemoverOverrideAsync_ChamaDelete()
    {
        await _sut.RemoverOverrideAsync(1, 3, "admin@resqui.local");

        await _overridesRepo.Received(1).DeleteAsync(1, 3);
    }

    [Fact]
    public async Task RemoverOverrideAsync_RemoveParOrdenado_QuandoClassesVemNaOrdemInversa()
    {
        await _sut.RemoverOverrideAsync(10, 5, "admin@resqui.local");

        await _overridesRepo.Received(1).DeleteAsync(5, 10);
    }

    // --- Proveniência ---

    [Fact]
    public async Task GetMatrizAsync_IncluiFonteDaMatriz()
    {
        _repo.GetAllAsync().Returns(new[]
        {
            new CompatEntry { ClasseA = 1, ClasseB = 2, Nivel = 1 },
        });
        _overridesRepo.GetAllAsync().Returns(Array.Empty<CompatOverride>());

        var matriz = await _sut.GetMatrizAsync();

        matriz.Fonte.Should().NotBeNull();
        matriz.Fonte.Fonte.Should().Contain("EPA-600/2-80-076");
        matriz.Fonte.Referencia.Should().Contain("Johnson");
        matriz.Fonte.Referencia.Should().Contain("2008");
        matriz.Fonte.Url.Should().StartWith("https://");
    }

    // --- Auditoria dos overrides ---

    [Fact]
    public async Task SalvarOverrideAsync_RegistraAuditoriaComQuemFezPeloToken()
    {
        await _sut.SalvarOverrideAsync(10, 5, new SalvarOverrideCmd(3, "Regra local", "Autor do corpo"), "admin@resqui.local");

        await _auditoria.Received(1).RegistrarAsync("admin@resqui.local", "compat.override-salvar", "Compatibilidade",
            Arg.Is<string>(d => d.Contains("5×10") && d.Contains("Proibido") && d.Contains("Regra local")), RiscoAuditoria.High);
    }

    [Fact]
    public async Task SalvarOverrideAsync_MotivoLongo_CabeNoDetalheDaAuditoria()
    {
        await _sut.SalvarOverrideAsync(1, 3, new SalvarOverrideCmd(1, new string('m', 5000), "x"), "admin@resqui.local");

        await _auditoria.Received(1).RegistrarAsync(Arg.Any<string>(), "compat.override-salvar", Arg.Any<string>(),
            Arg.Is<string>(d => d.Length <= 1000), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task SalvarOverrideAsync_Invalido_NaoRegistraAuditoria()
    {
        var act = () => _sut.SalvarOverrideAsync(5, 5, new SalvarOverrideCmd(1, "x", "x"), "admin@resqui.local");

        await act.Should().ThrowAsync<ValidationException>();
        await _auditoria.DidNotReceive().RegistrarAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task RemoverOverrideAsync_RegistraAuditoria()
    {
        await _sut.RemoverOverrideAsync(7, 2, "admin@resqui.local");

        await _auditoria.Received(1).RegistrarAsync("admin@resqui.local", "compat.override-remover", "Compatibilidade",
            Arg.Is<string>(d => d.Contains("2×7")), RiscoAuditoria.High);
    }
}

using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auditoria;

public class AuditoriaServiceTests
{
    private readonly IAuditoriaRepository _repo = Substitute.For<IAuditoriaRepository>();
    private readonly AuditoriaService _sut;

    public AuditoriaServiceTests()
    {
        _sut = new AuditoriaService(_repo);
    }

    [Fact]
    public async Task RegistrarAsync_AddsEntryAndSaves()
    {
        AuditoriaEntry? captured = null;
        await _repo.AddAsync(Arg.Do<AuditoriaEntry>(e => captured = e));

        await _sut.RegistrarAsync("Lucas", "reagente.baixa", "Inventário", "Baixou 0.5L de HCl", RiscoAuditoria.Medium);

        await _repo.Received(1).AddAsync(Arg.Any<AuditoriaEntry>());
        await _repo.Received(1).SaveChangesAsync();
        captured!.Who.Should().Be("Lucas");
        captured.Risk.Should().Be(RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task ListarAsync_SemFiltro_RetornaTodos()
    {
        var entries = new List<AuditoriaEntry>
        {
            new() { Who = "A", What = "x", Where = "y", Detail = "z", Risk = RiscoAuditoria.Low },
            new() { Who = "B", What = "x", Where = "y", Detail = "z", Risk = RiscoAuditoria.High },
        };
        _repo.GetAllAsync().Returns(entries);

        var result = (await _sut.ListarAsync(new AuditoriaFiltroDto())).ToList();

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarAsync_FiltroRisk_RetornaApenasCombinantes()
    {
        var entries = new List<AuditoriaEntry>
        {
            new() { Who = "A", What = "x", Where = "y", Detail = "z", Risk = RiscoAuditoria.Low },
            new() { Who = "B", What = "x", Where = "y", Detail = "z", Risk = RiscoAuditoria.High },
        };
        _repo.GetAllAsync().Returns(entries);

        var result = (await _sut.ListarAsync(new AuditoriaFiltroDto(Risk: "high"))).ToList();

        result.Should().HaveCount(1);
        result[0].Who.Should().Be("B");
    }
}

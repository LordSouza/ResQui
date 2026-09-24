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

    private void RepoDevolve(params AuditoriaEntry[] entries) =>
        _repo.BuscarAsync(
            Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), Arg.Any<RiscoAuditoria?>(),
            Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(),
            Arg.Any<string?>(), Arg.Any<int?>()).Returns(entries);

    [Fact]
    public async Task ListarAsync_SemFiltro_NaoRestringeNadaENaoImpoeTeto()
    {
        RepoDevolve(new AuditoriaEntry { Who = "A", What = "x", Where = "y", Detail = "z", Risk = RiscoAuditoria.Low });

        var result = (await _sut.ListarAsync(new AuditoriaFiltroDto())).ToList();

        result.Should().HaveCount(1);
        await _repo.Received(1).BuscarAsync(null, null, null, null, null, null, null, null);
    }

    [Fact]
    public async Task ListarAsync_RiscoTextual_ChegaAoRepositorioComoEnum()
    {
        RepoDevolve();

        await _sut.ListarAsync(new AuditoriaFiltroDto(Risk: "high"));

        await _repo.Received(1).BuscarAsync(
            Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), RiscoAuditoria.High,
            Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(),
            Arg.Any<string?>(), Arg.Any<int?>());
    }

    [Fact]
    public async Task ListarAsync_RiscoDesconhecido_NaoRestringePorRisco()
    {
        RepoDevolve();

        await _sut.ListarAsync(new AuditoriaFiltroDto(Risk: "catastrofico"));

        await _repo.Received(1).BuscarAsync(
            Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), null,
            Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(),
            Arg.Any<string?>(), Arg.Any<int?>());
    }

    [Fact]
    public async Task ListarAsync_FiltroTo_ViraLimiteExclusivoNoDiaSeguinte()
    {
        RepoDevolve();

        await _sut.ListarAsync(new AuditoriaFiltroDto(
            To: new DateTime(2026, 8, 24, 15, 30, 0, DateTimeKind.Utc)));

        await _repo.Received(1).BuscarAsync(
            Arg.Any<DateTime?>(),
            new DateTime(2026, 8, 25, 0, 0, 0, DateTimeKind.Utc),
            Arg.Any<RiscoAuditoria?>(), Arg.Any<string?>(), Arg.Any<string?>(),
            Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<int?>());
    }

    [Fact]
    public async Task ListarAsync_DataSemFusoDaQueryString_ChegaMarcadaComoUtc()
    {
        RepoDevolve();

        await _sut.ListarAsync(new AuditoriaFiltroDto(
            From: new DateTime(2026, 8, 24, 9, 0, 0, DateTimeKind.Unspecified)));

        await _repo.Received(1).BuscarAsync(
            Arg.Is<DateTime?>(d => d!.Value.Kind == DateTimeKind.Utc && d.Value.Hour == 9),
            Arg.Any<DateTime?>(), Arg.Any<RiscoAuditoria?>(), Arg.Any<string?>(),
            Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<int?>());
    }

    [Fact]
    public async Task ListarAsync_FiltrosDeTexto_ChegamIntactosAoRepositorio()
    {
        RepoDevolve();

        await _sut.ListarAsync(new AuditoriaFiltroDto(
            Who: "ana", What: "lab.criar", Where: "Laboratórios", Detail: "Lab-001", Limite: 20));

        await _repo.Received(1).BuscarAsync(
            Arg.Any<DateTime?>(), Arg.Any<DateTime?>(), Arg.Any<RiscoAuditoria?>(),
            "ana", "lab.criar", "Laboratórios", "Lab-001", 20);
    }
}

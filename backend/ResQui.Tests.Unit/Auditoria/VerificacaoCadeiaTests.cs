using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auditoria;

public class VerificacaoCadeiaTests
{
    private readonly IAuditoriaRepository _repo = Substitute.For<IAuditoriaRepository>();
    private readonly AuditoriaService _sut;

    public VerificacaoCadeiaTests()
    {
        _sut = new AuditoriaService(_repo);
    }

    private static List<AuditoriaEntry> CadeiaValida(int tamanho)
    {
        var cadeia = new List<AuditoriaEntry>();
        var anterior = CadeiaAuditoria.HashInicial;
        for (var i = 1; i <= tamanho; i++)
        {
            var elo = new AuditoriaEntry
            {
                Sequencia = i,
                Timestamp = new DateTime(2026, 11, 15, 10, 0, i, DateTimeKind.Utc),
                Who = "admin@resqui.local", What = "reagente.criar", Where = "Inventário",
                Detail = $"Criou reagente {i}", Risk = RiscoAuditoria.Low, HashAnterior = anterior,
            };
            elo.Hash = CadeiaAuditoria.CalcularHash(elo);
            anterior = elo.Hash;
            cadeia.Add(elo);
        }
        return cadeia;
    }

    private void RepoPercorre(IEnumerable<AuditoriaEntry> cadeia) =>
        _repo.PercorrerCadeia().Returns(cadeia.ToAsyncEnumerable());

    [Fact]
    public async Task CadeiaValida_EIntegra()
    {
        var cadeia = CadeiaValida(3);
        RepoPercorre(cadeia);

        var r = await _sut.VerificarCadeiaAsync("admin@resqui.local");

        r.Should().Be(new VerificacaoCadeiaDto(true, 3, 3, cadeia[2].Hash, null));
    }

    [Fact]
    public async Task CadeiaVazia_EIntegraSemUltimoElo()
    {
        RepoPercorre([]);

        var r = await _sut.VerificarCadeiaAsync("admin@resqui.local");

        r.Should().Be(new VerificacaoCadeiaDto(true, 0, null, null, null));
    }

    [Fact]
    public async Task CampoAlteradoSemRecalcularHash_ApontaOProprioElo()
    {
        var cadeia = CadeiaValida(4);
        cadeia[1].Detail = "adulterado";
        RepoPercorre(cadeia);

        var r = await _sut.VerificarCadeiaAsync("admin@resqui.local");

        r.Integra.Should().BeFalse();
        r.PrimeiraSequenciaInvalida.Should().Be(2);
        r.TotalRegistros.Should().Be(4);
    }

    [Fact]
    public async Task HashRecalculadoNoEloAdulterado_ApontaOEloSeguinte()
    {
        var cadeia = CadeiaValida(4);
        cadeia[1].Detail = "adulterado";
        cadeia[1].Hash = CadeiaAuditoria.CalcularHash(cadeia[1]);
        RepoPercorre(cadeia);

        var r = await _sut.VerificarCadeiaAsync("admin@resqui.local");

        r.PrimeiraSequenciaInvalida.Should().Be(3);
    }

    [Fact]
    public async Task EloRemovido_ApontaALacunaNaSequencia()
    {
        var cadeia = CadeiaValida(4);
        cadeia.RemoveAt(1);
        RepoPercorre(cadeia);

        var r = await _sut.VerificarCadeiaAsync("admin@resqui.local");

        r.PrimeiraSequenciaInvalida.Should().Be(3);
    }

    [Fact]
    public async Task RegistraAPropriaVerificacao_ComRiscoAltoQuandoViolada()
    {
        var cadeia = CadeiaValida(2);
        cadeia[0].Who = "outro";
        RepoPercorre(cadeia);
        AuditoriaEntry? registrada = null;
        await _repo.AddAsync(Arg.Do<AuditoriaEntry>(e => registrada = e));

        await _sut.VerificarCadeiaAsync("admin@resqui.local");

        registrada!.What.Should().Be("auditoria.verificar");
        registrada.Who.Should().Be("admin@resqui.local");
        registrada.Risk.Should().Be(RiscoAuditoria.High);
        registrada.Detail.Should().Contain("primeira sequência inválida 1");
    }

    [Fact]
    public async Task Ancora_UsaOUltimoElo()
    {
        var ultimo = CadeiaValida(1)[0];
        _repo.UltimoEloAsync().Returns(ultimo);

        var ancora = await _sut.AncoraAsync();

        ancora.Should().Be(new AncoraAuditoriaDto(1, ultimo.Hash));
        ancora!.PrefixoHash.Should().Be(ultimo.Hash[..16]);
    }
}

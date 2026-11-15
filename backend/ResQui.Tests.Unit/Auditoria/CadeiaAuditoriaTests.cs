using FluentAssertions;
using ResQui.Application.Auditoria;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;

namespace ResQui.Tests.Unit.Auditoria;

public class CadeiaAuditoriaTests
{
    private static AuditoriaEntry Elo(string who = "a", string what = "b") => new()
    {
        Sequencia = 7,
        Timestamp = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc).AddTicks(1234560),
        Who = who, What = what, Where = "Onde", Detail = "Detalhe", Risk = RiscoAuditoria.High,
        HashAnterior = CadeiaAuditoria.HashInicial,
    };

    [Fact]
    public void FormatarTimestamp_UsaMicrossegundosEZ()
    {
        CadeiaAuditoria.FormatarTimestamp(new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc).AddTicks(1234560))
            .Should().Be("2026-01-02T03:04:05.123456Z");
    }

    [Fact]
    public void Serializar_SegueAOrdemDocumentada()
    {
        CadeiaAuditoria.Serializar(Elo()).Should().Be(
            "7|2026-01-02T03:04:05.123456Z|a|b|Onde|Detalhe|2|" + new string('0', 64));
    }

    [Fact]
    public void Serializar_EscapaSeparadorEBarra()
    {
        CadeiaAuditoria.Serializar(Elo(who: @"x|y\z")).Should().StartWith(@"7|2026-01-02T03:04:05.123456Z|x\|y\\z|b|");
    }

    [Fact]
    public void CalcularHash_MoverSeparadorEntreCamposMudaOHash()
    {
        CadeiaAuditoria.CalcularHash(Elo(who: "a|b", what: "c"))
            .Should().NotBe(CadeiaAuditoria.CalcularHash(Elo(who: "a", what: "b|c")));
    }

    [Fact]
    public void CalcularHash_E64HexMinusculos()
    {
        CadeiaAuditoria.CalcularHash(Elo()).Should().MatchRegex("^[0-9a-f]{64}$");
    }
}

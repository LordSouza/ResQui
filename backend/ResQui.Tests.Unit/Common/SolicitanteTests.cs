using FluentAssertions;
using ResQui.Application.Common;

namespace ResQui.Tests.Unit.Common;

public class SolicitanteTests
{
    private static Solicitante De(string papel, params string[] labs) =>
        new("u1", "quem@resqui.local", papel, labs);

    [Fact]
    public void Admin_RespondePorQualquerLaboratorio_MesmoSemVinculo() =>
        De("Admin").Responde("Lab-009").Should().BeTrue();

    [Fact]
    public void Admin_VeTudo() => De("Admin").VeTudo.Should().BeTrue();

    [Theory]
    [InlineData("Professor")]
    [InlineData("Aluno")]
    public void NaoAdmin_RespondeSoPelosVinculados(string papel)
    {
        var solicitante = De(papel, "Lab-001", "Lab-002");

        solicitante.VeTudo.Should().BeFalse();
        solicitante.Responde("Lab-001").Should().BeTrue();
        solicitante.Responde("Lab-003").Should().BeFalse();
    }

    [Fact]
    public void SemVinculo_NaoRespondePorNada() =>
        De("Professor").Responde("Lab-001").Should().BeFalse();
}

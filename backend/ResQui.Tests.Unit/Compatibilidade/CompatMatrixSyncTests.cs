// backend/ResQui.Tests.Unit/Compatibilidade/CompatMatrixSyncTests.cs
using FluentAssertions;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Seed;

namespace ResQui.Tests.Unit.Compatibilidade;

public class CompatMatrixSyncTests
{
    [Fact]
    public void Diff_BancoVazio_InsereAMatrizInteira()
    {
        var diff = CompatMatrixSync.Diff([], CompatMatrixData.GetAll());

        diff.Inserir.Should().HaveCount(144);
        diff.Atualizar.Should().BeEmpty();
    }

    [Fact]
    public void Diff_BancoEmDia_NaoGravaNada()
    {
        var existentes = CompatMatrixData.GetAll()
            .Select(e => new CompatEntry { ClasseA = e.ClasseA, ClasseB = e.ClasseB, Nivel = e.Nivel })
            .ToList();

        var diff = CompatMatrixSync.Diff(existentes, CompatMatrixData.GetAll());

        diff.Inserir.Should().BeEmpty();
        diff.Atualizar.Should().BeEmpty();
    }

    [Fact]
    public void Diff_BancoDesatualizado_AtualizaSoAsCelulasDivergentes()
    {
        var existentes = CompatMatrixData.GetAll()
            .Select(e => new CompatEntry { ClasseA = e.ClasseA, ClasseB = e.ClasseB, Nivel = e.Nivel })
            .ToList();
        // simula o banco antigo, antes da reconciliação da classe 12
        existentes.Single(e => e is { ClasseA: 5, ClasseB: 12 }).Nivel = 1;
        existentes.Single(e => e is { ClasseA: 12, ClasseB: 5 }).Nivel = 1;

        var diff = CompatMatrixSync.Diff(existentes, CompatMatrixData.GetAll());

        diff.Inserir.Should().BeEmpty();
        diff.Atualizar.Should().HaveCount(2);
        diff.Atualizar.Should().OnlyContain(e => e.Nivel == 3);
    }

    [Fact]
    public void Diff_DevolveAsInstanciasExistentes_ParaQueOEfPersistaAAlteracao()
    {
        var existentes = CompatMatrixData.GetAll()
            .Select(e => new CompatEntry { ClasseA = e.ClasseA, ClasseB = e.ClasseB, Nivel = e.Nivel })
            .ToList();
        var alvo = existentes.Single(e => e is { ClasseA: 5, ClasseB: 12 });
        alvo.Nivel = 1;

        var diff = CompatMatrixSync.Diff(existentes, CompatMatrixData.GetAll());

        diff.Atualizar.Should().Contain(e => ReferenceEquals(e, alvo));
        alvo.Nivel.Should().Be(3);
    }

    [Fact]
    public void Diff_CelulaAusente_EhInserida()
    {
        var existentes = CompatMatrixData.GetAll()
            .Where(e => e is not { ClasseA: 7, ClasseB: 9 })
            .Select(e => new CompatEntry { ClasseA = e.ClasseA, ClasseB = e.ClasseB, Nivel = e.Nivel })
            .ToList();

        var diff = CompatMatrixSync.Diff(existentes, CompatMatrixData.GetAll());

        diff.Inserir.Should().ContainSingle(e => e.ClasseA == 7 && e.ClasseB == 9);
        diff.Atualizar.Should().BeEmpty();
    }
}

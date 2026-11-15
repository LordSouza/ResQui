using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;

namespace ResQui.Tests.Integracao.Data;

public class ConcorrenciaOtimistaPostgresTests
{
    [PostgresFact]
    public async Task DuasBaixasSobreAMesmaLeitura_ASegundaFalhaEmVezDeSobrescrever()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            db.Reagentes.Add(new Reagente
            {
                Id = "R-T1", Nome = "Ácido", Unidade = "L", ClasseReatividade = 1, Estoque = 10m,
                Validade = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            });
            await db.SaveChangesAsync();
        }

        await using var primeira = banco.NovoContexto();
        await using var segunda = banco.NovoContexto();
        var lidoPelaPrimeira = await primeira.Reagentes.SingleAsync(r => r.Id == "R-T1");
        var lidoPelaSegunda = await segunda.Reagentes.SingleAsync(r => r.Id == "R-T1");

        lidoPelaPrimeira.Estoque -= 3m;
        await primeira.SaveChangesAsync();

        lidoPelaSegunda.Estoque -= 4m;
        var gravarSobreLeituraVelha = () => segunda.SaveChangesAsync();
        await gravarSobreLeituraVelha.Should().ThrowAsync<DbUpdateConcurrencyException>();

        await using var conferencia = banco.NovoContexto();
        (await conferencia.Reagentes.SingleAsync(r => r.Id == "R-T1")).Estoque.Should().Be(7m);
    }
}

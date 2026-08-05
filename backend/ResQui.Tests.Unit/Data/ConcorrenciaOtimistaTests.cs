using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Data;

namespace ResQui.Tests.Unit.Data;

public class ConcorrenciaOtimistaTests
{
    private static AppDbContext NovoContexto() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=inexistente;Username=x;Password=y")
            .Options);

    [Theory]
    [InlineData(typeof(Reagente))]
    [InlineData(typeof(ReagenteLote))]
    [InlineData(typeof(Mtr))]
    [InlineData(typeof(Residuo))]
    public void Modelo_DeclaraXmin_ComoTokenDeConcorrencia(Type entidade)
    {
        using var db = NovoContexto();
        var tipo = db.Model.FindEntityType(entidade);
        tipo.Should().NotBeNull($"{entidade.Name} deve estar mapeada");

        var xmin = tipo!.FindProperty("xmin");
        xmin.Should().NotBeNull($"{entidade.Name} deve declarar a coluna de sistema xmin");
        xmin!.IsConcurrencyToken.Should().BeTrue();
        xmin.ValueGenerated.Should().Be(ValueGenerated.OnAddOrUpdate);
    }
}

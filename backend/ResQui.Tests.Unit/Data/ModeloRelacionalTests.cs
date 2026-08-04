// Trava as FKs do modelo e a política de exclusão de cada uma. O modelo do EF é inspecionável sem
// abrir conexão com o banco: UseNpgsql só configura o provider. Decisões em
// docs/superpowers/specs/2026-07-28-integridade-referencial-design.md.
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Data;
using ResQui.Infrastructure.Identity;

namespace ResQui.Tests.Unit.Data;

public class ModeloRelacionalTests
{
    private static AppDbContext NovoContexto() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=inexistente;Username=x;Password=y")
            .Options);

    [Theory]
    [InlineData(typeof(Residuo), "LaboratorioId", typeof(Laboratorio), DeleteBehavior.Restrict)]
    [InlineData(typeof(Residuo), "MtrId", typeof(Mtr), DeleteBehavior.SetNull)]
    [InlineData(typeof(Chamado), "LaboratorioId", typeof(Laboratorio), DeleteBehavior.Restrict)]
    [InlineData(typeof(Chamado), "AbertoPorId", typeof(Usuario), DeleteBehavior.SetNull)]
    [InlineData(typeof(ChamadoComentario), "ChamadoId", typeof(Chamado), DeleteBehavior.Cascade)]
    [InlineData(typeof(ChamadoComentario), "AutorId", typeof(Usuario), DeleteBehavior.SetNull)]
    [InlineData(typeof(ReagenteLote), "ReagenteId", typeof(Reagente), DeleteBehavior.Cascade)]
    [InlineData(typeof(ReagenteGhs), "ReagenteId", typeof(Reagente), DeleteBehavior.Cascade)]
    [InlineData(typeof(Mtr), "ResponsavelId", typeof(Usuario), DeleteBehavior.SetNull)]
    [InlineData(typeof(Mtr), "DestinadoPorId", typeof(Usuario), DeleteBehavior.SetNull)]
    [InlineData(typeof(Notificacao), "UsuarioId", typeof(Usuario), DeleteBehavior.Cascade)]
    [InlineData(typeof(SessaoToken), "UsuarioId", typeof(Usuario), DeleteBehavior.Cascade)]
    [InlineData(typeof(RelatorioGerado), "GeradoPorId", typeof(Usuario), DeleteBehavior.SetNull)]
    public void Modelo_DeclaraFk_ComAPoliticaDecidida(
        Type entidade, string propriedade, Type alvo, DeleteBehavior esperado)
    {
        using var db = NovoContexto();
        var tipo = db.Model.FindEntityType(entidade);
        tipo.Should().NotBeNull($"{entidade.Name} deve estar mapeada");

        var fk = tipo!.GetForeignKeys()
            .SingleOrDefault(f => f.Properties.Count == 1 && f.Properties[0].Name == propriedade);

        fk.Should().NotBeNull($"{entidade.Name}.{propriedade} deve ter FK para {alvo.Name}");
        fk!.PrincipalEntityType.ClrType.Should().Be(alvo);
        fk.DeleteBehavior.Should().Be(esperado);
    }

    [Theory]
    // ClasseA/ClasseB são inteiros de domínio, não referências; Autor é o nome de quem editou,
    // gravado em texto — mesma categoria de AuditoriaEntry.Who.
    [InlineData(typeof(CompatOverride))]
    [InlineData(typeof(AuditoriaEntry))]   // a trilha precisa sobreviver ao usuário que ela registra
    public void Modelo_NaoDeclaraFk_NasEntidadesDeliberadamenteSoltas(Type entidade)
    {
        using var db = NovoContexto();
        db.Model.FindEntityType(entidade)!.GetForeignKeys()
            .Should().BeEmpty("a ausência de FK aqui é decisão registrada na spec de 2026-07-28");
    }

    // Estas colunas guardam referência mas vivem em entidades que têm FK por outros campos — o
    // teste acima, que exige zero FKs na entidade inteira, não consegue expressá-las. Sem esta
    // trava a isenção delas seria só documental.
    [Theory]
    [InlineData(typeof(ConfiguracaoPgrs), "AtualizadoPor")]  // e-mail de autoria em texto
    [InlineData(typeof(Notificacao), "ReferenciaId")]        // polimórfico; no tipo compat, um par de ids
    [InlineData(typeof(CompatOverride), "Autor")]            // nome de quem editou, não o id do usuário
    public void Modelo_NaoDeclaraFk_NasColunasDeReferenciaIsentas(Type entidade, string propriedade)
    {
        using var db = NovoContexto();
        db.Model.FindEntityType(entidade)!.GetForeignKeys()
            .Where(f => f.Properties.Count == 1 && f.Properties[0].Name == propriedade)
            .Should().BeEmpty($"{entidade.Name}.{propriedade} é isenta de FK por decisão registrada");
    }
}

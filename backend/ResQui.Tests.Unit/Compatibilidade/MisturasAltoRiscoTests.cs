// Valida o critério de eficácia do TCC: 100% das misturas de alto risco
// (nível Perigo/Proibido na matriz baseada no chart EPA-600/2-80-076 seedada) devem ser bloqueadas.
using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Mtrs;
using ResQui.Application.Pdf;
using ResQui.Application.Residuos;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Seed;

namespace ResQui.Tests.Unit.Compatibilidade;

public class MisturasAltoRiscoTests
{
    private readonly CompatService _compat;
    private readonly ResiduosService _residuos;
    private readonly MtrsService _mtrs;
    private readonly IResiduosRepository _residuosRepo = Substitute.For<IResiduosRepository>();
    private readonly IMtrsRepository _mtrsRepo = Substitute.For<IMtrsRepository>();

    public MisturasAltoRiscoTests()
    {
        // CompatService real, alimentado pela matriz base real (sem overrides).
        var matriz = CompatMatrixData.GetAll().ToList();
        var repo = Substitute.For<ICompatibilidadeRepository>();
        repo.GetNivelAsync(Arg.Any<int>(), Arg.Any<int>())
            .Returns(ci => matriz.FirstOrDefault(e => e.ClasseA == ci.ArgAt<int>(0) && e.ClasseB == ci.ArgAt<int>(1)));
        var overrides = Substitute.For<ICompatOverridesRepository>();
        overrides.GetAsync(Arg.Any<int>(), Arg.Any<int>()).Returns((CompatOverride?)null);
        _compat = new CompatService(repo, overrides);

        var labRepo = Substitute.For<ILaboratoriosRepository>();
        labRepo.GetAllAsync().Returns([new Laboratorio { Id = "Lab-001", Nome = "Lab Teste" }]);
        var audit = Substitute.For<IAuditoriaService>();
        _residuos = new ResiduosService(_residuosRepo, audit, labRepo, _compat);
        _mtrs = new MtrsService(_mtrsRepo, _residuosRepo, audit, _compat, Substitute.For<IPdfService>());
    }

    private static CriarResiduoCmd CmdComClasses(params int[] classes) =>
        new("Mistura de teste", 1, "quimico", 1m, "L", "teste", "medio", null, classes);

    public static TheoryData<int, int, string> ParesProibidos => new()
    {
        { 1, 3, "Ácidos inorgânicos × Bases" },
        { 1, 8, "Ácidos inorgânicos × Cianetos" },
        { 1, 9, "Ácidos inorgânicos × Sulfetos" },
        { 1, 11, "Ácidos inorgânicos × Peróxidos" },
        { 1, 12, "Ácidos inorgânicos × Reativos com água" },
        { 4, 5, "Oxidantes fortes × Solventes orgânicos" },
        { 4, 8, "Oxidantes fortes × Cianetos" },
        { 4, 9, "Oxidantes fortes × Sulfetos" },
        { 4, 10, "Oxidantes fortes × Agentes redutores" },
        { 7, 8, "Metais pesados × Cianetos" },
        { 10, 11, "Agentes redutores × Peróxidos" },
        { 3, 12, "Bases × Reativos com água" },
        { 2, 12, "Ácidos orgânicos × Reativos com água" },
        { 4, 12, "Oxidantes fortes × Reativos com água" },
        { 5, 12, "Solventes orgânicos × Reativos com água" },
        { 6, 12, "Solventes halogenados × Reativos com água" },
        { 7, 12, "Metais pesados × Reativos com água" },
        { 8, 12, "Cianetos × Reativos com água" },
        { 9, 12, "Sulfetos × Reativos com água" },
        { 10, 12, "Agentes redutores × Reativos com água" },
    };

    [Theory]
    [MemberData(nameof(ParesProibidos))]
    public async Task CriarResiduo_BloqueiaPar_Proibido(int classeA, int classeB, string nome)
    {
        var act = () => _residuos.CriarAsync(CmdComClasses(classeA, classeB), "tecnico@resqui.local");
        await act.Should().ThrowAsync<ValidationException>($"o par {nome} é proibido na matriz");
    }

    [Fact]
    public async Task CriarResiduo_Bloqueia_100PorCento_DosParesDeAltoRisco()
    {
        var paresAltoRisco = CompatMatrixData.GetAll()
            .Where(e => e.ClasseA < e.ClasseB && e.Nivel >= 2)
            .ToList();
        paresAltoRisco.Should().NotBeEmpty();

        foreach (var par in paresAltoRisco)
        {
            var act = () => _residuos.CriarAsync(CmdComClasses(par.ClasseA, par.ClasseB), "tecnico@resqui.local");
            await act.Should().ThrowAsync<ValidationException>(
                $"par ({par.ClasseA},{par.ClasseB}) tem nível {par.Nivel} e deve ser bloqueado");
        }
    }

    [Theory]
    [InlineData(2, 5)]  // Ácidos orgânicos × Solventes orgânicos — compatível (0)
    [InlineData(5, 6)]  // Solventes orgânicos × halogenados — compatível (0)
    [InlineData(1, 2)]  // Ácidos inorgânicos × orgânicos — cautela (1)
    public async Task CriarResiduo_Permite_ParesCompativeisOuCautela(int classeA, int classeB)
    {
        var dto = await _residuos.CriarAsync(CmdComClasses(classeA, classeB), "tecnico@resqui.local");
        dto.ClassesReatividade.Should().BeEquivalentTo(new[] { classeA, classeB });
    }

    [Fact]
    public async Task CriarMtr_BloqueiaAgrupamento_ComParProibidoEntreResiduos()
    {
        var r1 = new Residuo { Id = 1, Descricao = "Ácidos", Status = "aguardando-coleta", ClassesReatividade = [1] };
        var r2 = new Residuo { Id = 2, Descricao = "Cianetos", Status = "aguardando-coleta", ClassesReatividade = [8] };
        _residuosRepo.GetByIdAsync(1).Returns(r1);
        _residuosRepo.GetByIdAsync(2).Returns(r2);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [1, 2]);
        var act = () => _mtrs.CriarAsync(cmd, "u1", "gestor@resqui.local");

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Proibido*");
    }

    [Fact]
    public async Task CriarMtr_PermiteAgrupamento_ComParPerigo()
    {
        // Perigo (2) bloqueia mistura, mas não transporte conjunto — ex.: classes 1 e 4.
        var r1 = new Residuo { Id = 1, Descricao = "Ácidos", Status = "aguardando-coleta", ClassesReatividade = [1] };
        var r2 = new Residuo { Id = 2, Descricao = "Oxidantes", Status = "aguardando-coleta", ClassesReatividade = [4] };
        _residuosRepo.GetByIdAsync(1).Returns(r1);
        _residuosRepo.GetByIdAsync(2).Returns(r2);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [1, 2]);
        var dto = await _mtrs.CriarAsync(cmd, "u1", "gestor@resqui.local");

        dto.Numero.Should().StartWith("MTR-");
    }

    [Fact]
    public async Task AvaliarMistura_RetornaPiorPar()
    {
        var pior = await _compat.AvaliarMisturaAsync([2, 5, 4]); // (2,5)=0, (2,4)=2, (5,4)=3
        pior.Should().NotBeNull();
        pior!.Nivel.Should().Be(3);
    }

    [Fact]
    public async Task AvaliarMistura_RetornaNull_ComMenosDeDuasClasses()
    {
        (await _compat.AvaliarMisturaAsync([4])).Should().BeNull();
        (await _compat.AvaliarMisturaAsync([])).Should().BeNull();
    }
}

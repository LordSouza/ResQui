using ResQui.Tests.Unit.Common;
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
        _compat = new CompatService(repo, overrides, Substitute.For<IAuditoriaService>(), new TransacoesDiretas());

        var labRepo = Substitute.For<ILaboratoriosRepository>();
        labRepo.GetAllAsync().Returns([new Laboratorio { Id = "Lab-001", Nome = "Lab Teste" }]);
        var audit = Substitute.For<IAuditoriaService>();
        _residuos = new ResiduosService(_residuosRepo, audit, labRepo, _compat, new TransacoesDiretas());
        var auth = Substitute.For<IAuthRepository>();
        _mtrs = new MtrsService(_mtrsRepo, _residuosRepo, audit, _compat, Substitute.For<IPdfService>(),
            auth, new VisibilidadeUsuarios(auth, Substitute.For<IUsuarioLaboratoriosRepository>()), new TransacoesDiretas());
    }

    private static CriarResiduoCmd CmdComClasses(params int[] classes) =>
        new("Mistura de teste", "Lab-001", "quimico", 1m, "L", "teste", "medio", null, classes);

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
        { 6, 10, "Solventes halogenados × Agentes redutores" },
        { 6, 11, "Solventes halogenados × Peróxidos" },
    };

    private static readonly Solicitante Solicitante =
        new("u1", "tecnico@resqui.local", "Professor", ["Lab-001"]);

    private static readonly Solicitante Gestor =
        new("u1", "gestor@resqui.local", "Admin", []);

    [Theory]
    [MemberData(nameof(ParesProibidos))]
    public async Task CriarResiduo_BloqueiaPar_Proibido(int classeA, int classeB, string nome)
    {
        var act = () => _residuos.CriarAsync(CmdComClasses(classeA, classeB), Solicitante);
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
            var act = () => _residuos.CriarAsync(CmdComClasses(par.ClasseA, par.ClasseB), Solicitante);
            await act.Should().ThrowAsync<ValidationException>(
                $"par ({par.ClasseA},{par.ClasseB}) tem nível {par.Nivel} e deve ser bloqueado");
        }
    }

    [Theory]
    [InlineData(2, 5)]  // Ácidos orgânicos × Solventes orgânicos — cautela (1), desvio declarado
    [InlineData(5, 6)]  // Solventes orgânicos × halogenados — compatível (0)
    [InlineData(1, 2)]  // Ácidos inorgânicos × orgânicos — cautela (1)
    public async Task CriarResiduo_Permite_ParesCompativeisOuCautela(int classeA, int classeB)
    {
        var dto = await _residuos.CriarAsync(CmdComClasses(classeA, classeB), Solicitante);
        dto.ClassesReatividade.Should().BeEquivalentTo(new[] { classeA, classeB });
    }

    public static TheoryData<int, int, string> ParesAgregadosPerigo => new()
    {
        { 1, 5, "Ácidos inorgânicos × Solventes orgânicos" },
        { 1, 6, "Ácidos inorgânicos × Solventes halogenados" },
        { 1, 7, "Ácidos inorgânicos × Metais pesados" },
        { 9, 10, "Sulfetos × Agentes redutores" },
        { 5, 10, "Solventes orgânicos × Agentes redutores" },
    };

    [Theory]
    [MemberData(nameof(ParesAgregadosPerigo))]
    public async Task CriarResiduo_BloqueiaPar_AgregadoNivelPerigo(int classeA, int classeB, string nome)
    {
        // Reconciliação de 2026-07-28 (Fatia 3): pares com classe agregada que subiram para
        // nível 2 e passaram a barrar a mistura na criação do resíduo.
        var act = () => _residuos.CriarAsync(CmdComClasses(classeA, classeB), Solicitante);
        await act.Should().ThrowAsync<ValidationException>($"o par {nome} é nível Perigo na matriz");
    }

    [Fact]
    public async Task CriarMtr_BloqueiaAgrupamento_SolventeOrganicoComPeroxido()
    {
        // 5×11 subiu para 3 na Fatia 3: o E do chart vem de RGN 19×30 (cetonas × peróxidos) —
        // a química do peróxido de acetona. Nível 3 é o que fecha o gate do MTR.
        var r1 = new Residuo { Id = 1, Descricao = "Acetona", Status = "aguardando-coleta", ClassesReatividade = [5] };
        var r2 = new Residuo { Id = 2, Descricao = "Peróxido", Status = "aguardando-coleta", ClassesReatividade = [11] };
        _residuosRepo.GetByIdAsync(1).Returns(r1);
        _residuosRepo.GetByIdAsync(2).Returns(r2);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [1, 2]);
        var act = () => _mtrs.CriarAsync(cmd, "u1", Gestor);

        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Proibido*");
    }

    [Fact]
    public async Task CriarMtr_BloqueiaAgrupamento_ComParProibidoEntreResiduos()
    {
        var r1 = new Residuo { Id = 1, Descricao = "Ácidos", Status = "aguardando-coleta", ClassesReatividade = [1] };
        var r2 = new Residuo { Id = 2, Descricao = "Cianetos", Status = "aguardando-coleta", ClassesReatividade = [8] };
        _residuosRepo.GetByIdAsync(1).Returns(r1);
        _residuosRepo.GetByIdAsync(2).Returns(r2);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [1, 2]);
        var act = () => _mtrs.CriarAsync(cmd, "u1", Gestor);

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
        var dto = await _mtrs.CriarAsync(cmd, "u1", Gestor);

        // O par Perigo não bloqueou: o manifesto foi criado com os dois resíduos.
        // (O Numero fica nulo aqui porque quem o gera é o DEFAULT da coluna, não o serviço.)
        dto.ResiduoIds.Should().BeEquivalentTo([1, 2]);
        await _mtrsRepo.Received(1).AddAsync(Arg.Any<Mtr>());
    }

    [Theory]
    [InlineData(6, 10, "Solventes halogenados × Agentes redutores")]
    [InlineData(6, 11, "Solventes halogenados × Peróxidos")]
    public async Task CriarMtr_BloqueiaAgrupamento_ComParDeRgnUnicoProibido(
        int classeA, int classeB, string nome)
    {
        // A EPA registra E (explosão) nos dois pares (RGN 17×105 e 17×30). Nível 3 é o que
        // fecha o gate do MTR — nível 2 bloqueia a mistura, mas não o transporte conjunto.
        var r1 = new Residuo { Id = 1, Descricao = nome, Status = "aguardando-coleta", ClassesReatividade = [classeA] };
        var r2 = new Residuo { Id = 2, Descricao = nome, Status = "aguardando-coleta", ClassesReatividade = [classeB] };
        _residuosRepo.GetByIdAsync(1).Returns(r1);
        _residuosRepo.GetByIdAsync(2).Returns(r2);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [1, 2]);
        var act = () => _mtrs.CriarAsync(cmd, "u1", Gestor);

        await act.Should().ThrowAsync<ValidationException>($"o par {nome} é nível 3 na matriz")
            .WithMessage("*Proibido*");
    }

    [Fact]
    public async Task AvaliarMistura_RetornaPiorPar()
    {
        var pior = await _compat.AvaliarMisturaAsync([2, 5, 4]); // (2,5)=1, (2,4)=2, (5,4)=3
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

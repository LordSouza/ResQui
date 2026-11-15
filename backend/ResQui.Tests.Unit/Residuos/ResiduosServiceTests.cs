using ResQui.Tests.Unit.Common;
using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Residuos;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Residuos;

public class ResiduosServiceTests
{
    private readonly IResiduosRepository _repo = Substitute.For<IResiduosRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ILaboratoriosRepository _labRepo = Substitute.For<ILaboratoriosRepository>();
    private readonly ICompatService _compat = Substitute.For<ICompatService>();
    private readonly ResiduosService _sut;

    public ResiduosServiceTests()
    {
        _sut = new ResiduosService(_repo, _audit, _labRepo, _compat, new TransacoesDiretas());
    }

    private static Solicitante Dono(string email = "u@x.com") =>
        new("u1", email, "Professor", ["Lab-001"]);

    private static Solicitante Alheio(string email = "outro@x.com") =>
        new("u2", email, "Professor", ["Lab-002"]);

    private static Solicitante Admin(string email = "admin@x.com") =>
        new("adm", email, "Admin", []);

    private static Residuo FakeResiduo(int id = 1, int? mtrId = null, string status = "aguardando-coleta") => new()
    {
        Id = id,
        Descricao = "Resíduo teste",
        LaboratorioId = "Lab-001",
        MtrId = mtrId,
        Status = status,
        Tipo = "Solventes orgânicos não-halogenados",
        Volume = 4.2m,
        Unidade = "L",
        Composicao = "Acetona + Etanol",
        Risco = "medio",
    };

    // Resíduo "legado": classificação gravada antes das reconciliações da matriz.
    private static Residuo FakeResiduoComClasses(params int[] classes) => new()
    {
        Id = 1,
        Descricao = "Resíduo legado",
        LaboratorioId = "Lab-001",
        Status = "aguardando-coleta",
        Tipo = "Solventes orgânicos não-halogenados",
        Volume = 4.2m,
        Unidade = "L",
        Composicao = "Acetona + HCl",
        Risco = "medio",
        ClassesReatividade = classes.ToList(),
    };

    [Fact]
    public async Task ListarAsync_SemFiltro_RetornaTodos()
    {
        _repo.GetAllAsync().Returns([FakeResiduo(1), FakeResiduo(2)]);

        var result = await _sut.ListarAsync(null, null, null, Dono());

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarAsync_FiltroStatus_RetornaApenasCombinantes()
    {
        _repo.GetAllAsync().Returns([
            FakeResiduo(1, status: "aguardando-coleta"),
            FakeResiduo(2, status: "destinado"),
        ]);

        var result = await _sut.ListarAsync(null, null, "aguardando-coleta", Dono());

        result.Should().HaveCount(1);
        result.First().Status.Should().Be("aguardando-coleta");
    }

    [Fact]
    public async Task ListarAsync_FiltroMtrId_RetornaVinculados()
    {
        _repo.GetAllAsync().Returns([
            FakeResiduo(1, mtrId: 5),
            FakeResiduo(2, mtrId: null),
        ]);

        var result = await _sut.ListarAsync(null, 5, null, Dono());

        result.Should().HaveCount(1);
        result.First().MtrId.Should().Be(5);
    }

    [Fact]
    public async Task CriarAsync_PersisteTodosOsCampos()
    {
        LabExiste("Lab-002");
        var cmd = new CriarResiduoCmd(
            Descricao: "Ácido clorídrico usado",
            LaboratorioId: "Lab-002",
            Tipo: "Ácidos inorgânicos",
            Volume: 2.0m,
            Unidade: "L",
            Composicao: "HCl diluído",
            Risco: "alto",
            Destino: null,
            ClassesReatividade: [1]
        );
        _repo.AddAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.CriarAsync(cmd, new Solicitante("u1", "test@lab.com", "Professor", ["Lab-002"]));

        result.Tipo.Should().Be("Ácidos inorgânicos");
        result.Volume.Should().Be(2.0m);
        result.Risco.Should().Be("alto");
        result.Status.Should().Be("solicitado"); // RF06: nasce como solicitação pendente
        await _repo.Received(1).AddAsync(Arg.Any<Residuo>());
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task AtualizarAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdAsync(999).Returns((Residuo?)null);

        var result = await _sut.AtualizarAsync(999, new AtualizarResiduoCmd(null, null, null, null, null, null, null), Dono("test@lab.com"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task AtualizarAsync_AtualizaCamposNaoNulos()
    {
        var r = FakeResiduo(1);
        _repo.GetByIdAsync(1).Returns(r);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.AtualizarAsync(1, new AtualizarResiduoCmd(
            Descricao: null, Tipo: "Metais pesados", Volume: 0.8m,
            Unidade: null, Composicao: null, Risco: "alto",
            Destino: null), Dono("test@lab.com"));

        result!.Tipo.Should().Be("Metais pesados");
        result.Volume.Should().Be(0.8m);
        result.Risco.Should().Be("alto");
        result.Unidade.Should().Be("L"); // campo não alterado permanece
    }

    [Fact]
    public async Task CriarAsync_RegistraAuditoria()
    {
        LabExiste();
        var cmd = new CriarResiduoCmd("Solventes", "Lab-001", "Solventes orgânicos", 4.2m, "L", "Acetona", "medio", null, [5]);
        _repo.AddAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.CriarAsync(cmd, Dono("ana@lab.com"));

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "residuo.criar", "Resíduos",
            Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task AtualizarAsync_ResiduoExistente_RegistraAuditoria()
    {
        var r = new Residuo { Id = 1, Descricao = "R1", LaboratorioId = "Lab-001", Tipo = "Solventes", Volume = 4.2m, Unidade = "L", Composicao = "Acetona", Risco = "medio", Status = "aguardando-coleta" };
        _repo.GetByIdAsync(1).Returns(r);
        _repo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.AtualizarAsync(1, new AtualizarResiduoCmd(null, null, null, null, null, "alto", null), Dono("ana@lab.com"));

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "residuo.atualizar", "Resíduos",
            Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task AprovarAsync_Solicitado_MoveParaAguardandoColeta()
    {
        var r = FakeResiduo(1, status: "solicitado");
        _repo.GetByIdAsync(1).Returns(r);

        var result = await _sut.AprovarAsync(1, Dono("prof@lab.com"));

        result!.Status.Should().Be("aguardando-coleta");
        await _audit.Received(1).RegistrarAsync(
            "prof@lab.com", "residuo.aprovar", "Resíduos", Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task AprovarAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdAsync(999).Returns((Residuo?)null);
        (await _sut.AprovarAsync(999, Dono("u@x.com"))).Should().BeNull();
    }

    [Fact]
    public async Task AprovarAsync_StatusNaoSolicitado_LancaValidationException()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "aguardando-coleta"));
        var act = () => _sut.AprovarAsync(1, Dono("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*solicitação pendente*");
    }

    [Fact]
    public async Task RejeitarAsync_Solicitado_MoveParaRejeitado()
    {
        var r = FakeResiduo(1, status: "solicitado");
        _repo.GetByIdAsync(1).Returns(r);

        var result = await _sut.RejeitarAsync(1, "fora de conformidade", Dono("prof@lab.com"));

        result!.Status.Should().Be("rejeitado");
        result.MotivoRejeicao.Should().Be("fora de conformidade");
        await _audit.Received(1).RegistrarAsync(
            "prof@lab.com", "residuo.rejeitar", "Resíduos", Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RejeitarAsync_SemMotivo_LancaValidationExceptionSemGravar(string? motivo)
    {
        var r = FakeResiduo(1, status: "solicitado");
        _repo.GetByIdAsync(1).Returns(r);

        var act = () => _sut.RejeitarAsync(1, motivo, Dono("prof@lab.com"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*motivo*");
        r.Status.Should().Be("solicitado");
        await _repo.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task RejeitarAsync_MotivoAcimaDoLimite_LancaValidationException()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "solicitado"));
        var act = () => _sut.RejeitarAsync(1, new string('x', Residuo.MaxMotivoRejeicao + 1), Dono("prof@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*no máximo*");
    }

    [Fact]
    public async Task RejeitarAsync_GravaMotivoSemEspacosNasPontas()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "solicitado"));
        var result = await _sut.RejeitarAsync(1, "  pH fora da faixa  ", Dono("prof@lab.com"));
        result!.MotivoRejeicao.Should().Be("pH fora da faixa");
    }

    [Fact]
    public async Task DesfazerAprovacaoAsync_AguardandoColeta_VoltaParaSolicitado()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "aguardando-coleta"));

        var result = await _sut.DesfazerAprovacaoAsync(1, Dono("prof@lab.com"));

        result!.Status.Should().Be("solicitado");
        await _repo.Received(1).SaveChangesAsync();
        await _audit.Received(1).RegistrarAsync(
            "prof@lab.com", "residuo.aprovacao-desfeita", "Resíduos", Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Theory]
    [InlineData("solicitado", null)]
    [InlineData("em-coleta", 3)]
    [InlineData("aguardando-coleta", 3)]
    [InlineData("rejeitado", null)]
    public async Task DesfazerAprovacaoAsync_ForaDaJanela_LancaValidationException(string status, int? mtrId)
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, mtrId: mtrId, status: status));
        var act = () => _sut.DesfazerAprovacaoAsync(1, Dono("prof@lab.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*desfazer a aprovação*");
        await _repo.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task DesfazerAprovacaoAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdAsync(999).Returns((Residuo?)null);
        (await _sut.DesfazerAprovacaoAsync(999, Dono("u@x.com"))).Should().BeNull();
    }

    [Fact]
    public async Task RejeitarAsync_StatusNaoSolicitado_LancaValidationException()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "em-coleta"));
        var act = () => _sut.RejeitarAsync(1, null, Dono("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*solicitação pendente*");
    }

    private static CriarResiduoCmd FakeResiduoCmd(decimal volume = 1m, string risco = "medio", string unidade = "L", string labId = "Lab-001", string descricao = "Solvente usado", IList<int>? classes = null) =>
        new(descricao, labId, "Solventes orgânicos não-halogenados", volume, unidade, "acetona 80%", risco, null, classes ?? [5]);

    private void LabExiste(string id = "Lab-001") =>
        _labRepo.GetAllAsync().Returns([new Laboratorio { Id = id, Nome = "Lab" }]);

    [Fact]
    public async Task CriarAsync_VolumeZero_LancaValidationException() { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(volume: 0m), Dono("u@x.com")); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Volume*"); }

    [Fact]
    public async Task CriarAsync_VolumeNegativo_LancaValidationException() { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(volume: -2m), Dono("u@x.com")); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Volume*"); }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task CriarAsync_DescricaoVazia_LancaValidationException(string? descricao)
    { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(descricao: descricao!), Dono("u@x.com")); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Descrição*"); }

    [Fact]
    public async Task CriarAsync_RiscoInvalido_LancaValidationException()
    { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(risco: "altíssimo"), Dono("u@x.com")); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Risco*"); }

    [Fact]
    public async Task CriarAsync_UnidadeInvalida_LancaValidationException()
    { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(unidade: "galões"), Dono("u@x.com")); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Unidade*"); }

    [Fact]
    public async Task CriarAsync_LaboratorioInexistente_LancaValidationException()
    { _labRepo.GetAllAsync().Returns([]); var act = () => _sut.CriarAsync(FakeResiduoCmd(labId: "Lab-999"), Dono("u@x.com")); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Laboratório*"); }

    [Fact]
    public async Task CriarAsync_SemClassificacao_LancaValidationException()
    {
        LabExiste();
        var cmd = new CriarResiduoCmd("Solvente usado", "Lab-001", "Solventes orgânicos não-halogenados", 1m, "L", "acetona 80%", "medio", null, null!);
        var act = () => _sut.CriarAsync(cmd, Dono("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Classifique a reatividade*");
    }

    [Fact]
    public async Task CriarAsync_ClassificacaoVazia_LancaValidationException()
    {
        LabExiste();
        var act = () => _sut.CriarAsync(FakeResiduoCmd(classes: []), Dono("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Classifique a reatividade*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    [InlineData(-1)]
    public async Task CriarAsync_ClasseForaDaFaixa_LancaValidationException(int classe)
    {
        LabExiste();
        var act = () => _sut.CriarAsync(FakeResiduoCmd(classes: [classe]), Dono("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*entre 1 e 12*");
    }

    [Fact]
    public async Task CriarAsync_ClassificacaoValida_Persiste()
    {
        LabExiste();
        _repo.AddAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        var result = await _sut.CriarAsync(FakeResiduoCmd(classes: [1, 12]), Dono("u@x.com"));
        result.ClassesReatividade.Should().Equal(1, 12);
    }

    [Fact]
    public async Task AtualizarAsync_VolumeNaoPositivo_LancaValidationException()
    {
        _repo.GetByIdAsync(1).Returns(new Residuo { Id = 1, LaboratorioId = "Lab-001" });
        var cmd = new AtualizarResiduoCmd(null, null, -1m, null, null, null, null);
        var act = () => _sut.AtualizarAsync(1, cmd, Dono("u@x.com"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Volume*");
    }

    private static Laboratorio FakeLab(string id, string nome) => new()
    {
        Id = id, Nome = nome, Responsavel = "", Sala = "",
        Armarios = [], Criado = DateOnly.FromDateTime(DateTime.Today),
    };

    [Fact]
    public async Task AnalyticsAsync_AgregaPorMes()
    {
        // data relativa: dentro da janela de 6 meses e longe das bordas (evita flakiness por DateTime.UtcNow)
        var referencia = DateTime.UtcNow.AddMonths(-1);
        var mesEsperado = referencia.ToString("yyyy-MM");
        var r1 = FakeResiduo(1); r1.Volume = 10; r1.Unidade = "L"; r1.DataRegistro = referencia;
        var r2 = FakeResiduo(2); r2.Volume = 5; r2.Unidade = "L"; r2.DataRegistro = referencia;
        _repo.GetAllAsync().Returns([r1, r2]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab A")]);

        var result = await _sut.AnalyticsAsync(6, Dono());

        result.Mensal.Should().Contain(m => m.Mes == mesEsperado && m.Litros == 15);
    }

    [Fact]
    public async Task AnalyticsAsync_AgregaPorLab()
    {
        var r1 = FakeResiduo(1); r1.Volume = 3; r1.Unidade = "L"; r1.LaboratorioId = "Lab-001";
        var r2 = FakeResiduo(2); r2.Volume = 7; r2.Unidade = "L"; r2.LaboratorioId = "Lab-001";
        _repo.GetAllAsync().Returns([r1, r2]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab Química")]);

        var result = await _sut.AnalyticsAsync(6, Dono());

        result.PorLab.Should().Contain(l => l.Lab == "Lab Química" && l.Litros == 10);
    }

    [Fact]
    public async Task AnalyticsAsync_NormalizaMl()
    {
        var r = FakeResiduo(1); r.Volume = 500; r.Unidade = "mL"; r.LaboratorioId = "Lab-001";
        _repo.GetAllAsync().Returns([r]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab A")]);

        var result = await _sut.AnalyticsAsync(6, Dono());

        result.PorLab.Should().Contain(l => l.Litros == 0.5m);
    }

    [Fact]
    public async Task AnalyticsAsync_SeparaLitrosDeQuilos()
    {
        var liquido = FakeResiduo(1); liquido.Volume = 5; liquido.Unidade = "L";
        var solido = FakeResiduo(2); solido.Volume = 300; solido.Unidade = "g";
        var cubico = FakeResiduo(3); cubico.Volume = 1; cubico.Unidade = "m³";
        _repo.GetAllAsync().Returns([liquido, solido, cubico]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab Química")]);

        var result = await _sut.AnalyticsAsync(6, Dono());

        result.PorLab.Single().Litros.Should().Be(1005m);
        result.PorLab.Single().Quilos.Should().Be(0.3m);
        result.Mensal.Sum(m => m.Litros).Should().Be(1005m);
        result.Mensal.Sum(m => m.Quilos).Should().Be(0.3m);
    }

    [Fact]
    public async Task AnalyticsAsync_ExcluiResiduosMaisAntigosDoPeriodo()
    {
        var r = FakeResiduo(1); r.Volume = 10; r.Unidade = "L";
        r.DataRegistro = DateTime.UtcNow.AddMonths(-10);
        _repo.GetAllAsync().Returns([r]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab A")]);

        var result = await _sut.AnalyticsAsync(6, Dono());

        result.Mensal.Should().NotContain(m => m.Litros > 0);
    }

    // Resíduos gravados antes das reconciliações da matriz (2026-07-27/28) podem ter par hoje em
    // nível >= 2. A validação incide sobre a mudança, não sobre o estado já persistido.
    [Fact]
    public async Task AtualizarAsync_ClassesInalteradas_NaoRevalidaMistura()
    {
        var r = FakeResiduoComClasses(1, 5); // par legado, hoje nível 2 na matriz
        _repo.GetByIdAsync(1).Returns(r);
        _repo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.AtualizarAsync(1, new AtualizarResiduoCmd(
            Descricao: null, Tipo: null, Volume: 9.0m, Unidade: null, Composicao: null,
            Risco: null, Destino: null,
            ClassesReatividade: [1, 5]), Dono("ana@lab.com"));

        result!.Volume.Should().Be(9.0m);
        await _compat.DidNotReceive().AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>());
    }

    [Fact]
    public async Task AtualizarAsync_ClassesEmOutraOrdem_NaoRevalidaMistura()
    {
        var r = FakeResiduoComClasses(1, 5);
        _repo.GetByIdAsync(1).Returns(r);
        _repo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.AtualizarAsync(1, new AtualizarResiduoCmd(
            null, null, null, null, "Nova composição", null, null,
            ClassesReatividade: [5, 1]), Dono("ana@lab.com"));

        await _compat.DidNotReceive().AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>());
    }

    [Fact]
    public async Task AtualizarAsync_ClassesAlteradasComParBloqueado_LancaEAudita()
    {
        var r = FakeResiduoComClasses(1);
        _repo.GetByIdAsync(1).Returns(r);
        _compat.AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>())
            .Returns(new CompatResultDto(1, 3, 3, "Proibido"));

        var act = () => _sut.AtualizarAsync(1, new AtualizarResiduoCmd(null, null, null, null, null, null, null,
            ClassesReatividade: [1, 3]), Dono("ana@lab.com"));

        await act.Should().ThrowAsync<ValidationException>();
        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "residuo.mistura-bloqueada", "Resíduos",
            Arg.Any<string>(), RiscoAuditoria.High);
    }

    [Fact]
    public async Task AtualizarAsync_ClassesNulas_NaoRevalidaNemApaga()
    {
        var r = FakeResiduoComClasses(1, 5);
        _repo.GetByIdAsync(1).Returns(r);
        _repo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.AtualizarAsync(1, new AtualizarResiduoCmd(
            null, null, null, null, null, "alto", null), Dono("ana@lab.com"));

        result!.ClassesReatividade.Should().Equal([1, 5]);
        await _compat.DidNotReceive().AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>());
    }

    [Fact]
    public async Task AtualizarAsync_ClassesVaziasExplicitas_LancaValidationException()
    {
        var r = FakeResiduoComClasses(1, 5);
        _repo.GetByIdAsync(1).Returns(r);

        var act = () => _sut.AtualizarAsync(1, new AtualizarResiduoCmd(null, null, null, null, null, null, null,
            ClassesReatividade: []), Dono("ana@lab.com"));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    [InlineData(99)]
    public async Task AtualizarAsync_ClasseForaDaFaixa_LancaValidationException(int classe)
    {
        var r = FakeResiduoComClasses(1, 5);
        _repo.GetByIdAsync(1).Returns(r);

        var act = () => _sut.AtualizarAsync(1, new AtualizarResiduoCmd(null, null, null, null, null, null, null,
            ClassesReatividade: [classe]), Dono("ana@lab.com"));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CriarAsync_EmLaboratorioAlheio_LancaValidationException()
    {
        LabExiste();

        var act = () => _sut.CriarAsync(FakeResiduoCmd(), Alheio());

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Lab-001*");
    }

    [Fact]
    public async Task CriarAsync_ComoAdmin_AceitaQualquerLaboratorio()
    {
        LabExiste();
        _repo.AddAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.CriarAsync(FakeResiduoCmd(), Admin());

        result.LaboratorioId.Should().Be("Lab-001");
    }

    [Fact]
    public async Task AtualizarAsync_DeLaboratorioAlheio_LancaAcessoNegado()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1));

        var act = () => _sut.AtualizarAsync(1, new AtualizarResiduoCmd(
            "Nova descrição", null, null, null, null, null, null), Alheio());

        await act.Should().ThrowAsync<AcessoNegadoException>().WithMessage("*Lab-001*");
    }

    [Fact]
    public async Task AprovarAsync_DeLaboratorioAlheio_LancaAcessoNegado()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "solicitado"));

        var act = () => _sut.AprovarAsync(1, Alheio());

        await act.Should().ThrowAsync<AcessoNegadoException>();
    }

    [Fact]
    public async Task RejeitarAsync_DeLaboratorioAlheio_LancaAcessoNegado()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "solicitado"));

        var act = () => _sut.RejeitarAsync(1, "motivo qualquer", Alheio());

        await act.Should().ThrowAsync<AcessoNegadoException>();
    }

    [Fact]
    public async Task DesfazerAprovacaoAsync_DeLaboratorioAlheio_LancaAcessoNegado()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1));

        var act = () => _sut.DesfazerAprovacaoAsync(1, Alheio());

        await act.Should().ThrowAsync<AcessoNegadoException>();
    }

    [Fact]
    public async Task AprovarAsync_ResiduoInexistente_ChecaExistenciaAntesDoEscopo()
    {
        _repo.GetByIdAsync(999).Returns((Residuo?)null);

        (await _sut.AprovarAsync(999, Alheio())).Should().BeNull();
    }

    [Fact]
    public async Task ListarAsync_DevolveSoOsLaboratoriosDoSolicitante()
    {
        var doDono = FakeResiduo(1);
        var deOutro = FakeResiduo(2);
        deOutro.LaboratorioId = "Lab-002";
        _repo.GetAllAsync().Returns([doDono, deOutro]);

        var result = await _sut.ListarAsync(null, null, null, Dono());

        result.Should().ContainSingle().Which.LaboratorioId.Should().Be("Lab-001");
    }

    [Fact]
    public async Task ListarAsync_ComoAdmin_DevolveTodos()
    {
        var doDono = FakeResiduo(1);
        var deOutro = FakeResiduo(2);
        deOutro.LaboratorioId = "Lab-002";
        _repo.GetAllAsync().Returns([doDono, deOutro]);

        var result = await _sut.ListarAsync(null, null, null, Admin());

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task AnalyticsAsync_AgregaSoOsLaboratoriosDoSolicitante()
    {
        var doDono = FakeResiduo(1); doDono.Volume = 3; doDono.Unidade = "L";
        var deOutro = FakeResiduo(2); deOutro.Volume = 7; deOutro.Unidade = "L"; deOutro.LaboratorioId = "Lab-002";
        _repo.GetAllAsync().Returns([doDono, deOutro]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab A"), FakeLab("Lab-002", "Lab B")]);

        var result = await _sut.AnalyticsAsync(6, Dono());

        result.PorLab.Should().ContainSingle().Which.Lab.Should().Be("Lab A");
    }

    [Fact]
    public void AtualizarResiduoCmd_NaoExpoeStatusNemMtr()
    {
        typeof(AtualizarResiduoCmd).GetProperties().Select(p => p.Name).Should().BeEquivalentTo(
            "Descricao", "Tipo", "Volume", "Unidade", "Composicao", "Risco", "Destino", "ClassesReatividade");
    }
}

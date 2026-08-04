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
        _sut = new ResiduosService(_repo, _audit, _labRepo, _compat);
    }

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

        var result = await _sut.ListarAsync(null, null, null);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListarAsync_FiltroStatus_RetornaApenasCombinantes()
    {
        _repo.GetAllAsync().Returns([
            FakeResiduo(1, status: "aguardando-coleta"),
            FakeResiduo(2, status: "destinado"),
        ]);

        var result = await _sut.ListarAsync(null, null, "aguardando-coleta");

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

        var result = await _sut.ListarAsync(null, 5, null);

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

        var result = await _sut.CriarAsync(cmd, "test@lab.com");

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

        var result = await _sut.AtualizarAsync(999, new AtualizarResiduoCmd(null, null, null, null, null, null, null, null, null), "test@lab.com");

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
            Destino: null, Status: null, MtrId: null), "test@lab.com");

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

        await _sut.CriarAsync(cmd, "ana@lab.com");

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

        await _sut.AtualizarAsync(1, new AtualizarResiduoCmd(null, null, null, null, null, "alto", null, null, null), "ana@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "residuo.atualizar", "Resíduos",
            Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task AprovarAsync_Solicitado_MoveParaAguardandoColeta()
    {
        var r = FakeResiduo(1, status: "solicitado");
        _repo.GetByIdAsync(1).Returns(r);

        var result = await _sut.AprovarAsync(1, "prof@lab.com");

        result!.Status.Should().Be("aguardando-coleta");
        await _audit.Received(1).RegistrarAsync(
            "prof@lab.com", "residuo.aprovar", "Resíduos", Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task AprovarAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdAsync(999).Returns((Residuo?)null);
        (await _sut.AprovarAsync(999, "u@x.com")).Should().BeNull();
    }

    [Fact]
    public async Task AprovarAsync_StatusNaoSolicitado_LancaValidationException()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "aguardando-coleta"));
        var act = () => _sut.AprovarAsync(1, "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*solicitação pendente*");
    }

    [Fact]
    public async Task RejeitarAsync_Solicitado_MoveParaRejeitado()
    {
        var r = FakeResiduo(1, status: "solicitado");
        _repo.GetByIdAsync(1).Returns(r);

        var result = await _sut.RejeitarAsync(1, "fora de conformidade", "prof@lab.com");

        result!.Status.Should().Be("rejeitado");
        await _audit.Received(1).RegistrarAsync(
            "prof@lab.com", "residuo.rejeitar", "Resíduos", Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task RejeitarAsync_StatusNaoSolicitado_LancaValidationException()
    {
        _repo.GetByIdAsync(1).Returns(FakeResiduo(1, status: "em-coleta"));
        var act = () => _sut.RejeitarAsync(1, null, "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*solicitação pendente*");
    }

    private static CriarResiduoCmd FakeResiduoCmd(decimal volume = 1m, string risco = "medio", string unidade = "L", string labId = "Lab-001", string descricao = "Solvente usado", IList<int>? classes = null) =>
        new(descricao, labId, "Solventes orgânicos não-halogenados", volume, unidade, "acetona 80%", risco, null, classes ?? [5]);

    private void LabExiste(string id = "Lab-001") =>
        _labRepo.GetAllAsync().Returns([new Laboratorio { Id = id, Nome = "Lab" }]);

    [Fact]
    public async Task CriarAsync_VolumeZero_LancaValidationException() { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(volume: 0m), "u@x.com"); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Volume*"); }

    [Fact]
    public async Task CriarAsync_VolumeNegativo_LancaValidationException() { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(volume: -2m), "u@x.com"); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Volume*"); }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task CriarAsync_DescricaoVazia_LancaValidationException(string? descricao)
    { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(descricao: descricao!), "u@x.com"); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Descrição*"); }

    [Fact]
    public async Task CriarAsync_RiscoInvalido_LancaValidationException()
    { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(risco: "altíssimo"), "u@x.com"); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Risco*"); }

    [Fact]
    public async Task CriarAsync_UnidadeInvalida_LancaValidationException()
    { LabExiste(); var act = () => _sut.CriarAsync(FakeResiduoCmd(unidade: "galões"), "u@x.com"); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Unidade*"); }

    [Fact]
    public async Task CriarAsync_LaboratorioInexistente_LancaValidationException()
    { _labRepo.GetAllAsync().Returns([]); var act = () => _sut.CriarAsync(FakeResiduoCmd(labId: "Lab-999"), "u@x.com"); await act.Should().ThrowAsync<ValidationException>().WithMessage("*Laboratório*"); }

    [Fact]
    public async Task CriarAsync_SemClassificacao_LancaValidationException()
    {
        LabExiste();
        var cmd = new CriarResiduoCmd("Solvente usado", "Lab-001", "Solventes orgânicos não-halogenados", 1m, "L", "acetona 80%", "medio", null, null!);
        var act = () => _sut.CriarAsync(cmd, "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Classifique a reatividade*");
    }

    [Fact]
    public async Task CriarAsync_ClassificacaoVazia_LancaValidationException()
    {
        LabExiste();
        var act = () => _sut.CriarAsync(FakeResiduoCmd(classes: []), "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Classifique a reatividade*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    [InlineData(-1)]
    public async Task CriarAsync_ClasseForaDaFaixa_LancaValidationException(int classe)
    {
        LabExiste();
        var act = () => _sut.CriarAsync(FakeResiduoCmd(classes: [classe]), "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*entre 1 e 12*");
    }

    [Fact]
    public async Task CriarAsync_ClassificacaoValida_Persiste()
    {
        LabExiste();
        _repo.AddAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        var result = await _sut.CriarAsync(FakeResiduoCmd(classes: [1, 12]), "u@x.com");
        result.ClassesReatividade.Should().Equal(1, 12);
    }

    [Fact]
    public async Task AtualizarAsync_VolumeNaoPositivo_LancaValidationException()
    {
        _repo.GetByIdAsync(1).Returns(new Residuo { Id = 1 });
        var cmd = new AtualizarResiduoCmd(null, null, -1m, null, null, null, null, null, null);
        var act = () => _sut.AtualizarAsync(1, cmd, "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Volume*");
    }

    private static Laboratorio FakeLab(string id, string nome) => new()
    {
        Id = id, Nome = nome, Responsavel = "", Sala = "", Ventilacao = "",
        Areas = [], Armarios = [], Criado = DateOnly.FromDateTime(DateTime.Today),
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

        var result = await _sut.AnalyticsAsync(6);

        result.Mensal.Should().Contain(m => m.Mes == mesEsperado && m.Valor == 15);
    }

    [Fact]
    public async Task AnalyticsAsync_AgregaPorLab()
    {
        var r1 = FakeResiduo(1); r1.Volume = 3; r1.Unidade = "L"; r1.LaboratorioId = "Lab-001";
        var r2 = FakeResiduo(2); r2.Volume = 7; r2.Unidade = "L"; r2.LaboratorioId = "Lab-001";
        _repo.GetAllAsync().Returns([r1, r2]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab Química")]);

        var result = await _sut.AnalyticsAsync(6);

        result.PorLab.Should().Contain(l => l.Lab == "Lab Química" && l.Valor == 10);
    }

    [Fact]
    public async Task AnalyticsAsync_NormalizaMl()
    {
        var r = FakeResiduo(1); r.Volume = 500; r.Unidade = "mL"; r.LaboratorioId = "Lab-001";
        _repo.GetAllAsync().Returns([r]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab A")]);

        var result = await _sut.AnalyticsAsync(6);

        result.PorLab.Should().Contain(l => l.Valor == 0.5m);
    }

    [Fact]
    public async Task AnalyticsAsync_ExcluiResiduosMaisAntigosDoPeriodo()
    {
        var r = FakeResiduo(1); r.Volume = 10; r.Unidade = "L";
        r.DataRegistro = DateTime.UtcNow.AddMonths(-10);
        _repo.GetAllAsync().Returns([r]);
        _labRepo.GetAllAsync().Returns([FakeLab("Lab-001", "Lab A")]);

        var result = await _sut.AnalyticsAsync(6);

        result.Mensal.Should().NotContain(m => m.Valor > 0);
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
            Risco: null, Destino: null, Status: null, MtrId: null,
            ClassesReatividade: [1, 5]), "ana@lab.com");

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
            null, null, null, null, "Nova composição", null, null, null, null,
            ClassesReatividade: [5, 1]), "ana@lab.com");

        await _compat.DidNotReceive().AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>());
    }

    [Fact]
    public async Task AtualizarAsync_ClassesAlteradasComParBloqueado_LancaEAudita()
    {
        var r = FakeResiduoComClasses(1);
        _repo.GetByIdAsync(1).Returns(r);
        _compat.AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>())
            .Returns(new CompatResultDto(1, 3, 3, "Proibido"));

        var act = () => _sut.AtualizarAsync(1, new AtualizarResiduoCmd(
            null, null, null, null, null, null, null, null, null,
            ClassesReatividade: [1, 3]), "ana@lab.com");

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
            null, null, null, null, null, "alto", null, null, null), "ana@lab.com");

        result!.ClassesReatividade.Should().Equal([1, 5]);
        await _compat.DidNotReceive().AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>());
    }
}

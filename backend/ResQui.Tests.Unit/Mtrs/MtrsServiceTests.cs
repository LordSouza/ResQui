using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Mtrs;
using ResQui.Application.Pdf;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Mtrs;

public class MtrsServiceTests
{
    private readonly IMtrsRepository _repo = Substitute.For<IMtrsRepository>();
    private readonly IResiduosRepository _residuosRepo = Substitute.For<IResiduosRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ICompatService _compat = Substitute.For<ICompatService>();
    private readonly IPdfService _pdf = Substitute.For<IPdfService>();
    private readonly MtrsService _sut;

    public MtrsServiceTests()
    {
        _sut = new MtrsService(_repo, _residuosRepo, _audit, _compat, _pdf);
    }

    private static Mtr FakeMtr(int id = 1) => new()
    {
        Id = id, Numero = $"MTR-2026-{id:D4}", Gerador = "Unifei",
        Transportadora = "EcoLog", ResponsavelId = "user1",
        Destinador = "EcoQuímica SA", CodigoIbama = "A099",
    };

    private static Residuo FakeResiduo(int id, int? mtrId = null) => new()
    {
        Id = id, Descricao = "Resíduo", LaboratorioId = "Lab-001",
        MtrId = mtrId, Status = "aguardando-coleta",
        Tipo = "Solventes", Volume = 5.0m, Unidade = "L",
        Composicao = "Acetona", Risco = "medio",
    };

    [Fact]
    public async Task ListarAsync_RetornaComResiduoIds()
    {
        var mtr = FakeMtr(1);
        _repo.GetAllAsync().Returns([mtr]);
        _residuosRepo.GetAllAsync().Returns([FakeResiduo(10, mtrId: 1), FakeResiduo(11, mtrId: null)]);

        var result = await _sut.ListarAsync();

        result.Should().HaveCount(1);
        result.First().ResiduoIds.Should().Equal([10]);
    }

    [Fact]
    public async Task CriarAsync_VinculaResiduosECalculaMassa()
    {
        var r1 = FakeResiduo(10);
        var r2 = FakeResiduo(11);
        _residuosRepo.GetByIdAsync(10).Returns(r1);
        _residuosRepo.GetByIdAsync(11).Returns(r2);
        _residuosRepo.GetAllAsync().Returns([r1, r2]);
        _repo.AddAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _repo.UpdateAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        _residuosRepo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _residuosRepo.SaveChangesAsync().Returns(Task.CompletedTask);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", "EcoQuímica SA", "A099", [10, 11]);
        var result = await _sut.CriarAsync(cmd, "user1", "user1@lab.com");

        r1.Status.Should().Be("em-coleta");
        r2.Status.Should().Be("em-coleta");
        result.Massa.Should().Be(10.0m); // 5L + 5L × fator 1.0
        result.ResiduoIds.Should().Contain(10);
        result.ResiduoIds.Should().Contain(11);
    }

    [Fact]
    public async Task CriarAsync_ResiduoNaoAprovado_LancaValidationException()
    {
        var r = FakeResiduo(10);
        r.Status = "solicitado"; // descarte ainda não aprovado (RF06 gate)
        _residuosRepo.GetByIdAsync(10).Returns(r);
        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [10]);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*não está aprovado para coleta*");
        await _repo.DidNotReceive().AddAsync(Arg.Any<Mtr>());
    }

    [Fact]
    public async Task CriarAsync_RegistraAuditoria()
    {
        var r = FakeResiduo(10);
        _repo.AddAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        _repo.UpdateAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _residuosRepo.GetByIdAsync(10).Returns(r);
        _residuosRepo.GetAllAsync().Returns(new List<Residuo> { r }.AsEnumerable());
        _residuosRepo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _residuosRepo.SaveChangesAsync().Returns(Task.CompletedTask);

        var cmd = new CriarMtrCmd("Unifei", "EcoLog", "EcoQuím", "A099", [10]);
        await _sut.CriarAsync(cmd, "user-1", "ana@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "mtr.criar", "MTR",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task CriarAsync_NaoAtribuiNumero_DeixaParaOBanco()
    {
        var r = FakeResiduo(10);
        Mtr? gravado = null;
        _repo.AddAsync(Arg.Do<Mtr>(m => gravado = m)).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        _repo.UpdateAsync(Arg.Any<Mtr>()).Returns(Task.CompletedTask);
        _residuosRepo.GetByIdAsync(10).Returns(r);
        _residuosRepo.GetAllAsync().Returns(new List<Residuo> { r }.AsEnumerable());
        _residuosRepo.UpdateAsync(Arg.Any<Residuo>()).Returns(Task.CompletedTask);
        _residuosRepo.SaveChangesAsync().Returns(Task.CompletedTask);

        await _sut.CriarAsync(new CriarMtrCmd("Unifei", "EcoLog", null, null, [10]), "u1", "ana@lab.com");

        // O número é DEFAULT da coluna (sequência mtrs_numero_seq): o serviço não pode inventá-lo,
        // senão o valor sorteado sobrescreve o do banco e a unicidade volta a depender de sorte.
        gravado.Should().NotBeNull();
        gravado!.Numero.Should().BeNull();
    }

    [Theory]
    [InlineData("", "Transp")]
    [InlineData("Gerador", "")]
    public async Task CriarAsync_GeradorOuTransportadoraVazios_LancaValidationException(string gerador, string transp)
    {
        var cmd = new CriarMtrCmd(gerador, transp, null, null, [1]);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CriarAsync_ResiduoIdsVazio_LancaValidationException()
    {
        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, []);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*resíduo*");
    }

    [Fact]
    public async Task CriarAsync_ResiduoInexistente_LancaValidationException()
    {
        _residuosRepo.GetByIdAsync(7).Returns((Residuo?)null);
        var cmd = new CriarMtrCmd("Unifei", "EcoLog", null, null, [7]);
        var act = () => _sut.CriarAsync(cmd, "u1", "u@x.com");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*7*");
        await _repo.DidNotReceive().AddAsync(Arg.Any<Mtr>());
    }

    // O gate de nível 3 não muda; a mensagem passa a dizer QUAL resíduo trouxe as classes do par,
    // para que descobrir o que reclassificar não seja tentativa e erro.
    [Fact]
    public async Task CriarAsync_ResiduoUnicoComParProibido_MensagemNomeiaAsDuasClasses()
    {
        var r = FakeResiduo(18);
        r.ClassesReatividade = [5, 12];
        _residuosRepo.GetByIdAsync(18).Returns(r);
        _compat.AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>())
            .Returns(new CompatResultDto(5, 12, 3, "Proibido"));

        var act = () => _sut.CriarAsync(
            new CriarMtrCmd("Unifei", "EcoLog", null, null, [18]), "user1", "ana@lab.com");

        var ex = await act.Should().ThrowAsync<ValidationException>();
        ex.Which.Message.Should().Contain("resíduo #18 (classes 5, 12)");
    }

    [Fact]
    public async Task CriarAsync_DoisResiduosComUmaClasseCada_MensagemNomeiaOsDois()
    {
        var r1 = FakeResiduo(10);
        r1.ClassesReatividade = [5];
        var r2 = FakeResiduo(11);
        r2.ClassesReatividade = [12];
        _residuosRepo.GetByIdAsync(10).Returns(r1);
        _residuosRepo.GetByIdAsync(11).Returns(r2);
        _compat.AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>())
            .Returns(new CompatResultDto(5, 12, 3, "Proibido"));

        var act = () => _sut.CriarAsync(
            new CriarMtrCmd("Unifei", "EcoLog", null, null, [10, 11]), "user1", "ana@lab.com");

        var ex = await act.Should().ThrowAsync<ValidationException>();
        ex.Which.Message.Should().Contain("resíduo #10 (classe 5)");
        ex.Which.Message.Should().Contain("resíduo #11 (classe 12)");
    }

    [Fact]
    public async Task CriarAsync_ResiduoAlheioAoPar_NaoAparecerNaMensagem()
    {
        var r1 = FakeResiduo(10);
        r1.ClassesReatividade = [5];
        var r2 = FakeResiduo(11);
        r2.ClassesReatividade = [12];
        var r3 = FakeResiduo(12);
        r3.ClassesReatividade = [1];
        _residuosRepo.GetByIdAsync(10).Returns(r1);
        _residuosRepo.GetByIdAsync(11).Returns(r2);
        _residuosRepo.GetByIdAsync(12).Returns(r3);
        _compat.AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>())
            .Returns(new CompatResultDto(5, 12, 3, "Proibido"));

        var act = () => _sut.CriarAsync(
            new CriarMtrCmd("Unifei", "EcoLog", null, null, [10, 11, 12]), "user1", "ana@lab.com");

        var ex = await act.Should().ThrowAsync<ValidationException>();
        ex.Which.Message.Should().NotContain("#12");
    }

    [Fact]
    public async Task CriarAsync_AgrupamentoBloqueado_AuditoriaTrazOsResiduos()
    {
        var r = FakeResiduo(18);
        r.ClassesReatividade = [5, 12];
        _residuosRepo.GetByIdAsync(18).Returns(r);
        _compat.AvaliarMisturaAsync(Arg.Any<IReadOnlyCollection<int>>())
            .Returns(new CompatResultDto(5, 12, 3, "Proibido"));

        var act = () => _sut.CriarAsync(
            new CriarMtrCmd("Unifei", "EcoLog", null, null, [18]), "user1", "ana@lab.com");
        await act.Should().ThrowAsync<ValidationException>();

        await _audit.Received(1).RegistrarAsync(
            "ana@lab.com", "mtr.agrupamento-bloqueado", "MTR",
            Arg.Is<string>(d => d.Contains("#18")), RiscoAuditoria.High);
    }

    // ---------- Destinação final ----------

    private static string Hoje() => DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");

    [Fact]
    public async Task ConfirmarDestinacao_MoveSoOsEmColeta_EGravaDataEAutor()
    {
        var mtr = FakeMtr(1);
        var emColeta = FakeResiduo(10, mtrId: 1); emColeta.Status = "em-coleta";
        var rejeitado = FakeResiduo(11, mtrId: 1); rejeitado.Status = "rejeitado";
        var deOutroMtr = FakeResiduo(12, mtrId: 2); deOutroMtr.Status = "em-coleta";
        _repo.GetByIdAsync(1).Returns(mtr);
        _residuosRepo.GetAllAsync().Returns([emColeta, rejeitado, deOutroMtr]);

        var dto = await _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd(Hoje()), "user1", "user1@lab.com");

        emColeta.Status.Should().Be("destinado");
        rejeitado.Status.Should().Be("rejeitado", "a confirmação não arrasta resíduo que saiu do fluxo por outro caminho");
        deOutroMtr.Status.Should().Be("em-coleta", "resíduo de outro manifesto não é tocado");
        mtr.DataDestinacao.Should().Be(DateOnly.FromDateTime(DateTime.UtcNow));
        mtr.DestinadoPorId.Should().Be("user1");
        dto!.DataDestinacao.Should().Be(Hoje());
    }

    [Fact]
    public async Task ConfirmarDestinacao_MtrInexistente_RetornaNull()
    {
        _repo.GetByIdAsync(99).Returns((Mtr?)null);

        var dto = await _sut.ConfirmarDestinacaoAsync(99, new ConfirmarDestinacaoCmd(Hoje()), "user1", "user1@lab.com");

        dto.Should().BeNull();
    }

    [Fact]
    public async Task ConfirmarDestinacao_JaDestinado_Lanca()
    {
        var mtr = FakeMtr(1);
        mtr.DataDestinacao = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        _repo.GetByIdAsync(1).Returns(mtr);
        var r = FakeResiduo(10, mtrId: 1); r.Status = "destinado";
        _residuosRepo.GetAllAsync().Returns([r]);

        var act = () => _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd(Hoje()), "user1", "user1@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*já destinado*");
    }

    [Fact]
    public async Task ConfirmarDestinacao_DataInvalida_Lanca()
    {
        _repo.GetByIdAsync(1).Returns(FakeMtr(1));

        var act = () => _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd("ontem"), "user1", "user1@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*inválida*");
    }

    [Fact]
    public async Task ConfirmarDestinacao_DataNoFuturo_Lanca()
    {
        _repo.GetByIdAsync(1).Returns(FakeMtr(1));
        var amanha = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1).ToString("yyyy-MM-dd");

        var act = () => _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd(amanha), "user1", "user1@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*futuro*");
    }

    [Fact]
    public async Task ConfirmarDestinacao_AnteriorAEmissao_Lanca()
    {
        var mtr = FakeMtr(1);
        mtr.DataEmissao = DateTime.UtcNow.AddDays(-2);
        _repo.GetByIdAsync(1).Returns(mtr);
        var ontem = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-3).ToString("yyyy-MM-dd");

        var act = () => _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd(ontem), "user1", "user1@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*anterior à emissão*");
    }

    // Trava a comparação por DIA: emitido hoje às 14:32, destinado hoje (meia-noite) deve passar.
    [Fact]
    public async Task ConfirmarDestinacao_MesmoDiaDaEmissao_Aceita()
    {
        var mtr = FakeMtr(1);
        mtr.DataEmissao = DateTime.UtcNow.Date.AddHours(14).AddMinutes(32);
        _repo.GetByIdAsync(1).Returns(mtr);
        var r = FakeResiduo(10, mtrId: 1); r.Status = "em-coleta";
        _residuosRepo.GetAllAsync().Returns([r]);

        var dto = await _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd(Hoje()), "user1", "user1@lab.com");

        dto.Should().NotBeNull();
        r.Status.Should().Be("destinado");
    }

    [Fact]
    public async Task ConfirmarDestinacao_SemResiduoEmColeta_Lanca()
    {
        _repo.GetByIdAsync(1).Returns(FakeMtr(1));
        var r = FakeResiduo(10, mtrId: 1); r.Status = "destinado";
        _residuosRepo.GetAllAsync().Returns([r]);

        var act = () => _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd(Hoje()), "user1", "user1@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*em coleta*");
    }

    [Fact]
    public async Task ConfirmarDestinacao_AuditaMedium()
    {
        var mtr = FakeMtr(1);
        _repo.GetByIdAsync(1).Returns(mtr);
        var r = FakeResiduo(10, mtrId: 1); r.Status = "em-coleta";
        _residuosRepo.GetAllAsync().Returns([r]);

        await _sut.ConfirmarDestinacaoAsync(1, new ConfirmarDestinacaoCmd(Hoje()), "user1", "user1@lab.com");

        await _audit.Received(1).RegistrarAsync("user1@lab.com", "mtr.destinacao", "MTR",
            Arg.Is<string>(d => d.Contains(mtr.Numero) && d.Contains("1 resíduo")), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task ReabrirDestinacao_VoltaParaEmColeta_ELimpaOsCampos()
    {
        var mtr = FakeMtr(1);
        mtr.DataDestinacao = DateOnly.FromDateTime(DateTime.UtcNow);
        mtr.DestinadoPorId = "user1";
        _repo.GetByIdAsync(1).Returns(mtr);
        var destinado = FakeResiduo(10, mtrId: 1); destinado.Status = "destinado";
        var rejeitado = FakeResiduo(11, mtrId: 1); rejeitado.Status = "rejeitado";
        _residuosRepo.GetAllAsync().Returns([destinado, rejeitado]);

        var ok = await _sut.ReabrirDestinacaoAsync(1, "gestor@lab.com");

        ok.Should().BeTrue();
        destinado.Status.Should().Be("em-coleta");
        rejeitado.Status.Should().Be("rejeitado", "reabrir não ressuscita o que não foi ela quem moveu");
        mtr.DataDestinacao.Should().BeNull();
        mtr.DestinadoPorId.Should().BeNull();
    }

    [Fact]
    public async Task ReabrirDestinacao_MtrInexistente_RetornaFalse()
    {
        _repo.GetByIdAsync(99).Returns((Mtr?)null);

        (await _sut.ReabrirDestinacaoAsync(99, "gestor@lab.com")).Should().BeFalse();
    }

    [Fact]
    public async Task ReabrirDestinacao_NaoDestinado_Lanca()
    {
        _repo.GetByIdAsync(1).Returns(FakeMtr(1));

        var act = () => _sut.ReabrirDestinacaoAsync(1, "gestor@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*não está destinado*");
    }

    [Fact]
    public async Task ReabrirDestinacao_AuditaHigh()
    {
        var mtr = FakeMtr(1);
        mtr.DataDestinacao = DateOnly.FromDateTime(DateTime.UtcNow);
        _repo.GetByIdAsync(1).Returns(mtr);
        var r = FakeResiduo(10, mtrId: 1); r.Status = "destinado";
        _residuosRepo.GetAllAsync().Returns([r]);

        await _sut.ReabrirDestinacaoAsync(1, "gestor@lab.com");

        await _audit.Received(1).RegistrarAsync("gestor@lab.com", "mtr.destinacao-reaberta", "MTR",
            Arg.Is<string>(d => d.Contains(mtr.Numero)), RiscoAuditoria.High);
    }
}

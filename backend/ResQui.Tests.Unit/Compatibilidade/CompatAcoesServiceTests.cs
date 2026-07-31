// backend/ResQui.Tests.Unit/Compatibilidade/CompatAcoesServiceTests.cs
using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Notificacoes;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Compatibilidade;

public class CompatAcoesServiceTests
{
    private readonly IReagentesRepository _reagentes = Substitute.For<IReagentesRepository>();
    private readonly ICompatService _compat = Substitute.For<ICompatService>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly INotificacoesService _notifs = Substitute.For<INotificacoesService>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly CompatAcoesService _sut;

    public CompatAcoesServiceTests()
    {
        _sut = new CompatAcoesService(_reagentes, _compat, _audit, _notifs, _auth);
        SeedPar(nivel: 2, descricao: "Perigo");
    }

    // Par padrão: R-1 (classe 5, resp. "Ana Souza") + R-2 (classe 10, resp. "Bruno Lima").
    private void SeedPar(int nivel, string descricao)
    {
        _reagentes.GetByIdAsync("R-1").Returns(new Reagente
            { Id = "R-1", Nome = "Metanol", ClasseReatividade = 5, Responsavel = "Ana Souza" });
        _reagentes.GetByIdAsync("R-2").Returns(new Reagente
            { Id = "R-2", Nome = "Ácido Nítrico", ClasseReatividade = 10, Responsavel = "Bruno Lima" });
        _compat.ConsultarParAsync(5, 10).Returns(new CompatResultDto(5, 10, nivel, descricao));
    }

    // --- RegistrarParecerAsync ---

    [Fact]
    public async Task RegistrarParecer_GravaAuditoriaComNivelDerivadoDoServidor()
    {
        await _sut.RegistrarParecerAsync("tec@resqui.local",
            new RegistrarParecerCmd("R-1", "R-2", "Armazenados em bandejas separadas."));

        await _audit.Received(1).RegistrarAsync(
            "tec@resqui.local",
            "compat.parecer",
            "Compatibilidade",
            Arg.Is<string>(d => d.Contains("R-1") && d.Contains("R-2")
                && d.Contains("nível 2") && d.Contains("Perigo")
                && d.Contains("Armazenados em bandejas separadas.")),
            RiscoAuditoria.Low);
    }

    [Fact]
    public async Task RegistrarParecer_OmiteOTrechoDoParecer_QuandoVazio()
    {
        await _sut.RegistrarParecerAsync("tec@resqui.local", new RegistrarParecerCmd("R-1", "R-2", "   "));

        await _audit.Received(1).RegistrarAsync(
            Arg.Any<string>(), "compat.parecer", "Compatibilidade",
            Arg.Is<string>(d => !d.Contains("Parecer:")),
            RiscoAuditoria.Low);
    }

    [Fact]
    public async Task RegistrarParecer_AceitaParCompativel()
    {
        _compat.ConsultarParAsync(5, 10).Returns(new CompatResultDto(5, 10, 0, "Compatível"));

        await _sut.RegistrarParecerAsync("tec@resqui.local", new RegistrarParecerCmd("R-1", "R-2", "ok"));

        await _audit.Received(1).RegistrarAsync(
            Arg.Any<string>(), "compat.parecer", Arg.Any<string>(), Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task RegistrarParecer_Recusa_QuandoReagenteNaoExiste()
    {
        _reagentes.GetByIdAsync("R-9").Returns((Reagente?)null);

        var act = () => _sut.RegistrarParecerAsync("tec@resqui.local", new RegistrarParecerCmd("R-1", "R-9", null));

        await act.Should().ThrowAsync<ValidationException>();
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task RegistrarParecer_Recusa_QuandoOsDoisIdsSaoIguais()
    {
        var act = () => _sut.RegistrarParecerAsync("tec@resqui.local", new RegistrarParecerCmd("R-1", "R-1", null));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task RegistrarParecer_Recusa_QuandoParecerPassaDe1000Caracteres()
    {
        var act = () => _sut.RegistrarParecerAsync("tec@resqui.local",
            new RegistrarParecerCmd("R-1", "R-2", new string('x', 1001)));

        await act.Should().ThrowAsync<ValidationException>();
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    // --- NotificarResponsaveisAsync ---

    private void SeedUsuarios(params UsuarioInfo[] usuarios) =>
        _auth.GetAllAsync().Returns(usuarios.AsEnumerable());

    private static UsuarioInfo Usuario(string id, string email, string? nome, bool arquivado = false) =>
        new(id, email, nome, null, "Tecnico", new List<string> { "Tecnico" }, arquivado, false);

    [Fact]
    public async Task Notificar_CriaUmaNotificacaoParaCadaResponsavelResolvidoPeloNome()
    {
        SeedUsuarios(
            Usuario("u-1", "ana@resqui.local", "Ana Souza"),
            Usuario("u-2", "bruno@resqui.local", "Bruno Lima"));

        var r = await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        r.Notificados.Should().HaveCount(2);
        r.NaoResolvidos.Should().BeEmpty();
        await _notifs.Received(1).CriarAsync("u-1", Arg.Any<string>(), "compat", "R-1|R-2", "amber");
        await _notifs.Received(1).CriarAsync("u-2", Arg.Any<string>(), "compat", "R-1|R-2", "amber");
    }

    [Fact]
    public async Task Notificar_UsaSeveridadeRed_QuandoNivelEhProibido()
    {
        SeedPar(nivel: 3, descricao: "Proibido");
        SeedUsuarios(Usuario("u-1", "ana@resqui.local", "Ana Souza"));

        await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        await _notifs.Received(1).CriarAsync("u-1", Arg.Any<string>(), "compat", "R-1|R-2", "red");
    }

    [Fact]
    public async Task Notificar_ResolvePorEmail_QuandoOResponsavelEhUmEndereco()
    {
        _reagentes.GetByIdAsync("R-1").Returns(new Reagente
            { Id = "R-1", Nome = "Metanol", ClasseReatividade = 5, Responsavel = "ana@resqui.local" });
        SeedUsuarios(Usuario("u-1", "ana@resqui.local", null), Usuario("u-2", "bruno@resqui.local", "Bruno Lima"));

        var r = await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        r.Notificados.Should().Contain(n => n.UsuarioId == "u-1");
    }

    [Fact]
    public async Task Notificar_NaoResolve_QuandoONomeCorrespondeAMaisDeUmUsuario()
    {
        SeedUsuarios(
            Usuario("u-1", "ana1@resqui.local", "Ana Souza"),
            Usuario("u-3", "ana2@resqui.local", "Ana Souza"),
            Usuario("u-2", "bruno@resqui.local", "Bruno Lima"));

        var r = await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        r.NaoResolvidos.Should().ContainSingle(n => n.Responsavel == "Ana Souza"
            && n.Motivo.Contains("mais de um usuário"));
        await _notifs.DidNotReceive().CriarAsync("u-1", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Notificar_IgnoraUsuarioArquivado()
    {
        SeedUsuarios(
            Usuario("u-1", "ana@resqui.local", "Ana Souza", arquivado: true),
            Usuario("u-2", "bruno@resqui.local", "Bruno Lima"));

        var r = await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        r.Notificados.Should().ContainSingle(n => n.UsuarioId == "u-2");
        r.NaoResolvidos.Should().ContainSingle(n => n.Responsavel == "Ana Souza");
    }

    [Fact]
    public async Task Notificar_ReportaReagenteSemResponsavel()
    {
        _reagentes.GetByIdAsync("R-1").Returns(new Reagente
            { Id = "R-1", Nome = "Metanol", ClasseReatividade = 5, Responsavel = "  " });
        SeedUsuarios(Usuario("u-2", "bruno@resqui.local", "Bruno Lima"));

        var r = await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        r.NaoResolvidos.Should().ContainSingle(n => n.Motivo.Contains("sem responsável"));
    }

    [Fact]
    public async Task Notificar_CriaUmaSoNotificacao_QuandoOsDoisReagentesTemOMesmoResponsavel()
    {
        _reagentes.GetByIdAsync("R-2").Returns(new Reagente
            { Id = "R-2", Nome = "Ácido Nítrico", ClasseReatividade = 10, Responsavel = "Ana Souza" });
        SeedUsuarios(Usuario("u-1", "ana@resqui.local", "Ana Souza"));

        var r = await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        r.Notificados.Should().ContainSingle();
        await _notifs.Received(1).CriarAsync("u-1", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Notificar_Recusa_QuandoNivelEhMenorQueDois()
    {
        SeedPar(nivel: 1, descricao: "Cautela");
        SeedUsuarios(Usuario("u-1", "ana@resqui.local", "Ana Souza"));

        var act = () => _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        await act.Should().ThrowAsync<ValidationException>();
        await _notifs.DidNotReceive().CriarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Notificar_AuditaMedium_MesmoQuandoNinguemFoiResolvido()
    {
        SeedUsuarios(Usuario("u-9", "outro@resqui.local", "Outro Alguém"));

        var r = await _sut.NotificarResponsaveisAsync("tec@resqui.local", new NotificarResponsaveisCmd("R-1", "R-2"));

        r.Notificados.Should().BeEmpty();
        r.NaoResolvidos.Should().HaveCount(2);
        await _notifs.DidNotReceive().CriarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
        await _audit.Received(1).RegistrarAsync(
            "tec@resqui.local", "compat.notificar", "Compatibilidade", Arg.Any<string>(), RiscoAuditoria.Medium);
    }
}

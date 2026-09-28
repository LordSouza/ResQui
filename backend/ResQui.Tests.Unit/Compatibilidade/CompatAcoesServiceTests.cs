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
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly CompatAcoesService _sut;

    private static readonly Solicitante Admin = new("adm", "tec@resqui.local", "Admin", []);

    public CompatAcoesServiceTests()
    {
        _sut = new CompatAcoesService(_reagentes, _compat, _audit, _notifs, _auth, _usuarioLabs);
        SeedPar(nivel: 2, descricao: "Perigo");
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["u-1"] = ["Lab-001"], ["u-2"] = ["Lab-001"], ["u-3"] = ["Lab-001"], ["u-4"] = ["Lab-001"], ["u-9"] = ["Lab-001"],
        });
    }

    // Par padrão: R-1 (classe 5) + R-2 (classe 10).
    private void SeedPar(int nivel, string descricao)
    {
        _reagentes.GetByIdAsync("R-1").Returns(new Reagente
            { Id = "R-1", Nome = "Metanol", ClasseReatividade = 5, LaboratorioId = "Lab-001" });
        _reagentes.GetByIdAsync("R-2").Returns(new Reagente
            { Id = "R-2", Nome = "Ácido Nítrico", ClasseReatividade = 10, LaboratorioId = "Lab-001" });
        _compat.ConsultarParAsync(5, 10).Returns(new CompatResultDto(5, 10, nivel, descricao));
    }

    // --- RegistrarParecerAsync ---

    [Fact]
    public async Task RegistrarParecer_GravaAuditoriaComNivelDerivadoDoServidor()
    {
        await _sut.RegistrarParecerAsync(Admin,
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
        await _sut.RegistrarParecerAsync(Admin, new RegistrarParecerCmd("R-1", "R-2", "   "));

        await _audit.Received(1).RegistrarAsync(
            Arg.Any<string>(), "compat.parecer", "Compatibilidade",
            Arg.Is<string>(d => !d.Contains("Parecer:")),
            RiscoAuditoria.Low);
    }

    [Fact]
    public async Task RegistrarParecer_AceitaParCompativel()
    {
        _compat.ConsultarParAsync(5, 10).Returns(new CompatResultDto(5, 10, 0, "Compatível"));

        await _sut.RegistrarParecerAsync(Admin, new RegistrarParecerCmd("R-1", "R-2", "ok"));

        await _audit.Received(1).RegistrarAsync(
            Arg.Any<string>(), "compat.parecer", Arg.Any<string>(), Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task RegistrarParecer_Recusa_QuandoReagenteNaoExiste()
    {
        _reagentes.GetByIdAsync("R-9").Returns((Reagente?)null);

        var act = () => _sut.RegistrarParecerAsync(Admin, new RegistrarParecerCmd("R-1", "R-9", null));

        await act.Should().ThrowAsync<ValidationException>();
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task RegistrarParecer_Recusa_QuandoOsDoisIdsSaoIguais()
    {
        var act = () => _sut.RegistrarParecerAsync(Admin, new RegistrarParecerCmd("R-1", "R-1", null));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task RegistrarParecer_Recusa_QuandoParecerPassaDe1000Caracteres()
    {
        var act = () => _sut.RegistrarParecerAsync(Admin,
            new RegistrarParecerCmd("R-1", "R-2", new string('x', 1001)));

        await act.Should().ThrowAsync<ValidationException>();
        await _audit.DidNotReceive().RegistrarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    // --- NotificarProfessoresAsync ---

    private void SeedUsuarios(params UsuarioInfo[] usuarios) =>
        _auth.GetAllAsync().Returns(usuarios.AsEnumerable());

    private static UsuarioInfo Usuario(string id, string email, string? nome, string papel = "Professor", bool arquivado = false) =>
        new(id, email, nome, null, papel, new List<string> { papel }, arquivado, false);

    [Fact]
    public async Task Notificar_CriaUmaNotificacaoParaCadaProfessorAtivo()
    {
        SeedUsuarios(
            Usuario("u-1", "ana@resqui.local", "Ana Souza"),
            Usuario("u-2", "bruno@resqui.local", "Bruno Lima"));

        var r = await _sut.NotificarProfessoresAsync(Admin, new NotificarProfessoresCmd("R-1", "R-2"));

        r.Notificados.Select(n => n.UsuarioId).Should().BeEquivalentTo(["u-1", "u-2"]);
        await _notifs.Received(1).CriarAsync("u-1", Arg.Any<string>(), "compat", "R-1|R-2", "amber");
        await _notifs.Received(1).CriarAsync("u-2", Arg.Any<string>(), "compat", "R-1|R-2", "amber");
    }

    [Fact]
    public async Task Notificar_UsaSeveridadeRed_QuandoNivelEhProibido()
    {
        SeedPar(nivel: 3, descricao: "Proibido");
        SeedUsuarios(Usuario("u-1", "ana@resqui.local", "Ana Souza"));

        await _sut.NotificarProfessoresAsync(Admin, new NotificarProfessoresCmd("R-1", "R-2"));

        await _notifs.Received(1).CriarAsync("u-1", Arg.Any<string>(), "compat", "R-1|R-2", "red");
    }

    [Fact]
    public async Task Notificar_IgnoraAlunoAdminEArquivado()
    {
        SeedUsuarios(
            Usuario("u-1", "prof@resqui.local", "Ana Souza"),
            Usuario("u-2", "aluno@resqui.local", "Bruno Lima", papel: "Aluno"),
            Usuario("u-3", "admin@resqui.local", "Admin", papel: "Admin"),
            Usuario("u-4", "antigo@resqui.local", "Carla Dias", arquivado: true));

        var r = await _sut.NotificarProfessoresAsync(Admin, new NotificarProfessoresCmd("R-1", "R-2"));

        r.Notificados.Should().ContainSingle(n => n.UsuarioId == "u-1");
        await _notifs.Received(1).CriarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Notificar_UsaOEmailComoNome_QuandoOProfessorNaoTemNome()
    {
        SeedUsuarios(Usuario("u-1", "ana@resqui.local", null));

        var r = await _sut.NotificarProfessoresAsync(Admin, new NotificarProfessoresCmd("R-1", "R-2"));

        r.Notificados.Should().ContainSingle(n => n.Nome == "ana@resqui.local");
    }

    [Fact]
    public async Task Notificar_Recusa_QuandoNivelEhMenorQueDois()
    {
        SeedPar(nivel: 1, descricao: "Cautela");
        SeedUsuarios(Usuario("u-1", "ana@resqui.local", "Ana Souza"));

        var act = () => _sut.NotificarProfessoresAsync(Admin, new NotificarProfessoresCmd("R-1", "R-2"));

        await act.Should().ThrowAsync<ValidationException>();
        await _notifs.DidNotReceive().CriarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Notificar_AuditaMedium_MesmoSemProfessorAtivo()
    {
        SeedUsuarios(Usuario("u-9", "aluno@resqui.local", "Aluno", papel: "Aluno"));

        var r = await _sut.NotificarProfessoresAsync(Admin, new NotificarProfessoresCmd("R-1", "R-2"));

        r.Notificados.Should().BeEmpty();
        await _notifs.DidNotReceive().CriarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
        await _audit.Received(1).RegistrarAsync(
            "tec@resqui.local", "compat.notificar", "Compatibilidade", Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task Notificar_AvisaSoOsProfessoresDosLaboratoriosDosReagentes()
    {
        SeedUsuarios(
            Usuario("u-1", "meu@resqui.local", "Professor do laboratório"),
            Usuario("u-5", "outro@resqui.local", "Professor de outro laboratório"));
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["u-1"] = ["Lab-001"], ["u-5"] = ["Lab-002"],
        });
        var aluno = new Solicitante("aluno-1", "aluno@resqui.local", "Aluno", ["Lab-001"]);

        var r = await _sut.NotificarProfessoresAsync(aluno, new NotificarProfessoresCmd("R-1", "R-2"));

        r.Notificados.Select(n => n.UsuarioId).Should().Equal("u-1");
        await _notifs.DidNotReceive().CriarAsync("u-5", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Notificar_ReagenteDeOutroLaboratorio_LancaAcessoNegado()
    {
        var deOutroLaboratorio = new Solicitante("aluno-2", "aluno2@resqui.local", "Aluno", ["Lab-002"]);

        var act = () => _sut.NotificarProfessoresAsync(deOutroLaboratorio, new NotificarProfessoresCmd("R-1", "R-2"));

        await act.Should().ThrowAsync<AcessoNegadoException>();
        await _notifs.DidNotReceive().CriarAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task RegistrarParecer_ReagenteDeOutroLaboratorio_LancaAcessoNegado()
    {
        var deOutroLaboratorio = new Solicitante("aluno-2", "aluno2@resqui.local", "Aluno", ["Lab-002"]);

        var act = () => _sut.RegistrarParecerAsync(deOutroLaboratorio, new RegistrarParecerCmd("R-1", "R-2", null));

        await act.Should().ThrowAsync<AcessoNegadoException>();
    }
}

using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Tests.Unit.Notificacoes;

public class CompatCheckerTests
{
    private readonly IReagentesRepository _reagentes = Substitute.For<IReagentesRepository>();
    private readonly ICompatService _compat = Substitute.For<ICompatService>();
    private readonly INotificacoesRepository _notifs = Substitute.For<INotificacoesRepository>();
    private readonly IAuthRepository _auth = Substitute.For<IAuthRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly IUsuarioLaboratoriosRepository _usuarioLabs = Substitute.For<IUsuarioLaboratoriosRepository>();
    private readonly CompatChecker _sut;

    private static readonly Laboratorio Quimica = new() { Id = "Lab-001", Nome = "Química" };
    private static readonly UsuarioInfo ProfessorDaQuimica = new("u-1", "p1@x.com", "P1", null, "Professor", ["Professor"], false);
    private static readonly UsuarioInfo ProfessorDeOutroLaboratorio = new("u-2", "p2@x.com", "P2", null, "Professor", ["Professor"], false);

    public CompatCheckerTests()
    {
        _compat.ConsultarParAsync(5, 10).Returns(new CompatResultDto(5, 10, 3, "Proibido"));
        _auth.GetAllAsync().Returns([ProfessorDaQuimica, ProfessorDeOutroLaboratorio]);
        _usuarioLabs.DeTodosAsync().Returns(new Dictionary<string, IReadOnlyList<string>>
        {
            ["u-1"] = ["Lab-001"], ["u-2"] = ["Lab-002"],
        });
        _sut = new CompatChecker(_reagentes, _compat, _notifs, _auth, _email, _usuarioLabs, NullLogger<CompatChecker>.Instance);
    }

    private static Reagente Reagente(string id, int classe, string armario) => new()
    {
        Id = id, Nome = id, ClasseReatividade = classe,
        LaboratorioId = Quimica.Id, Laboratorio = Quimica, Armario = armario,
    };

    [Fact]
    public async Task RunAsync_ParIncompativelNoMesmoArmario_AvisaOProfessorDoLaboratorioComOLocalDerivado()
    {
        _reagentes.GetAllAsync().Returns([Reagente("R-1", 5, "Armário A"), Reagente("R-2", 10, "Armário A")]);

        await _sut.RunAsync();

        await _notifs.Received(1).AddAsync(Arg.Is<Notificacao>(
            n => n.UsuarioId == "u-1" && n.ReferenciaId == "R-1|R-2" && n.Mensagem.Contains("Química · Armário A")));
        await _notifs.DidNotReceive().AddAsync(Arg.Is<Notificacao>(n => n.UsuarioId == "u-2"));
    }

    [Fact]
    public async Task RunAsync_ParIncompativelEmArmariosDiferentes_NaoAvisa()
    {
        _reagentes.GetAllAsync().Returns([Reagente("R-1", 5, "Armário A"), Reagente("R-2", 10, "Armário B")]);

        await _sut.RunAsync();

        await _notifs.DidNotReceive().AddAsync(Arg.Any<Notificacao>());
    }
}

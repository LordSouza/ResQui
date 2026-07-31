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
}

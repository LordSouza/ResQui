using System.Text.RegularExpressions;
using FluentAssertions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ResQui.Application.Auditoria;
using ResQui.Application.Auth;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Auth;

public class RedefinicaoSenhaServiceTests
{
    private readonly IRedefinicoesSenhaRepository _redefinicoes = Substitute.For<IRedefinicoesSenhaRepository>();
    private readonly IAuthRepository _usuarios = Substitute.For<IAuthRepository>();
    private readonly ISessoesRepository _sessoes = Substitute.For<ISessoesRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly IAuditoriaRepository _trilha = Substitute.For<IAuditoriaRepository>();
    private readonly IEmailService _email = Substitute.For<IEmailService>();
    private readonly IFilaPedidosRedefinicao _fila = Substitute.For<IFilaPedidosRedefinicao>();
    private readonly ILoginThrottle _throttle = Substitute.For<ILoginThrottle>();
    private readonly RedefinicaoSenhaOptions _opcoes = new() { UrlPublica = "https://resqui.com.br/" };
    private readonly RedefinicaoSenhaService _sut;
    private readonly List<RedefinicaoSenha> _gravadas = [];
    private readonly List<string> _corposEnviados = [];

    private static readonly UsuarioInfo Ana = new("user-1", "ana@lab.com", "Ana", null, "Aluno", ["Aluno"], false);

    public RedefinicaoSenhaServiceTests()
    {
        _email.Habilitado.Returns(true);
        _redefinicoes.AddAsync(Arg.Do<RedefinicaoSenha>(_gravadas.Add)).Returns(Task.CompletedTask);
        _email.SendAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Do<string>(_corposEnviados.Add)).Returns(Task.CompletedTask);
        _trilha.BuscarAsync(default, default, default, default, default, default, default, default, default)
            .ReturnsForAnyArgs([]);
        _usuarios.FindByEmailAsync("ana@lab.com").Returns(Ana);
        _usuarios.FindByIdAsync("user-1").Returns(Ana);
        _sut = new RedefinicaoSenhaService(_redefinicoes, _usuarios, _sessoes, _audit, _trilha, _email, _fila, _throttle, _opcoes);
    }

    private string TokenDoUltimoEmail() =>
        Regex.Match(_corposEnviados[^1], @"redefinir=([A-Za-z0-9_-]+)").Groups[1].Value;

    private async Task<(string token, RedefinicaoSenha redefinicao)> PedirLinkAsync()
    {
        await _sut.ProcessarPedidoAsync("ana@lab.com");
        var redefinicao = _gravadas[^1];
        _redefinicoes.GetByTokenHashAsync(redefinicao.TokenHash).Returns(redefinicao);
        return (TokenDoUltimoEmail(), redefinicao);
    }

    [Fact]
    public void Solicitar_ComEmailDesligado_LancaIndisponivel_SemEnfileirar()
    {
        _email.Habilitado.Returns(false);

        var act = () => _sut.Solicitar(new EsqueciSenhaCmd("ana@lab.com"));

        act.Should().Throw<EmailIndisponivelException>();
        _fila.DidNotReceiveWithAnyArgs().Enfileirar(default!);
    }

    [Theory]
    [InlineData("ana@lab.com")]
    [InlineData("ninguem@lab.com")]
    public void Solicitar_SoEnfileira_SemConsultarAConta(string email)
    {
        _sut.Solicitar(new EsqueciSenhaCmd($"  {email} "));

        _fila.Received(1).Enfileirar(email);
        _usuarios.ReceivedCalls().Should().BeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("sem-arroba")]
    public void Solicitar_EmailMalformado_Recusa(string email)
    {
        var act = () => _sut.Solicitar(new EsqueciSenhaCmd(email));

        act.Should().Throw<ValidationException>();
    }

    [Fact]
    public async Task ProcessarPedido_ContaValida_GravaSoOHashEEnviaLinkDaUrlConfigurada()
    {
        var (token, redefinicao) = await PedirLinkAsync();

        token.Should().NotBeNullOrWhiteSpace();
        redefinicao.UsuarioId.Should().Be("user-1");
        redefinicao.TokenHash.Should().NotContain(token);
        redefinicao.ExpiraEm.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(60), TimeSpan.FromMinutes(1));
        _corposEnviados[^1].Should().Contain($"https://resqui.com.br/?redefinir={token}");
        await _email.Received(1).SendAsync("ana@lab.com", Arg.Any<string>(), Arg.Any<string>());
        await _audit.Received(1).RegistrarAsync("ana@lab.com", "user.senha-redefinicao-solicitada", "Auth",
            Arg.Any<string>(), RiscoAuditoria.Low);
    }

    [Fact]
    public async Task ProcessarPedido_ContaInexistenteOuArquivada_NaoGravaNemEnvia()
    {
        _usuarios.FindByEmailAsync("arquivada@lab.com").Returns((UsuarioInfo?)null);

        await _sut.ProcessarPedidoAsync("arquivada@lab.com");

        _gravadas.Should().BeEmpty();
        await _email.DidNotReceiveWithAnyArgs().SendAsync(default!, default!, default!);
        await _audit.DidNotReceiveWithAnyArgs().RegistrarAsync(default!, default!, default!, default!, default);
    }

    [Fact]
    public async Task ProcessarPedido_NoTetoDaConta_NaoEnvia_EAuditaMedium()
    {
        _redefinicoes.ContarDesdeAsync("user-1", Arg.Any<DateTime>()).Returns(3);

        await _sut.ProcessarPedidoAsync("ana@lab.com");

        _gravadas.Should().BeEmpty();
        await _email.DidNotReceiveWithAnyArgs().SendAsync(default!, default!, default!);
        await _audit.Received(1).RegistrarAsync("ana@lab.com", "user.senha-redefinicao-bloqueada", "Auth",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task ProcessarPedido_NoTetoJaAuditadoNaJanela_NaoAuditaDeNovo()
    {
        _redefinicoes.ContarDesdeAsync("user-1", Arg.Any<DateTime>()).Returns(3);
        _trilha.BuscarAsync(default, default, default, default, default, default, default, default, default)
            .ReturnsForAnyArgs([new AuditoriaEntry { What = "user.senha-redefinicao-bloqueada" }]);

        await _sut.ProcessarPedidoAsync("ana@lab.com");

        await _audit.DidNotReceiveWithAnyArgs().RegistrarAsync(default!, default!, default!, default!, default);
    }

    [Fact]
    public async Task Redefinir_TokenValido_TrocaASenha_EncerraSessoes_DestravaEAvisa()
    {
        var (token, redefinicao) = await PedirLinkAsync();
        var sessao = new SessaoToken { UsuarioId = "user-1", Jti = "abc" };
        _sessoes.GetAtivasByUsuarioAsync("user-1").Returns([sessao]);

        await _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "Nova@Senha1"));

        await _usuarios.Received(1).RedefinirSenhaAsync("user-1", "Nova@Senha1");
        redefinicao.UsadaEm.Should().NotBeNull();
        sessao.Revogada.Should().BeTrue();
        await _usuarios.Received(1).DesbloquearLoginAsync("user-1");
        _throttle.Received(1).Zerar("ana@lab.com");
        await _usuarios.DidNotReceiveWithAnyArgs().SetTwoFactorEnabledAsync(default!, default);
        await _audit.Received(1).RegistrarAsync("ana@lab.com", "user.senha-redefinida", "Auth",
            Arg.Any<string>(), RiscoAuditoria.High);
        await _email.Received(2).SendAsync("ana@lab.com", Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task Redefinir_MarcaUsadoAntesDeTrocarASenha()
    {
        var (token, redefinicao) = await PedirLinkAsync();
        DateTime? usadaDuranteATroca = null;
        _usuarios.RedefinirSenhaAsync("user-1", Arg.Any<string>())
            .Returns(_ => { usadaDuranteATroca = redefinicao.UsadaEm; return Task.CompletedTask; });

        await _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "Nova@Senha1"));

        usadaDuranteATroca.Should().NotBeNull();
    }

    [Fact]
    public async Task Redefinir_SenhaRecusadaPeloIdentity_DevolveOLinkAoEstadoPendente()
    {
        var (token, redefinicao) = await PedirLinkAsync();
        _usuarios.RedefinirSenhaAsync("user-1", "fraca").ThrowsAsync(new ValidationException("Passwords must have at least one digit."));

        var act = () => _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "fraca"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*digit*");
        redefinicao.UsadaEm.Should().BeNull();
        await _audit.DidNotReceive().RegistrarAsync(Arg.Any<string>(), "user.senha-redefinida", Arg.Any<string>(),
            Arg.Any<string>(), Arg.Any<RiscoAuditoria>());
    }

    [Fact]
    public async Task Redefinir_InvalidaOsOutrosPedidosPendentes()
    {
        var (token, _) = await PedirLinkAsync();
        var outra = new RedefinicaoSenha { UsuarioId = "user-1", ExpiraEm = DateTime.UtcNow.AddMinutes(30) };
        _redefinicoes.PendentesDoUsuarioAsync("user-1").Returns([outra]);

        await _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "Nova@Senha1"));

        outra.UsadaEm.Should().NotBeNull();
    }

    [Fact]
    public async Task Redefinir_TokenJaUsado_Recusa()
    {
        var (token, redefinicao) = await PedirLinkAsync();
        redefinicao.UsadaEm = DateTime.UtcNow;

        var act = () => _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "Nova@Senha1"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage(RedefinicaoSenhaService.LinkInvalido);
        await _usuarios.DidNotReceiveWithAnyArgs().RedefinirSenhaAsync(default!, default!);
    }

    [Fact]
    public async Task Redefinir_TokenExpirado_Recusa()
    {
        var (token, redefinicao) = await PedirLinkAsync();
        redefinicao.ExpiraEm = DateTime.UtcNow.AddMinutes(-1);

        var act = () => _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "Nova@Senha1"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage(RedefinicaoSenhaService.LinkInvalido);
    }

    [Fact]
    public async Task Redefinir_ContaArquivadaDepoisDoPedido_Recusa()
    {
        var (token, redefinicao) = await PedirLinkAsync();
        _usuarios.FindByIdAsync("user-1").Returns((UsuarioInfo?)null);

        var act = () => _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "Nova@Senha1"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage(RedefinicaoSenhaService.LinkInvalido);
        redefinicao.UsadaEm.Should().BeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("token-que-nao-existe")]
    public async Task Redefinir_TokenDesconhecido_Recusa(string token)
    {
        var act = () => _sut.RedefinirAsync(new RedefinirSenhaCmd(token, "Nova@Senha1"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage(RedefinicaoSenhaService.LinkInvalido);
    }

    [Fact]
    public async Task Redefinir_SemNovaSenha_RecusaSemQueimarOLink()
    {
        var (token, redefinicao) = await PedirLinkAsync();

        var act = () => _sut.RedefinirAsync(new RedefinirSenhaCmd(token, " "));

        await act.Should().ThrowAsync<ValidationException>();
        redefinicao.UsadaEm.Should().BeNull();
    }
}

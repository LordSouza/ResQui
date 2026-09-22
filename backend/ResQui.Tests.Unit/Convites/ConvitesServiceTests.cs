using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Convites;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Convites;

public class ConvitesServiceTests
{
    private readonly IConvitesRepository _convites = Substitute.For<IConvitesRepository>();
    private readonly IAuthRepository _usuarios = Substitute.For<IAuthRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly ConvitesService _sut;
    private readonly List<Convite> _gravados = [];

    public ConvitesServiceTests()
    {
        _convites.AddAsync(Arg.Do<Convite>(_gravados.Add)).Returns(Task.CompletedTask);
        _sut = new ConvitesService(_convites, _usuarios, _audit);
    }

    private async Task<(string token, Convite convite)> CriarConviteAsync(string papel = "Aluno", string papelDeQuemConvida = "Professor")
    {
        var dto = await _sut.CriarAsync(new CriarConviteCmd(papel), "prof-1", "prof@lab.com", papelDeQuemConvida);
        var convite = _gravados[^1];
        _convites.GetByTokenHashAsync(convite.TokenHash).Returns(convite);
        return (dto.Token, convite);
    }

    [Fact]
    public async Task CriarAsync_Professor_ConvidaAluno()
    {
        var (token, convite) = await CriarConviteAsync();

        token.Should().NotBeNullOrWhiteSpace();
        convite.Papel.Should().Be("Aluno");
        convite.ExpiraEm.Should().BeCloseTo(DateTime.UtcNow.AddDays(ConvitesService.DiasValidade), TimeSpan.FromMinutes(1));
        await _audit.Received(1).RegistrarAsync("prof@lab.com", "convite.criar", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task CriarAsync_NaoGravaOTokenEmClaro()
    {
        var (token, convite) = await CriarConviteAsync();

        convite.TokenHash.Should().NotBe(token);
        convite.TokenHash.Should().NotContain(token);
    }

    [Fact]
    public async Task CriarAsync_ProfessorConvidandoProfessor_Recusa()
    {
        var act = () => _sut.CriarAsync(new CriarConviteCmd("Professor"), "prof-1", "prof@lab.com", "Professor");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*só o Admin*");
    }

    [Fact]
    public async Task CriarAsync_AdminConvidandoProfessor_Aceita()
    {
        var (_, convite) = await CriarConviteAsync("Professor", "Admin");

        convite.Papel.Should().Be("Professor");
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Diretor")]
    [InlineData("")]
    public async Task CriarAsync_PapelForaDoConjuntoConvidavel_Recusa(string papel)
    {
        var act = () => _sut.CriarAsync(new CriarConviteCmd(papel), "admin-1", "admin@lab.com", "Admin");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Papel inválido*");
    }

    [Fact]
    public async Task AceitarAsync_CriaUsuarioComOPapelDoConvite_EQueimaOConvite()
    {
        var (token, convite) = await CriarConviteAsync();
        _usuarios.FindByEmailAsync("novo@lab.com").Returns((UsuarioInfo?)null);
        _usuarios.CreateAsync("novo@lab.com", "Senha@123", "M99", "Aluno", "Novo Aluno").Returns("user-9");

        await _sut.AceitarAsync(token, new AceitarConviteCmd("Novo Aluno", "novo@lab.com", "M99", "Senha@123"));

        await _usuarios.Received(1).AddToRoleAsync("user-9", "Aluno");
        convite.UsadoPorId.Should().Be("user-9");
        convite.UsadoEm.Should().NotBeNull();
        await _audit.Received(1).RegistrarAsync("novo@lab.com", "convite.aceito", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task AceitarAsync_QueimaOConviteAntesDeCriarAConta()
    {
        var (token, convite) = await CriarConviteAsync();
        _usuarios.FindByEmailAsync("novo@lab.com").Returns((UsuarioInfo?)null);
        DateTime? usadoEmDuranteACriacao = null;
        _usuarios.CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<string>(), Arg.Any<string?>())
            .Returns(_ => { usadoEmDuranteACriacao = convite.UsadoEm; return "user-9"; });

        await _sut.AceitarAsync(token, new AceitarConviteCmd("Novo Aluno", "novo@lab.com", null, "Senha@123"));

        usadoEmDuranteACriacao.Should().NotBeNull();
    }

    [Fact]
    public async Task AceitarAsync_FalhaAoCriarAConta_DevolveOConviteAoEstadoPendente()
    {
        var (token, convite) = await CriarConviteAsync();
        _usuarios.FindByEmailAsync("novo@lab.com").Returns((UsuarioInfo?)null);
        _usuarios.CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<string>(), Arg.Any<string?>())
            .Returns<string>(_ => throw new ValidationException("Passwords must have at least one digit."));

        var act = () => _sut.AceitarAsync(token, new AceitarConviteCmd("Novo Aluno", "novo@lab.com", null, "senha"));

        await act.Should().ThrowAsync<ValidationException>();
        convite.UsadoEm.Should().BeNull();
        (await _sut.ConsultarAsync(token)).Should().NotBeNull();
    }

    [Fact]
    public async Task AceitarAsync_ConviteJaUsado_Recusa()
    {
        var (token, convite) = await CriarConviteAsync();
        convite.UsadoEm = DateTime.UtcNow;

        var act = () => _sut.AceitarAsync(token, new AceitarConviteCmd("Outro", "outro@lab.com", null, "Senha@123"));

        await act.Should().ThrowAsync<ValidationException>();
        await _usuarios.DidNotReceive().CreateAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    [Fact]
    public async Task AceitarAsync_ConviteExpirado_Recusa()
    {
        var (token, convite) = await CriarConviteAsync();
        convite.ExpiraEm = DateTime.UtcNow.AddMinutes(-1);

        var act = () => _sut.AceitarAsync(token, new AceitarConviteCmd("Outro", "outro@lab.com", null, "Senha@123"));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AceitarAsync_ConviteRevogado_Recusa()
    {
        var (token, convite) = await CriarConviteAsync();
        convite.RevogadoEm = DateTime.UtcNow;

        var act = () => _sut.AceitarAsync(token, new AceitarConviteCmd("Outro", "outro@lab.com", null, "Senha@123"));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AceitarAsync_TokenDesconhecido_Recusa()
    {
        _convites.GetByTokenHashAsync(Arg.Any<string>()).Returns((Convite?)null);

        var act = () => _sut.AceitarAsync("token-que-nao-existe", new AceitarConviteCmd("Outro", "outro@lab.com", null, "Senha@123"));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AceitarAsync_EmailJaCadastrado_Recusa()
    {
        var (token, _) = await CriarConviteAsync();
        _usuarios.FindByEmailAsync("ana@lab.com").Returns(new UsuarioInfo(
            "user-1", "ana@lab.com", "Ana", null, "Aluno", new List<string> { "Aluno" }, false));

        var act = () => _sut.AceitarAsync(token, new AceitarConviteCmd("Ana", "ana@lab.com", null, "Senha@123"));

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*já em uso*");
    }

    [Theory]
    [InlineData("", "novo@lab.com", "Senha@123")]
    [InlineData("Novo", "sem-arroba", "Senha@123")]
    [InlineData("Novo", "novo@lab.com", "")]
    public async Task AceitarAsync_CampoObrigatorioAusente_Recusa(string nome, string email, string senha)
    {
        var (token, _) = await CriarConviteAsync();
        _usuarios.FindByEmailAsync(Arg.Any<string>()).Returns((UsuarioInfo?)null);

        var act = () => _sut.AceitarAsync(token, new AceitarConviteCmd(nome, email, null, senha));

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ConsultarAsync_ConvitePendente_DevolveOPapel()
    {
        var (token, _) = await CriarConviteAsync();

        (await _sut.ConsultarAsync(token))!.Papel.Should().Be("Aluno");
    }

    [Fact]
    public async Task ConsultarAsync_ConviteQueimado_DevolveNulo()
    {
        var (token, convite) = await CriarConviteAsync();
        convite.UsadoEm = DateTime.UtcNow;

        (await _sut.ConsultarAsync(token)).Should().BeNull();
    }

    [Fact]
    public async Task RevogarAsync_ConvitePendente_MarcaEAudita()
    {
        var (_, convite) = await CriarConviteAsync();
        convite.Id = 7;
        _convites.GetByIdAsync(7).Returns(convite);

        (await _sut.RevogarAsync(7, "prof@lab.com", "Professor")).Should().BeTrue();

        convite.RevogadoEm.Should().NotBeNull();
        await _audit.Received(1).RegistrarAsync("prof@lab.com", "convite.revogar", "Usuários",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Fact]
    public async Task RevogarAsync_ConviteJaUsado_Recusa()
    {
        var (_, convite) = await CriarConviteAsync();
        convite.Id = 7;
        convite.UsadoEm = DateTime.UtcNow;
        _convites.GetByIdAsync(7).Returns(convite);

        var act = () => _sut.RevogarAsync(7, "prof@lab.com", "Professor");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*pendentes*");
    }

    [Fact]
    public async Task RevogarAsync_ProfessorRevogandoConviteDeProfessor_Recusa()
    {
        var (_, convite) = await CriarConviteAsync("Professor", "Admin");
        convite.Id = 7;
        _convites.GetByIdAsync(7).Returns(convite);

        var act = () => _sut.RevogarAsync(7, "prof@lab.com", "Professor");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*só o Admin*");
        convite.RevogadoEm.Should().BeNull();
    }

    [Fact]
    public async Task RevogarAsync_ConviteInexistente_DevolveFalso()
    {
        _convites.GetByIdAsync(99).Returns((Convite?)null);

        (await _sut.RevogarAsync(99, "prof@lab.com", "Professor")).Should().BeFalse();
    }

    [Fact]
    public async Task ListarAsync_DerivaOStatusDeCadaConvite()
    {
        var agora = DateTime.UtcNow;
        _convites.GetAllAsync().Returns(new List<Convite>
        {
            new() { Id = 1, Papel = "Aluno", ExpiraEm = agora.AddDays(7) },
            new() { Id = 2, Papel = "Aluno", ExpiraEm = agora.AddDays(7), UsadoEm = agora, UsadoPorId = "user-9" },
            new() { Id = 3, Papel = "Aluno", ExpiraEm = agora.AddMinutes(-1) },
            new() { Id = 4, Papel = "Aluno", ExpiraEm = agora.AddDays(7), RevogadoEm = agora },
        });
        _usuarios.GetAllAsync().Returns(new List<UsuarioInfo>
        {
            new("user-9", "novo@lab.com", "Novo Aluno", null, "Aluno", new List<string> { "Aluno" }, false),
        });

        var lista = (await _sut.ListarAsync()).ToList();

        lista.Select(c => c.Status).Should().Equal("pendente", "usado", "expirado", "revogado");
        lista[1].UsadoPor.Should().Be("Novo Aluno");
    }
}

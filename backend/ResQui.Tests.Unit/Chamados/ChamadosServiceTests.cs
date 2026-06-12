using FluentAssertions;
using NSubstitute;
using ResQui.Application.Chamados;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Chamados;

public class ChamadosServiceTests
{
    private readonly IChamadosRepository _repo = Substitute.For<IChamadosRepository>();
    private readonly ILaboratoriosRepository _labRepo = Substitute.For<ILaboratoriosRepository>();
    private readonly ChamadosService _sut;

    public ChamadosServiceTests()
    {
        _labRepo.GetAllAsync().Returns([new Laboratorio { Id = "Lab-001", Nome = "Lab" }]);
        _sut = new ChamadosService(_repo, _labRepo);
    }

    private static Chamado FakeChamado(int id = 1) => new()
    {
        Id = id, Titulo = "Teste", Descricao = "Desc", LaboratorioId = 1,
        AbertoPorId = "u1", Tipo = ChamadoTipo.Bug, Severidade = ChamadoSeveridade.Alta,
        Status = ChamadoStatus.Aberto, Comentarios = [],
    };

    [Fact]
    public async Task ListarAsync_RetornaTodos()
    {
        _repo.GetAllWithComentariosAsync().Returns([FakeChamado(1), FakeChamado(2)]);
        var result = await _sut.ListarAsync();
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task CriarAsync_PersisteCampos()
    {
        var cmd = new CriarChamadoCmd("Título", "Descrição", 1, "Bug", "Alta");
        _repo.AddAsync(Arg.Any<Chamado>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.CriarAsync(cmd, "u1");

        result.Titulo.Should().Be("Título");
        result.Tipo.Should().Be("bug");
        result.Severidade.Should().Be("alta");
        await _repo.Received(1).AddAsync(Arg.Any<Chamado>());
    }

    [Fact]
    public async Task AtualizarStatusAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdWithComentariosAsync(999).Returns((Chamado?)null);
        var result = await _sut.AtualizarStatusAsync(999, new AtualizarStatusCmd("fechado"));
        result.Should().BeNull();
    }

    [Fact]
    public async Task AtualizarStatusAsync_AtualizaStatus()
    {
        var c = FakeChamado(1);
        _repo.GetByIdWithComentariosAsync(1).Returns(c);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.AtualizarStatusAsync(1, new AtualizarStatusCmd("Fechado"));

        result!.Status.Should().Be("fechado");
        await _repo.Received(1).UpdateAsync(c);
    }

    [Fact]
    public async Task ComentarAsync_IdInexistente_RetornaNull()
    {
        _repo.GetByIdWithComentariosAsync(999).Returns((Chamado?)null);
        var result = await _sut.ComentarAsync(999, new ComentarChamadoCmd("texto"), "u1");
        result.Should().BeNull();
    }

    [Fact]
    public async Task ComentarAsync_AdicionaComentario()
    {
        var c = FakeChamado(1);
        _repo.GetByIdWithComentariosAsync(1).Returns(c);
        _repo.AddComentarioAsync(Arg.Any<ChamadoComentario>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);

        var result = await _sut.ComentarAsync(1, new ComentarChamadoCmd("Meu comentário"), "u2");

        result!.Comentarios.Should().HaveCount(1);
        result.Comentarios[0].Texto.Should().Be("Meu comentário");
        await _repo.Received(1).AddComentarioAsync(Arg.Any<ChamadoComentario>());
    }

    [Fact]
    public async Task ToDto_StatusEmAnalise_RetornaStringComHifen()
    {
        var c = FakeChamado(1);
        c.Status = ChamadoStatus.EmAnalise;
        _repo.GetAllWithComentariosAsync().Returns([c]);
        var result = (await _sut.ListarAsync()).First();
        result.Status.Should().Be("em-analise");
    }

    [Theory]
    [InlineData("", "Desc")]
    [InlineData("Título", "")]
    public async Task CriarAsync_TituloOuDescricaoVazios_LancaValidationException(string titulo, string desc)
    {
        var cmd = new CriarChamadoCmd(titulo, desc, 1, "Bug", "Alta");
        var act = () => _sut.CriarAsync(cmd, "u1");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CriarAsync_LaboratorioInexistente_LancaValidationException()
    {
        var cmd = new CriarChamadoCmd("Título", "Desc", 99, "Bug", "Alta");
        var act = () => _sut.CriarAsync(cmd, "u1");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Laboratório*");
    }

    [Fact]
    public async Task CriarAsync_LaboratorioZero_EhPermitido()
    {
        var cmd = new CriarChamadoCmd("Título", "Desc", 0, "Bug", "Alta");
        _repo.AddAsync(Arg.Any<Chamado>()).Returns(Task.CompletedTask);
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        var result = await _sut.CriarAsync(cmd, "u1");
        result.LaboratorioId.Should().Be(0);
    }

    [Fact]
    public async Task AtualizarStatusAsync_StatusInvalido_LancaValidationException()
    {
        _repo.GetByIdWithComentariosAsync(1).Returns(FakeChamado());
        var act = () => _sut.AtualizarStatusAsync(1, new AtualizarStatusCmd("inexistente"));
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Status*");
    }

    [Fact]
    public async Task AtualizarStatusAsync_StatusKebabCase_EhAceito()
    {
        _repo.GetByIdWithComentariosAsync(1).Returns(FakeChamado());
        _repo.SaveChangesAsync().Returns(Task.CompletedTask);
        var result = await _sut.AtualizarStatusAsync(1, new AtualizarStatusCmd("em-analise"));
        result!.Status.Should().Be("em-analise");
    }

    [Fact]
    public async Task ComentarAsync_TextoVazio_LancaValidationException()
    {
        _repo.GetByIdWithComentariosAsync(1).Returns(FakeChamado());
        var act = () => _sut.ComentarAsync(1, new ComentarChamadoCmd(""), "u1");
        await act.Should().ThrowAsync<ValidationException>().WithMessage("*Texto*");
    }
}

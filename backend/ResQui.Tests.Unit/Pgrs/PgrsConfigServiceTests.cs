using FluentAssertions;
using NSubstitute;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Pgrs;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Pgrs;

public class PgrsConfigServiceTests
{
    private readonly IPgrsConfigRepository _repo = Substitute.For<IPgrsConfigRepository>();
    private readonly IAuditoriaService _audit = Substitute.For<IAuditoriaService>();
    private readonly PgrsConfigService _sut;

    public PgrsConfigServiceTests() => _sut = new PgrsConfigService(_repo, _audit);

    private static AtualizarConfiguracaoPgrsCmd Cmd(string? cnpj = "12.345.678/0001-95", string? email = "resp@inst.edu.br") =>
        new("Instituição Teste", cnpj, "Rua A, 100", "Instituto Teste",
            "Resp. Teste", "CRQ-123", email, "(00) 1111-2222",
            "Instituição Teste", "Transportadora Teste", "Destinadora Teste", "A099");

    [Fact]
    public async Task ObterAsync_SemConfiguracao_RetornaDtoVazio()
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var dto = await _sut.ObterAsync();

        dto.RazaoSocial.Should().BeEmpty();
        dto.Cnpj.Should().BeEmpty();
        dto.CodigoIbamaPadrao.Should().BeEmpty();
        dto.AtualizadoEm.Should().BeNull();
    }

    [Fact]
    public async Task SalvarAsync_SemConfiguracao_CriaLinha()
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var dto = await _sut.SalvarAsync(Cmd(), "gestor@lab.com");

        await _repo.Received(1).AddAsync(Arg.Is<ConfiguracaoPgrs>(c => c.Id == 1 && c.RazaoSocial == "Instituição Teste"));
        await _repo.Received(1).SaveChangesAsync();
        dto.TransportadorPadrao.Should().Be("Transportadora Teste");
        dto.AtualizadoEm.Should().NotBeNull();
    }

    [Fact]
    public async Task SalvarAsync_ComConfiguracao_AtualizaSemCriarOutra()
    {
        var existente = new ConfiguracaoPgrs { Id = 1, RazaoSocial = "Antiga" };
        _repo.GetAsync().Returns(existente);

        var dto = await _sut.SalvarAsync(Cmd(), "gestor@lab.com");

        await _repo.DidNotReceive().AddAsync(Arg.Any<ConfiguracaoPgrs>());
        await _repo.Received(1).SaveChangesAsync();
        existente.RazaoSocial.Should().Be("Instituição Teste");
        dto.RazaoSocial.Should().Be("Instituição Teste");
    }

    [Fact]
    public async Task SalvarAsync_RegistraAuditoria()
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        await _sut.SalvarAsync(Cmd(), "gestor@lab.com");

        await _audit.Received(1).RegistrarAsync(
            "gestor@lab.com", "pgrs.configurar", "Relatórios",
            Arg.Any<string>(), RiscoAuditoria.Medium);
    }

    [Theory]
    [InlineData("123")]
    [InlineData("12.345.678/0001-9")]
    public async Task SalvarAsync_CnpjInvalido_LancaValidacao(string cnpj)
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var act = () => _sut.SalvarAsync(Cmd(cnpj: cnpj), "gestor@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*14 dígitos*");
        await _repo.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task SalvarAsync_EmailInvalido_LancaValidacao()
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var act = () => _sut.SalvarAsync(Cmd(email: "resp.inst.edu.br"), "gestor@lab.com");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*inválido*");
    }

    [Fact]
    public async Task SalvarAsync_CamposVazios_NaoValidaFormato()
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var vazio = new AtualizarConfiguracaoPgrsCmd(null, "", null, null, null, null, "  ", null, null, null, null, null);
        var dto = await _sut.SalvarAsync(vazio, "gestor@lab.com");

        dto.Cnpj.Should().BeEmpty();
        dto.RespEmail.Should().BeEmpty();
        await _repo.Received(1).SaveChangesAsync();
    }
}

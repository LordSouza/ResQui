using ResQui.Tests.Unit.Common;
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

    public PgrsConfigServiceTests() => _sut = new PgrsConfigService(_repo, _audit, new TransacoesDiretas());

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
    public async Task SalvarAsync_VersaoEsperadaDiferenteDaPersistida_LancaConflito()
    {
        var existente = new ConfiguracaoPgrs
        {
            Id = 1,
            RazaoSocial = "Antiga",
            AtualizadoEm = new DateTime(2026, 8, 5, 12, 31, 4, DateTimeKind.Utc),
            AtualizadoPor = "gestor2@resqui.local",
        };
        _repo.GetAsync().Returns(existente);

        var cmd = Cmd() with { AtualizadoEmEsperado = new DateTime(2026, 8, 5, 9, 0, 0, DateTimeKind.Utc) };

        var acao = async () => await _sut.SalvarAsync(cmd, "gestor@lab.com");

        (await acao.Should().ThrowAsync<ConflitoConcorrenciaException>())
            .WithMessage("*gestor2@resqui.local*");
        existente.RazaoSocial.Should().Be("Antiga");
        await _repo.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task SalvarAsync_VersaoEsperadaOmitidaComLinhaVersionada_LancaConflito()
    {
        _repo.GetAsync().Returns(new ConfiguracaoPgrs
        {
            Id = 1,
            AtualizadoEm = new DateTime(2026, 8, 5, 12, 31, 4, DateTimeKind.Utc),
        });

        var acao = async () => await _sut.SalvarAsync(Cmd(), "gestor@lab.com");

        await acao.Should().ThrowAsync<ConflitoConcorrenciaException>();
    }

    [Fact]
    public async Task SalvarAsync_VersaoEsperadaIgualAPersistida_Grava()
    {
        var versao = new DateTime(2026, 8, 5, 12, 31, 4, DateTimeKind.Utc);
        _repo.GetAsync().Returns(new ConfiguracaoPgrs { Id = 1, RazaoSocial = "Antiga", AtualizadoEm = versao });

        var dto = await _sut.SalvarAsync(Cmd() with { AtualizadoEmEsperado = versao }, "gestor@lab.com");

        dto.RazaoSocial.Should().Be("Instituição Teste");
        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task SalvarAsync_LinhaSemVersaoComEsperadoNulo_Grava()
    {
        _repo.GetAsync().Returns(new ConfiguracaoPgrs { Id = 1, RazaoSocial = "Semeada pelo demo" });

        await _sut.SalvarAsync(Cmd(), "gestor@lab.com");

        await _repo.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task SalvarAsync_GravaVersaoTruncadaEmMilissegundos()
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var dto = await _sut.SalvarAsync(Cmd(), "gestor@lab.com");

        dto.AtualizadoEm!.Value.Ticks.Should().Be(
            dto.AtualizadoEm.Value.Ticks / TimeSpan.TicksPerMillisecond * TimeSpan.TicksPerMillisecond);
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

    // GET /api/pgrs-config/identificacao é aberto a qualquer autenticado; ele NÃO pode vazar
    // CNPJ, endereço nem os contatos do responsável técnico, que seguem atrás da policy Operacao.
    [Fact]
    public async Task ObterIdentificacaoAsync_DevolveApenasRazaoSocialEUnidade()
    {
        _repo.GetAsync().Returns(new ConfiguracaoPgrs
        {
            Id = 1,
            RazaoSocial = "Instituição Demo de Ensino",
            Unidade = "Campus Itajubá",
            Cnpj = "00000000000100",
            Endereco = "Rua X, 100",
            RespTecnico = "Fulano",
            RespEmail = "resp@inst.edu.br",
            RespTel = "35 99999-0000",
        });

        var dto = await _sut.ObterIdentificacaoAsync();

        dto.RazaoSocial.Should().Be("Instituição Demo de Ensino");
        dto.Unidade.Should().Be("Campus Itajubá");
        // O record tem exatamente dois campos — nada mais atravessa.
        typeof(IdentificacaoPgrsDto).GetProperties().Select(p => p.Name)
            .Should().BeEquivalentTo(["RazaoSocial", "Unidade"]);
    }

    [Fact]
    public async Task ObterIdentificacaoAsync_SemConfiguracao_DevolveVazio()
    {
        _repo.GetAsync().Returns((ConfiguracaoPgrs?)null);

        var dto = await _sut.ObterIdentificacaoAsync();

        dto.RazaoSocial.Should().BeEmpty();
        dto.Unidade.Should().BeEmpty();
    }
}

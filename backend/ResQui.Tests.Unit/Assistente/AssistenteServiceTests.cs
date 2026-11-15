using FluentAssertions;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using ResQui.Application.Assistente;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Tests.Unit.Assistente;

public class AssistenteServiceTests
{
    private readonly IAssistenteProvider _provider = Substitute.For<IAssistenteProvider>();
    private readonly IReagentesRepository _reagentes = Substitute.For<IReagentesRepository>();
    private readonly IResiduosRepository _residuos = Substitute.For<IResiduosRepository>();

    private AssistenteService Criar(bool habilitado = true, int maxReagentes = 200)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Assistente:Enabled"] = habilitado ? "true" : "false",
            ["Assistente:MaxReagentesCatalogo"] = maxReagentes.ToString(),
        }).Build();
        return new AssistenteService(_provider, _reagentes, _residuos, config);
    }

    private static Reagente Reagente(string id) =>
        new() { Id = id, Nome = "HCl", Cas = "7647-01-0", ClasseReatividade = 1, Estoque = 1m, Unidade = "L", LaboratorioId = "Lab-001" };

    private static MensagemAssistenteCmd Cmd(string mensagem = "oi") => new(mensagem, null);

    private static Solicitante Admin() => new("adm", "admin@x.com", "Admin", []);

    private static Solicitante Professor(params string[] labs) => new("u1", "prof@x.com", "Professor", labs);

    private void ProviderResponde(string conteudo) =>
        _provider.CompletarAsync(Arg.Any<string>(), Arg.Any<IReadOnlyList<MensagemChat>>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(conteudo);

    private string PromptEnviado() =>
        (string)_provider.ReceivedCalls().Single().GetArguments()[0]!;

    [Fact]
    public async Task ResponderAsync_Desabilitado_LancaAssistenteIndisponivel()
    {
        var acao = () => Criar(habilitado: false).ResponderAsync(Cmd(), Admin());

        await acao.Should().ThrowAsync<AssistenteIndisponivelException>();
    }

    [Fact]
    public async Task ResponderAsync_MensagemVazia_LancaValidationException()
    {
        var acao = () => Criar().ResponderAsync(Cmd("   "), Admin());

        await acao.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ResponderAsync_JsonValido_DevolveDto()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente> { Reagente("R-00001") });
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":\"abrindo\",\"action\":\"detail\",\"params\":{\"id\":\"R-00001\"}}");

        var dto = await Criar().ResponderAsync(Cmd(), Admin());

        dto.Say.Should().Be("abrindo");
        dto.Action.Should().Be("detail");
        dto.Params.GetProperty("id").GetString().Should().Be("R-00001");
    }

    [Fact]
    public async Task ResponderAsync_SayEActionComTipoErrado_DegradaEmVezDeEstourar()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":42,\"action\":7,\"params\":{}}");

        var dto = await Criar().ResponderAsync(Cmd(), Admin());

        dto.Say.Should().BeEmpty();
        dto.Action.Should().Be("explain");
    }

    [Fact]
    public async Task ResponderAsync_JsonEnvoltoEmCercasDeMarkdown_AindaEParseado()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("```json\n{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}\n```");

        var dto = await Criar().ResponderAsync(Cmd(), Admin());

        dto.Action.Should().Be("explain");
    }

    [Fact]
    public async Task ResponderAsync_JsonInvalido_TrataComoAssistenteIndisponivel()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("desculpe, não entendi");

        var acao = () => Criar().ResponderAsync(Cmd(), Admin());

        await acao.Should().ThrowAsync<AssistenteIndisponivelException>().WithMessage("*interpretar*");
    }

    [Fact]
    public async Task ResponderAsync_AcaoDesconhecida_ViraExplain()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":\"oi\",\"action\":\"apagarTudo\",\"params\":{}}");

        var dto = await Criar().ResponderAsync(Cmd(), Admin());

        dto.Action.Should().Be("explain");
    }

    [Fact]
    public async Task ResponderAsync_SemParams_DevolveObjetoVazio()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\"}");

        var dto = await Criar().ResponderAsync(Cmd(), Admin());

        dto.Params.ValueKind.Should().Be(System.Text.Json.JsonValueKind.Object);
    }

    [Fact]
    public async Task ResponderAsync_RespeitaMaxReagentesDoCatalogo()
    {
        _reagentes.GetAllAsync().Returns(Enumerable.Range(1, 50).Select(i => Reagente($"R-{i:00000}")).ToList());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}");

        await Criar(maxReagentes: 10).ResponderAsync(Cmd(), Admin());

        PromptEnviado().Should().Contain("R-00010").And.NotContain("R-00011");
    }

    [Fact]
    public async Task ResponderAsync_CatalogoSoTrazResiduosAguardandoColeta()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>
        {
            new() { Id = 1, Tipo = "Solventes", Volume = 1m, Unidade = "L", LaboratorioId = "Lab-001", Status = "aguardando-coleta" },
            new() { Id = 2, Tipo = "Ácidos", Volume = 2m, Unidade = "L", LaboratorioId = "Lab-002", Status = "solicitado" },
        });
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}");

        await Criar().ResponderAsync(Cmd(), Admin());

        PromptEnviado().Should().Contain("W-1").And.NotContain("W-2");
    }

    [Fact]
    public async Task ResponderAsync_HistoricoLimitadoAsUltimasSeisMensagens()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}");
        var historico = Enumerable.Range(1, 10).Select(i => new MensagemChat("user", $"mensagem {i}")).ToList();

        await Criar().ResponderAsync(new MensagemAssistenteCmd("oi", historico), Admin());

        var enviado = (IReadOnlyList<MensagemChat>)_provider.ReceivedCalls().Single().GetArguments()[1]!;
        enviado.Should().HaveCount(6);
        enviado[0].Texto.Should().Be("mensagem 5");
    }

    [Fact]
    public async Task ResponderAsync_CatalogoTrazSoOsResiduosDosLaboratoriosDoSolicitante()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>
        {
            new() { Id = 1, Tipo = "Solventes", Volume = 1m, Unidade = "L", LaboratorioId = "Lab-001", Status = "aguardando-coleta" },
            new() { Id = 2, Tipo = "Ácidos", Volume = 2m, Unidade = "L", LaboratorioId = "Lab-002", Status = "aguardando-coleta" },
        });
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}");

        await Criar().ResponderAsync(Cmd(), Professor("Lab-001"));

        PromptEnviado().Should().Contain("W-1").And.NotContain("W-2");
    }

    [Fact]
    public async Task ResponderAsync_ComoAdmin_CatalogoTrazTodosOsResiduos()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>
        {
            new() { Id = 1, Tipo = "Solventes", Volume = 1m, Unidade = "L", LaboratorioId = "Lab-001", Status = "aguardando-coleta" },
            new() { Id = 2, Tipo = "Ácidos", Volume = 2m, Unidade = "L", LaboratorioId = "Lab-002", Status = "aguardando-coleta" },
        });
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}");

        await Criar().ResponderAsync(Cmd(), Admin());

        PromptEnviado().Should().Contain("W-1").And.Contain("W-2");
    }

    [Fact]
    public async Task ResponderAsync_MensagemAcimaDoTeto_LancaValidationExceptionSemChamarOProvedor()
    {
        var longa = new string('a', AssistenteService.MaxCaracteresMensagem + 1);

        var acao = () => Criar().ResponderAsync(Cmd(longa), Admin());

        await acao.Should().ThrowAsync<ValidationException>().WithMessage("*caracteres*");
        _provider.ReceivedCalls().Should().BeEmpty();
    }

    [Fact]
    public async Task ResponderAsync_TextoDoHistoricoAcimaDoTeto_ChegaTruncado()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}");
        var historico = new List<MensagemChat> { new("bot", new string('b', AssistenteService.MaxCaracteresMensagem * 5)) };

        await Criar().ResponderAsync(new MensagemAssistenteCmd("oi", historico), Admin());

        var enviado = (IReadOnlyList<MensagemChat>)_provider.ReceivedCalls().Single().GetArguments()[1]!;
        enviado.Single().Texto.Should().HaveLength(AssistenteService.MaxCaracteresMensagem);
    }

    [Fact]
    public async Task ResponderAsync_RepassaOCancelamentoDaRequisicaoAoProvedor()
    {
        _reagentes.GetAllAsync().Returns(new List<Reagente>());
        _residuos.GetAllAsync().Returns(new List<Residuo>());
        ProviderResponde("{\"say\":\"oi\",\"action\":\"explain\"}");
        using var requisicao = new CancellationTokenSource();

        await Criar().ResponderAsync(Cmd(), Admin(), requisicao.Token);

        await _provider.Received(1).CompletarAsync(Arg.Any<string>(), Arg.Any<IReadOnlyList<MensagemChat>>(),
            Arg.Any<string>(), requisicao.Token);
    }
}

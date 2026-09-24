using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ResQui.Application.Assistente;
using ResQui.Application.Common;

namespace ResQui.Tests.Unit.Assistente;

public class DeepSeekProviderTests
{
    private sealed class HandlerFalso(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        public HttpRequestMessage? UltimaRequisicao { get; private set; }
        public string? CorpoEnviado { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            UltimaRequisicao = request;
            if (request.Content is not null)
                CorpoEnviado = await request.Content.ReadAsStringAsync(cancellationToken);
            return responder(request);
        }
    }

    private static HttpResponseMessage Ok(string conteudoDoModelo)
    {
        var conteudoEscapado = JsonSerializer.Serialize(conteudoDoModelo);
        var payload = "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":" + conteudoEscapado + "}}]}";
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json"),
        };
    }

    private static DeepSeekProvider Criar(HttpMessageHandler handler)
    {
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://api.deepseek.com") };
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Assistente:Model"] = "deepseek-v4-flash",
            ["Assistente:TimeoutSeconds"] = "20",
        }).Build();
        return new DeepSeekProvider(http, config, NullLogger<DeepSeekProvider>.Instance);
    }

    private static HttpResponseMessage Corpo(string payload, string tipo = "application/json") =>
        new(HttpStatusCode.OK) { Content = new StringContent(payload, Encoding.UTF8, tipo) };

    [Theory]
    [InlineData("{\"choices\":null}")]
    [InlineData("{\"choices\":[]}")]
    [InlineData("{\"choices\":[{\"delta\":{\"content\":\"oi\"}}]}")]
    [InlineData("{\"choices\":[{\"message\":{\"content\":42}}]}")]
    [InlineData("[]")]
    [InlineData("\"texto\"")]
    public async Task CompletarAsync_FormatoInesperado_LancaValidationException(string payload)
    {
        var handler = new HandlerFalso(_ => Corpo(payload));

        var act = () => Criar(handler).CompletarAsync("prompt", [], "oi");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*inesperada*");
    }

    [Fact]
    public async Task CompletarAsync_RespostaOkQueNaoEhJson_LancaValidationException()
    {
        var handler = new HandlerFalso(_ => Corpo("<html>proxy</html>", "text/html"));

        var act = () => Criar(handler).CompletarAsync("prompt", [], "oi");

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*inesperada*");
    }

    [Fact]
    public async Task CompletarAsync_RespostaOk_DevolveConteudoDoModelo()
    {
        var handler = new HandlerFalso(_ => Ok("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}"));

        var conteudo = await Criar(handler).CompletarAsync("prompt", [], "oi");

        conteudo.Should().Be("{\"say\":\"oi\",\"action\":\"explain\",\"params\":{}}");
    }

    [Fact]
    public async Task CompletarAsync_MontaMensagensNaOrdemSystemHistoricoUsuario()
    {
        var handler = new HandlerFalso(_ => Ok("{}"));
        var historico = new List<MensagemChat> { new("user", "anterior"), new("bot", "resposta") };

        await Criar(handler).CompletarAsync("SYS", historico, "atual");

        var corpo = handler.CorpoEnviado!;
        corpo.Should().Contain("\"role\":\"system\"").And.Contain("SYS");
        corpo.Should().Contain("anterior").And.Contain("\"role\":\"assistant\"");
        corpo.Should().Contain("atual");
        corpo.IndexOf("SYS", StringComparison.Ordinal).Should().BeLessThan(corpo.IndexOf("atual", StringComparison.Ordinal));
    }

    [Fact]
    public async Task CompletarAsync_StatusDeErro_LancaValidationException()
    {
        var handler = new HandlerFalso(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests)
        {
            Content = new StringContent("{\"error\":\"rate limit\"}"),
        });

        var acao = () => Criar(handler).CompletarAsync("prompt", [], "oi");

        await acao.Should().ThrowAsync<ValidationException>().WithMessage("*indisponível*");
    }

    [Fact]
    public async Task CompletarAsync_FalhaDeRede_LancaValidationException()
    {
        var handler = new HandlerFalso(_ => throw new HttpRequestException("conexão recusada"));

        var acao = () => Criar(handler).CompletarAsync("prompt", [], "oi");

        await acao.Should().ThrowAsync<ValidationException>().WithMessage("*indisponível*");
    }

    [Fact]
    public async Task CompletarAsync_Timeout_LancaValidationExceptionComMensagemPropria()
    {
        var handler = new HandlerFalso(_ => throw new TaskCanceledException("timeout"));

        var acao = () => Criar(handler).CompletarAsync("prompt", [], "oi");

        await acao.Should().ThrowAsync<ValidationException>().WithMessage("*não respondeu a tempo*");
    }

    [Fact]
    public async Task CompletarAsync_RespostaSemChoices_LancaValidationException()
    {
        var handler = new HandlerFalso(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"choices\":[]}", Encoding.UTF8, "application/json"),
        });

        var acao = () => Criar(handler).CompletarAsync("prompt", [], "oi");

        await acao.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CompletarAsync_ConteudoVazio_LancaValidationException()
    {
        var handler = new HandlerFalso(_ => Ok("   "));

        var acao = () => Criar(handler).CompletarAsync("prompt", [], "oi");

        await acao.Should().ThrowAsync<ValidationException>();
    }
}

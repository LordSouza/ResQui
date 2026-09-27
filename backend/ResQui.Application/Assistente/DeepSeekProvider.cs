using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ResQui.Application.Common;

namespace ResQui.Application.Assistente;

public class DeepSeekProvider(HttpClient http, IConfiguration config, ILogger<DeepSeekProvider> logger) : IAssistenteProvider
{
    public async Task<string> CompletarAsync(string systemPrompt, IReadOnlyList<MensagemChat> historico, string mensagem)
    {
        var modelo = config["Assistente:Model"] ?? "deepseek-v4-flash";
        var timeout = TimeSpan.FromSeconds(config.GetValue("Assistente:TimeoutSeconds", 20));
        var maxTokens = config.GetValue("Assistente:MaxTokens", 600);

        var mensagens = new List<object> { new { role = "system", content = systemPrompt } };
        foreach (var m in historico)
            mensagens.Add(new { role = m.Papel == "user" ? "user" : "assistant", content = m.Texto });
        mensagens.Add(new { role = "user", content = mensagem });

        var payload = new
        {
            model = modelo,
            messages = mensagens,
            response_format = new { type = "json_object" },
            max_tokens = maxTokens,
            stream = false,
        };

        using var cts = new CancellationTokenSource(timeout);
        HttpResponseMessage resposta;
        try
        {
            resposta = await http.PostAsJsonAsync("/chat/completions", payload, cts.Token);
        }
        catch (Exception ex) when (ex is OperationCanceledException or TimeoutException)
        {
            logger.LogWarning("Assistente: provedor não respondeu em {Timeout}s", timeout.TotalSeconds);
            throw new ValidationException("O assistente não respondeu a tempo. Tente de novo em instantes.");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Assistente: falha de rede ao chamar o provedor");
            throw new ValidationException("O serviço do assistente está indisponível agora.");
        }

        if (!resposta.IsSuccessStatusCode)
        {
            var corpo = await resposta.Content.ReadAsStringAsync(cts.Token);
            logger.LogError("Assistente: provedor devolveu {Status}: {Corpo}", (int)resposta.StatusCode, corpo);
            throw new ValidationException("O serviço do assistente está indisponível agora.");
        }

        JsonElement doc;
        try
        {
            doc = await resposta.Content.ReadFromJsonAsync<JsonElement>(cts.Token);
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Assistente: resposta do provedor não é JSON");
            throw new ValidationException("O serviço do assistente devolveu uma resposta inesperada.");
        }

        if (doc.ValueKind != JsonValueKind.Object
            || !doc.TryGetProperty("choices", out var choices)
            || choices.ValueKind != JsonValueKind.Array
            || choices.GetArrayLength() == 0
            || choices[0].ValueKind != JsonValueKind.Object
            || !choices[0].TryGetProperty("message", out var message)
            || message.ValueKind != JsonValueKind.Object
            || !message.TryGetProperty("content", out var content)
            || content.ValueKind != JsonValueKind.String)
        {
            logger.LogError("Assistente: resposta do provedor fora do formato esperado");
            throw new ValidationException("O serviço do assistente devolveu uma resposta inesperada.");
        }

        var conteudo = content.GetString();
        if (string.IsNullOrWhiteSpace(conteudo))
        {
            logger.LogError("Assistente: provedor devolveu conteúdo vazio");
            throw new ValidationException("O serviço do assistente devolveu uma resposta vazia.");
        }

        return conteudo;
    }
}

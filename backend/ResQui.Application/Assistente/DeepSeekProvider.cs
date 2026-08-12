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

        var mensagens = new List<object> { new { role = "system", content = systemPrompt } };
        foreach (var m in historico)
            mensagens.Add(new { role = m.Papel == "user" ? "user" : "assistant", content = m.Texto });
        mensagens.Add(new { role = "user", content = mensagem });

        var payload = new
        {
            model = modelo,
            messages = mensagens,
            response_format = new { type = "json_object" },
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

        var doc = await resposta.Content.ReadFromJsonAsync<JsonElement>(cts.Token);
        if (!doc.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
        {
            logger.LogError("Assistente: resposta do provedor sem choices");
            throw new ValidationException("O serviço do assistente devolveu uma resposta inesperada.");
        }

        var conteudo = choices[0].GetProperty("message").GetProperty("content").GetString();
        if (string.IsNullOrWhiteSpace(conteudo))
        {
            logger.LogError("Assistente: provedor devolveu conteúdo vazio");
            throw new ValidationException("O serviço do assistente devolveu uma resposta vazia.");
        }

        return conteudo;
    }
}

using System.Text.Json;

namespace ResQui.Application.Assistente;

public record MensagemChat(string Papel, string Texto);

public record MensagemAssistenteCmd(string Mensagem, List<MensagemChat>? Historico);

public record RespostaAssistenteDto(string Say, string Action, JsonElement Params);

using System.Text.Json.Serialization;

namespace ResQui.Application.Notificacoes;

public record NotificacaoDto(int Id, string Mensagem, bool Lida, DateTime CriadaEm, string Tipo, string ReferenciaId, string Severidade);

public record NotificacaoPrefsDto(
    [property: JsonPropertyName("expiry")] bool Expiry,
    [property: JsonPropertyName("low-stock")] bool LowStock,
    [property: JsonPropertyName("compat")] bool Compat,
    [property: JsonPropertyName("coleta")] bool Coleta
);

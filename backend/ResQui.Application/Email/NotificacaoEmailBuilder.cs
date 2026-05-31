namespace ResQui.Application.Email;

public static class NotificacaoEmailBuilder
{
    private static string Layout(string titulo, string corpo) => $"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <body style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
          <h2 style="color:#2563eb">ResQui — {titulo}</h2>
          {corpo}
          <hr style="margin-top:32px"/>
          <p style="font-size:12px;color:#6b7280">ResQui · Sistema de Gestão de Resíduos Químicos</p>
        </body>
        </html>
        """;

    public static (string Subject, string Html) BuildExpiry(string nome, string id, int diasRestantes) =>
    (
        $"[ResQui] Reagente prestes a vencer: {nome}",
        Layout("Vencimento próximo",
            $"<p>O reagente <strong>{nome}</strong> ({id}) vence em <strong>{diasRestantes} dias</strong>.</p>" +
            $"<p>Acesse o inventário para tomar providências.</p>")
    );

    public static (string Subject, string Html) BuildLowStock(string nome, string id, decimal estoque, decimal estoqueMin, string unidade) =>
    (
        $"[ResQui] Estoque mínimo atingido: {nome}",
        Layout("Estoque abaixo do mínimo",
            $"<p>O reagente <strong>{nome}</strong> ({id}) está com estoque <strong>{estoque:F2} {unidade}</strong>, " +
            $"abaixo do mínimo configurado de <strong>{estoqueMin:F2} {unidade}</strong>.</p>")
    );

    public static (string Subject, string Html) BuildSinir(string numero, int id) =>
    (
        $"[ResQui] MTR aguarda envio ao SINIR: {numero}",
        Layout("MTR pendente no SINIR",
            $"<p>O MTR <strong>{numero}</strong> (ID: {id}) está como rascunho há mais de 2 dias e ainda não foi enviado ao SINIR.</p>")
    );

    public static (string Subject, string Html) BuildColeta(int quantidade) =>
    (
        $"[ResQui] {quantidade} resíduo(s) aguardando coleta",
        Layout("Resíduos aguardando coleta",
            $"<p><strong>{quantidade} resíduo(s)</strong> estão aguardando coleta há mais de 7 dias.</p>" +
            $"<p>Acesse a tela de Resíduos para verificar.</p>")
    );

    public static (string Subject, string Html) BuildCompat(string nomeA, string nomeB) =>
    (
        $"[ResQui] Tentativa de compatibilidade bloqueada",
        Layout("Incompatibilidade detectada",
            $"<p>Uma tentativa de combinar <strong>{nomeA}</strong> com <strong>{nomeB}</strong> foi bloqueada pelo sistema de compatibilidade.</p>")
    );
}

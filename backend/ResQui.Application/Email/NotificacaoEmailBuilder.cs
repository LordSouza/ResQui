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

    public static (string Subject, string Html) BuildExpiry(string nome, string id, int diasRestantes)
    {
        var vencido = diasRestantes < 0;
        return (
            vencido ? $"[ResQui] Reagente vencido: {nome}" : $"[ResQui] Reagente prestes a vencer: {nome}",
            Layout(vencido ? "Reagente vencido" : "Vencimento próximo",
                $"<p>O reagente <strong>{nome}</strong> ({id}) <strong>{Common.PrazoValidade.Descrever(diasRestantes)}</strong>.</p>" +
                $"<p>Acesse o inventário para tomar providências.</p>")
        );
    }

    public static (string Subject, string Html) BuildLowStock(string nome, string id, decimal estoque, decimal estoqueMin, string unidade) =>
    (
        $"[ResQui] Estoque mínimo atingido: {nome}",
        Layout("Estoque abaixo do mínimo",
            $"<p>O reagente <strong>{nome}</strong> ({id}) está com estoque <strong>{estoque:F2} {unidade}</strong>, " +
            $"abaixo do mínimo configurado de <strong>{estoqueMin:F2} {unidade}</strong>.</p>")
    );

    public static (string Subject, string Html) BuildColeta(int quantidade) =>
    (
        $"[ResQui] {quantidade} resíduo(s) aguardando coleta",
        Layout("Resíduos aguardando coleta",
            $"<p><strong>{quantidade} resíduo(s)</strong> estão aguardando coleta há mais de 7 dias.</p>" +
            $"<p>Acesse a tela de Resíduos para verificar.</p>")
    );

    public static (string Subject, string Html) BuildCompatLocal(string local, string nomeA, string nomeB, string nivel) =>
    (
        $"[ResQui] Armazenamento incompatível em {local}",
        Layout("Armazenamento incompatível",
            $"<p>Os reagentes <strong>{nomeA}</strong> e <strong>{nomeB}</strong> estão armazenados em <strong>{local}</strong> " +
            $"com nível de compatibilidade <strong>{nivel}</strong>.</p>" +
            $"<p>Verifique a segregação física desses itens.</p>")
    );

    public static (string Subject, string Html) BuildCompat(string nomeA, string nomeB) =>
    (
        $"[ResQui] Tentativa de compatibilidade bloqueada",
        Layout("Incompatibilidade detectada",
            $"<p>Uma tentativa de combinar <strong>{nomeA}</strong> com <strong>{nomeB}</strong> foi bloqueada pelo sistema de compatibilidade.</p>")
    );

    public static (string Subject, string Html) BuildCodigoRecuperacaoUsado(int restantes) =>
    (
        "[ResQui] Código de recuperação usado na sua conta",
        Layout("Código de recuperação usado",
            $"<p>Um <strong>código de recuperação</strong> acabou de ser usado para entrar na sua conta.</p>" +
            $"<p>Restam <strong>{restantes}</strong> de 10 códigos.</p>" +
            $"<p>Se não foi você, troque sua senha e gere novos códigos imediatamente.</p>")
    );

    public static (string Subject, string Html) Build2faResetadoPorAdmin(string adminEmail) =>
    (
        "[ResQui] Autenticação em dois fatores resetada",
        Layout("2FA resetado por um administrador",
            $"<p>O administrador <strong>{adminEmail}</strong> resetou a autenticação em dois fatores da sua conta.</p>" +
            $"<p>Seu aplicativo autenticador e seus códigos de recuperação <strong>deixaram de valer</strong>, " +
            $"e todas as sessões abertas foram encerradas.</p>" +
            $"<p>Entre com sua senha e configure o 2FA novamente em <em>Senha e autenticação</em>.</p>" +
            $"<p>Se você não pediu este reset, procure o administrador imediatamente.</p>")
    );
}

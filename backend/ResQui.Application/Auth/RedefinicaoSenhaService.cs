using System.Security.Cryptography;
using System.Text;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Auth;

public record EsqueciSenhaCmd(string Email);
public record RedefinirSenhaCmd(string Token, string NovaSenha);

public interface IRedefinicaoSenhaService
{
    void Solicitar(EsqueciSenhaCmd cmd);
    Task ProcessarPedidoAsync(string emailInformado);
    Task RedefinirAsync(RedefinirSenhaCmd cmd);
}

public class RedefinicaoSenhaService(
    IRedefinicoesSenhaRepository redefinicoes,
    IAuthRepository usuarios,
    ISessoesRepository sessoes,
    IAuditoriaService auditoria,
    IAuditoriaRepository trilha,
    IEmailService email,
    IFilaPedidosRedefinicao fila,
    ILoginThrottle throttle,
    RedefinicaoSenhaOptions opcoes,
    ITransacoes transacoes) : IRedefinicaoSenhaService
{
    public const string LinkInvalido = "Link inválido ou expirado. Peça outro em \"Esqueci minha senha\".";
    public const string EmailNaoConfigurado = "A recuperação de senha por e-mail não está configurada nesta instalação. Procure o administrador.";

    public void Solicitar(EsqueciSenhaCmd cmd)
    {
        if (!email.Habilitado)
            throw new EmailIndisponivelException(EmailNaoConfigurado);
        var emailInformado = EmailDeEntrada.Normalizar(cmd.Email);
        if (!emailInformado.Contains('@'))
            throw new ValidationException("E-mail inválido.");
        fila.Enfileirar(emailInformado);
    }

    public async Task ProcessarPedidoAsync(string emailInformado)
    {
        if (await usuarios.FindByEmailAsync(emailInformado) is not { } usuario)
            return;

        var agora = DateTime.UtcNow;
        var inicioDaJanela = agora.AddMinutes(-opcoes.JanelaMinutosConta);
        if (await redefinicoes.ContarDesdeAsync(usuario.Id, inicioDaJanela) >= opcoes.MaxPorConta)
        {
            await AuditarTetoUmaVezPorJanelaAsync(usuario.Email, inicioDaJanela);
            return;
        }

        var token = GerarToken();
        await redefinicoes.AddAsync(new RedefinicaoSenha
        {
            UsuarioId = usuario.Id,
            TokenHash = Hash(token),
            CriadaEm = agora,
            ExpiraEm = agora.AddMinutes(opcoes.ValidadeMinutos),
        });
        await transacoes.ExecutarAsync(async () =>
        {
            await redefinicoes.SaveChangesAsync();
            await auditoria.RegistrarAsync(usuario.Email, "user.senha-redefinicao-solicitada", "Auth",
                "Pediu um link de redefinição de senha", RiscoAuditoria.Low);
        });
        var (assunto, html) = NotificacaoEmailBuilder.BuildRedefinicaoSenha(LinkDe(token), opcoes.ValidadeMinutos);
        await email.SendAsync(usuario.Email, assunto, html);
    }

    public async Task RedefinirAsync(RedefinirSenhaCmd cmd)
    {
        if (string.IsNullOrWhiteSpace(cmd.NovaSenha))
            throw new ValidationException("Nova senha é obrigatória.");
        var redefinicao = await BuscarPendenteAsync(cmd.Token)
            ?? throw new ValidationException(LinkInvalido);
        var usuario = await usuarios.FindByIdAsync(redefinicao.UsuarioId)
            ?? throw new ValidationException(LinkInvalido);

        var agora = DateTime.UtcNow;
        await transacoes.ExecutarAsync(async () =>
        {
            // Marcar o uso primeiro faz o xmin do link decidir a corrida entre dois envios; senha
            // recusada pela política desfaz a marcação junto, e o link continua valendo.
            redefinicao.UsadaEm = agora;
            await redefinicoes.SaveChangesAsync();
            await usuarios.RedefinirSenhaAsync(usuario.Id, cmd.NovaSenha);

            foreach (var outra in await redefinicoes.PendentesDoUsuarioAsync(usuario.Id))
                outra.UsadaEm = agora;
            await redefinicoes.SaveChangesAsync();

            var encerradas = await EncerrarSessoesAsync(usuario.Id);
            await usuarios.DesbloquearLoginAsync(usuario.Id);
            await auditoria.RegistrarAsync(usuario.Email, "user.senha-redefinida", "Auth",
                $"Redefiniu a senha pelo link do e-mail; {encerradas} sessão(ões) encerrada(s)", RiscoAuditoria.High);
        });
        throttle.Zerar(usuario.Email);

        var (assunto, html) = NotificacaoEmailBuilder.BuildSenhaRedefinida();
        await email.SendAsync(usuario.Email, assunto, html);
    }

    private async Task AuditarTetoUmaVezPorJanelaAsync(string emailDaConta, DateTime inicioDaJanela)
    {
        var jaAuditado = await trilha.BuscarAsync(inicioDaJanela, null, null, null,
            "user.senha-redefinicao-bloqueada", null, null, 1, [emailDaConta.ToLowerInvariant()]);
        if (jaAuditado.Any())
            return;
        await auditoria.RegistrarAsync(emailDaConta, "user.senha-redefinicao-bloqueada", "Auth",
            $"Pedidos de redefinição de senha passaram de {opcoes.MaxPorConta} em {opcoes.JanelaMinutosConta} minutos; novos pedidos não enviam e-mail",
            RiscoAuditoria.Medium);
    }

    private async Task<int> EncerrarSessoesAsync(string usuarioId)
    {
        var ativas = (await sessoes.GetAtivasByUsuarioAsync(usuarioId)).ToList();
        foreach (var sessao in ativas)
        {
            sessao.Revogada = true;
            await sessoes.UpdateAsync(sessao);
        }
        if (ativas.Count > 0) await sessoes.SaveChangesAsync();
        return ativas.Count;
    }

    private async Task<RedefinicaoSenha?> BuscarPendenteAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var redefinicao = await redefinicoes.GetByTokenHashAsync(Hash(token));
        return redefinicao is { UsadaEm: null } && redefinicao.ExpiraEm > DateTime.UtcNow ? redefinicao : null;
    }

    private string LinkDe(string token) =>
        $"{opcoes.UrlPublica.TrimEnd('/')}/?redefinir={Uri.EscapeDataString(token)}";

    private static string GerarToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}

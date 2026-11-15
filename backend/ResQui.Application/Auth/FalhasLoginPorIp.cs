using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.Configuration;

namespace ResQui.Application.Auth;

/// Dois tetos sobre o IP real. Por (origem, e-mail): quem erra a própria senha atrás do NAT do
/// campus só trava a si mesmo, e não a rede inteira. Por origem, contando e-mails distintos que
/// falharam: é a assinatura do password spray (poucas senhas contra muitas contas), que um
/// teto por par não enxerga.
public class FalhasLoginPorIp : IFalhasLoginPorIp
{
    private const int GatePoda = 1024;

    private sealed class JanelaPar
    {
        public DateTimeOffset Inicio;
        public int Falhas;
    }

    private sealed class JanelaOrigem
    {
        public DateTimeOffset Inicio;
        public readonly HashSet<string> Emails = [];
    }

    private readonly Dictionary<(string Origem, string Email), JanelaPar> _pares = [];
    private readonly Dictionary<string, JanelaOrigem> _origens = [];
    private readonly Lock _lock = new();
    private readonly int _maxFalhasPorEmail;
    private readonly int _maxEmailsPorOrigem;
    private readonly TimeSpan _duracao;
    private readonly TimeProvider _clock;

    public FalhasLoginPorIp(IConfiguration config) : this(
        config.GetValue("Auth:FalhasPorIp:MaxFalhasPorEmail", 10),
        config.GetValue("Auth:FalhasPorIp:MaxEmailsDistintos", 20),
        TimeSpan.FromMinutes(config.GetValue("Auth:FalhasPorIp:JanelaMinutos", 10)),
        TimeProvider.System)
    { }

    public FalhasLoginPorIp(int maxFalhasPorEmail, int maxEmailsPorOrigem, TimeSpan janela, TimeProvider clock)
    {
        _maxFalhasPorEmail = maxFalhasPorEmail;
        _maxEmailsPorOrigem = maxEmailsPorOrigem;
        _duracao = janela;
        _clock = clock;
    }

    public int EntradasEmMemoria
    {
        get { lock (_lock) return _pares.Count + _origens.Count; }
    }

    public TimeSpan? TempoAteLiberar(string ip, string email)
    {
        var origem = Origem(ip);
        var chave = (origem, NormalizarEmail(email));
        var agora = _clock.GetUtcNow();
        lock (_lock)
        {
            TimeSpan? restante = null;
            if (_origens.TryGetValue(origem, out var janelaOrigem) && Vigente(janelaOrigem.Inicio, agora)
                && janelaOrigem.Emails.Count >= _maxEmailsPorOrigem)
                restante = janelaOrigem.Inicio + _duracao - agora;
            if (_pares.TryGetValue(chave, out var par) && Vigente(par.Inicio, agora)
                && par.Falhas >= _maxFalhasPorEmail)
            {
                var restantePar = par.Inicio + _duracao - agora;
                if (restante is null || restantePar > restante) restante = restantePar;
            }
            return restante;
        }
    }

    public bool RegistrarFalha(string ip, string email)
    {
        var origem = Origem(ip);
        var emailNormalizado = NormalizarEmail(email);
        var agora = _clock.GetUtcNow();
        lock (_lock)
        {
            Podar(agora);
            if (!_origens.TryGetValue(origem, out var janelaOrigem) || !Vigente(janelaOrigem.Inicio, agora))
            {
                janelaOrigem = new JanelaOrigem { Inicio = agora };
                _origens[origem] = janelaOrigem;
            }
            // Com a origem já no teto, e-mail novo não ganha entrada: é o que limita a memória por
            // origem a MaxEmailsDistintos, mesmo com requisições que já tinham passado do portão.
            var emailNovo = !janelaOrigem.Emails.Contains(emailNormalizado);
            if (emailNovo && janelaOrigem.Emails.Count >= _maxEmailsPorOrigem) return false;

            var chave = (origem, emailNormalizado);
            if (!_pares.TryGetValue(chave, out var par) || !Vigente(par.Inicio, agora))
            {
                par = new JanelaPar { Inicio = agora };
                _pares[chave] = par;
            }
            par.Falhas++;

            if (!emailNovo) return false;
            janelaOrigem.Emails.Add(emailNormalizado);
            return janelaOrigem.Emails.Count == _maxEmailsPorOrigem;
        }
    }

    private bool Vigente(DateTimeOffset inicio, DateTimeOffset agora) => agora - inicio < _duracao;

    private void Podar(DateTimeOffset agora)
    {
        if (_pares.Count >= GatePoda)
            foreach (var chave in _pares.Where(kv => !Vigente(kv.Value.Inicio, agora)).Select(kv => kv.Key).ToList())
                _pares.Remove(chave);
        if (_origens.Count >= GatePoda)
            foreach (var chave in _origens.Where(kv => !Vigente(kv.Value.Inicio, agora)).Select(kv => kv.Key).ToList())
                _origens.Remove(chave);
    }

    // Um cliente IPv6 costuma receber um /64 inteiro: chavear por endereço daria ao atacante 2^64
    // chaves para rodar. O IPv4 mapeado em IPv6 volta a ser IPv4 antes, senão todo cliente IPv4
    // cairia no mesmo /64 zerado.
    private static string Origem(string ip)
    {
        if (!IPAddress.TryParse(ip, out var endereco)) return ip;
        if (endereco.IsIPv4MappedToIPv6) endereco = endereco.MapToIPv4();
        if (endereco.AddressFamily != AddressFamily.InterNetworkV6) return endereco.ToString();
        var bytes = endereco.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return $"{new IPAddress(bytes)}/64";
    }

    private static string NormalizarEmail(string email) => email.Trim().ToLowerInvariant();
}

using Microsoft.Extensions.Configuration;

namespace ResQui.Application.Auth;

/// O lockout do Identity é read-modify-write no banco: uma rajada concorrente lê
/// AccessFailedCount = 0 em todas as requisições, passa o portão e avalia todas — da ordem de
/// mil palpites de TOTP por rajada, o que reduz 10^6 a horas. Só rejeitar antes do trabalho caro
/// fecha essa corrida, e é o que esta classe faz.
///
/// O estado é local ao processo: vale por instância. O deploy é de instância única; num cenário
/// multi-instância o throttle enfraquece proporcionalmente às réplicas (o lockout, persistido, não).
public class LoginThrottle : ILoginThrottle
{
    /// Acima deste número de entradas, cada escrita varre e remove as janelas expiradas. O gate
    /// evita pagar O(n) em toda tentativa; sem poda, um dicionário chaveado por e-mail escolhido
    /// pelo atacante é vetor de exaustão de memória.
    private const int GatePoda = 1024;

    private sealed class Janela
    {
        public DateTimeOffset Inicio;
        public int Contador;
    }

    private readonly Dictionary<string, Janela> _janelas = [];
    private readonly Lock _lock = new();
    private readonly int _maxTentativas;
    private readonly TimeSpan _duracao;
    private readonly TimeProvider _clock;

    public LoginThrottle(IConfiguration config) : this(
        config.GetValue("Auth:Throttle:MaxTentativas", 10),
        TimeSpan.FromSeconds(config.GetValue("Auth:Throttle:JanelaSegundos", 60)),
        TimeProvider.System)
    { }

    public LoginThrottle(int maxTentativas, TimeSpan janela, TimeProvider clock)
    {
        _maxTentativas = maxTentativas;
        _duracao = janela;
        _clock = clock;
    }

    /// Observabilidade para os testes de poda; não faz parte da interface.
    public int EntradasEmMemoria
    {
        get { lock (_lock) return _janelas.Count; }
    }

    public bool TentarConsumir(string email)
    {
        var chave = Normalizar(email);
        var agora = _clock.GetUtcNow();
        // Um lock global basta: login não é caminho quente (o PBKDF2 logo adiante custa ordens de
        // grandeza mais), e a alternativa sem lock não daria atomicidade entre ler e incrementar —
        // que é justamente o defeito do contador do banco.
        lock (_lock)
        {
            Podar(agora);
            if (!_janelas.TryGetValue(chave, out var janela) || agora - janela.Inicio >= _duracao)
            {
                _janelas[chave] = new Janela { Inicio = agora, Contador = 1 };
                return true;
            }
            janela.Contador++;
            return janela.Contador <= _maxTentativas;
        }
    }

    public void Zerar(string email)
    {
        lock (_lock) _janelas.Remove(Normalizar(email));
    }

    private void Podar(DateTimeOffset agora)
    {
        if (_janelas.Count < GatePoda) return;
        var expiradas = _janelas
            .Where(kv => agora - kv.Value.Inicio >= _duracao)
            .Select(kv => kv.Key)
            .ToList();
        foreach (var chave in expiradas) _janelas.Remove(chave);
    }

    private static string Normalizar(string email) => (email ?? "").Trim().ToLowerInvariant();
}

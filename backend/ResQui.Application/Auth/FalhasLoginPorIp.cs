using Microsoft.Extensions.Configuration;

namespace ResQui.Application.Auth;

public class FalhasLoginPorIp : IFalhasLoginPorIp
{
    private const int GatePoda = 1024;

    private sealed class Janela
    {
        public DateTimeOffset Inicio;
        public int Falhas;
    }

    private readonly Dictionary<string, Janela> _janelas = [];
    private readonly Lock _lock = new();
    private readonly int _maxFalhas;
    private readonly TimeSpan _duracao;
    private readonly TimeProvider _clock;

    public FalhasLoginPorIp(IConfiguration config) : this(
        config.GetValue("Auth:FalhasPorIp:MaxFalhas", 50),
        TimeSpan.FromMinutes(config.GetValue("Auth:FalhasPorIp:JanelaMinutos", 10)),
        TimeProvider.System)
    { }

    public FalhasLoginPorIp(int maxFalhas, TimeSpan janela, TimeProvider clock)
    {
        _maxFalhas = maxFalhas;
        _duracao = janela;
        _clock = clock;
    }

    public int EntradasEmMemoria
    {
        get { lock (_lock) return _janelas.Count; }
    }

    public bool EstaBloqueado(string ip)
    {
        var agora = _clock.GetUtcNow();
        lock (_lock)
            return _janelas.TryGetValue(ip, out var janela)
                && agora - janela.Inicio < _duracao
                && janela.Falhas >= _maxFalhas;
    }

    public bool RegistrarFalha(string ip)
    {
        var agora = _clock.GetUtcNow();
        lock (_lock)
        {
            Podar(agora);
            if (!_janelas.TryGetValue(ip, out var janela) || agora - janela.Inicio >= _duracao)
            {
                janela = new Janela { Inicio = agora };
                _janelas[ip] = janela;
            }
            janela.Falhas++;
            return janela.Falhas == _maxFalhas;
        }
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
}

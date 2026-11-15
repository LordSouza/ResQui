using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Auditoria;

public class AuditoriaService(IAuditoriaRepository repo) : IAuditoriaService
{
    public async Task RegistrarAsync(string who, string what, string where, string detail, RiscoAuditoria risk)
    {
        var entry = new AuditoriaEntry
        {
            Who = Truncar(who, MaxCurto),
            What = Truncar(what, MaxCurto),
            Where = Truncar(where, MaxCurto),
            Detail = Truncar(detail, MaxDetalhe),
            Risk = risk,
            Timestamp = DateTime.UtcNow
        };
        await repo.AddAsync(entry);
        await repo.SaveChangesAsync();
    }

    // A tabela só cresce (logins e falhas de login também entram) e não pode ser podada.
    public const int LimitePadrao = 1000;
    public const int LimiteMaximo = 5000;

    // Espelham as colunas varchar de AuditoriaConfiguration: texto maior fazia o INSERT falhar
    // depois de a operação auditada já ter sido gravada.
    private const int MaxCurto = 200;
    private const int MaxDetalhe = 1000;
    private const string Reticencias = "…";

    private static string Truncar(string? texto, int maximo)
    {
        if (string.IsNullOrEmpty(texto)) return "";
        if (texto.Length <= maximo) return texto;
        var corte = maximo - Reticencias.Length;
        // Não separa um par substituto (emoji etc.): metade dele não é UTF-8 válido.
        if (char.IsHighSurrogate(texto[corte - 1])) corte--;
        return texto[..corte] + Reticencias;
    }

    public async Task<IEnumerable<AuditoriaItemDto>> ListarAsync(AuditoriaFiltroDto filtro)
    {
        RiscoAuditoria? risco =
            !string.IsNullOrEmpty(filtro.Risk)
            && Enum.TryParse<RiscoAuditoria>(filtro.Risk, ignoreCase: true, out var r)
                ? r : null;

        var entries = await repo.BuscarAsync(
            filtro.From is { } de ? ComoUtc(de) : null,
            filtro.To is { } ate ? ComoUtc(ate.Date.AddDays(1)) : null,
            risco, filtro.Who, filtro.What, filtro.Where, filtro.Detail,
            Math.Clamp(filtro.Limite ?? LimitePadrao, 1, LimiteMaximo), filtro.Autores);

        return entries.Select(e => new AuditoriaItemDto(
            e.Id, e.Timestamp, e.Who, e.What, e.Where, e.Detail,
            e.Risk.ToString().ToLower()));
    }

    public async Task<VerificacaoCadeiaDto> VerificarCadeiaAsync(string quemVerifica)
    {
        long total = 0;
        long sequenciaEsperada = 1;
        var hashAnterior = CadeiaAuditoria.HashInicial;
        long? primeiraInvalida = null;
        AuditoriaEntry? ultimo = null;

        await foreach (var elo in repo.PercorrerCadeia())
        {
            total++;
            var valido = elo.Sequencia == sequenciaEsperada
                && elo.HashAnterior == hashAnterior
                && elo.Hash == CadeiaAuditoria.CalcularHash(elo);
            if (!valido && primeiraInvalida is null) primeiraInvalida = elo.Sequencia;
            sequenciaEsperada = elo.Sequencia + 1;
            hashAnterior = elo.Hash;
            ultimo = elo;
        }

        var resultado = new VerificacaoCadeiaDto(
            primeiraInvalida is null, total, ultimo?.Sequencia, ultimo?.Hash, primeiraInvalida);

        var detalhe = resultado.Integra
            ? $"Cadeia íntegra: {total} registros, última sequência {ultimo?.Sequencia.ToString() ?? "-"}"
            : $"Cadeia violada: primeira sequência inválida {primeiraInvalida}, {total} registros";
        await RegistrarAsync(quemVerifica, "auditoria.verificar", "Auditoria", detalhe,
            resultado.Integra ? RiscoAuditoria.Low : RiscoAuditoria.High);

        return resultado;
    }

    public async Task<AncoraAuditoriaDto?> AncoraAsync() =>
        await repo.UltimoEloAsync() is { } ultimo ? new AncoraAuditoriaDto(ultimo.Sequencia, ultimo.Hash) : null;

    private static DateTime ComoUtc(DateTime valor) =>
        valor.Kind == DateTimeKind.Utc ? valor : DateTime.SpecifyKind(valor, DateTimeKind.Utc);
}

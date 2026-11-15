using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using ResQui.Domain.Entities;

namespace ResQui.Application.Auditoria;

/// <summary>
/// Espelho em C# da função SQL auditoria_hash (migração AddCadeiaAuditoria); as duas precisam
/// produzir a mesma serialização, documentada em docs/auditoria-integridade.md.
/// </summary>
public static class CadeiaAuditoria
{
    public static readonly string HashInicial = new('0', 64);

    public static string FormatarTimestamp(DateTime timestampUtc) =>
        timestampUtc.ToString("yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'", CultureInfo.InvariantCulture);

    public static string Serializar(AuditoriaEntry e) => string.Join('|',
        e.Sequencia.ToString(CultureInfo.InvariantCulture),
        FormatarTimestamp(e.Timestamp),
        Escapar(e.Who),
        Escapar(e.What),
        Escapar(e.Where),
        Escapar(e.Detail),
        ((int)e.Risk).ToString(CultureInfo.InvariantCulture),
        e.HashAnterior);

    public static string CalcularHash(AuditoriaEntry e) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(Serializar(e))));

    // Sem escape, mover um "|" de um campo para o vizinho manteria o mesmo hash.
    private static string Escapar(string valor) => valor.Replace("\\", "\\\\").Replace("|", "\\|");
}

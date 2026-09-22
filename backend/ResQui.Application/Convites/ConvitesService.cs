using System.Security.Cryptography;
using System.Text;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Convites;

public record CriarConviteCmd(string Papel);
public record ConviteCriadoDto(int Id, string Token, string Papel, DateTime ExpiraEm);
public record ConviteDto(int Id, string Papel, string Status, DateTime CriadoEm, DateTime ExpiraEm, DateTime? UsadoEm, string? UsadoPor);
public record ConvitePublicoDto(string Papel);
public record AceitarConviteCmd(string Nome, string Email, string? Matricula, string Senha);

public interface IConvitesService
{
    Task<ConviteCriadoDto> CriarAsync(CriarConviteCmd cmd, string? requesterId, string requesterEmail, string requesterPapel);
    Task<IEnumerable<ConviteDto>> ListarAsync();
    Task<bool> RevogarAsync(int id, string requesterEmail, string requesterPapel);
    Task<ConvitePublicoDto?> ConsultarAsync(string token);
    Task AceitarAsync(string token, AceitarConviteCmd cmd);
}

public class ConvitesService(IConvitesRepository convites, IAuthRepository usuarios, IAuditoriaService auditoria) : IConvitesService
{
    public const int DiasValidade = 7;
    private static readonly string[] PapeisConvidaveis = ["Professor", "Aluno"];

    public async Task<ConviteCriadoDto> CriarAsync(CriarConviteCmd cmd, string? requesterId, string requesterEmail, string requesterPapel)
    {
        if (!PapeisConvidaveis.Contains(cmd.Papel))
            throw new ValidationException($"Papel inválido para convite: {cmd.Papel}.");
        if (cmd.Papel != "Aluno" && requesterPapel != "Admin")
            throw new ValidationException($"Convidar {cmd.Papel} é só o Admin; você pode convidar Aluno.");

        var token = GerarToken();
        var convite = new Convite
        {
            TokenHash = Hash(token),
            Papel = cmd.Papel,
            CriadoPorId = requesterId,
            ExpiraEm = DateTime.UtcNow.AddDays(DiasValidade),
        };
        await convites.AddAsync(convite);
        await convites.SaveChangesAsync();
        await auditoria.RegistrarAsync(requesterEmail, "convite.criar", "Usuários",
            $"Gerou convite #{convite.Id} para {cmd.Papel}, válido até {convite.ExpiraEm:dd/MM/yyyy}", RiscoAuditoria.Medium);
        return new ConviteCriadoDto(convite.Id, token, convite.Papel, convite.ExpiraEm);
    }

    public async Task<IEnumerable<ConviteDto>> ListarAsync()
    {
        var todos = (await convites.GetAllAsync()).ToList();
        var porId = new Dictionary<string, string>();
        foreach (var usadoPorId in todos.Select(c => c.UsadoPorId).OfType<string>().Distinct())
        {
            if (await usuarios.FindByIdIncluindoArquivadosAsync(usadoPorId) is { } usuario)
                porId[usadoPorId] = string.IsNullOrWhiteSpace(usuario.Nome) ? usuario.Email : usuario.Nome;
        }
        return todos.Select(c => new ConviteDto(
            c.Id, c.Papel, StatusDe(c), c.CriadoEm, c.ExpiraEm, c.UsadoEm,
            c.UsadoPorId is { } id && porId.TryGetValue(id, out var nome) ? nome : null));
    }

    public async Task<bool> RevogarAsync(int id, string requesterEmail, string requesterPapel)
    {
        if (await convites.GetByIdAsync(id) is not { } convite) return false;
        if (convite.Papel != "Aluno" && requesterPapel != "Admin")
            throw new ValidationException($"Revogar convite de {convite.Papel} é só o Admin.");
        if (StatusDe(convite) != "pendente")
            throw new ValidationException("Só convites pendentes podem ser revogados.");
        convite.RevogadoEm = DateTime.UtcNow;
        await convites.SaveChangesAsync();
        await auditoria.RegistrarAsync(requesterEmail, "convite.revogar", "Usuários",
            $"Revogou o convite #{id} para {convite.Papel}", RiscoAuditoria.Medium);
        return true;
    }

    public async Task<ConvitePublicoDto?> ConsultarAsync(string token)
    {
        var convite = await BuscarValidoAsync(token);
        return convite is null ? null : new ConvitePublicoDto(convite.Papel);
    }

    public async Task AceitarAsync(string token, AceitarConviteCmd cmd)
    {
        var convite = await BuscarValidoAsync(token)
            ?? throw new ValidationException("Convite inválido, expirado ou já utilizado.");
        if (string.IsNullOrWhiteSpace(cmd.Nome))
            throw new ValidationException("Nome é obrigatório.");
        if (string.IsNullOrWhiteSpace(cmd.Email) || !cmd.Email.Contains('@'))
            throw new ValidationException("E-mail inválido.");
        if (string.IsNullOrWhiteSpace(cmd.Senha))
            throw new ValidationException("Senha é obrigatória.");
        var email = cmd.Email.Trim();
        if (await usuarios.FindByEmailIncluindoArquivadosAsync(email) is { } existente)
            throw new ValidationException(existente.Arquivado
                ? "Este e-mail pertence a uma conta arquivada. Peça ao responsável para reativá-la."
                : "E-mail já em uso.");

        convite.UsadoEm = DateTime.UtcNow;
        await convites.SaveChangesAsync();

        string id;
        try
        {
            id = await usuarios.CreateAsync(email, cmd.Senha, cmd.Matricula?.Trim(), convite.Papel, cmd.Nome.Trim());
        }
        catch
        {
            try
            {
                convite.UsadoEm = null;
                await convites.SaveChangesAsync();
            }
            catch
            {
            }
            throw;
        }

        convite.UsadoPorId = id;
        await convites.SaveChangesAsync();
        await usuarios.AddToRoleAsync(id, convite.Papel);
        await auditoria.RegistrarAsync(email, "convite.aceito", "Usuários",
            $"Aceitou o convite #{convite.Id} e criou conta de {convite.Papel}", RiscoAuditoria.Medium);
    }

    private async Task<Convite?> BuscarValidoAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var convite = await convites.GetByTokenHashAsync(Hash(token));
        return convite is not null && StatusDe(convite) == "pendente" ? convite : null;
    }

    private static string StatusDe(Convite c) =>
        c.RevogadoEm is not null ? "revogado"
        : c.UsadoEm is not null ? "usado"
        : c.ExpiraEm <= DateTime.UtcNow ? "expirado"
        : "pendente";

    private static string GerarToken() =>
        Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}

using System.Security.Cryptography;
using System.Text;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Convites;

public record CriarConviteCmd(string Papel, IList<string>? LaboratorioIds = null);
public record ConviteCriadoDto(int Id, string Token, string Papel, DateTime ExpiraEm);
public record ConviteDto(int Id, string Papel, string Status, DateTime CriadoEm, DateTime ExpiraEm, DateTime? UsadoEm, string? UsadoPor);
public record ConvitePublicoDto(string Papel);
public record AceitarConviteCmd(string Nome, string Email, string? Matricula, string Senha);

public interface IConvitesService
{
    Task<ConviteCriadoDto> CriarAsync(CriarConviteCmd cmd, Solicitante solicitante);
    Task<IEnumerable<ConviteDto>> ListarAsync(Solicitante solicitante);
    Task<bool> RevogarAsync(int id, Solicitante solicitante);
    Task<ConvitePublicoDto?> ConsultarAsync(string token);
    Task AceitarAsync(string token, AceitarConviteCmd cmd);
}

public class ConvitesService(
    IConvitesRepository convites,
    IAuthRepository usuarios,
    IAuditoriaService auditoria,
    IUsuarioLaboratoriosRepository usuarioLabs,
    ILaboratoriosRepository labRepo,
    ITransacoes transacoes) : IConvitesService
{
    public const int DiasValidade = 7;
    private static readonly string[] PapeisConvidaveis = ["Professor", "Aluno"];

    public async Task<ConviteCriadoDto> CriarAsync(CriarConviteCmd cmd, Solicitante solicitante)
    {
        if (!PapeisConvidaveis.Contains(cmd.Papel))
            throw new ValidationException($"Papel inválido para convite: {cmd.Papel}.");
        if (cmd.Papel != "Aluno" && solicitante.Papel != "Admin")
            throw new ValidationException($"Convidar {cmd.Papel} é só o Admin; você pode convidar Aluno.");

        var laboratorios = (cmd.LaboratorioIds ?? []).Distinct().ToList();
        var existentes = (await labRepo.GetAllAsync()).Select(l => l.Id).ToHashSet();
        if (laboratorios.FirstOrDefault(labId => !existentes.Contains(labId)) is { } inexistente)
            throw new ValidationException($"Laboratório {inexistente} não encontrado.");
        if (solicitante.Papel != "Admin"
            && laboratorios.FirstOrDefault(labId => !solicitante.Responde(labId)) is { } alheio)
            throw new ValidationException($"Você não responde pelo laboratório {alheio}.");
        if (solicitante.Papel != "Admin" && laboratorios.Count == 0)
            throw new ValidationException("Escolha pelo menos um laboratório: conta sem laboratório só o Admin enxerga.");

        var token = GerarToken();
        var convite = new Convite
        {
            TokenHash = Hash(token),
            Papel = cmd.Papel,
            CriadoPorId = solicitante.Id is { Length: > 0 } criador ? criador : null,
            ExpiraEm = DateTime.UtcNow.AddDays(DiasValidade),
        };
        await transacoes.ExecutarAsync(async () =>
        {
            await convites.AddAsync(convite);
            await convites.SaveChangesAsync();
            await usuarioLabs.DefinirDoConviteAsync(convite.Id, laboratorios);
            await auditoria.RegistrarAsync(solicitante.Email, "convite.criar", "Usuários",
                $"Gerou convite #{convite.Id} para {cmd.Papel}, válido até {convite.ExpiraEm:dd/MM/yyyy}", RiscoAuditoria.Medium);
        });
        return new ConviteCriadoDto(convite.Id, token, convite.Papel, convite.ExpiraEm);
    }

    public async Task<IEnumerable<ConviteDto>> ListarAsync(Solicitante solicitante)
    {
        var todos = (await convites.GetAllAsync())
            .Where(c => solicitante.VeTudo || c.CriadoPorId == solicitante.Id)
            .ToList();
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

    public async Task<bool> RevogarAsync(int id, Solicitante solicitante)
    {
        if (await convites.GetByIdAsync(id) is not { } convite) return false;
        if (!solicitante.VeTudo && convite.CriadoPorId != solicitante.Id)
            throw new AcessoNegadoException("Você só revoga os convites que gerou.");
        if (StatusDe(convite) != "pendente")
            throw new ValidationException("Só convites pendentes podem ser revogados.");
        convite.RevogadoEm = DateTime.UtcNow;
        await transacoes.ExecutarAsync(async () =>
        {
            await convites.SaveChangesAsync();
            await auditoria.RegistrarAsync(solicitante.Email, "convite.revogar", "Usuários",
                $"Revogou o convite #{id} para {convite.Papel}", RiscoAuditoria.Medium);
        });
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

        await transacoes.ExecutarAsync(async () =>
        {
            // Marcar o uso primeiro faz o xmin do convite decidir a corrida entre dois aceites
            // antes de qualquer conta ser criada; se algo falhar depois, o rollback o libera.
            convite.UsadoEm = DateTime.UtcNow;
            await convites.SaveChangesAsync();

            var id = await usuarios.CreateAsync(email, cmd.Senha, cmd.Matricula?.Trim(), convite.Papel, cmd.Nome.Trim());
            convite.UsadoPorId = id;
            await convites.SaveChangesAsync();
            await usuarios.AddToRoleAsync(id, convite.Papel);
            await usuarioLabs.DefinirAsync(id, await usuarioLabs.DoConviteAsync(convite.Id));
            await auditoria.RegistrarAsync(email, "convite.aceito", "Usuários",
                $"Aceitou o convite #{convite.Id} e criou conta de {convite.Papel}", RiscoAuditoria.Medium);
        });
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

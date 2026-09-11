using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Usuarios;

public record UsuarioDto(string Id, string Email, string? Nome, string? Matricula, string Papel, IList<string> Roles, bool Arquivado, bool TwoFactorEnabled);
public record UsuarioNomeDto(string Id, string Nome, string Email);
public record AlterarPapelCmd(string NovoPapel);

public interface IUsuariosService
{
    Task<IEnumerable<UsuarioDto>> ListarAsync();
    Task<IEnumerable<UsuarioNomeDto>> ListarNomesAsync();
    Task AlterarPapelAsync(string id, AlterarPapelCmd cmd, string usuarioEmail);
    Task ArquivarAsync(string id, string usuarioEmail, string requesterPapel);
    Task ExcluirAsync(string id, string requesterId, string usuarioEmail);
}

public class UsuariosService(IAuthRepository repo, IAuditoriaService auditoria) : IUsuariosService
{
    public async Task<IEnumerable<UsuarioDto>> ListarAsync() =>
        (await repo.GetAllAsync())
            .Select(u => new UsuarioDto(u.Id, u.Email, u.Nome, u.Matricula, u.Papel, u.Roles, u.Arquivado, u.TwoFactorEnabled));

    public async Task<IEnumerable<UsuarioNomeDto>> ListarNomesAsync() =>
        (await repo.GetAllAsync())
            .Where(u => !u.Arquivado)
            .Select(u => new UsuarioNomeDto(u.Id, string.IsNullOrWhiteSpace(u.Nome) ? u.Email : u.Nome, u.Email))
            .OrderBy(u => u.Nome, StringComparer.CurrentCultureIgnoreCase);

    public async Task AlterarPapelAsync(string id, AlterarPapelCmd cmd, string usuarioEmail)
    {
        if (await repo.FindByIdAsync(id) is null) return;
        await repo.UpdateRoleAsync(id, cmd.NovoPapel);
        await auditoria.RegistrarAsync(usuarioEmail, "user.papel", "Usuários",
            $"Alterou papel do usuário {id} para {cmd.NovoPapel}", RiscoAuditoria.High);
    }

    public async Task ArquivarAsync(string id, string usuarioEmail, string requesterPapel)
    {
        if (await repo.FindByIdAsync(id) is not { } alvo) return;
        if (alvo.Papel != "Aluno" && requesterPapel != "Admin")
            throw new ValidationException($"Arquivar conta de {alvo.Papel} é só o Admin; você pode arquivar Aluno.");
        await repo.SoftDeleteAsync(id);
        await auditoria.RegistrarAsync(usuarioEmail, "user.arquivar", "Usuários",
            $"Arquivou usuário {id}", RiscoAuditoria.High);
    }

    public async Task ExcluirAsync(string id, string requesterId, string usuarioEmail)
    {
        if (id == requesterId)
            throw new ValidationException("Você não pode excluir a própria conta.");
        if (!await repo.HardDeleteAsync(id)) return;
        await auditoria.RegistrarAsync(usuarioEmail, "user.excluir", "Usuários",
            $"Excluiu definitivamente o usuário {id}", RiscoAuditoria.High);
    }
}

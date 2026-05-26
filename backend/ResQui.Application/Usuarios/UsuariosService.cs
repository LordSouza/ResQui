using ResQui.Application.Auditoria;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Usuarios;

public record UsuarioDto(string Id, string Email, string? Nome, string? Matricula, string Papel, IList<string> Roles, bool Arquivado);
public record AlterarPapelCmd(string NovoPapel);

public interface IUsuariosService
{
    Task<IEnumerable<UsuarioDto>> ListarAsync();
    Task AlterarPapelAsync(string id, AlterarPapelCmd cmd, string usuarioEmail);
    Task ArquivarAsync(string id, string usuarioEmail);
}

public class UsuariosService(IAuthRepository repo, IAuditoriaService auditoria) : IUsuariosService
{
    public async Task<IEnumerable<UsuarioDto>> ListarAsync() =>
        (await repo.GetAllAsync())
            .Select(u => new UsuarioDto(u.Id, u.Email, u.Nome, u.Matricula, u.Papel, u.Roles, u.Arquivado));

    public async Task AlterarPapelAsync(string id, AlterarPapelCmd cmd, string usuarioEmail)
    {
        await repo.UpdateRoleAsync(id, cmd.NovoPapel);
        await auditoria.RegistrarAsync(usuarioEmail, "user.papel", "Usuários",
            $"Alterou papel do usuário {id} para {cmd.NovoPapel}", RiscoAuditoria.High);
    }

    public async Task ArquivarAsync(string id, string usuarioEmail)
    {
        await repo.SoftDeleteAsync(id);
        await auditoria.RegistrarAsync(usuarioEmail, "user.arquivar", "Usuários",
            $"Arquivou usuário {id}", RiscoAuditoria.High);
    }
}

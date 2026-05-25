using ResQui.Domain.Interfaces;

namespace ResQui.Application.Usuarios;

public record UsuarioDto(string Id, string Email, string? Nome, string? Matricula, string Papel, IList<string> Roles, bool Arquivado);
public record AlterarPapelCmd(string NovoPapel);

public interface IUsuariosService
{
    Task<IEnumerable<UsuarioDto>> ListarAsync();
    Task AlterarPapelAsync(string id, AlterarPapelCmd cmd);
    Task ArquivarAsync(string id);
}

public class UsuariosService(IAuthRepository repo) : IUsuariosService
{
    public async Task<IEnumerable<UsuarioDto>> ListarAsync() =>
        (await repo.GetAllAsync())
            .Select(u => new UsuarioDto(u.Id, u.Email, u.Nome, u.Matricula, u.Papel, u.Roles, u.Arquivado));

    public async Task AlterarPapelAsync(string id, AlterarPapelCmd cmd) =>
        await repo.UpdateRoleAsync(id, cmd.NovoPapel);

    public async Task ArquivarAsync(string id) =>
        await repo.SoftDeleteAsync(id);
}

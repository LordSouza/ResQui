using ResQui.Domain.Interfaces;

namespace ResQui.Application.Usuarios;

public class UsuariosService(IAuthRepository repo) : IUsuariosService
{
    public async Task<IEnumerable<UsuarioDto>> ListarAsync() =>
        (await repo.GetAllAsync())
            .Select(u => new UsuarioDto(u.Id, u.Email, u.Matricula, u.Papel, u.Roles));

    public async Task AlterarPapelAsync(string id, AlterarPapelCmd cmd) =>
        await repo.UpdateRoleAsync(id, cmd.NovoPapel);

    public async Task ArquivarAsync(string id) =>
        await repo.SoftDeleteAsync(id);
}

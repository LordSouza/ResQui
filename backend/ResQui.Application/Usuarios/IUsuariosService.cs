namespace ResQui.Application.Usuarios;

public interface IUsuariosService
{
    Task<IEnumerable<UsuarioDto>> ListarAsync();
    Task AlterarPapelAsync(string id, AlterarPapelCmd cmd);
    Task ArquivarAsync(string id);
}

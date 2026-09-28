using ResQui.Domain.Interfaces;

namespace ResQui.Application.Common;

public interface IVisibilidadeUsuarios
{
    Task<IReadOnlyCollection<string>?> EmailsQueEnxergaAsync(Solicitante solicitante);
    Task<bool> EnxergaAsync(Solicitante solicitante, UsuarioInfo usuario);
    Task<bool> EnxergaAutorAsync(Solicitante solicitante, string email);
}

public class VisibilidadeUsuarios(IAuthRepository usuarios, IUsuarioLaboratoriosRepository usuarioLabs) : IVisibilidadeUsuarios
{
    public async Task<IReadOnlyCollection<string>?> EmailsQueEnxergaAsync(Solicitante solicitante)
    {
        if (solicitante.VeTudo) return null;
        var porUsuario = await usuarioLabs.DeTodosAsync();
        return (await usuarios.GetAllAsync())
            .Where(u => solicitante.Enxerga(u.Id, u.Papel, porUsuario.TryGetValue(u.Id, out var labs) ? labs : []))
            .Select(u => u.Email.ToLowerInvariant())
            .ToList();
    }

    public async Task<bool> EnxergaAsync(Solicitante solicitante, UsuarioInfo usuario) =>
        solicitante.VeTudo
        || solicitante.Enxerga(usuario.Id, usuario.Papel, await usuarioLabs.DoUsuarioAsync(usuario.Id));

    public async Task<bool> EnxergaAutorAsync(Solicitante solicitante, string email) =>
        solicitante.VeTudo
        || (await usuarios.FindByEmailIncluindoArquivadosAsync(email) is { } autor
            && await EnxergaAsync(solicitante, autor));
}

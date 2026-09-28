using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Jobs.Checkers;

public sealed class DestinatariosPorLaboratorio
{
    private readonly List<UsuarioInfo> _professores;
    private readonly List<UsuarioInfo> _admins;
    private readonly IReadOnlyDictionary<string, IReadOnlyList<string>> _laboratoriosPorUsuario;

    private DestinatariosPorLaboratorio(
        List<UsuarioInfo> professores, List<UsuarioInfo> admins,
        IReadOnlyDictionary<string, IReadOnlyList<string>> laboratoriosPorUsuario)
    {
        _professores = professores;
        _admins = admins;
        _laboratoriosPorUsuario = laboratoriosPorUsuario;
    }

    public static async Task<DestinatariosPorLaboratorio> CarregarAsync(
        IAuthRepository auth, IUsuarioLaboratoriosRepository usuarioLabs)
    {
        var ativos = (await auth.GetAllAsync()).Where(u => !u.Arquivado).ToList();
        return new DestinatariosPorLaboratorio(
            ativos.Where(u => u.Papel == "Professor").ToList(),
            ativos.Where(u => u.Papel == "Admin").ToList(),
            await usuarioLabs.DeTodosAsync());
    }

    public IReadOnlyList<UsuarioInfo> Do(string? laboratorioId)
    {
        if (laboratorioId is null) return _admins;
        var responsaveis = _professores
            .Where(u => _laboratoriosPorUsuario.TryGetValue(u.Id, out var labs) && labs.Contains(laboratorioId))
            .ToList();
        return responsaveis.Count > 0 ? responsaveis : _admins;
    }
}

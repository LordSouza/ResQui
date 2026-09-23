namespace ResQui.Domain.Interfaces;

public interface IUsuarioLaboratoriosRepository
{
    Task<IReadOnlyList<string>> DoUsuarioAsync(string usuarioId);
    Task<IReadOnlyDictionary<string, IReadOnlyList<string>>> DeTodosAsync();
    Task<IReadOnlyList<string>> UsuariosDoLaboratorioAsync(string laboratorioId);
    Task DefinirAsync(string usuarioId, IEnumerable<string> laboratorioIds);
    Task AdicionarAsync(string usuarioId, string laboratorioId);
    Task<IReadOnlyList<string>> DoConviteAsync(int conviteId);
    Task DefinirDoConviteAsync(int conviteId, IEnumerable<string> laboratorioIds);
}

namespace ResQui.Domain.Interfaces;

public record UsuarioInfo(
    string Id,
    string Email,
    string? Nome,
    string? Matricula,
    string Papel,
    IList<string> Roles,
    bool Arquivado,
    bool TwoFactorEnabled = false
);

public interface IAuthRepository
{
    Task<UsuarioInfo?> FindByEmailAsync(string email);
    Task<UsuarioInfo?> FindByIdAsync(string id);
    Task<bool> CheckPasswordAsync(string userId, string password);
    Task<string> CreateAsync(string email, string password, string? matricula, string papel, string? nome);
    Task AddToRoleAsync(string userId, string role);
    Task<IList<string>> GetRolesAsync(string userId);
    Task<IEnumerable<UsuarioInfo>> GetAllAsync();
    Task UpdateRoleAsync(string userId, string newRole);
    Task SoftDeleteAsync(string userId);
    Task<bool> HardDeleteAsync(string userId);
    Task UpdateProfileAsync(string userId, string nome, string email);
    Task<string> GetNotificacaoPrefsJsonAsync(string userId);
    Task SaveNotificacaoPrefsJsonAsync(string userId, string json);
    Task<bool> ChangePasswordAsync(string userId, string senhaAtual, string novaSenha);
    Task<string?> GetOrCreateAuthenticatorKeyAsync(string userId);
    Task<bool> VerifyTwoFactorCodeAsync(string userId, string codigo);
    Task SetTwoFactorEnabledAsync(string userId, bool enabled);
    Task<IEnumerable<string>> GerarCodigosRecuperacaoAsync(string userId, int quantidade);
    Task<bool> ResgatarCodigoRecuperacaoAsync(string userId, string codigo);
    Task<int> ContarCodigosRecuperacaoAsync(string userId);
}

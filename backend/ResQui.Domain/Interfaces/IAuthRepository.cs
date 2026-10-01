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
    // FindByIdAsync devolve null para arquivado; o reset de 2FA precisa alcançar a conta
    // arquivada (um 404 ali leria como "usuário não existe"). Mesma escolha de HardDeleteAsync.
    Task<UsuarioInfo?> FindByIdIncluindoArquivadosAsync(string id);
    Task<UsuarioInfo?> FindByEmailIncluindoArquivadosAsync(string email);
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
    // Sempre gera uma chave nova: o setup só é alcançável com o 2FA desligado, então
    // rotacionar aqui é o que faz o ciclo desativar→reativar entregar um segredo novo
    // (cenário do aparelho roubado).
    Task<string?> ResetAuthenticatorKeyAsync(string userId);
    Task<bool> VerifyTwoFactorCodeAsync(string userId, string codigo);
    Task SetTwoFactorEnabledAsync(string userId, bool enabled);
    Task<IEnumerable<string>> GerarCodigosRecuperacaoAsync(string userId, int quantidade);
    Task<bool> ResgatarCodigoRecuperacaoAsync(string userId, string codigo);
    Task<int> ContarCodigosRecuperacaoAsync(string userId);
    // Lockout do Identity. AddIdentityCore não registra SignInManager, então o login não passa por
    // CheckPasswordSignInAsync: estes três encostam direto nos contadores do UserManager, que é o
    // que o SignInManager usaria por baixo.
    Task<bool> EstaBloqueadoAsync(string userId);
    Task RegistrarFalhaLoginAsync(string userId);
    Task ZerarFalhasLoginAsync(string userId);
    Task RedefinirSenhaAsync(string userId, string novaSenha);
    Task DesbloquearLoginAsync(string userId);
}

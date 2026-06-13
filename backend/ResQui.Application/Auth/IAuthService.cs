namespace ResQui.Application.Auth;

public interface IAuthService
{
    Task<LoginResultDto?> LoginAsync(LoginCmd cmd, string? userAgent = null);
    Task AlterarSenhaAsync(string userId, AlterarSenhaCmd cmd, string usuarioEmail);
    Task<Setup2faDto?> Setup2faAsync(string userId);
    Task Ativar2faAsync(string userId, string codigo, string usuarioEmail);
    Task Desativar2faAsync(string userId, string codigo, string usuarioEmail);
    Task<IEnumerable<SessaoDto>> ListarSessoesAsync(string userId, string? jtiAtual);
    Task<bool> RevogarSessaoAsync(string userId, string jti, string usuarioEmail);
    Task<int> RevogarOutrasSessoesAsync(string userId, string? jtiAtual, string usuarioEmail);
    Task<UserProfileDto> RegisterAsync(RegisterCmd cmd, string requesterEmail);
    Task<UserProfileDto?> GetMeAsync(string userId);
}

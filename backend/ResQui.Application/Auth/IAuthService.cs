namespace ResQui.Application.Auth;

public interface IAuthService
{
    Task<TokenDto?> LoginAsync(LoginCmd cmd);
    Task<UserProfileDto> RegisterAsync(RegisterCmd cmd, string requesterEmail);
    Task<UserProfileDto?> GetMeAsync(string userId);
}

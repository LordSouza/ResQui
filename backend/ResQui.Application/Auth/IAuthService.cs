namespace ResQui.Application.Auth;

public interface IAuthService
{
    Task<TokenDto?> LoginAsync(LoginCmd cmd);
    Task<UserProfileDto> RegisterAsync(RegisterCmd cmd);
    Task<UserProfileDto?> GetMeAsync(string userId);
}

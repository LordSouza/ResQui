using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Auth;

public class AuthService(IAuthRepository repo, JwtOptions jwtOptions) : IAuthService
{
    public async Task<TokenDto?> LoginAsync(LoginCmd cmd)
    {
        var user = await repo.FindByEmailAsync(cmd.Email);
        if (user is null) return null;

        var valid = await repo.CheckPasswordAsync(user.Id, cmd.Senha);
        if (!valid) return null;

        var expireAt = DateTime.UtcNow.AddHours(jwtOptions.ExpirationHours);
        var token = GenerateToken(user, expireAt);
        var profile = new UserProfileDto(user.Id, user.Email, user.Matricula, user.Papel, user.Roles);
        return new TokenDto(token, expireAt, profile);
    }

    public async Task<UserProfileDto> RegisterAsync(RegisterCmd cmd)
    {
        var id = await repo.CreateAsync(cmd.Email, cmd.Senha, cmd.Matricula, cmd.Papel);
        await repo.AddToRoleAsync(id, cmd.Papel);
        var roles = await repo.GetRolesAsync(id);
        return new UserProfileDto(id, cmd.Email, cmd.Matricula, cmd.Papel, roles);
    }

    public async Task<UserProfileDto?> GetMeAsync(string userId)
    {
        var user = await repo.FindByIdAsync(userId);
        if (user is null) return null;
        return new UserProfileDto(user.Id, user.Email, user.Matricula, user.Papel, user.Roles);
    }

    private string GenerateToken(UsuarioInfo user, DateTime expireAt)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("papel", user.Papel),
        };
        foreach (var role in user.Roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: jwtOptions.Issuer,
            audience: jwtOptions.Audience,
            claims: claims,
            expires: expireAt,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

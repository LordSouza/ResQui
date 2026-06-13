using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Auth;

public class AuthService(IAuthRepository repo, JwtOptions jwtOptions, IAuditoriaService auditoria) : IAuthService
{
    public async Task<TokenDto?> LoginAsync(LoginCmd cmd)
    {
        var user = await repo.FindByEmailAsync(cmd.Email);
        if (user is null) return null;

        var valid = await repo.CheckPasswordAsync(user.Id, cmd.Senha);
        if (!valid) return null;

        var expireAt = DateTime.UtcNow.AddHours(jwtOptions.ExpirationHours);
        var token = GenerateToken(user, expireAt);
        var profile = new UserProfileDto(user.Id, user.Email, user.Nome, user.Matricula, user.Papel, user.Roles);
        await auditoria.RegistrarAsync(cmd.Email, "user.login", "Auth",
            $"Login de {cmd.Email}", RiscoAuditoria.Low);
        return new TokenDto(token, expireAt, profile);
    }

    public async Task<UserProfileDto> RegisterAsync(RegisterCmd cmd, string requesterEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.Email) || !cmd.Email.Contains('@'))
            throw new ValidationException("E-mail inválido.");
        if (string.IsNullOrWhiteSpace(cmd.Senha))
            throw new ValidationException("Senha é obrigatória.");
        string[] papeisValidos = ["Admin", "Gestor", "Tecnico", "Visualizador"];
        if (!papeisValidos.Contains(cmd.Papel))
            throw new ValidationException($"Papel inválido: {cmd.Papel}.");

        var id = await repo.CreateAsync(cmd.Email, cmd.Senha, cmd.Matricula, cmd.Papel, cmd.Nome);
        await repo.AddToRoleAsync(id, cmd.Papel);
        var roles = await repo.GetRolesAsync(id);
        await auditoria.RegistrarAsync(requesterEmail, "user.criar", "Usuários",
            $"Criou usuário {cmd.Email} com papel {cmd.Papel}", RiscoAuditoria.Medium);
        return new UserProfileDto(id, cmd.Email, cmd.Nome, cmd.Matricula, cmd.Papel, roles);
    }

    public async Task<UserProfileDto?> GetMeAsync(string userId)
    {
        var user = await repo.FindByIdAsync(userId);
        if (user is null) return null;
        return new UserProfileDto(user.Id, user.Email, user.Nome, user.Matricula, user.Papel, user.Roles);
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

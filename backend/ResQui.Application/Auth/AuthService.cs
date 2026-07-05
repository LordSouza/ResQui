using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Auth;

public class AuthService(IAuthRepository repo, JwtOptions jwtOptions, IAuditoriaService auditoria, ISessoesRepository sessoes) : IAuthService
{
    public async Task<LoginResultDto?> LoginAsync(LoginCmd cmd, string? userAgent = null)
    {
        var user = await repo.FindByEmailAsync(cmd.Email);
        if (user is null) return null;

        var valid = await repo.CheckPasswordAsync(user.Id, cmd.Senha);
        if (!valid) return null;

        if (user.TwoFactorEnabled)
        {
            if (string.IsNullOrWhiteSpace(cmd.Codigo2fa))
                return new LoginResultDto(true, null);
            if (!await repo.VerifyTwoFactorCodeAsync(user.Id, cmd.Codigo2fa))
            {
                await auditoria.RegistrarAsync(cmd.Email, "user.login-2fa-falha", "Auth",
                    $"Código 2FA inválido para {cmd.Email}", RiscoAuditoria.Medium);
                return null;
            }
        }

        var expireAt = DateTime.UtcNow.AddHours(jwtOptions.ExpirationHours);
        var jti = Guid.NewGuid().ToString("N");
        var token = GenerateToken(user, expireAt, jti);
        await sessoes.AddAsync(new Domain.Entities.SessaoToken
        {
            UsuarioId = user.Id,
            Jti = jti,
            ExpiraEm = expireAt,
            UserAgent = userAgent is { Length: > 200 } ? userAgent[..200] : userAgent,
        });
        await sessoes.SaveChangesAsync();
        var profile = new UserProfileDto(user.Id, user.Email, user.Nome, user.Matricula, user.Papel, user.Roles, user.TwoFactorEnabled);
        await auditoria.RegistrarAsync(cmd.Email, "user.login", "Auth",
            $"Login de {cmd.Email}", RiscoAuditoria.Low);
        return new LoginResultDto(false, new TokenDto(token, expireAt, profile));
    }

    public async Task AlterarSenhaAsync(string userId, AlterarSenhaCmd cmd, string usuarioEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.NovaSenha))
            throw new ValidationException("Nova senha é obrigatória.");
        var ok = await repo.ChangePasswordAsync(userId, cmd.SenhaAtual, cmd.NovaSenha);
        if (!ok)
            throw new ValidationException("Senha atual incorreta ou nova senha não atende aos requisitos.");
        await auditoria.RegistrarAsync(usuarioEmail, "user.alterar-senha", "Auth",
            $"Alterou a própria senha", RiscoAuditoria.Medium);
    }

    public async Task<Setup2faDto?> Setup2faAsync(string userId)
    {
        var user = await repo.FindByIdAsync(userId);
        if (user is null) return null;
        var key = await repo.GetOrCreateAuthenticatorKeyAsync(userId);
        if (key is null) return null;
        var uri = $"otpauth://totp/ResQui:{Uri.EscapeDataString(user.Email)}?secret={key}&issuer=ResQui";
        return new Setup2faDto(key, uri);
    }

    public async Task Ativar2faAsync(string userId, string codigo, string usuarioEmail)
    {
        if (!await repo.VerifyTwoFactorCodeAsync(userId, codigo))
            throw new ValidationException("Código inválido — confira o aplicativo autenticador.");
        await repo.SetTwoFactorEnabledAsync(userId, true);
        await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-ativado", "Auth",
            "Ativou autenticação em dois fatores", RiscoAuditoria.Medium);
    }

    public async Task Desativar2faAsync(string userId, string codigo, string usuarioEmail)
    {
        if (!await repo.VerifyTwoFactorCodeAsync(userId, codigo))
            throw new ValidationException("Código inválido — confira o aplicativo autenticador.");
        await repo.SetTwoFactorEnabledAsync(userId, false);
        await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-desativado", "Auth",
            "Desativou autenticação em dois fatores", RiscoAuditoria.High);
    }

    public async Task<IEnumerable<SessaoDto>> ListarSessoesAsync(string userId, string? jtiAtual)
    {
        var ativas = await sessoes.GetAtivasByUsuarioAsync(userId);
        return ativas.Select(s => new SessaoDto(s.Jti, s.CriadaEm, s.ExpiraEm, s.UserAgent, s.Jti == jtiAtual));
    }

    public async Task<bool> RevogarSessaoAsync(string userId, string jti, string usuarioEmail)
    {
        var s = await sessoes.GetByJtiAsync(jti);
        if (s is null || s.UsuarioId != userId) return false;
        s.Revogada = true;
        await sessoes.UpdateAsync(s);
        await sessoes.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "user.sessao-revogada", "Auth",
            $"Revogou a sessão {jti[..8]}…", RiscoAuditoria.Medium);
        return true;
    }

    public async Task<int> RevogarOutrasSessoesAsync(string userId, string? jtiAtual, string usuarioEmail)
    {
        var ativas = (await sessoes.GetAtivasByUsuarioAsync(userId)).Where(s => s.Jti != jtiAtual).ToList();
        foreach (var s in ativas)
        {
            s.Revogada = true;
            await sessoes.UpdateAsync(s);
        }
        if (ativas.Count > 0) await sessoes.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "user.sessoes-revogadas", "Auth",
            $"Encerrou {ativas.Count} outra(s) sessão(ões)", RiscoAuditoria.Medium);
        return ativas.Count;
    }

    public async Task<UserProfileDto> RegisterAsync(RegisterCmd cmd, string requesterEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.Email) || !cmd.Email.Contains('@'))
            throw new ValidationException("E-mail inválido.");
        if (string.IsNullOrWhiteSpace(cmd.Senha))
            throw new ValidationException("Senha é obrigatória.");
        string[] papeisValidos = ["Admin", "Gestor", "Professor", "Tecnico", "Pesquisador", "Visualizador"];
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
        return new UserProfileDto(user.Id, user.Email, user.Nome, user.Matricula, user.Papel, user.Roles, user.TwoFactorEnabled);
    }

    private string GenerateToken(UsuarioInfo user, DateTime expireAt, string jti)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, jti),
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

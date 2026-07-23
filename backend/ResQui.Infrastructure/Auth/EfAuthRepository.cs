using System.Linq;
using Microsoft.AspNetCore.Identity;
using ResQui.Application.Common;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Auth;

public class EfAuthRepository(UserManager<Usuario> userManager) : IAuthRepository
{
    public async Task<UsuarioInfo?> FindByEmailAsync(string email)
    {
        var u = await userManager.FindByEmailAsync(email);
        if (u is null || u.Arquivado) return null;
        var roles = await userManager.GetRolesAsync(u);
        return new UsuarioInfo(u.Id, u.Email!, u.Nome, u.Matricula, u.Papel, roles, u.Arquivado, u.TwoFactorEnabled);
    }

    public async Task<UsuarioInfo?> FindByIdAsync(string id)
    {
        var u = await userManager.FindByIdAsync(id);
        if (u is null || u.Arquivado) return null;
        var roles = await userManager.GetRolesAsync(u);
        return new UsuarioInfo(u.Id, u.Email!, u.Nome, u.Matricula, u.Papel, roles, u.Arquivado, u.TwoFactorEnabled);
    }

    public async Task<bool> CheckPasswordAsync(string userId, string password)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return false;
        return await userManager.CheckPasswordAsync(u, password);
    }

    public async Task<string> CreateAsync(string email, string password, string? matricula, string papel, string? nome)
    {
        var u = new Usuario { UserName = email, Email = email, Matricula = matricula, Papel = papel, Nome = nome };
        var result = await userManager.CreateAsync(u, password);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        return u.Id;
    }

    public async Task AddToRoleAsync(string userId, string role)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is not null) await userManager.AddToRoleAsync(u, role);
    }

    public async Task<IList<string>> GetRolesAsync(string userId)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return [];
        return await userManager.GetRolesAsync(u);
    }

    public async Task<IEnumerable<UsuarioInfo>> GetAllAsync()
    {
        var users = userManager.Users.ToList();
        var result = new List<UsuarioInfo>();
        foreach (var u in users)
        {
            var roles = await userManager.GetRolesAsync(u);
            result.Add(new UsuarioInfo(u.Id, u.Email!, u.Nome, u.Matricula, u.Papel, roles, u.Arquivado, u.TwoFactorEnabled));
        }
        return result;
    }

    public async Task UpdateRoleAsync(string userId, string newRole)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return;
        var currentRoles = await userManager.GetRolesAsync(u);
        await userManager.RemoveFromRolesAsync(u, currentRoles);
        await userManager.AddToRoleAsync(u, newRole);
        u.Papel = newRole;
        await userManager.UpdateAsync(u);
    }

    public async Task SoftDeleteAsync(string userId)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is not null) { u.Arquivado = true; await userManager.UpdateAsync(u); }
    }

    public async Task UpdateProfileAsync(string userId, string nome, string email)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return;
        u.Nome = nome;
        if (!string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            u.Email = email;
            u.UserName = email;
        }
        var result = await userManager.UpdateAsync(u);
        if (!result.Succeeded)
            throw new ValidationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task<string> GetNotificacaoPrefsJsonAsync(string userId)
    {
        var u = await userManager.FindByIdAsync(userId);
        return u?.NotificacaoPrefsJson ?? "{}";
    }

    public async Task SaveNotificacaoPrefsJsonAsync(string userId, string json)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return;
        u.NotificacaoPrefsJson = json;
        await userManager.UpdateAsync(u);
    }
    public async Task<bool> ChangePasswordAsync(string userId, string senhaAtual, string novaSenha)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return false;
        var result = await userManager.ChangePasswordAsync(u, senhaAtual, novaSenha);
        return result.Succeeded;
    }

    public async Task<string?> GetOrCreateAuthenticatorKeyAsync(string userId)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return null;
        var key = await userManager.GetAuthenticatorKeyAsync(u);
        if (string.IsNullOrEmpty(key))
        {
            await userManager.ResetAuthenticatorKeyAsync(u);
            key = await userManager.GetAuthenticatorKeyAsync(u);
        }
        return key;
    }

    public async Task<bool> VerifyTwoFactorCodeAsync(string userId, string codigo)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is null) return false;
        return await userManager.VerifyTwoFactorTokenAsync(
            u, userManager.Options.Tokens.AuthenticatorTokenProvider, codigo);
    }

    public async Task SetTwoFactorEnabledAsync(string userId, bool enabled)
    {
        var u = await userManager.FindByIdAsync(userId);
        if (u is not null) await userManager.SetTwoFactorEnabledAsync(u, enabled);
    }
}

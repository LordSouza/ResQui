using System.Security.Claims;
using ResQui.Application.Auth;

namespace ResQui.API.Features.Auth;

public static class Endpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/login", async (LoginCmd cmd, IAuthService svc, HttpContext ctx) =>
        {
            var result = await svc.LoginAsync(cmd, ctx.Request.Headers.UserAgent.ToString());
            if (result is null) return Results.Unauthorized();
            // 2FA habilitado e sem código: o cliente deve reenviar com Codigo2fa
            if (result.Requires2fa) return Results.Ok(new { requires2fa = true });
            return Results.Ok(result.Token);
        })
        .AllowAnonymous()
        .WithName("Login")
        .WithSummary("Autenticar usuário e obter JWT");

        group.MapPost("/alterar-senha", async (AlterarSenhaCmd cmd, IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.AlterarSenhaAsync(userId, cmd, email);
            return Results.NoContent();
        })
        .RequireAuthorization();

        group.MapPost("/2fa/setup", async (IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var setup = await svc.Setup2faAsync(userId);
            return setup is null ? Results.NotFound() : Results.Ok(setup);
        })
        .RequireAuthorization();

        group.MapPost("/2fa/ativar", async (Codigo2faCmd cmd, IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var codigos = await svc.Ativar2faAsync(userId, cmd.Codigo, email);
            return Results.Ok(new { codigos });
        })
        .RequireAuthorization();

        group.MapPost("/2fa/desativar", async (Codigo2faCmd cmd, IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.Desativar2faAsync(userId, cmd.Codigo, email);
            return Results.NoContent();
        })
        .RequireAuthorization();

        group.MapGet("/sessoes", async (IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var jti = user.FindFirstValue("jti");
            return Results.Ok(await svc.ListarSessoesAsync(userId, jti));
        })
        .RequireAuthorization();

        group.MapDelete("/sessoes/{jti}", async (string jti, IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var ok = await svc.RevogarSessaoAsync(userId, jti, email);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization();

        group.MapPost("/sessoes/revogar-outras", async (IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var jti = user.FindFirstValue("jti");
            var n = await svc.RevogarOutrasSessoesAsync(userId, jti, email);
            return Results.Ok(new { revogadas = n });
        })
        .RequireAuthorization();

        group.MapPost("/register", async (RegisterCmd cmd, IAuthService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var profile = await svc.RegisterAsync(cmd, email);
            return Results.Created($"/api/auth/me", profile);
        })
        .RequireAuthorization("Admin")
        .WithName("Register")
        .WithSummary("Criar novo usuário (Admin only)");

        group.MapGet("/me", async (ClaimsPrincipal user, IAuthService svc) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? user.FindFirstValue("sub");
            if (userId is null) return Results.Unauthorized();
            var profile = await svc.GetMeAsync(userId);
            return profile is null ? Results.NotFound() : Results.Ok(profile);
        })
        .RequireAuthorization()
        .WithName("GetMe")
        .WithSummary("Perfil do usuário autenticado");

        group.MapPut("/me", async (AtualizarPerfilCmd cmd, IAuthService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var profile = await svc.AtualizarPerfilAsync(userId, cmd, email);
            return Results.Ok(profile);
        })
        .RequireAuthorization()
        .WithName("AtualizarPerfil")
        .WithSummary("Atualizar nome/e-mail do usuário autenticado");

        return group;
    }
}

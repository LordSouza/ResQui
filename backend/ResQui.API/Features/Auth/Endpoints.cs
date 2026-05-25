using System.Security.Claims;
using ResQui.Application.Auth;

namespace ResQui.API.Features.Auth;

public static class Endpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/login", async (LoginCmd cmd, IAuthService svc) =>
        {
            var result = await svc.LoginAsync(cmd);
            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        })
        .AllowAnonymous()
        .WithName("Login")
        .WithSummary("Autenticar usuário e obter JWT");

        group.MapPost("/register", async (RegisterCmd cmd, IAuthService svc) =>
        {
            var profile = await svc.RegisterAsync(cmd);
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

        return group;
    }
}

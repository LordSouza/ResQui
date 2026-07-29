using System.Security.Claims;
using ResQui.Application.Auth;
using ResQui.Application.Usuarios;

namespace ResQui.API.Features.Usuarios;

public static class Endpoints
{
    public static RouteGroupBuilder MapUsuariosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IUsuariosService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapPost("/", async (RegisterCmd cmd, IAuthService authSvc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var profile = await authSvc.RegisterAsync(cmd, email);
            return Results.Created($"/api/usuarios/{profile.Id}", profile);
        })
        .RequireAuthorization("Admin");

        group.MapPut("/{id}/papel", async (string id, AlterarPapelCmd cmd, IUsuariosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.AlterarPapelAsync(id, cmd, email);
            return Results.NoContent();
        });

        group.MapDelete("/{id}", async (string id, IUsuariosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.ArquivarAsync(id, email);
            return Results.NoContent();
        });

        group.MapDelete("/{id}/definitivo", async (string id, IUsuariosService svc, ClaimsPrincipal user) =>
        {
            var requesterId = user.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? user.FindFirstValue("sub") ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.ExcluirAsync(id, requesterId, email);
            return Results.NoContent();
        });

        group.MapPost("/{id}/2fa/reset", async (string id, IAuthService authSvc, ClaimsPrincipal user) =>
        {
            var requesterId = user.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? user.FindFirstValue("sub") ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var ok = await authSvc.ResetarSegundoFatorAsync(id, requesterId, email);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Admin");

        return group;
    }
}

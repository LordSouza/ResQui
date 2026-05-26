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
        });

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

        return group;
    }
}

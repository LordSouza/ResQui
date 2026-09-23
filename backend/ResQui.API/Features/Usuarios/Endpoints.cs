using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Domain.Interfaces;
using ResQui.Application.Auth;
using ResQui.Application.Usuarios;

namespace ResQui.API.Features.Usuarios;

public static class Endpoints
{
    public static RouteGroupBuilder MapUsuariosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IUsuariosService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapPost("/", async (RegisterCmd cmd, IAuthService authSvc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var profile = await authSvc.RegisterAsync(cmd, await user.ResolverAsync(labs));
            return Results.Created($"/api/usuarios/{profile.Id}", profile);
        });

        group.MapPut("/{id}/laboratorios", async (string id, DefinirLaboratoriosCmd cmd, IUsuariosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            await svc.DefinirLaboratoriosAsync(id, cmd, await user.ResolverAsync(labs));
            return Results.NoContent();
        });

        group.MapPut("/{id}/papel", async (string id, AlterarPapelCmd cmd, IUsuariosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.AlterarPapelAsync(id, cmd, email);
            return Results.NoContent();
        })
        .RequireAuthorization("Administracao");

        group.MapDelete("/{id}", async (string id, IUsuariosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.ArquivarAsync(id, email, user.FindFirstValue("papel") ?? "");
            return Results.NoContent();
        });

        group.MapDelete("/{id}/definitivo", async (string id, IUsuariosService svc, ClaimsPrincipal user) =>
        {
            var requesterId = user.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? user.FindFirstValue("sub") ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            await svc.ExcluirAsync(id, requesterId, email);
            return Results.NoContent();
        })
        .RequireAuthorization("Administracao");

        group.MapPost("/{id}/2fa/reset", async (string id, IAuthService authSvc, ClaimsPrincipal user) =>
        {
            var requesterId = user.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? user.FindFirstValue("sub") ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var ok = await authSvc.ResetarSegundoFatorAsync(id, requesterId, email);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Administracao");

        return group;
    }
}

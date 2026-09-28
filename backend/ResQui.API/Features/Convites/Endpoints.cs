using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Domain.Interfaces;
using ResQui.Application.Convites;

namespace ResQui.API.Features.Convites;

public static class Endpoints
{
    public static RouteGroupBuilder MapConvitesEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/", async (CriarConviteCmd cmd, IConvitesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            Results.Ok(await svc.CriarAsync(cmd, await user.ResolverAsync(labs))))
        .RequireAuthorization("GestaoUsuarios")
        .WithSummary("Gerar link de convite");

        group.MapGet("/", async (IConvitesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            Results.Ok(await svc.ListarAsync(await user.ResolverAsync(labs))))
            .RequireAuthorization("GestaoUsuarios");

        group.MapDelete("/{id:int}", async (int id, IConvitesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            await svc.RevogarAsync(id, await user.ResolverAsync(labs)) ? Results.NoContent() : Results.NotFound())
        .RequireAuthorization("GestaoUsuarios");

        group.MapGet("/{token}", async (string token, IConvitesService svc) =>
        {
            var convite = await svc.ConsultarAsync(token);
            return convite is null ? Results.NotFound() : Results.Ok(convite);
        })
        .AllowAnonymous()
        .WithSummary("Consultar convite pelo token");

        group.MapPost("/{token}/aceitar", async (string token, AceitarConviteCmd cmd, IConvitesService svc) =>
        {
            await svc.AceitarAsync(token, cmd);
            return Results.NoContent();
        })
        .AllowAnonymous()
        .WithSummary("Aceitar convite e criar a própria conta");

        return group;
    }
}

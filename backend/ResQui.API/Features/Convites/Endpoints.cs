using System.Security.Claims;
using ResQui.Application.Convites;

namespace ResQui.API.Features.Convites;

public static class Endpoints
{
    public static RouteGroupBuilder MapConvitesEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/", async (CriarConviteCmd cmd, IConvitesService svc, ClaimsPrincipal user) =>
        {
            var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var papel = user.FindFirstValue("papel") ?? "";
            return Results.Ok(await svc.CriarAsync(cmd, id, email, papel));
        })
        .RequireAuthorization("GestaoUsuarios")
        .WithSummary("Gerar link de convite");

        group.MapGet("/", async (IConvitesService svc) => Results.Ok(await svc.ListarAsync()))
            .RequireAuthorization("GestaoUsuarios");

        group.MapDelete("/{id:int}", async (int id, IConvitesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var papel = user.FindFirstValue("papel") ?? "";
            return await svc.RevogarAsync(id, email, papel) ? Results.NoContent() : Results.NotFound();
        })
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

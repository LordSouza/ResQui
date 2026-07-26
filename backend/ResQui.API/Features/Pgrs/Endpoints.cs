using System.Security.Claims;
using ResQui.Application.Pgrs;

namespace ResQui.API.Features.Pgrs;

public static class Endpoints
{
    public static RouteGroupBuilder MapPgrsConfigEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IPgrsConfigService svc) =>
            Results.Ok(await svc.ObterAsync()));

        group.MapPut("/", async (AtualizarConfiguracaoPgrsCmd cmd, IPgrsConfigService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            return Results.Ok(await svc.SalvarAsync(cmd, email));
        })
        .RequireAuthorization("Gestor");

        return group;
    }
}

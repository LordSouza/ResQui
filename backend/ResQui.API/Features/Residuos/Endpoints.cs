using System.Security.Claims;
using ResQui.Application.Residuos;

namespace ResQui.API.Features.Residuos;

public static class Endpoints
{
    public static RouteGroupBuilder MapResiduosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IResiduosService svc,
            int? labId = null,
            int? mtrId = null,
            string? status = null) =>
            Results.Ok(await svc.ListarAsync(labId, mtrId, status)));

        group.MapPost("/", async (CriarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.CriarAsync(cmd, email);
            return Results.Created($"/api/residuos/{r.Id}", r);
        });

        group.MapPut("/{id:int}", async (int id, AtualizarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.AtualizarAsync(id, cmd, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        return group;
    }
}

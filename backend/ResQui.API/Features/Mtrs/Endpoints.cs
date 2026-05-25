using System.Security.Claims;
using ResQui.Application.Mtrs;

namespace ResQui.API.Features.Mtrs;

public static class Endpoints
{
    public static RouteGroupBuilder MapMtrsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IMtrsService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapGet("/{id:int}", async (int id, IMtrsService svc) =>
        {
            var m = await svc.ObterPorIdAsync(id);
            return m is null ? Results.NotFound() : Results.Ok(m);
        });

        group.MapPost("/", async (CriarMtrCmd cmd, IMtrsService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var m = await svc.CriarAsync(cmd, userId);
            return Results.Created($"/api/mtrs/{m.Id}", m);
        });

        group.MapPut("/{id:int}/enviar-sinir", async (int id, IMtrsService svc) =>
        {
            var result = await svc.EnviarSinirAsync(id);
            return result.Sucesso ? Results.Ok(result) : Results.BadRequest(result);
        });

        group.MapPost("/enviar-batch", async (IMtrsService svc) =>
            Results.Ok(await svc.EnviarBatchAsync()));

        return group;
    }
}

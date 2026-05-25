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

        group.MapPost("/", async (CriarResiduoCmd cmd, IResiduosService svc) =>
        {
            var r = await svc.CriarAsync(cmd);
            return Results.Created($"/api/residuos/{r.Id}", r);
        });

        group.MapPut("/{id:int}", async (int id, AtualizarResiduoCmd cmd, IResiduosService svc) =>
        {
            var r = await svc.AtualizarAsync(id, cmd);
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        return group;
    }
}

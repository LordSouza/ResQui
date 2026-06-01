using ResQui.Application.Compatibilidade;

namespace ResQui.API.Features.Compatibilidade;

public static class Endpoints
{
    public static RouteGroupBuilder MapCompatEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (int classeA, int classeB, ICompatService svc) =>
        {
            var result = await svc.ConsultarParAsync(classeA, classeB);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapGet("/matriz", async (ICompatService svc) =>
            Results.Ok(await svc.GetMatrizAsync()));

        group.MapGet("/overrides", async (ICompatService svc) =>
            Results.Ok(await svc.GetOverridesAsync()));

        group.MapPut("/overrides/{classeA:int}/{classeB:int}",
            async (int classeA, int classeB, SalvarOverrideCmd cmd, ICompatService svc) =>
                Results.Ok(await svc.SalvarOverrideAsync(classeA, classeB, cmd)));

        group.MapDelete("/overrides/{classeA:int}/{classeB:int}",
            async (int classeA, int classeB, ICompatService svc) =>
            {
                await svc.RemoverOverrideAsync(classeA, classeB);
                return Results.NoContent();
            });

        return group;
    }
}

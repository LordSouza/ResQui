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

        return group;
    }
}

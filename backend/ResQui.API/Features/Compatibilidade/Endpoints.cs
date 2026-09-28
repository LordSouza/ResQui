using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Compatibilidade;
using ResQui.Domain.Interfaces;

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
                Results.Ok(await svc.SalvarOverrideAsync(classeA, classeB, cmd)))
            .RequireAuthorization("Administracao");

        group.MapDelete("/overrides/{classeA:int}/{classeB:int}",
            async (int classeA, int classeB, ICompatService svc) =>
            {
                await svc.RemoverOverrideAsync(classeA, classeB);
                return Results.NoContent();
            })
            .RequireAuthorization("Administracao");

        group.MapPost("/parecer", async (RegistrarParecerCmd cmd, ICompatAcoesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            await svc.RegistrarParecerAsync(await user.ResolverAsync(labs), cmd);
            return Results.NoContent();
        })
        .RequireAuthorization("Operacional");

        group.MapPost("/notificar", async (NotificarProfessoresCmd cmd, ICompatAcoesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            Results.Ok(await svc.NotificarProfessoresAsync(await user.ResolverAsync(labs), cmd)))
        .RequireAuthorization("Operacional");

        return group;
    }
}

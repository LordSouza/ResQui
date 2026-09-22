using System.Security.Claims;
using ResQui.Application.Residuos;

namespace ResQui.API.Features.Residuos;

public static class Endpoints
{
    public static RouteGroupBuilder MapResiduosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IResiduosService svc,
            string? labId = null,
            int? mtrId = null,
            string? status = null) =>
            Results.Ok(await svc.ListarAsync(labId, mtrId, status)));

        group.MapPost("/", async (CriarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.CriarAsync(cmd, email);
            return Results.Created($"/api/residuos/{r.Id}", r);
        })
        .RequireAuthorization("Operacional");

        group.MapPut("/{id:int}", async (int id, AtualizarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.AtualizarAsync(id, cmd, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Operacao");

        // RF06 — aprovar/rejeitar solicitação de descarte. Policy Aprovador: Admin ou Professor.
        group.MapPut("/{id:int}/aprovar", async (int id, IResiduosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.AprovarAsync(id, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Aprovador");

        group.MapPut("/{id:int}/rejeitar", async (int id, RejeitarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.RejeitarAsync(id, cmd.Motivo, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Aprovador");

        group.MapGet("/analytics", async (IResiduosService svc, int meses = 6) =>
            Results.Ok(await svc.AnalyticsAsync(meses)));

        return group;
    }
}

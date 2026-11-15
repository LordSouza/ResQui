using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Residuos;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Residuos;

public static class Endpoints
{
    public static RouteGroupBuilder MapResiduosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IResiduosService svc,
            ClaimsPrincipal user,
            IUsuarioLaboratoriosRepository labs,
            string? labId = null,
            int? mtrId = null,
            string? status = null) =>
            Results.Ok(await svc.ListarAsync(labId, mtrId, status, await user.ResolverAsync(labs))));

        group.MapPost("/", async (CriarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.CriarAsync(cmd, await user.ResolverAsync(labs));
            return Results.Created($"/api/residuos/{r.Id}", r);
        })
        .RequireAuthorization("Operacional");

        group.MapPut("/{id:int}", async (int id, AtualizarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.AtualizarAsync(id, cmd, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Operacao");

        // RF06 — aprovar/rejeitar solicitação de descarte. Policy Aprovador: Admin ou Professor.
        group.MapPut("/{id:int}/aprovar", async (int id, IResiduosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.AprovarAsync(id, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Aprovador");

        group.MapPut("/{id:int}/desfazer-aprovacao", async (int id, IResiduosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.DesfazerAprovacaoAsync(id, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Aprovador");

        group.MapPut("/{id:int}/rejeitar", async (int id, RejeitarResiduoCmd cmd, IResiduosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.RejeitarAsync(id, cmd.Motivo, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Aprovador");

        group.MapGet("/analytics", async (IResiduosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs, int meses = 6) =>
            Results.Ok(await svc.AnalyticsAsync(Math.Clamp(meses, 1, 60), await user.ResolverAsync(labs))));

        return group;
    }
}

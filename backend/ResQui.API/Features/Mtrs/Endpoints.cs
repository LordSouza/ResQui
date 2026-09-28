using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Mtrs;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Mtrs;

public static class Endpoints
{
    public static RouteGroupBuilder MapMtrsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IMtrsService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            Results.Ok(await svc.ListarAsync(await user.ResolverAsync(labs))));

        group.MapGet("/{id:int}", async (int id, IMtrsService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var m = await svc.ObterPorIdAsync(id, await user.ResolverAsync(labs));
            return m is null ? Results.NotFound() : Results.Ok(m);
        });

        group.MapPost("/", async (CriarMtrCmd cmd, IMtrsService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var m = await svc.CriarAsync(cmd, userId, await user.ResolverAsync(labs));
            return Results.Created($"/api/mtrs/{m.Id}", m);
        })
        .RequireAuthorization("Operacao");

        group.MapGet("/{id:int}/pdf", async (int id, IMtrsService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var result = await svc.GerarPdfAsync(id, await user.ResolverAsync(labs));
            if (result is null) return Results.NotFound();
            var (pdf, filename) = result.Value;
            return Results.File(pdf, "application/pdf", filename);
        });

        group.MapPost("/{id:int}/destinacao", async (int id, ConfirmarDestinacaoCmd cmd, IMtrsService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            // Sem fallback ?? "": DestinadoPorId tem FK, e "" seria violação de constraint.
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var m = await svc.ConfirmarDestinacaoAsync(id, cmd, userId, await user.ResolverAsync(labs));
            return m is null ? Results.NotFound() : Results.Ok(m);
        })
        .RequireAuthorization("Operacao");

        group.MapDelete("/{id:int}/destinacao", async (int id, IMtrsService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            return await svc.ReabrirDestinacaoAsync(id, await user.ResolverAsync(labs))
                ? Results.NoContent()
                : Results.NotFound();
        })
        .RequireAuthorization("Cadastro");

        return group;
    }
}

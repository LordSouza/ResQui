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
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var m = await svc.CriarAsync(cmd, userId, email);
            return Results.Created($"/api/mtrs/{m.Id}", m);
        })
        .RequireAuthorization("Tecnico");

        group.MapGet("/{id:int}/pdf", async (int id, IMtrsService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var result = await svc.GerarPdfAsync(id, email);
            if (result is null) return Results.NotFound();
            var (pdf, filename) = result.Value;
            return Results.File(pdf, "application/pdf", filename);
        });

        group.MapPost("/{id:int}/destinacao", async (int id, ConfirmarDestinacaoCmd cmd, IMtrsService svc, ClaimsPrincipal user) =>
        {
            // Sem fallback ?? "": DestinadoPorId tem FK, e "" seria violação de constraint.
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var m = await svc.ConfirmarDestinacaoAsync(id, cmd, userId, email);
            return m is null ? Results.NotFound() : Results.Ok(m);
        })
        .RequireAuthorization("Tecnico");

        group.MapDelete("/{id:int}/destinacao", async (int id, IMtrsService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            return await svc.ReabrirDestinacaoAsync(id, email)
                ? Results.NoContent()
                : Results.NotFound();
        })
        .RequireAuthorization("Gestor");

        return group;
    }
}

using System.Security.Claims;
using ResQui.Application.Reagentes;

namespace ResQui.API.Features.Reagentes;

public static class Endpoints
{
    public static RouteGroupBuilder MapReagentesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IReagentesService svc,
            int page = 1,
            int pageSize = 20,
            string? q = null,
            int? classe = null,
            bool vencendo = false) =>
        {
            var filtro = new ReagentesFiltroDto(page, pageSize, q, classe, vencendo);
            var (items, total) = await svc.ListarAsync(filtro);
            return Results.Ok(new { items, total, page, pageSize });
        });

        group.MapGet("/{id}", async (string id, IReagentesService svc) =>
        {
            var r = await svc.ObterPorIdAsync(id);
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        group.MapPost("/", async (CriarReagenteCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.CriarAsync(cmd, email);
            return Results.Created($"/api/reagentes/{r.Id}", r);
        })
        .RequireAuthorization("Gestor");

        group.MapPut("/{id}", async (string id, AtualizarReagenteCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.AtualizarAsync(id, cmd, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Gestor");

        group.MapDelete("/{id}", async (string id, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var ok = await svc.DeletarAsync(id, email);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Admin");

        group.MapPost("/{id}/baixa", async (string id, BaixaCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.BaixaAsync(id, cmd, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        return group;
    }
}

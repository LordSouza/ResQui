using System.Security.Claims;
using ResQui.Application.Chamados;

namespace ResQui.API.Features.Chamados;

public static class Endpoints
{
    public static RouteGroupBuilder MapChamadosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IChamadosService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapPost("/", async (CriarChamadoCmd cmd, IChamadosService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var c = await svc.CriarAsync(cmd, userId);
            return Results.Created($"/api/chamados/{c.Id}", c);
        });

        group.MapPut("/{id:int}/status", async (int id, AtualizarStatusCmd cmd, IChamadosService svc) =>
        {
            var c = await svc.AtualizarStatusAsync(id, cmd);
            return c is null ? Results.NotFound() : Results.Ok(c);
        });

        group.MapPost("/{id:int}/comentarios", async (
            int id, ComentarChamadoCmd cmd, IChamadosService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var c = await svc.ComentarAsync(id, cmd, userId);
            return c is null ? Results.NotFound() : Results.Ok(c);
        });

        return group;
    }
}

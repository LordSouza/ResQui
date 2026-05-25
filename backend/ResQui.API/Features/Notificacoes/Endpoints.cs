using System.Security.Claims;
using ResQui.Application.Notificacoes;

namespace ResQui.API.Features.Notificacoes;

public static class Endpoints
{
    public static RouteGroupBuilder MapNotificacoesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (INotificacoesService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            return Results.Ok(await svc.ListarPorUsuarioAsync(userId));
        });

        group.MapPatch("/{id:int}/lida", async (int id, INotificacoesService svc) =>
        {
            await svc.MarcarComoLidaAsync(id);
            return Results.NoContent();
        });

        return group;
    }
}

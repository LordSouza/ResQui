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

        group.MapPost("/marcar-todas-lidas", async (INotificacoesService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            await svc.MarcarTodasLidasAsync(userId);
            return Results.NoContent();
        });

        group.MapGet("/prefs", async (INotificacoesService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            return Results.Ok(await svc.GetPrefsAsync(userId));
        });

        group.MapPut("/prefs", async (NotificacaoPrefsDto prefs, INotificacoesService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            await svc.SavePrefsAsync(userId, prefs);
            return Results.NoContent();
        });

        return group;
    }
}

using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Auditoria;

public static class Endpoints
{
    public static RouteGroupBuilder MapAuditoriaEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IAuditoriaService svc,
            IVisibilidadeUsuarios visibilidade,
            ClaimsPrincipal user,
            IUsuarioLaboratoriosRepository labs,
            DateTime? from = null,
            DateTime? to = null,
            string? risk = null,
            string? who = null,
            string? what = null,
            string? where = null) =>
        {
            var autores = await visibilidade.EmailsQueEnxergaAsync(await user.ResolverAsync(labs));
            var filtro = new AuditoriaFiltroDto(from, to, risk, who, what, where, Autores: autores);
            return Results.Ok(await svc.ListarAsync(filtro));
        });

        group.MapGet("/verificacao", async (IAuditoriaService svc, ClaimsPrincipal user) =>
            Results.Ok(await svc.VerificarCadeiaAsync(user.FindFirstValue(ClaimTypes.Email) ?? "")))
            .RequireAuthorization("Administracao");

        group.MapGet("/ancora", async (IAuditoriaService svc) =>
            await svc.AncoraAsync() is { } ancora ? Results.Ok(ancora) : Results.NoContent());

        return group;
    }
}

using ResQui.Application.Auditoria;

namespace ResQui.API.Features.Auditoria;

public static class Endpoints
{
    public static RouteGroupBuilder MapAuditoriaEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IAuditoriaService svc,
            DateTime? from = null,
            DateTime? to = null,
            string? risk = null,
            string? who = null,
            string? what = null,
            string? where = null) =>
        {
            var filtro = new AuditoriaFiltroDto(from, to, risk, who, what, where);
            return Results.Ok(await svc.ListarAsync(filtro));
        });

        return group;
    }
}

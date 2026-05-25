using ResQui.Application.Laboratorios;

namespace ResQui.API.Features.Laboratorios;

public static class Endpoints
{
    public static RouteGroupBuilder MapLaboratoriosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (ILaboratoriosService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapGet("/{id}", async (string id, ILaboratoriosService svc) =>
        {
            var l = await svc.ObterPorIdAsync(id);
            return l is null ? Results.NotFound() : Results.Ok(l);
        });

        group.MapPost("/", async (CriarLaboratorioCmd cmd, ILaboratoriosService svc) =>
        {
            var l = await svc.CriarAsync(cmd);
            return Results.Created($"/api/laboratorios/{l.Id}", l);
        })
        .RequireAuthorization("Gestor");

        group.MapPut("/{id}", async (string id, AtualizarLaboratorioCmd cmd, ILaboratoriosService svc) =>
        {
            var l = await svc.AtualizarAsync(id, cmd);
            return l is null ? Results.NotFound() : Results.Ok(l);
        })
        .RequireAuthorization("Gestor");

        group.MapDelete("/{id}", async (string id, ILaboratoriosService svc) =>
        {
            var ok = await svc.DeletarAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Admin");

        return group;
    }
}

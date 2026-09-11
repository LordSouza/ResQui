using System.Security.Claims;
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

        group.MapPost("/", async (CriarLaboratorioCmd cmd, ILaboratoriosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var l = await svc.CriarAsync(cmd, email);
            return Results.Created($"/api/laboratorios/{l.Id}", l);
        })
        .RequireAuthorization("Cadastro");

        group.MapPut("/{id}", async (string id, AtualizarLaboratorioCmd cmd, ILaboratoriosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var l = await svc.AtualizarAsync(id, cmd, email);
            return l is null ? Results.NotFound() : Results.Ok(l);
        })
        .RequireAuthorization("Cadastro");

        group.MapDelete("/{id}", async (string id, ILaboratoriosService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var ok = await svc.DeletarAsync(id, email);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Cadastro");

        return group;
    }
}

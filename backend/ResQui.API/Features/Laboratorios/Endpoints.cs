using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Laboratorios;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Laboratorios;

public static class Endpoints
{
    public static RouteGroupBuilder MapLaboratoriosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (ILaboratoriosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            Results.Ok(await svc.ListarAsync(await user.ResolverAsync(labs))));

        group.MapGet("/{id}", async (string id, ILaboratoriosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var l = await svc.ObterPorIdAsync(id, await user.ResolverAsync(labs));
            return l is null ? Results.NotFound() : Results.Ok(l);
        });

        group.MapPost("/", async (CriarLaboratorioCmd cmd, ILaboratoriosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var l = await svc.CriarAsync(cmd, await user.ResolverAsync(labs));
            return Results.Created($"/api/laboratorios/{l.Id}", l);
        })
        .RequireAuthorization("Cadastro");

        group.MapPut("/{id}", async (string id, AtualizarLaboratorioCmd cmd, ILaboratoriosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var l = await svc.AtualizarAsync(id, cmd, await user.ResolverAsync(labs));
            return l is null ? Results.NotFound() : Results.Ok(l);
        })
        .RequireAuthorization("Cadastro");

        group.MapDelete("/{id}", async (string id, ILaboratoriosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var ok = await svc.DeletarAsync(id, await user.ResolverAsync(labs));
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Cadastro");

        return group;
    }
}

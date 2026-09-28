using System.Security.Claims;
using System.Text;
using ResQui.API.Common;
using ResQui.Application.Relatorios;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Relatorios;

public static class Endpoints
{
    public static RouteGroupBuilder MapRelatoriosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IRelatoriosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            Results.Ok(await svc.ListarAsync(await user.ResolverAsync(labs))));

        group.MapPost("/gerar", async (
            GerarRelatorioCmd cmd,
            IRelatoriosService svc,
            ClaimsPrincipal user,
            IUsuarioLaboratoriosRepository labs) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var dto = await svc.GerarAsync(cmd, userId, await user.ResolverAsync(labs));
            return Results.Created($"/api/relatorios/{dto.Id}", dto);
        }).RequireAuthorization("Cadastro");

        group.MapGet("/{id:int}/download", async (int id, IRelatoriosService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var result = await svc.DownloadAsync(id, await user.ResolverAsync(labs));
            if (result is null) return Results.NotFound();
            var (csv, filename) = result.Value;
            var bom = Encoding.UTF8.GetPreamble();
            var body = Encoding.UTF8.GetBytes(csv);
            var bytes = bom.Concat(body).ToArray();
            return Results.File(bytes, "text/csv; charset=utf-8", filename);
        });

        return group;
    }
}

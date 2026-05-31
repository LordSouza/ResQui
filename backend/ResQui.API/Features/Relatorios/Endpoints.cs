using System.Security.Claims;
using System.Text;
using ResQui.Application.Relatorios;

namespace ResQui.API.Features.Relatorios;

public static class Endpoints
{
    public static RouteGroupBuilder MapRelatoriosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IRelatoriosService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapPost("/gerar", async (
            GerarRelatorioCmd cmd,
            IRelatoriosService svc,
            ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var dto = await svc.GerarAsync(cmd, userId);
            return Results.Created($"/api/relatorios/{dto.Id}", dto);
        }).RequireAuthorization("Gestor");

        group.MapGet("/{id:int}/download", async (int id, IRelatoriosService svc) =>
        {
            var result = await svc.DownloadAsync(id);
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

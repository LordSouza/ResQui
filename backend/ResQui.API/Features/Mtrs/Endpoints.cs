using System.Security.Claims;
using ResQui.Application.Mtrs;

namespace ResQui.API.Features.Mtrs;

public static class Endpoints
{
    public static RouteGroupBuilder MapMtrsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IMtrsService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapGet("/{id:int}", async (int id, IMtrsService svc) =>
        {
            var m = await svc.ObterPorIdAsync(id);
            return m is null ? Results.NotFound() : Results.Ok(m);
        });

        group.MapPost("/", async (CriarMtrCmd cmd, IMtrsService svc, ClaimsPrincipal user) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var m = await svc.CriarAsync(cmd, userId, email);
            return Results.Created($"/api/mtrs/{m.Id}", m);
        });

        group.MapPut("/{id:int}/enviar-sinir", async (int id, IMtrsService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var result = await svc.EnviarSinirAsync(id, email);
            return result.Sucesso ? Results.Ok(result) : Results.BadRequest(result);
        });

        group.MapPost("/enviar-batch", async (IMtrsService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            return Results.Ok(await svc.EnviarBatchAsync(email));
        });

        group.MapGet("/{id:int}/pdf", async (int id, IMtrsService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var result = await svc.GerarPdfAsync(id, email);
            if (result is null) return Results.NotFound();
            var (pdf, filename) = result.Value;
            return Results.File(pdf, "application/pdf", filename);
        });

        group.MapGet("/{id:int}/export-sinir", async (int id, IMtrsService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var result = await svc.ExportarSinirAsync(id, email);
            if (result is null) return Results.NotFound();
            var (csv, filename) = result.Value;
            var bom = System.Text.Encoding.UTF8.GetPreamble();
            var body = System.Text.Encoding.UTF8.GetBytes(csv);
            return Results.File(bom.Concat(body).ToArray(), "text/csv; charset=utf-8", filename);
        });

        return group;
    }
}

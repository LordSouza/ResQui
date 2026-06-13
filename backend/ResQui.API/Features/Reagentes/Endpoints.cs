using System.Security.Claims;
using ResQui.Application.Reagentes;

namespace ResQui.API.Features.Reagentes;

public static class Endpoints
{
    public static RouteGroupBuilder MapReagentesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IReagentesService svc,
            int page = 1,
            int pageSize = 20,
            string? q = null,
            int? classe = null,
            bool vencendo = false) =>
        {
            var filtro = new ReagentesFiltroDto(page, pageSize, q, classe, vencendo);
            var (items, total) = await svc.ListarAsync(filtro);
            return Results.Ok(new { items, total, page, pageSize });
        });

        group.MapGet("/{id}", async (string id, IReagentesService svc) =>
        {
            var r = await svc.ObterPorIdAsync(id);
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        group.MapPost("/", async (CriarReagenteCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.CriarAsync(cmd, email);
            return Results.Created($"/api/reagentes/{r.Id}", r);
        })
        .RequireAuthorization("Gestor");

        group.MapPut("/{id}", async (string id, AtualizarReagenteCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.AtualizarAsync(id, cmd, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Gestor");

        group.MapDelete("/{id}", async (string id, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var ok = await svc.DeletarAsync(id, email);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Admin");

        group.MapPost("/{id}/baixa", async (string id, BaixaCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var r = await svc.BaixaAsync(id, cmd, email);
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Tecnico");

        group.MapGet("/{id}/movimentacoes", async (string id, IReagentesService svc, int limite = 20) =>
        {
            var result = await svc.ListarMovimentacoesAsync(id, limite);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapGet("/{id}/lotes", async (string id, IReagentesService svc) =>
        {
            var result = await svc.ListarLotesAsync(id);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPost("/{id}/lotes", async (string id, CriarLoteCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var lote = await svc.CriarLoteAsync(id, cmd, email);
            return lote is null ? Results.NotFound() : Results.Created($"/api/reagentes/{id}/lotes/{lote.Id}", lote);
        })
        .RequireAuthorization("Tecnico");

        group.MapPost("/{id}/lotes/{loteId:int}/baixa", async (string id, int loteId, BaixaCmd cmd, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var lote = await svc.BaixaLoteAsync(id, loteId, cmd, email);
            return lote is null ? Results.NotFound() : Results.Ok(lote);
        })
        .RequireAuthorization("Tecnico");

        group.MapGet("/{id}/rotulo", async (string id, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var pdf = await svc.GerarRotuloAsync(id, email);
            return pdf is null ? Results.NotFound() : Results.File(pdf, "application/pdf", $"rotulo-{id.ToLower()}.pdf");
        });

        group.MapGet("/{id}/lotes/{loteId:int}/rotulo", async (string id, int loteId, IReagentesService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            var pdf = await svc.GerarRotuloLoteAsync(id, loteId, email);
            return pdf is null ? Results.NotFound() : Results.File(pdf, "application/pdf", $"etiqueta-{id.ToLower()}-lote-{loteId}.pdf");
        });

        return group;
    }
}

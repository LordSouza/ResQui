using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Reagentes;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Reagentes;

public static class Endpoints
{
    public static RouteGroupBuilder MapReagentesEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            IReagentesService svc,
            ClaimsPrincipal user,
            IUsuarioLaboratoriosRepository labs,
            int page = 1,
            int pageSize = 20,
            string? q = null,
            int? classe = null,
            bool vencendo = false) =>
        {
            var filtro = new ReagentesFiltroDto(page, pageSize, q, classe, vencendo);
            var (items, total) = await svc.ListarAsync(filtro, await user.ResolverAsync(labs));
            return Results.Ok(new { items, total, page, pageSize });
        });

        group.MapGet("/{id}", async (string id, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.ObterPorIdAsync(id, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        });

        group.MapPost("/", async (CriarReagenteCmd cmd, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.CriarAsync(cmd, await user.ResolverAsync(labs));
            return Results.Created($"/api/reagentes/{r.Id}", r);
        })
        .RequireAuthorization("Operacional");

        group.MapPost("/importar-lote", async (CriarReagenteCmd[] cmds, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var result = await svc.ImportarLoteAsync(cmds, await user.ResolverAsync(labs));
            return Results.Ok(result);
        })
        .RequireAuthorization("Operacional");

        group.MapPut("/{id}", async (string id, AtualizarReagenteCmd cmd, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.AtualizarAsync(id, cmd, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Cadastro");

        group.MapDelete("/{id}", async (string id, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var ok = await svc.DeletarAsync(id, await user.ResolverAsync(labs));
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization("Cadastro");

        group.MapPost("/{id}/baixa", async (string id, BaixaCmd cmd, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.BaixaAsync(id, cmd, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Operacional");

        group.MapPost("/{id}/transferencia", async (string id, TransferirReagenteCmd cmd, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var r = await svc.TransferirAsync(id, cmd, await user.ResolverAsync(labs));
            return r is null ? Results.NotFound() : Results.Ok(r);
        })
        .RequireAuthorization("Operacional");

        group.MapGet("/{id}/movimentacoes", async (string id, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs, int limite = 20) =>
        {
            var result = await svc.ListarMovimentacoesAsync(id, await user.ResolverAsync(labs), limite);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapGet("/{id}/lotes", async (string id, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var result = await svc.ListarLotesAsync(id, await user.ResolverAsync(labs));
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPost("/{id}/lotes", async (string id, CriarLoteCmd cmd, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var lote = await svc.CriarLoteAsync(id, cmd, await user.ResolverAsync(labs));
            return lote is null ? Results.NotFound() : Results.Created($"/api/reagentes/{id}/lotes/{lote.Id}", lote);
        })
        .RequireAuthorization("Operacao");

        group.MapPost("/{id}/lotes/{loteId:int}/baixa", async (string id, int loteId, BaixaCmd cmd, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var lote = await svc.BaixaLoteAsync(id, loteId, cmd, await user.ResolverAsync(labs));
            return lote is null ? Results.NotFound() : Results.Ok(lote);
        })
        .RequireAuthorization("Operacional");

        group.MapGet("/{id}/rotulo", async (string id, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var pdf = await svc.GerarRotuloAsync(id, await user.ResolverAsync(labs));
            return pdf is null ? Results.NotFound() : Results.File(pdf, "application/pdf", $"rotulo-{id.ToLower()}.pdf");
        });

        group.MapGet("/{id}/rotulo/qr", async (string id, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var png = await svc.QrDoRotuloAsync(id, await user.ResolverAsync(labs));
            return png is null ? Results.NotFound() : Results.File(png, "image/png");
        });

        group.MapGet("/{id}/lotes/{loteId:int}/rotulo", async (string id, int loteId, IReagentesService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
        {
            var pdf = await svc.GerarRotuloLoteAsync(id, loteId, await user.ResolverAsync(labs));
            return pdf is null ? Results.NotFound() : Results.File(pdf, "application/pdf", $"etiqueta-{id.ToLower()}-lote-{loteId}.pdf");
        });

        return group;
    }
}

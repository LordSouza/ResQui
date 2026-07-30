using System.Security.Claims;
using ResQui.Application.Pgrs;

namespace ResQui.API.Features.Pgrs;

public static class Endpoints
{
    public static RouteGroupBuilder MapPgrsConfigEndpoints(this RouteGroupBuilder group)
    {
        // Expõe nome, e-mail e telefone do responsável técnico. Os dois consumidores reais são
        // FormNovoMtr (MtrScreen, Tecnico+) e FormConfigurarPgrs (RelatoriosScreen, Admin/Gestor) —
        // nenhuma tela de Visualizador chama useConfigPgrs.
        group.MapGet("/", async (IPgrsConfigService svc) =>
            Results.Ok(await svc.ObterAsync()))
            .RequireAuthorization("Tecnico");

        group.MapPut("/", async (AtualizarConfiguracaoPgrsCmd cmd, IPgrsConfigService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            return Results.Ok(await svc.SalvarAsync(cmd, email));
        })
        .RequireAuthorization("Gestor");

        return group;
    }
}

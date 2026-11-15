using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Assistente;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Assistente;

public static class Endpoints
{
    public const string PoliticaLimite = "assistente";

    public static RouteGroupBuilder MapAssistenteEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/mensagem", async (MensagemAssistenteCmd cmd, IAssistenteService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs, CancellationToken ct) =>
            Results.Ok(await svc.ResponderAsync(cmd, await user.ResolverAsync(labs), ct)))
            .RequireAuthorization()
            .RequireRateLimiting(PoliticaLimite);

        return group;
    }
}

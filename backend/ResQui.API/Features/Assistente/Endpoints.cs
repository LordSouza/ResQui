using System.Security.Claims;
using ResQui.API.Common;
using ResQui.Application.Assistente;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Features.Assistente;

public static class Endpoints
{
    public static RouteGroupBuilder MapAssistenteEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/mensagem", async (MensagemAssistenteCmd cmd, IAssistenteService svc, ClaimsPrincipal user, IUsuarioLaboratoriosRepository labs) =>
            Results.Ok(await svc.ResponderAsync(cmd, await user.ResolverAsync(labs))))
            .RequireAuthorization();

        return group;
    }
}

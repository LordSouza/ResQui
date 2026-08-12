using ResQui.Application.Assistente;

namespace ResQui.API.Features.Assistente;

public static class Endpoints
{
    public static RouteGroupBuilder MapAssistenteEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/mensagem", async (MensagemAssistenteCmd cmd, IAssistenteService svc) =>
            Results.Ok(await svc.ResponderAsync(cmd)))
            .RequireAuthorization();

        return group;
    }
}

using ResQui.Application.Auth;
using ResQui.Application.Usuarios;

namespace ResQui.API.Features.Usuarios;

public static class Endpoints
{
    public static RouteGroupBuilder MapUsuariosEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (IUsuariosService svc) =>
            Results.Ok(await svc.ListarAsync()));

        group.MapPost("/", async (RegisterCmd cmd, IAuthService authSvc) =>
        {
            var profile = await authSvc.RegisterAsync(cmd);
            return Results.Created($"/api/usuarios/{profile.Id}", profile);
        });

        group.MapPut("/{id}/papel", async (string id, AlterarPapelCmd cmd, IUsuariosService svc) =>
        {
            await svc.AlterarPapelAsync(id, cmd);
            return Results.NoContent();
        });

        group.MapDelete("/{id}", async (string id, IUsuariosService svc) =>
        {
            await svc.ArquivarAsync(id);
            return Results.NoContent();
        });

        return group;
    }
}

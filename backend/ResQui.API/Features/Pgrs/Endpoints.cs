using System.Security.Claims;
using ResQui.Application.Pgrs;

namespace ResQui.API.Features.Pgrs;

public static class Endpoints
{
    public static RouteGroupBuilder MapPgrsConfigEndpoints(this RouteGroupBuilder group)
    {
        // Expõe CNPJ, endereço e os contatos do responsável técnico. Consumidores: FormNovoMtr
        // (MtrScreen, policy Operacao) e FormConfigurarPgrs (RelatoriosScreen, policy Cadastro).
        group.MapGet("/", async (IPgrsConfigService svc) =>
            Results.Ok(await svc.ObterAsync()))
            .RequireAuthorization("Operacao");

        // Recorte só com razão social e unidade, para o cabeçalho do resumo de segurança — que é
        // um documento de segurança e precisa identificar a instituição para qualquer papel,
        // inclusive o Aluno. Por isso exige apenas autenticação.
        group.MapGet("/identificacao", async (IPgrsConfigService svc) =>
            Results.Ok(await svc.ObterIdentificacaoAsync()))
            .RequireAuthorization();

        group.MapPut("/", async (AtualizarConfiguracaoPgrsCmd cmd, IPgrsConfigService svc, ClaimsPrincipal user) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
            return Results.Ok(await svc.SalvarAsync(cmd, email));
        })
        .RequireAuthorization("Cadastro");

        return group;
    }
}

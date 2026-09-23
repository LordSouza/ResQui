using System.Security.Claims;
using ResQui.Application.Common;
using ResQui.Domain.Interfaces;

namespace ResQui.API.Common;

public static class SolicitanteResolver
{
    public static async Task<Solicitante> ResolverAsync(
        this ClaimsPrincipal user, IUsuarioLaboratoriosRepository repo)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub") ?? "";
        var email = user.FindFirstValue(ClaimTypes.Email) ?? "";
        var papel = user.FindFirstValue("papel") ?? "";
        IReadOnlyList<string> laboratorios = papel == "Admin" ? [] : await repo.DoUsuarioAsync(id);
        return new Solicitante(id, email, papel, laboratorios);
    }
}

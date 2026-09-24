using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Usuarios;

public record UsuarioDto(string Id, string Email, string? Nome, string? Matricula, string Papel, IList<string> Roles, bool Arquivado, bool TwoFactorEnabled, IReadOnlyList<string> LaboratorioIds);
public record UsuarioNomeDto(string Id, string Nome, string Email);
public record AlterarPapelCmd(string NovoPapel);
public record DefinirLaboratoriosCmd(IList<string> LaboratorioIds);

public interface IUsuariosService
{
    Task<IEnumerable<UsuarioDto>> ListarAsync();
    Task<IEnumerable<UsuarioNomeDto>> ListarNomesAsync();
    Task AlterarPapelAsync(string id, AlterarPapelCmd cmd, string usuarioEmail);
    Task ArquivarAsync(string id, string usuarioEmail, string requesterPapel);
    Task ExcluirAsync(string id, string requesterId, string usuarioEmail);
    Task DefinirLaboratoriosAsync(string id, DefinirLaboratoriosCmd cmd, Solicitante solicitante);
}

public class UsuariosService(
    IAuthRepository repo,
    IAuditoriaService auditoria,
    IUsuarioLaboratoriosRepository usuarioLabs,
    ILaboratoriosRepository labRepo,
    ISessoesRepository sessoes) : IUsuariosService
{
    private static readonly string[] PapeisValidos = ["Admin", "Professor", "Aluno"];

    public async Task<IEnumerable<UsuarioDto>> ListarAsync()
    {
        var porUsuario = await usuarioLabs.DeTodosAsync();
        return (await repo.GetAllAsync())
            .Select(u => new UsuarioDto(u.Id, u.Email, u.Nome, u.Matricula, u.Papel, u.Roles, u.Arquivado,
                u.TwoFactorEnabled, porUsuario.TryGetValue(u.Id, out var labs) ? labs : []));
    }

    public async Task<IEnumerable<UsuarioNomeDto>> ListarNomesAsync() =>
        (await repo.GetAllAsync())
            .Where(u => !u.Arquivado)
            .Select(u => new UsuarioNomeDto(u.Id, string.IsNullOrWhiteSpace(u.Nome) ? u.Email : u.Nome, u.Email))
            .OrderBy(u => u.Nome, StringComparer.CurrentCultureIgnoreCase);

    public async Task AlterarPapelAsync(string id, AlterarPapelCmd cmd, string usuarioEmail)
    {
        if (!PapeisValidos.Contains(cmd.NovoPapel))
            throw new ValidationException($"Papel inválido: {cmd.NovoPapel}.");
        if (await repo.FindByIdIncluindoArquivadosAsync(id) is null) return;
        await repo.UpdateRoleAsync(id, cmd.NovoPapel);
        var revogadas = await RevogarSessoesAsync(id);
        await auditoria.RegistrarAsync(usuarioEmail, "user.papel", "Usuários",
            $"Alterou papel do usuário {id} para {cmd.NovoPapel}; {revogadas} sessão(ões) revogada(s)",
            RiscoAuditoria.High);
    }

    public async Task ArquivarAsync(string id, string usuarioEmail, string requesterPapel)
    {
        if (await repo.FindByIdAsync(id) is not { } alvo) return;
        if (alvo.Papel != "Aluno" && requesterPapel != "Admin")
            throw new ValidationException($"Arquivar conta de {alvo.Papel} é só o Admin; você pode arquivar Aluno.");
        await repo.SoftDeleteAsync(id);
        var revogadas = await RevogarSessoesAsync(id);
        await auditoria.RegistrarAsync(usuarioEmail, "user.arquivar", "Usuários",
            $"Arquivou usuário {id}; {revogadas} sessão(ões) revogada(s)", RiscoAuditoria.High);
    }

    public async Task DefinirLaboratoriosAsync(string id, DefinirLaboratoriosCmd cmd, Solicitante solicitante)
    {
        if (await repo.FindByIdIncluindoArquivadosAsync(id) is not { } alvo) return;

        var pedidos = (cmd.LaboratorioIds ?? []).Distinct().ToList();
        var existentes = (await labRepo.GetAllAsync()).Select(l => l.Id).ToHashSet();
        if (pedidos.FirstOrDefault(labId => !existentes.Contains(labId)) is { } inexistente)
            throw new ValidationException($"Laboratório {inexistente} não encontrado.");

        var resultante = pedidos;
        if (solicitante.Papel != "Admin")
        {
            if (alvo.Papel != "Aluno")
                throw new ValidationException(
                    $"Definir os laboratórios de {alvo.Papel} é só o Admin; você pode definir de Aluno.");
            if (pedidos.FirstOrDefault(labId => !solicitante.Responde(labId)) is { } alheio)
                throw new ValidationException($"Você não responde pelo laboratório {alheio}.");

            var preservados = (await usuarioLabs.DoUsuarioAsync(id))
                .Where(labId => !solicitante.Responde(labId));
            resultante = preservados.Concat(pedidos).Distinct().ToList();
        }

        await usuarioLabs.DefinirAsync(id, resultante);
        var lista = resultante.Count == 0 ? "nenhum laboratório" : string.Join(", ", resultante);
        await auditoria.RegistrarAsync(solicitante.Email, "usuario.laboratorios", "Usuários",
            $"Definiu os laboratórios do usuário {id}: {lista}", RiscoAuditoria.Medium);
    }

    public async Task ExcluirAsync(string id, string requesterId, string usuarioEmail)
    {
        if (id == requesterId)
            throw new ValidationException("Você não pode excluir a própria conta.");
        if (!await repo.HardDeleteAsync(id)) return;
        await auditoria.RegistrarAsync(usuarioEmail, "user.excluir", "Usuários",
            $"Excluiu definitivamente o usuário {id}", RiscoAuditoria.High);
    }

    private async Task<int> RevogarSessoesAsync(string usuarioId)
    {
        var ativas = (await sessoes.GetAtivasByUsuarioAsync(usuarioId)).ToList();
        foreach (var s in ativas)
        {
            s.Revogada = true;
            await sessoes.UpdateAsync(s);
        }
        if (ativas.Count > 0) await sessoes.SaveChangesAsync();
        return ativas.Count;
    }
}

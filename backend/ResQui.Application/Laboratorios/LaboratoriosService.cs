using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Laboratorios;

public class LaboratoriosService(
    ILaboratoriosRepository repo,
    IAuditoriaService auditoria,
    IResiduosRepository residuosRepo,
    IUsuarioLaboratoriosRepository usuarioLabs) : ILaboratoriosService
{
    public async Task<IEnumerable<LaboratorioDto>> ListarAsync() =>
        (await repo.GetAllAsync()).Select(ToDto);

    public async Task<LaboratorioDto?> ObterPorIdAsync(string id) =>
        (await repo.GetByIdAsync(id)) is { } l ? ToDto(l) : null;

    public async Task<LaboratorioDto> CriarAsync(CriarLaboratorioCmd cmd, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nome)) throw new ValidationException("Nome é obrigatório.");
        if (cmd.Capacidade < 0) throw new ValidationException("Capacidade não pode ser negativa.");
        if (cmd.AreaM2 < 0) throw new ValidationException("Área não pode ser negativa.");

        var l = new Laboratorio
        {
            Nome = cmd.Nome, Responsavel = cmd.Responsavel, Email = cmd.Email,
            Areas = cmd.Areas, Sala = cmd.Sala, Armarios = cmd.Armarios,
            Capacidade = cmd.Capacidade, AreaM2 = cmd.AreaM2,
            Ventilacao = cmd.Ventilacao, Cor = cmd.Cor,
            Criado = DateOnly.FromDateTime(DateTime.UtcNow),
        };
        await repo.AddAsync(l);
        await repo.SaveChangesAsync();
        await usuarioLabs.AdicionarAsync(solicitante.Id, l.Id);
        await auditoria.RegistrarAsync(solicitante.Email, "lab.criar", "Laboratórios",
            $"Criou laboratório {l.Id} — {l.Nome}", RiscoAuditoria.Low);
        return ToDto(l);
    }

    public async Task<LaboratorioDto?> AtualizarAsync(string id, AtualizarLaboratorioCmd cmd, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nome)) throw new ValidationException("Nome é obrigatório.");
        if (cmd.Capacidade < 0) throw new ValidationException("Capacidade não pode ser negativa.");
        if (cmd.AreaM2 < 0) throw new ValidationException("Área não pode ser negativa.");

        var l = await repo.GetByIdAsync(id);
        if (l is null) return null;
        GarantirEscopo(id, solicitante);
        l.Nome = cmd.Nome; l.Responsavel = cmd.Responsavel; l.Email = cmd.Email;
        l.Areas = cmd.Areas; l.Sala = cmd.Sala; l.Armarios = cmd.Armarios;
        l.Capacidade = cmd.Capacidade; l.AreaM2 = cmd.AreaM2;
        l.Ventilacao = cmd.Ventilacao; l.Cor = cmd.Cor;
        await repo.UpdateAsync(l);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "lab.atualizar", "Laboratórios",
            $"Editou laboratório {id} — {l.Nome}", RiscoAuditoria.Low);
        return ToDto(l);
    }

    public async Task<bool> DeletarAsync(string id, Solicitante solicitante)
    {
        if (await repo.GetByIdAsync(id) is null) return false;
        GarantirEscopo(id, solicitante);

        // Com a FK Restrict, apagar um laboratório vinculado estouraria no banco (500).
        // A checagem antecipada devolve 400 com o que o usuário precisa fazer.
        var residuos = (await residuosRepo.GetAllAsync()).Count(r => r.LaboratorioId == id);
        if (residuos > 0)
            throw new ValidationException(
                $"Laboratório {id} tem {residuos} resíduo(s) vinculado(s); "
                + "transfira ou remova esses registros antes de excluir.");

        await repo.DeleteAsync(id);
        await repo.SaveChangesAsync();
        await auditoria.RegistrarAsync(solicitante.Email, "lab.deletar", "Laboratórios",
            $"Removeu laboratório {id}", RiscoAuditoria.Medium);
        return true;
    }

    private static void GarantirEscopo(string id, Solicitante solicitante)
    {
        if (!solicitante.Responde(id))
            throw new AcessoNegadoException($"Você não responde pelo laboratório {id}.");
    }

    private static LaboratorioDto ToDto(Laboratorio l) =>
        new(l.Id, l.Nome, l.Responsavel, l.Email,
            l.Areas, l.Sala, l.Armarios,
            l.Capacidade, l.AreaM2, l.Ventilacao, l.Cor, l.Criado);
}

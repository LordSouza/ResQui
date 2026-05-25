using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Laboratorios;

public class LaboratoriosService(ILaboratoriosRepository repo) : ILaboratoriosService
{
    public async Task<IEnumerable<LaboratorioDto>> ListarAsync() =>
        (await repo.GetAllAsync()).Select(ToDto);

    public async Task<LaboratorioDto?> ObterPorIdAsync(string id) =>
        (await repo.GetByIdAsync(id)) is { } l ? ToDto(l) : null;

    public async Task<LaboratorioDto> CriarAsync(CriarLaboratorioCmd cmd)
    {
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
        return ToDto(l);
    }

    public async Task<LaboratorioDto?> AtualizarAsync(string id, AtualizarLaboratorioCmd cmd)
    {
        var l = await repo.GetByIdAsync(id);
        if (l is null) return null;
        l.Nome = cmd.Nome; l.Responsavel = cmd.Responsavel; l.Email = cmd.Email;
        l.Areas = cmd.Areas; l.Sala = cmd.Sala; l.Armarios = cmd.Armarios;
        l.Capacidade = cmd.Capacidade; l.AreaM2 = cmd.AreaM2;
        l.Ventilacao = cmd.Ventilacao; l.Cor = cmd.Cor;
        await repo.UpdateAsync(l);
        await repo.SaveChangesAsync();
        return ToDto(l);
    }

    public async Task<bool> DeletarAsync(string id)
    {
        if (await repo.GetByIdAsync(id) is null) return false;
        await repo.DeleteAsync(id);
        await repo.SaveChangesAsync();
        return true;
    }

    private static LaboratorioDto ToDto(Laboratorio l) =>
        new(l.Id, l.Nome, l.Responsavel, l.Email,
            l.Areas, l.Sala, l.Armarios,
            l.Capacidade, l.AreaM2, l.Ventilacao, l.Cor, l.Criado);
}

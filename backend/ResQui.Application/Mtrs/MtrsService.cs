using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Mtrs;

public class MtrsService(IMtrsRepository repo) : IMtrsService
{
    public async Task<IEnumerable<MtrDto>> ListarAsync() =>
        (await repo.GetAllAsync()).Select(ToDto);

    public async Task<MtrDto?> ObterPorIdAsync(int id) =>
        (await repo.GetByIdAsync(id)) is { } m ? ToDto(m) : null;

    public async Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string usuarioId)
    {
        var m = new Mtr { Numero = cmd.Numero, Gerador = cmd.Gerador, Transportadora = cmd.Transportadora, ResponsavelId = usuarioId };
        await repo.AddAsync(m);
        await repo.SaveChangesAsync();
        return ToDto(m);
    }

    public async Task<EnviarSinirResult> EnviarSinirAsync(int id)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return new EnviarSinirResult(false, "MTR não encontrado", "");
        if (m.Status != MtrStatus.Rascunho && m.Status != MtrStatus.PendenteSinir)
            return new EnviarSinirResult(false, "MTR não está em estado enviável", m.Status.ToString());

        // Simulates SINIR submission (70% success, matching frontend behavior)
        var sucesso = Random.Shared.NextDouble() > 0.3;
        m.Status = sucesso ? MtrStatus.AceitoSinir : MtrStatus.PendenteSinir;
        await repo.UpdateAsync(m);
        await repo.SaveChangesAsync();
        return new EnviarSinirResult(sucesso, sucesso ? "Aceito pelo SINIR" : "Pendente no SINIR", m.Status.ToString());
    }

    public async Task<IEnumerable<EnviarSinirResult>> EnviarBatchAsync()
    {
        var rascunhos = (await repo.GetAllAsync()).Where(m => m.Status == MtrStatus.Rascunho).ToList();
        var results = new List<EnviarSinirResult>();
        foreach (var m in rascunhos)
            results.Add(await EnviarSinirAsync(m.Id));
        return results;
    }

    private static MtrDto ToDto(Mtr m) =>
        new(m.Id, m.Numero, m.Gerador, m.Transportadora, m.Status.ToString(), m.DataEmissao);
}

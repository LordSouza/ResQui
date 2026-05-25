using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Mtrs;

public class MtrsService(IMtrsRepository repo, IResiduosRepository residuosRepo) : IMtrsService
{
    public async Task<IEnumerable<MtrDto>> ListarAsync()
    {
        var mtrs = await repo.GetAllAsync();
        var residuos = await residuosRepo.GetAllAsync();
        return mtrs.Select(m => ToDto(m, residuos));
    }

    public async Task<MtrDto?> ObterPorIdAsync(int id)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return null;
        var residuos = await residuosRepo.GetAllAsync();
        return ToDto(m, residuos);
    }

    public async Task<MtrDto> CriarAsync(CriarMtrCmd cmd, string usuarioId)
    {
        var numero = $"MTR-{DateTime.UtcNow.Year}-{Random.Shared.Next(1000, 9999)}";
        var m = new Mtr
        {
            Numero = numero,
            Gerador = cmd.Gerador,
            Transportadora = cmd.Transportadora,
            Destinador = cmd.Destinador,
            CodigoIbama = cmd.CodigoIbama,
            ResponsavelId = usuarioId,
        };
        await repo.AddAsync(m);
        await repo.SaveChangesAsync();

        // Vincula resíduos e calcula massa
        var residuos = new List<Residuo>();
        foreach (var rid in cmd.ResiduoIds)
        {
            var r = await residuosRepo.GetByIdAsync(rid);
            if (r is null) continue;
            r.MtrId = m.Id;
            r.Status = "em-coleta";
            await residuosRepo.UpdateAsync(r);
            residuos.Add(r);
        }
        m.Massa = CalcularMassa(residuos);
        await repo.UpdateAsync(m);
        await residuosRepo.SaveChangesAsync();
        await repo.SaveChangesAsync();

        return ToDto(m, residuos);
    }

    public async Task<EnviarSinirResult> EnviarSinirAsync(int id)
    {
        var m = await repo.GetByIdAsync(id);
        if (m is null) return new EnviarSinirResult(false, "MTR não encontrado", "");
        if (m.Status != MtrStatus.Rascunho && m.Status != MtrStatus.PendenteSinir)
            return new EnviarSinirResult(false, "MTR não está em estado enviável", m.Status.ToString());

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

    private static decimal CalcularMassa(IEnumerable<Residuo> residuos)
    {
        var toKg = new Dictionary<string, decimal>
        {
            ["kg"] = 1m, ["g"] = 0.001m, ["L"] = 1.0m, ["mL"] = 0.001m, ["m³"] = 1000m,
        };
        return residuos.Sum(r => r.Volume * (toKg.TryGetValue(r.Unidade, out var f) ? f : 1m));
    }

    private static MtrDto ToDto(Mtr m, IEnumerable<Residuo> todosResíduos)
    {
        var ids = todosResíduos.Where(r => r.MtrId == m.Id).Select(r => r.Id).ToList();
        return new MtrDto(m.Id, m.Numero, m.Gerador, m.Transportadora,
            m.Status.ToString(), m.DataEmissao, m.Destinador, m.CodigoIbama, m.Massa, ids);
    }
}

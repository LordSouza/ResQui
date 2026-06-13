using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface ISessoesRepository
{
    Task AddAsync(SessaoToken sessao);
    Task<SessaoToken?> GetByJtiAsync(string jti);
    Task<IEnumerable<SessaoToken>> GetAtivasByUsuarioAsync(string usuarioId);
    Task UpdateAsync(SessaoToken sessao);
    Task SaveChangesAsync();
}

using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IRedefinicoesSenhaRepository
{
    Task AddAsync(RedefinicaoSenha redefinicao);
    Task<RedefinicaoSenha?> GetByTokenHashAsync(string tokenHash);
    Task<int> ContarDesdeAsync(string usuarioId, DateTime desde);
    Task<IEnumerable<RedefinicaoSenha>> PendentesDoUsuarioAsync(string usuarioId);
    Task SaveChangesAsync();
}

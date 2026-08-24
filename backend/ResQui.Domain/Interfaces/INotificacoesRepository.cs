using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface INotificacoesRepository
{
    Task<IEnumerable<Notificacao>> GetByUsuarioAsync(string usuarioId);
    Task MarkAsReadAsync(int id, string usuarioId);
    Task AddAsync(Notificacao notificacao);
    Task SaveChangesAsync();
    Task<bool> ExisteNaoLidaAsync(string usuarioId, string tipo, string referenciaId);
    Task MarcarTodasLidasAsync(string usuarioId);
}

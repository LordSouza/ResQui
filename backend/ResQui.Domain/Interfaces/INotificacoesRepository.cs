using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface INotificacoesRepository
{
    Task<IEnumerable<Notificacao>> GetByUsuarioAsync(string usuarioId);
    Task MarkAsReadAsync(int id);
    Task AddAsync(Notificacao notificacao);
    Task SaveChangesAsync();
}

using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface INotificacoesRepository
{
    /// <summary>Não lidas primeiro, depois as mais recentes; no máximo 50 itens.</summary>
    Task<IEnumerable<Notificacao>> GetByUsuarioAsync(string usuarioId);
    Task<bool> MarkAsReadAsync(int id, string usuarioId);
    Task AddAsync(Notificacao notificacao);
    Task SaveChangesAsync();
    /// <summary>Considera lidas e não lidas: cada condição gera uma notificação só uma vez.</summary>
    Task<bool> ExisteAsync(string usuarioId, string tipo, string referenciaId);
    Task<int> MarcarTodasLidasAsync(string usuarioId);
    Task<int> ExcluirLidasCriadasAntesDeAsync(DateTime criadasAntesDeUtc);
}

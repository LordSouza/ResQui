using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface INotificacoesRepository
{
    /// <summary>Não lidas primeiro, depois as mais recentes; no máximo 50 itens.</summary>
    Task<IEnumerable<Notificacao>> GetByUsuarioAsync(string usuarioId);
    Task<bool> MarkAsReadAsync(int id, string usuarioId);
    Task AddAsync(Notificacao notificacao);
    Task SaveChangesAsync();
    /// <summary>
    /// Considera lidas e não lidas: cada condição gera uma notificação só uma vez por severidade,
    /// então uma escalada (amber → red) avisa de novo.
    /// </summary>
    Task<bool> ExisteAsync(string usuarioId, string tipo, string referenciaId, string severidade);
    /// <summary>
    /// Apaga as notificações lidas do tipo cuja referência saiu da condição, para que uma
    /// recorrência (reagente reposto que volta a faltar) avise de novo. Não lidas ficam.
    /// </summary>
    Task<int> RearmarAsync(string tipo, IReadOnlyCollection<string> referenciasNaCondicao);
    Task<int> MarcarTodasLidasAsync(string usuarioId);
    Task<int> ExcluirLidasCriadasAntesDeAsync(DateTime criadasAntesDeUtc);
}

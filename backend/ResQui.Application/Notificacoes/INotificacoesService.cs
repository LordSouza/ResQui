namespace ResQui.Application.Notificacoes;

public interface INotificacoesService
{
    Task<IEnumerable<NotificacaoDto>> ListarPorUsuarioAsync(string usuarioId);
    Task MarcarComoLidaAsync(int id);
    Task MarcarTodasLidasAsync(string usuarioId);
    Task<NotificacaoPrefsDto> GetPrefsAsync(string usuarioId);
    Task SavePrefsAsync(string usuarioId, NotificacaoPrefsDto prefs);
}

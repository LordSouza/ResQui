namespace ResQui.Application.Notificacoes;

public interface INotificacoesService
{
    Task<IEnumerable<NotificacaoDto>> ListarPorUsuarioAsync(string usuarioId);
    Task MarcarComoLidaAsync(int id, string usuarioId);
    Task MarcarTodasLidasAsync(string usuarioId);
    Task CriarAsync(string usuarioId, string mensagem, string tipo, string referenciaId, string severidade);
    Task<NotificacaoPrefsDto> GetPrefsAsync(string usuarioId);
    Task SavePrefsAsync(string usuarioId, NotificacaoPrefsDto prefs);
}

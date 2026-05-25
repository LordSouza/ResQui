namespace ResQui.Application.Notificacoes;

public interface INotificacoesService
{
    Task<IEnumerable<NotificacaoDto>> ListarPorUsuarioAsync(string usuarioId);
    Task MarcarComoLidaAsync(int id);
}

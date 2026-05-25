using ResQui.Domain.Interfaces;

namespace ResQui.Application.Notificacoes;

public class NotificacoesService(INotificacoesRepository repo) : INotificacoesService
{
    public async Task<IEnumerable<NotificacaoDto>> ListarPorUsuarioAsync(string usuarioId) =>
        (await repo.GetByUsuarioAsync(usuarioId))
            .Select(n => new NotificacaoDto(n.Id, n.Mensagem, n.Lida, n.CriadaEm));

    public async Task MarcarComoLidaAsync(int id) =>
        await repo.MarkAsReadAsync(id);
}

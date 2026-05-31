using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IChamadosRepository
{
    Task<IEnumerable<Chamado>> GetAllWithComentariosAsync();
    Task<Chamado?> GetByIdWithComentariosAsync(int id);
    Task AddAsync(Chamado chamado);
    Task AddComentarioAsync(ChamadoComentario comentario);
    Task UpdateAsync(Chamado chamado);
    Task SaveChangesAsync();
}

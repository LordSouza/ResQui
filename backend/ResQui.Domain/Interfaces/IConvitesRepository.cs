using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IConvitesRepository
{
    Task AddAsync(Convite convite);
    Task<Convite?> GetByTokenHashAsync(string tokenHash);
    Task<Convite?> GetByIdAsync(int id);
    Task<IEnumerable<Convite>> GetAllAsync();
    Task SaveChangesAsync();
}

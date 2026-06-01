using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface ICompatOverridesRepository
{
    Task<IEnumerable<CompatOverride>> GetAllAsync();
    Task<CompatOverride?> GetAsync(int classeA, int classeB);
    Task UpsertAsync(CompatOverride entry);
    Task DeleteAsync(int classeA, int classeB);
}

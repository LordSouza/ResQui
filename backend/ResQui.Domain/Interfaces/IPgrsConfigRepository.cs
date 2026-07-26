using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface IPgrsConfigRepository
{
    Task<ConfiguracaoPgrs?> GetAsync();
    Task AddAsync(ConfiguracaoPgrs cfg);
    Task SaveChangesAsync();
}

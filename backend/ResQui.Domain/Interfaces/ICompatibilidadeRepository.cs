using ResQui.Domain.Entities;

namespace ResQui.Domain.Interfaces;

public interface ICompatibilidadeRepository
{
    Task<CompatEntry?> GetNivelAsync(int classeA, int classeB);
    Task<IEnumerable<CompatEntry>> GetAllAsync();
}

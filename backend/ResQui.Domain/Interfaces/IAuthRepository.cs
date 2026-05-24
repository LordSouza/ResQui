namespace ResQui.Domain.Interfaces;

public record UsuarioInfo(
    string Id,
    string Email,
    string? Matricula,
    string Papel,
    IList<string> Roles
);

public interface IAuthRepository
{
    Task<UsuarioInfo?> FindByEmailAsync(string email);
    Task<UsuarioInfo?> FindByIdAsync(string id);
    Task<bool> CheckPasswordAsync(string userId, string password);
    Task<string> CreateAsync(string email, string password, string? matricula, string papel);
    Task AddToRoleAsync(string userId, string role);
    Task<IList<string>> GetRolesAsync(string userId);
    Task<IEnumerable<UsuarioInfo>> GetAllAsync();
    Task UpdateRoleAsync(string userId, string newRole);
    Task SoftDeleteAsync(string userId);
}

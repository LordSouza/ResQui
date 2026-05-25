namespace ResQui.Application.Usuarios;

public record UsuarioDto(string Id, string Email, string? Matricula, string Papel, IList<string> Roles);
public record AlterarPapelCmd(string NovoPapel);

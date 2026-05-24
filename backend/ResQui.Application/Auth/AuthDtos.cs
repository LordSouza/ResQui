namespace ResQui.Application.Auth;

public record LoginCmd(string Email, string Senha);
public record RegisterCmd(string Email, string Senha, string? Matricula, string Papel);
public record TokenDto(string Token, DateTime ExpireAt, UserProfileDto User);
public record UserProfileDto(string Id, string Email, string? Matricula, string Papel, IList<string> Roles);

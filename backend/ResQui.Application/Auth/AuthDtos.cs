namespace ResQui.Application.Auth;

public record LoginCmd(string Email, string Senha);
public record RegisterCmd(string Email, string Senha, string? Matricula, string Papel, string? Nome);
public record TokenDto(string Token, DateTime ExpireAt, UserProfileDto User);
public record UserProfileDto(string Id, string Email, string? Nome, string? Matricula, string Papel, IList<string> Roles);

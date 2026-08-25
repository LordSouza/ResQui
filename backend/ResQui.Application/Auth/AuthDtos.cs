namespace ResQui.Application.Auth;

public record LoginCmd(string Email, string Senha, string? Codigo2fa = null);
public record RegisterCmd(string Email, string Senha, string? Matricula, string Papel, string? Nome);
public record AtualizarPerfilCmd(string Nome, string Email);
public record TokenDto(string Token, DateTime ExpireAt, UserProfileDto User);
public record UserProfileDto(string Id, string Email, string? Nome, string? Matricula, string Papel, IList<string> Roles, bool TwoFactorEnabled = false, int CodigosRecuperacaoRestantes = 0);

public record LoginResultDto(bool Requires2fa, TokenDto? Token);
public record AlterarSenhaCmd(string SenhaAtual, string NovaSenha);
public record Codigo2faCmd(string Codigo);
public record Setup2faCmd(string Senha);
public record Setup2faDto(string Secret, string OtpauthUri, string QrPngBase64);
public record SessaoDto(string Jti, DateTime CriadaEm, DateTime ExpiraEm, string? UserAgent, bool Atual);

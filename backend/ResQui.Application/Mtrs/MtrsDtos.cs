namespace ResQui.Application.Mtrs;

public record MtrDto(int Id, string Numero, string Gerador, string Transportadora, string Status, DateTime DataEmissao);
public record CriarMtrCmd(string Numero, string Gerador, string Transportadora);
public record EnviarSinirResult(bool Sucesso, string Mensagem, string NovoStatus);

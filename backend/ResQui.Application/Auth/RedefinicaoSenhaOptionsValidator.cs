using Microsoft.Extensions.Options;

namespace ResQui.Application.Auth;

public class RedefinicaoSenhaOptionsValidator(bool emailHabilitado) : IValidateOptions<RedefinicaoSenhaOptions>
{
    public ValidateOptionsResult Validate(string? name, RedefinicaoSenhaOptions options)
    {
        if (!emailHabilitado)
            return ValidateOptionsResult.Success;

        if (!Uri.TryCreate(options.UrlPublica, UriKind.Absolute, out var url)
            || (url.Scheme != Uri.UriSchemeHttp && url.Scheme != Uri.UriSchemeHttps))
            return ValidateOptionsResult.Fail("Email:Enabled é true, mas App:UrlPublica não é uma URL http(s) absoluta — defina APP_URL_PUBLICA (ex.: https://resqui.com.br) para os links de redefinição de senha.");

        return ValidateOptionsResult.Success;
    }
}

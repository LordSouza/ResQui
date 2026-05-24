using System.Text;
using Microsoft.Extensions.Options;

namespace ResQui.Application.Auth;

public class JwtOptionsValidator : IValidateOptions<JwtOptions>
{
    public ValidateOptionsResult Validate(string? name, JwtOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Key))
            return ValidateOptionsResult.Fail("JwtOptions.Key must not be empty.");

        if (Encoding.UTF8.GetByteCount(options.Key) < 32)
            return ValidateOptionsResult.Fail("JwtOptions.Key must be at least 32 bytes (UTF-8).");

        return ValidateOptionsResult.Success;
    }
}

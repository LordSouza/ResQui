using Microsoft.Extensions.Options;

namespace ResQui.Application.Assistente;

public class AssistenteOptionsValidator : IValidateOptions<AssistenteOptions>
{
    public ValidateOptionsResult Validate(string? name, AssistenteOptions options)
    {
        if (options.Enabled && string.IsNullOrWhiteSpace(options.ApiKey))
            return ValidateOptionsResult.Fail("Assistente:Enabled é true, mas Assistente:ApiKey está vazia — defina Assistente__ApiKey ou desligue o assistente.");

        return ValidateOptionsResult.Success;
    }
}

namespace ResQui.Application.Common;

public class MuitasTentativasException(string message, TimeSpan tentarNovamenteEm) : Exception(message)
{
    public TimeSpan TentarNovamenteEm { get; } = tentarNovamenteEm;
}

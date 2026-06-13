using ResQui.Domain.Entities;

namespace ResQui.Application.Pdf;

public interface IPdfService
{
    byte[] RotuloReagente(Reagente reagente);
    byte[] ManifestoMtr(Mtr mtr, IList<Residuo> residuos);
}

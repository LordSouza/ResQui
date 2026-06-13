using ResQui.Domain.Entities;

namespace ResQui.Application.Pdf;

public interface IPdfService
{
    byte[] RotuloReagente(Reagente reagente);
    byte[] RotuloLote(Reagente reagente, ReagenteLote lote);
    byte[] ManifestoMtr(Mtr mtr, IList<Residuo> residuos);
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class ReagenteLoteConfiguration : IEntityTypeConfiguration<ReagenteLote>
{
    public void Configure(EntityTypeBuilder<ReagenteLote> builder)
    {
        // Cascade — o lote é o frasco físico daquela substância; sem o reagente, não faz sentido existir.
        builder.HasOne<Reagente>()
            .WithMany()
            .HasForeignKey(l => l.ReagenteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

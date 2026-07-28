using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class ResiduoConfiguration : IEntityTypeConfiguration<Residuo>
{
    public void Configure(EntityTypeBuilder<Residuo> builder)
    {
        // Sem navigation property: a FK existe no banco, mas o domínio não passa a navegar.
        // Restrict — resíduo é registro regulatório e não pode cair junto com o laboratório.
        builder.HasOne<Laboratorio>()
            .WithMany()
            .HasForeignKey(r => r.LaboratorioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Mtr>()
            .WithMany()
            .HasForeignKey(r => r.MtrId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

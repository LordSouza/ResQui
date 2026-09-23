using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class ConviteLaboratorioConfiguration : IEntityTypeConfiguration<ConviteLaboratorio>
{
    public void Configure(EntityTypeBuilder<ConviteLaboratorio> builder)
    {
        builder.HasKey(cl => new { cl.ConviteId, cl.LaboratorioId });

        builder.HasOne<Convite>()
            .WithMany()
            .HasForeignKey(cl => cl.ConviteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Laboratorio>()
            .WithMany()
            .HasForeignKey(cl => cl.LaboratorioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

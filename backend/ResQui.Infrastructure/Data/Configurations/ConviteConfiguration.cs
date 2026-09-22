using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class ConviteConfiguration : IEntityTypeConfiguration<Convite>
{
    public void Configure(EntityTypeBuilder<Convite> builder)
    {
        builder.HasIndex(c => c.TokenHash).IsUnique();

        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(c => c.CriadoPorId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(c => c.UsadoPorId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

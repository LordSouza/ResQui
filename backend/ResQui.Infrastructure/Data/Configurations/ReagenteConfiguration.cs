using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class ReagenteConfiguration : IEntityTypeConfiguration<Reagente>
{
    public void Configure(EntityTypeBuilder<Reagente> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasMaxLength(20);
        builder.Property(r => r.Nome).HasMaxLength(200).IsRequired();
        builder.Property(r => r.Cas).HasMaxLength(20);
        builder.Property(r => r.Estoque).HasPrecision(10, 3);
        builder.Property(r => r.EstoqueMin).HasPrecision(10, 3);
        builder.Ignore(r => r.ValidadeStatus);
        builder.HasOne(r => r.Ghs)
               .WithOne()
               .HasForeignKey<ReagenteGhs>(g => g.ReagenteId);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class AuditoriaConfiguration : IEntityTypeConfiguration<AuditoriaEntry>
{
    public void Configure(EntityTypeBuilder<AuditoriaEntry> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Who).HasMaxLength(200);
        builder.Property(a => a.What).HasMaxLength(200);
        builder.Property(a => a.Where).HasMaxLength(200);
        builder.Property(a => a.Detail).HasMaxLength(1000);
        builder.Property(a => a.HashAnterior).HasMaxLength(64);
        builder.Property(a => a.Hash).HasMaxLength(64);
        builder.HasIndex(a => a.Sequencia).IsUnique();
    }
}

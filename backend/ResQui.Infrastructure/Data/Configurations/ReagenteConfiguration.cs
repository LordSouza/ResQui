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
        builder.Property(r => r.Id)
            .HasMaxLength(20)
            .HasDefaultValueSql("'R-' || lpad(nextval('reagentes_id_seq')::text, 5, '0')")
            .ValueGeneratedOnAdd();
        builder.Property(r => r.Nome).HasMaxLength(200).IsRequired();
        builder.Property(r => r.Cas).HasMaxLength(20);
        builder.Property(r => r.Estoque).HasPrecision(10, 3);
        builder.Property(r => r.EstoqueMin).HasPrecision(10, 3);
        builder.Ignore(r => r.ValidadeStatus);
        builder.Property(r => r.Armario).HasMaxLength(200).IsRequired();
        builder.HasOne(r => r.Laboratorio)
            .WithMany()
            .HasForeignKey(r => r.LaboratorioId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(r => r.Ghs)
               .WithOne()
               .HasForeignKey<ReagenteGhs>(g => g.ReagenteId);
    }
}

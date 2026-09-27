using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class LaboratorioConfiguration : IEntityTypeConfiguration<Laboratorio>
{
    public void Configure(EntityTypeBuilder<Laboratorio> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id)
            .HasMaxLength(20)
            .HasDefaultValueSql("'Lab-' || lpad(nextval('laboratorios_id_seq')::text, 3, '0')")
            .ValueGeneratedOnAdd();
        builder.Property(l => l.Nome).HasMaxLength(200).IsRequired();
        builder.Property(l => l.Sala).HasMaxLength(200);
        builder.Property(l => l.Cor).HasMaxLength(20);
        builder.Property(l => l.Armarios).HasColumnType("text[]");
    }
}

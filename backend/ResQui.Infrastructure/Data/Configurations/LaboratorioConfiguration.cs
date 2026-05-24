using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class LaboratorioConfiguration : IEntityTypeConfiguration<Laboratorio>
{
    private static readonly JsonSerializerOptions _json = new();

    public void Configure(EntityTypeBuilder<Laboratorio> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Nome).HasMaxLength(200).IsRequired();

        builder.Property(l => l.AreasDeArmazenamento)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, _json),
                v => JsonSerializer.Deserialize<List<string>>(v, _json) ?? new List<string>());
    }
}

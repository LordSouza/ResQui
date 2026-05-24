using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class ReagenteGhsConfiguration : IEntityTypeConfiguration<ReagenteGhs>
{
    private static readonly JsonSerializerOptions _json = new();

    public void Configure(EntityTypeBuilder<ReagenteGhs> builder)
    {
        builder.HasKey(g => g.Id);

        builder.Property(g => g.Pictos)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, _json),
                v => JsonSerializer.Deserialize<List<string>>(v, _json) ?? new List<string>());

        builder.Property(g => g.FrasesH)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, _json),
                v => JsonSerializer.Deserialize<List<string>>(v, _json) ?? new List<string>());

        builder.Property(g => g.FrasesP)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, _json),
                v => JsonSerializer.Deserialize<List<string>>(v, _json) ?? new List<string>());
    }
}

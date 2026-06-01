using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class CompatOverrideConfiguration : IEntityTypeConfiguration<CompatOverride>
{
    public void Configure(EntityTypeBuilder<CompatOverride> builder)
    {
        builder.HasKey(c => new { c.ClasseA, c.ClasseB });
        builder.ToTable("compat_overrides");
    }
}

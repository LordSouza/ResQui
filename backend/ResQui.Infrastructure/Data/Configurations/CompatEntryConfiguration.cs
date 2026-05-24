using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class CompatEntryConfiguration : IEntityTypeConfiguration<CompatEntry>
{
    public void Configure(EntityTypeBuilder<CompatEntry> builder)
    {
        builder.HasKey(c => new { c.ClasseA, c.ClasseB });
    }
}

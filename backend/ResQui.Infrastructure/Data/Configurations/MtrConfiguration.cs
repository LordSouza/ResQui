using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class MtrConfiguration : IEntityTypeConfiguration<Mtr>
{
    public void Configure(EntityTypeBuilder<Mtr> builder)
    {
        // SetNull — o manifesto é registro regulatório e sobrevive à exclusão de quem o emitiu.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(m => m.ResponsavelId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

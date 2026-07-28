using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class RelatorioGeradoConfiguration : IEntityTypeConfiguration<RelatorioGerado>
{
    public void Configure(EntityTypeBuilder<RelatorioGerado> builder)
    {
        // SetNull — registro histórico sobrevive à exclusão do autor.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(g => g.GeradoPorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;

namespace ResQui.Infrastructure.Data.Configurations;

public class ConfiguracaoPgrsConfiguration : IEntityTypeConfiguration<ConfiguracaoPgrs>
{
    public void Configure(EntityTypeBuilder<ConfiguracaoPgrs> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).ValueGeneratedNever(); // singleton: Id fixo 1
        builder.ToTable("configuracao_pgrs");
    }
}

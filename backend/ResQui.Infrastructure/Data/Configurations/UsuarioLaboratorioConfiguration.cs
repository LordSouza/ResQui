using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class UsuarioLaboratorioConfiguration : IEntityTypeConfiguration<UsuarioLaboratorio>
{
    public void Configure(EntityTypeBuilder<UsuarioLaboratorio> builder)
    {
        builder.HasKey(ul => new { ul.UsuarioId, ul.LaboratorioId });

        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(ul => ul.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Laboratorio>()
            .WithMany()
            .HasForeignKey(ul => ul.LaboratorioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

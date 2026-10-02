using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class RedefinicaoSenhaConfiguration : IEntityTypeConfiguration<RedefinicaoSenha>
{
    public void Configure(EntityTypeBuilder<RedefinicaoSenha> builder)
    {
        builder.HasIndex(r => r.TokenHash).IsUnique();
        builder.HasIndex(r => new { r.UsuarioId, r.CriadaEm });

        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

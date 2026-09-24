using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class SessaoTokenConfiguration : IEntityTypeConfiguration<SessaoToken>
{
    public void Configure(EntityTypeBuilder<SessaoToken> builder)
    {
        builder.HasIndex(s => s.Jti);

        // Cascade — dado pessoal do usuário, some junto com a conta.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(s => s.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

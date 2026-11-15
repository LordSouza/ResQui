using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class NotificacaoConfiguration : IEntityTypeConfiguration<Notificacao>
{
    public void Configure(EntityTypeBuilder<Notificacao> builder)
    {
        // Cascade — dado pessoal do usuário, some junto com a conta.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(n => n.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        // Deduplicação dos checkers: uma consulta por (usuário, item) a cada ciclo do job.
        builder.HasIndex(n => new { n.UsuarioId, n.Tipo, n.ReferenciaId });
    }
}

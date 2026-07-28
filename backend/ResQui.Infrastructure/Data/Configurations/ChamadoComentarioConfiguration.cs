using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class ChamadoComentarioConfiguration : IEntityTypeConfiguration<ChamadoComentario>
{
    public void Configure(EntityTypeBuilder<ChamadoComentario> builder)
    {
        // O comentário é parte do chamado — já era cascade por convenção; explicitado aqui.
        builder.HasOne(k => k.Chamado)
            .WithMany(c => c.Comentarios)
            .HasForeignKey(k => k.ChamadoId)
            .OnDelete(DeleteBehavior.Cascade);

        // Autoria é registro histórico: o comentário sobrevive à exclusão do usuário.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(k => k.AutorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class ChamadoConfiguration : IEntityTypeConfiguration<Chamado>
{
    public void Configure(EntityTypeBuilder<Chamado> builder)
    {
        // Restrict — o chamado é histórico do laboratório e não pode cair junto com ele
        // (LaboratoriosService.DeletarAsync checa os vínculos antes e devolve 400).
        builder.HasOne<Laboratorio>()
            .WithMany()
            .HasForeignKey(c => c.LaboratorioId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // Autoria é registro histórico: o chamado sobrevive à exclusão do usuário.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(c => c.AbertoPorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

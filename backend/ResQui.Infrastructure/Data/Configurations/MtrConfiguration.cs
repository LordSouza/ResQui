using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data.Configurations;

public class MtrConfiguration : IEntityTypeConfiguration<Mtr>
{
    public void Configure(EntityTypeBuilder<Mtr> builder)
    {
        // Número gerado pelo banco, no mesmo padrão de Reagente.Id / Laboratorio.Id — a sequência
        // garante unicidade sem depender de sorteio no serviço.
        builder.Property(m => m.Numero)
            .HasMaxLength(30)
            .HasDefaultValueSql("'MTR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('mtrs_numero_seq')::text, 4, '0')")
            .ValueGeneratedOnAdd();
        builder.HasIndex(m => m.Numero).IsUnique();

        // SetNull — o manifesto é registro regulatório e sobrevive à exclusão de quem o emitiu.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(m => m.ResponsavelId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        // SetNull pela mesma razão do ResponsavelId: o registro de destinação sobrevive à
        // exclusão de quem o confirmou.
        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(m => m.DestinadoPorId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ResQui.Domain.Entities;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<Usuario>(options)
{
    public DbSet<Reagente> Reagentes => Set<Reagente>();
    public DbSet<ReagenteGhs> ReagentesGhs => Set<ReagenteGhs>();
    public DbSet<Laboratorio> Laboratorios => Set<Laboratorio>();
    public DbSet<Residuo> Residuos => Set<Residuo>();
    public DbSet<Mtr> Mtrs => Set<Mtr>();
    public DbSet<AuditoriaEntry> Auditoria => Set<AuditoriaEntry>();
    public DbSet<Notificacao> Notificacoes => Set<Notificacao>();
    public DbSet<Chamado> Chamados => Set<Chamado>();
    public DbSet<ChamadoComentario> ChamadoComentarios => Set<ChamadoComentario>();
    public DbSet<CompatEntry> CompatEntries => Set<CompatEntry>();
    public DbSet<CompatOverride> CompatOverrides => Set<CompatOverride>();
    public DbSet<RelatorioGerado> RelatoriosGerados => Set<RelatorioGerado>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}

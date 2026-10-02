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
    public DbSet<ReagenteLote> ReagenteLotes => Set<ReagenteLote>();
    public DbSet<Laboratorio> Laboratorios => Set<Laboratorio>();
    public DbSet<Residuo> Residuos => Set<Residuo>();
    public DbSet<Mtr> Mtrs => Set<Mtr>();
    public DbSet<AuditoriaEntry> Auditoria => Set<AuditoriaEntry>();
    public DbSet<Notificacao> Notificacoes => Set<Notificacao>();
    public DbSet<CompatEntry> CompatEntries => Set<CompatEntry>();
    public DbSet<CompatOverride> CompatOverrides => Set<CompatOverride>();
    public DbSet<RelatorioGerado> RelatoriosGerados => Set<RelatorioGerado>();
    public DbSet<SessaoToken> SessoesTokens => Set<SessaoToken>();
    public DbSet<ConfiguracaoPgrs> ConfiguracaoPgrs => Set<ConfiguracaoPgrs>();
    public DbSet<Convite> Convites => Set<Convite>();
    public DbSet<UsuarioLaboratorio> UsuarioLaboratorios => Set<UsuarioLaboratorio>();
    public DbSet<ConviteLaboratorio> ConviteLaboratorios => Set<ConviteLaboratorio>();
    public DbSet<RedefinicaoSenha> RedefinicoesSenha => Set<RedefinicaoSenha>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Concorrência otimista no estoque (coluna de sistema xmin do PostgreSQL) —
        // duas baixas simultâneas não podem perder atualização
        builder.Entity<Reagente>().Property<uint>("xmin").IsRowVersion();
        builder.Entity<ReagenteLote>().Property<uint>("xmin").IsRowVersion();
        builder.Entity<Mtr>().Property<uint>("xmin").IsRowVersion();
        builder.Entity<Residuo>().Property<uint>("xmin").IsRowVersion();
        builder.Entity<ConfiguracaoPgrs>().Property<uint>("xmin").IsRowVersion();
        builder.Entity<CompatOverride>().Property<uint>("xmin").IsRowVersion();
        builder.Entity<Convite>().Property<uint>("xmin").IsRowVersion();
        builder.Entity<RedefinicaoSenha>().Property<uint>("xmin").IsRowVersion();
    }
}

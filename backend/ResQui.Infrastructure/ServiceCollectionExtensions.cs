using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ResQui.Domain.Interfaces;
using ResQui.Infrastructure.Auth;
using ResQui.Infrastructure.Data;
using ResQui.Infrastructure.Data.Repositories;
using ResQui.Infrastructure.Identity;
using ResQui.Infrastructure.Jobs.Checkers;

namespace ResQui.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseNpgsql(connectionString));

        services.AddIdentityCore<Usuario>(opts =>
        {
            // Sem sobrescrever RequireNonAlphanumeric/RequireDigit/RequireLowercase/RequireUppercase:
            // os defaults do Identity já exigem os quatro. Só o comprimento sobe (default é 6).
            opts.Password.RequiredLength = 8;
            // São os defaults do Identity hoje. Explicitados para travar o comportamento caso o
            // default mude, e para deixar o número visível a quem lê a configuração.
            opts.Lockout.MaxFailedAccessAttempts = 5;
            opts.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            opts.Lockout.AllowedForNewUsers = true;
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders(); // necessário para o AuthenticatorTokenProvider (TOTP)

        services.AddScoped<IReagentesRepository, EfReagentesRepository>();
        services.AddScoped<IReagenteLotesRepository, EfReagenteLotesRepository>();
        services.AddScoped<ILaboratoriosRepository, EfLaboratoriosRepository>();
        services.AddScoped<IResiduosRepository, EfResiduosRepository>();
        services.AddScoped<IMtrsRepository, EfMtrsRepository>();
        services.AddScoped<IAuditoriaRepository, EfAuditoriaRepository>();
        services.AddScoped<INotificacoesRepository, EfNotificacoesRepository>();
        services.AddScoped<IChamadosRepository, EfChamadosRepository>();
        services.AddScoped<IRelatoriosRepository, EfRelatoriosRepository>();
        services.AddScoped<ICompatibilidadeRepository, EfCompatibilidadeRepository>();
        services.AddScoped<ICompatOverridesRepository, EfCompatOverridesRepository>();
        services.AddScoped<IAuthRepository, EfAuthRepository>();
        services.AddScoped<ISessoesRepository, EfSessoesRepository>();
        services.AddScoped<IPgrsConfigRepository, EfPgrsConfigRepository>();

        services.AddScoped<ExpiryChecker>();
        services.AddScoped<LowStockChecker>();
        services.AddScoped<SinirChecker>();
        services.AddScoped<ColetaChecker>();
        services.AddScoped<CompatChecker>();

        return services;
    }
}

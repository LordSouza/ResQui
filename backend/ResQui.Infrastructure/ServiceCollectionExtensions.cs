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
            opts.Password.RequireNonAlphanumeric = false;
            opts.Password.RequiredLength = 6;
        })
        .AddRoles<IdentityRole>()
        .AddEntityFrameworkStores<AppDbContext>();

        services.AddScoped<IReagentesRepository, EfReagentesRepository>();
        services.AddScoped<ILaboratoriosRepository, EfLaboratoriosRepository>();
        services.AddScoped<IResiduosRepository, EfResiduosRepository>();
        services.AddScoped<IMtrsRepository, EfMtrsRepository>();
        services.AddScoped<IAuditoriaRepository, EfAuditoriaRepository>();
        services.AddScoped<INotificacoesRepository, EfNotificacoesRepository>();
        services.AddScoped<IChamadosRepository, EfChamadosRepository>();
        services.AddScoped<IRelatoriosRepository, EfRelatoriosRepository>();
        services.AddScoped<ICompatibilidadeRepository, EfCompatibilidadeRepository>();
        services.AddScoped<IAuthRepository, EfAuthRepository>();

        services.AddScoped<ExpiryChecker>();
        services.AddScoped<LowStockChecker>();
        services.AddScoped<SinirChecker>();
        services.AddScoped<ColetaChecker>();

        return services;
    }
}

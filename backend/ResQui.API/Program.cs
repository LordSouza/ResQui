using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using ResQui.Application.Auth;
using ResQui.Application.Auditoria;
using ResQui.Application.Chamados;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Laboratorios;
using ResQui.Application.Mtrs;
using ResQui.Application.Notificacoes;
using ResQui.Application.Reagentes;
using ResQui.Application.Relatorios;
using ResQui.Application.Residuos;
using ResQui.Application.Email;
using ResQui.Application.Usuarios;
using ResQui.Infrastructure;
using ResQui.Infrastructure.Data;
using ResQui.Infrastructure.Identity;
using ResQui.Infrastructure.Seed;
using ResQui.API.Features.Auth;
using ResQui.API.Features.Reagentes;
using ResQui.API.Features.Laboratorios;
using ResQui.API.Features.Residuos;
using ResQui.API.Features.Mtrs;
using ResQui.API.Features.Auditoria;
using ResQui.API.Features.Chamados;
using ResQui.API.Features.Notificacoes;
using ResQui.API.Features.Usuarios;
using ResQui.API.Features.Compatibilidade;
using ResQui.API.Features.Relatorios;
using ResQui.Infrastructure.Jobs;

var builder = WebApplication.CreateBuilder(args);

// Infrastructure (DbContext + Identity + repositories)
var connStr = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddInfrastructure(connStr);

// JWT options
var jwtOpts = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
builder.Services.AddSingleton(jwtOpts);

// Application services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAuditoriaService, AuditoriaService>();
builder.Services.AddScoped<IReagentesService, ReagentesService>();
builder.Services.AddScoped<ILaboratoriosService, LaboratoriosService>();
builder.Services.AddScoped<IResiduosService, ResiduosService>();
builder.Services.AddScoped<IMtrsService, MtrsService>();
builder.Services.AddScoped<ICompatService, CompatService>();
builder.Services.AddScoped<IChamadosService, ChamadosService>();
builder.Services.AddScoped<INotificacoesService, NotificacoesService>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IRelatoriosService, RelatoriosService>();

// JWT authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOpts.Issuer,
            ValidAudience = jwtOpts.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOpts.Key))
        };
    });

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("Gestor", p => p.RequireRole("Admin", "Gestor"));
    opts.AddPolicy("Admin",  p => p.RequireRole("Admin"));
});

// CORS — allow frontend Vite origin
builder.Services.AddCors(opts =>
    opts.AddPolicy("frontend", p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHostedService<NotificacoesJob>();

var app = builder.Build();

// Seed on startup (idempotent in all environments)
using (var scope = app.Services.CreateScope())
{
    var db       = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var users    = scope.ServiceProvider.GetRequiredService<UserManager<Usuario>>();
    var roles    = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var adminPwd = builder.Configuration["Seed:AdminPassword"] ?? "Admin@123";
    await DbSeeder.SeedAsync(db, users, roles, adminPwd);
    if (builder.Configuration.GetValue<bool>("Seed:DemoData"))
    {
        var admin = await users.FindByEmailAsync("admin@resqui.local");
        await DemoDataSeeder.SeedAsync(db, admin!.Id);
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

// Endpoints
app.MapGroup("/api/auth").MapAuthEndpoints();
app.MapGroup("/api/reagentes").RequireAuthorization().MapReagentesEndpoints();
app.MapGroup("/api/laboratorios").RequireAuthorization().MapLaboratoriosEndpoints();
app.MapGroup("/api/residuos").RequireAuthorization().MapResiduosEndpoints();
app.MapGroup("/api/mtrs").RequireAuthorization().MapMtrsEndpoints();
app.MapGroup("/api/auditoria").RequireAuthorization("Gestor").MapAuditoriaEndpoints();
app.MapGroup("/api/usuarios").RequireAuthorization("Admin").MapUsuariosEndpoints();
app.MapGroup("/api/chamados").RequireAuthorization().MapChamadosEndpoints();
app.MapGroup("/api/compat").RequireAuthorization().MapCompatEndpoints();
app.MapGroup("/api/notificacoes").RequireAuthorization().MapNotificacoesEndpoints();
app.MapGroup("/api/relatorios").RequireAuthorization().MapRelatoriosEndpoints();

app.Run();

public partial class Program { }

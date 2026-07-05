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
using ResQui.Application.Common;

var builder = WebApplication.CreateBuilder(args);

// Infrastructure (DbContext + Identity + repositories)
var connStr = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddInfrastructure(connStr);

// JWT options — fail-closed: chave vazia ou < 32 bytes derruba o startup em qualquer ambiente.
var jwtOpts = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
var jwtValidation = new JwtOptionsValidator().Validate(null, jwtOpts);
if (jwtValidation.Failed)
    throw new InvalidOperationException($"Configuração JWT inválida: {jwtValidation.FailureMessage}");
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
builder.Services.AddSingleton<ResQui.Application.Pdf.IPdfService, ResQui.Application.Pdf.PdfService>();
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

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
        opts.Events = new JwtBearerEvents
        {
            // Sessões revogadas (logout remoto) derrubam o token mesmo dentro da validade.
            // Tokens antigos sem jti continuam aceitos até expirarem.
            OnTokenValidated = async ctx =>
            {
                var jti = ctx.Principal?.FindFirst("jti")?.Value;
                if (string.IsNullOrEmpty(jti)) return;
                var sessoes = ctx.HttpContext.RequestServices.GetRequiredService<ResQui.Domain.Interfaces.ISessoesRepository>();
                var sessao = await sessoes.GetByJtiAsync(jti);
                if (sessao is { Revogada: true })
                    ctx.Fail("Sessão revogada.");
            }
        };
    });

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("Gestor",  p => p.RequireRole("Admin", "Gestor"));
    opts.AddPolicy("Admin",   p => p.RequireRole("Admin"));
    opts.AddPolicy("Tecnico", p => p.RequireRole("Admin", "Gestor", "Tecnico")); // mutações operacionais — exclui Visualizador
    opts.AddPolicy("Operacional", p => p.RequireRole("Admin", "Gestor", "Tecnico", "Pesquisador", "Professor")); // solicitar descarte + baixa (inclui aluno/professor)
    opts.AddPolicy("Aprovador",   p => p.RequireRole("Admin", "Gestor", "Professor")); // aprovar/rejeitar descarte (RF06)
    opts.AddPolicy("Supervisao",  p => p.RequireRole("Admin", "Gestor", "Professor")); // leitura supervisora (auditoria)
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

app.Use(async (ctx, next) =>
{
    try { await next(); }
    catch (ValidationException ex)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new { message = ex.Message });
    }
    catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
    {
        ctx.Response.StatusCode = StatusCodes.Status409Conflict;
        await ctx.Response.WriteAsJsonAsync(new { message = "O registro foi alterado por outro usuário. Recarregue e tente novamente." });
    }
});

// Seed on startup (idempotent in all environments)
using (var scope = app.Services.CreateScope())
{
    var db       = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var users    = scope.ServiceProvider.GetRequiredService<UserManager<Usuario>>();
    var roles    = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var adminPwd = builder.Configuration["Seed:AdminPassword"];
    if (string.IsNullOrWhiteSpace(adminPwd))
        throw new InvalidOperationException("Seed:AdminPassword não configurado — defina ADMIN_PASSWORD (ou o appsettings de dev).");
    await DbSeeder.SeedAsync(db, users, roles, adminPwd);
    if (builder.Configuration.GetValue<bool>("Seed:DemoData"))
    {
        var admin = await users.FindByEmailAsync("admin@resqui.local")
            ?? throw new InvalidOperationException("Admin user não encontrado após o seed — verifique Seed:AdminPassword.");
        await DemoDataSeeder.SeedAsync(db, admin.Id);
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
app.MapGroup("/api/auditoria").RequireAuthorization("Supervisao").MapAuditoriaEndpoints();
app.MapGroup("/api/usuarios").RequireAuthorization("Admin").MapUsuariosEndpoints();
app.MapGroup("/api/chamados").RequireAuthorization().MapChamadosEndpoints();
app.MapGroup("/api/compat").RequireAuthorization().MapCompatEndpoints();
app.MapGroup("/api/notificacoes").RequireAuthorization().MapNotificacoesEndpoints();
app.MapGroup("/api/relatorios").RequireAuthorization().MapRelatoriosEndpoints();

app.Run();

public partial class Program { }

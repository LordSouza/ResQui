using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ResQui.Infrastructure.Data;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(
        AppDbContext db,
        UserManager<Usuario> userManager,
        RoleManager<IdentityRole> roleManager,
        string adminPassword)
    {
        await db.Database.MigrateAsync();

        string[] roles = ["Admin", "Gestor", "Professor", "Tecnico", "Pesquisador", "Visualizador"];
        foreach (var role in roles)
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));

        const string adminEmail = "admin@resqui.local";
        if (await userManager.FindByEmailAsync(adminEmail) is null)
        {
            var admin = new Usuario
            {
                UserName = adminEmail,
                Email = adminEmail,
                Papel = "Admin",
                EmailConfirmed = true
            };
            await userManager.CreateAsync(admin, adminPassword);
            await userManager.AddToRoleAsync(admin, "Admin");
        }

        // A matriz base é sincronizada a cada startup: correções em CompatMatrixData precisam
        // alcançar bancos que já existem, não só instalações novas. Overrides institucionais
        // (CompatOverride) são tabela à parte e continuam vencendo na consulta.
        var persistidas = await db.CompatEntries.ToListAsync();
        var diff = CompatMatrixSync.Diff(persistidas, CompatMatrixData.GetAll());
        if (diff.Inserir.Count > 0)
            await db.CompatEntries.AddRangeAsync(diff.Inserir);
        if (diff.Inserir.Count > 0 || diff.Atualizar.Count > 0)
            await db.SaveChangesAsync();
    }
}

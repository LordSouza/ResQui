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

        if (!await db.CompatEntries.AnyAsync())
        {
            await db.CompatEntries.AddRangeAsync(CompatMatrixData.GetAll());
            await db.SaveChangesAsync();
        }
    }
}

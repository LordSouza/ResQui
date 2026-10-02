using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ResQui.Infrastructure.Data;
using ResQui.Infrastructure.Identity;

namespace ResQui.Infrastructure.Seed;

public static class DbSeeder
{
    public const string EmailAdminInicial = "admin@resqui.local";

    public static async Task<string> SeedAsync(
        AppDbContext db,
        UserManager<Usuario> userManager,
        RoleManager<IdentityRole> roleManager,
        string adminPassword)
    {
        await db.Database.MigrateAsync();

        string[] roles = ["Admin", "Professor", "Aluno"];
        foreach (var role in roles)
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));

        var adminId = await GarantirAdminAsync(userManager, adminPassword);

        // A matriz base é sincronizada a cada startup: correções em CompatMatrixData precisam
        // alcançar bancos que já existem, não só instalações novas. Overrides institucionais
        // (CompatOverride) são tabela à parte e continuam vencendo na consulta.
        var persistidas = await db.CompatEntries.ToListAsync();
        var diff = CompatMatrixSync.Diff(persistidas, CompatMatrixData.GetAll());
        if (diff.Inserir.Count > 0 || diff.Atualizar.Count > 0)
        {
            db.CompatEntries.AddRange(diff.Inserir);
            await db.SaveChangesAsync();
        }

        return adminId;
    }

    public static async Task<string> GarantirAdminAsync(UserManager<Usuario> userManager, string adminPassword)
    {
        var existentes = await userManager.GetUsersInRoleAsync("Admin");
        if (existentes.Count > 0)
            return existentes.OrderBy(u => u.Id, StringComparer.Ordinal).First().Id;

        var admin = new Usuario
        {
            UserName = EmailAdminInicial,
            Email = EmailAdminInicial,
            Papel = "Admin",
            EmailConfirmed = true
        };
        var criado = await userManager.CreateAsync(admin, adminPassword);
        // Sem esta checagem o resultado era descartado: uma senha que não atende à política
        // fazia o admin não ser criado em silêncio, e o startup morria adiante em
        // "Admin user não encontrado após o seed" — mensagem que não diz o que corrigir.
        if (!criado.Succeeded)
            throw new InvalidOperationException(
                "Não foi possível criar o admin do seed: "
                + string.Join("; ", criado.Errors.Select(e => e.Description))
                + " (ajuste ADMIN_PASSWORD / Seed:AdminPassword)");
        await userManager.AddToRoleAsync(admin, "Admin");
        return admin.Id;
    }
}

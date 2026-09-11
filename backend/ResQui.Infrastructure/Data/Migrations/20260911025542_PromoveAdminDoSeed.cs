using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class PromoveAdminDoSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // MigrateAsync roda antes do DbSeeder, então a role Admin ainda não existe aqui.
            migrationBuilder.Sql("""
                INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
                SELECT gen_random_uuid()::text, 'Admin', 'ADMIN', gen_random_uuid()::text
                 WHERE NOT EXISTS (SELECT 1 FROM "AspNetRoles" r WHERE r."Name" = 'Admin');
                """);

            // O admin do seed é o único a promover: os demais usuários seguem Professor. O e-mail
            // é a mesma constante que o DbSeeder usa para criá-lo.
            migrationBuilder.Sql("""
                UPDATE "AspNetUsers" SET "Papel" = 'Admin' WHERE "Email" = 'admin@resqui.local';
                """);

            migrationBuilder.Sql("""
                UPDATE "AspNetUserRoles" ur
                   SET "RoleId" = (SELECT r."Id" FROM "AspNetRoles" r WHERE r."Name" = 'Admin')
                  FROM "AspNetUsers" u
                 WHERE ur."UserId" = u."Id" AND u."Email" = 'admin@resqui.local';
                """);
        }

        // Devolve o admin do seed a Professor, que era o papel dele antes desta migration.
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "AspNetUsers" SET "Papel" = 'Professor' WHERE "Email" = 'admin@resqui.local';
                """);

            migrationBuilder.Sql("""
                UPDATE "AspNetUserRoles" ur
                   SET "RoleId" = (SELECT r."Id" FROM "AspNetRoles" r WHERE r."Name" = 'Professor')
                  FROM "AspNetUsers" u
                 WHERE ur."UserId" = u."Id" AND u."Email" = 'admin@resqui.local';
                """);

            migrationBuilder.Sql("""DELETE FROM "AspNetRoles" WHERE "Name" = 'Admin';""");
        }
    }
}

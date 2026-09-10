using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ColapsaPapeisEmProfessorEAluno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // MigrateAsync roda antes do DbSeeder, então as roles de destino ainda não existem
            // quando este SQL corre: sem inseri-las, o remapeamento abaixo não casaria e as
            // linhas de AspNetUserRoles ficariam apontando para roles prestes a serem apagadas.
            migrationBuilder.Sql("""
                INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
                SELECT gen_random_uuid()::text, novo.nome, upper(novo.nome), gen_random_uuid()::text
                  FROM (VALUES ('Professor'), ('Aluno')) AS novo(nome)
                 WHERE NOT EXISTS (SELECT 1 FROM "AspNetRoles" r WHERE r."Name" = novo.nome);
                """);

            migrationBuilder.Sql("""
                UPDATE "AspNetUsers"
                   SET "Papel" = CASE WHEN "Papel" IN ('Admin', 'Gestor', 'Tecnico', 'Professor')
                                      THEN 'Professor' ELSE 'Aluno' END;
                """);

            // Deduplica antes de remapear: dois papéis antigos podem colapsar no mesmo destino,
            // e a PK composta de AspNetUserRoles recusaria a linha repetida.
            migrationBuilder.Sql("""
                DELETE FROM "AspNetUserRoles" ur
                 WHERE EXISTS (
                    SELECT 1 FROM "AspNetUserRoles" outra
                     WHERE outra."UserId" = ur."UserId"
                       AND outra.ctid < ur.ctid);
                """);

            migrationBuilder.Sql("""
                UPDATE "AspNetUserRoles" ur
                   SET "RoleId" = destino."Id"
                  FROM "AspNetRoles" origem, "AspNetRoles" destino
                 WHERE ur."RoleId" = origem."Id"
                   AND destino."Name" = CASE WHEN origem."Name" IN ('Admin', 'Gestor', 'Tecnico', 'Professor')
                                             THEN 'Professor' ELSE 'Aluno' END
                   AND destino."Id" <> origem."Id";
                """);

            migrationBuilder.Sql("""
                DELETE FROM "AspNetRoles"
                 WHERE "Name" NOT IN ('Professor', 'Aluno');
                """);
        }

        // O papel original não é reconstituível: quatro papéis colapsaram em Professor e dois em
        // Aluno. O Down devolve todo mundo para Professor, que é o superconjunto de capacidades.
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""UPDATE "AspNetUsers" SET "Papel" = 'Professor';""");
        }
    }
}

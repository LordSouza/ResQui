using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLaboratorioAoReagente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Armario",
                table: "Reagentes",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LaboratorioId",
                table: "Reagentes",
                type: "character varying(20)",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE ""Reagentes"" r
SET ""LaboratorioId"" = casamento.""LaboratorioId"",
    ""Armario"" = CASE WHEN r.""Local"" = casamento.""Nome"" THEN ''
                     ELSE left(substring(r.""Local"" FROM char_length(casamento.""Nome"") + 4), 200) END
FROM (
    SELECT r2.""Id"" AS ""ReagenteId"", min(l.""Id"") AS ""LaboratorioId"", min(l.""Nome"") AS ""Nome""
    FROM ""Reagentes"" r2
    JOIN ""Laboratorios"" l
      ON r2.""Local"" = l.""Nome""
      OR left(r2.""Local"", char_length(l.""Nome"") + 3) = l.""Nome"" || ' · '
    GROUP BY r2.""Id""
    HAVING count(*) = 1
) casamento
WHERE r.""Id"" = casamento.""ReagenteId"";

UPDATE ""Reagentes"" SET ""Armario"" = left(""Local"", 200) WHERE ""LaboratorioId"" IS NULL;
");

            migrationBuilder.DropColumn(
                name: "Local",
                table: "Reagentes");

            migrationBuilder.CreateIndex(
                name: "IX_Reagentes_LaboratorioId",
                table: "Reagentes",
                column: "LaboratorioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reagentes_Laboratorios_LaboratorioId",
                table: "Reagentes",
                column: "LaboratorioId",
                principalTable: "Laboratorios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reagentes_Laboratorios_LaboratorioId",
                table: "Reagentes");

            migrationBuilder.DropIndex(
                name: "IX_Reagentes_LaboratorioId",
                table: "Reagentes");

            migrationBuilder.AddColumn<string>(
                name: "Local",
                table: "Reagentes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(@"
UPDATE ""Reagentes"" r
SET ""Local"" = CASE WHEN r.""Armario"" = '' THEN l.""Nome"" ELSE l.""Nome"" || ' · ' || r.""Armario"" END
FROM ""Laboratorios"" l
WHERE r.""LaboratorioId"" = l.""Id"";

UPDATE ""Reagentes"" SET ""Local"" = ""Armario"" WHERE ""LaboratorioId"" IS NULL;
");

            migrationBuilder.DropColumn(
                name: "Armario",
                table: "Reagentes");

            migrationBuilder.DropColumn(
                name: "LaboratorioId",
                table: "Reagentes");
        }
    }
}

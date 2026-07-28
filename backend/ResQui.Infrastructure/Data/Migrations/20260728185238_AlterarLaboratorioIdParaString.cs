using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlterarLaboratorioIdParaString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // int → "Lab-001". Em Chamados, o sentinela 0 ("sem laboratório") vira NULL.
            migrationBuilder.Sql(@"
                ALTER TABLE ""Residuos"" ALTER COLUMN ""LaboratorioId"" TYPE text
                    USING 'Lab-' || lpad(""LaboratorioId""::text, 3, '0');");
            migrationBuilder.Sql(@"
                ALTER TABLE ""Chamados"" ALTER COLUMN ""LaboratorioId"" DROP NOT NULL;");
            migrationBuilder.Sql(@"
                ALTER TABLE ""Chamados"" ALTER COLUMN ""LaboratorioId"" TYPE text
                    USING CASE WHEN ""LaboratorioId"" = 0 THEN NULL
                               ELSE 'Lab-' || lpad(""LaboratorioId""::text, 3, '0') END;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Residuos"" ALTER COLUMN ""LaboratorioId"" TYPE integer
                    USING COALESCE(NULLIF(split_part(""LaboratorioId"", '-', 2), '')::integer, 0);");
            migrationBuilder.Sql(@"
                ALTER TABLE ""Chamados"" ALTER COLUMN ""LaboratorioId"" TYPE integer
                    USING COALESCE(NULLIF(split_part(COALESCE(""LaboratorioId"", ''), '-', 2), '')::integer, 0);");
            migrationBuilder.Sql(@"
                ALTER TABLE ""Chamados"" ALTER COLUMN ""LaboratorioId"" SET NOT NULL;");
        }
    }
}

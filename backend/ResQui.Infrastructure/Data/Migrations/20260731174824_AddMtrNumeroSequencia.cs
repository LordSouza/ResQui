using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMtrNumeroSequencia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS mtrs_numero_seq START 1;");
            // Bancos em uso já têm números sorteados: a sequência começa acima do maior sufixo
            // existente, senão a primeira geração colidiria com uma linha antiga.
            migrationBuilder.Sql("""
                SELECT setval('mtrs_numero_seq',
                    COALESCE((SELECT MAX(substring("Numero" from '(\d+)$')::bigint)
                              FROM "Mtrs" WHERE "Numero" ~ '\d+$'), 0) + 1,
                    false);
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Numero",
                table: "Mtrs",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValueSql: "'MTR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('mtrs_numero_seq')::text, 4, '0')",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_Mtrs_Numero",
                table: "Mtrs",
                column: "Numero",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Mtrs_Numero",
                table: "Mtrs");

            migrationBuilder.AlterColumn<string>(
                name: "Numero",
                table: "Mtrs",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValueSql: "'MTR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('mtrs_numero_seq')::text, 4, '0')");

            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS mtrs_numero_seq;");
        }
    }
}

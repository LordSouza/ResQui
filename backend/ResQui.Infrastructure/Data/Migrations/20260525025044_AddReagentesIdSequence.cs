using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReagentesIdSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS reagentes_id_seq START 1 INCREMENT 1;");

            migrationBuilder.AlterColumn<string>(
                name: "Id",
                table: "Reagentes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValueSql: "'R-' || lpad(nextval('reagentes_id_seq')::text, 5, '0')",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Id",
                table: "Reagentes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValueSql: "'R-' || lpad(nextval('reagentes_id_seq')::text, 5, '0')");

            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS reagentes_id_seq;");
        }
    }
}

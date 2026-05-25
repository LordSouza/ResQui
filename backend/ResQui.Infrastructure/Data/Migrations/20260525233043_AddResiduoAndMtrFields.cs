using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddResiduoAndMtrFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Composicao",
                table: "Residuos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Destino",
                table: "Residuos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Risco",
                table: "Residuos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "Residuos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Unidade",
                table: "Residuos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Volume",
                table: "Residuos",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CodigoIbama",
                table: "Mtrs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Destinador",
                table: "Mtrs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Massa",
                table: "Mtrs",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Composicao",
                table: "Residuos");

            migrationBuilder.DropColumn(
                name: "Destino",
                table: "Residuos");

            migrationBuilder.DropColumn(
                name: "Risco",
                table: "Residuos");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "Residuos");

            migrationBuilder.DropColumn(
                name: "Unidade",
                table: "Residuos");

            migrationBuilder.DropColumn(
                name: "Volume",
                table: "Residuos");

            migrationBuilder.DropColumn(
                name: "CodigoIbama",
                table: "Mtrs");

            migrationBuilder.DropColumn(
                name: "Destinador",
                table: "Mtrs");

            migrationBuilder.DropColumn(
                name: "Massa",
                table: "Mtrs");
        }
    }
}

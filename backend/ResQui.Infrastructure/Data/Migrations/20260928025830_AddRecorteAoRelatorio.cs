using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecorteAoRelatorio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "LaboratorioIds",
                table: "RelatoriosGerados",
                type: "text[]",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LaboratorioIds",
                table: "RelatoriosGerados");
        }
    }
}

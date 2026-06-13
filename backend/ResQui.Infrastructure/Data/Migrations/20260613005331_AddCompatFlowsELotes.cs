using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCompatFlowsELotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<int>>(
                name: "ClassesReatividade",
                table: "Residuos",
                type: "integer[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.CreateTable(
                name: "ReagenteLotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReagenteId = table.Column<string>(type: "text", nullable: false),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Estoque = table.Column<decimal>(type: "numeric", nullable: false),
                    Validade = table.Column<DateOnly>(type: "date", nullable: false),
                    Abertura = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReagenteLotes", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReagenteLotes");

            migrationBuilder.DropColumn(
                name: "ClassesReatividade",
                table: "Residuos");
        }
    }
}

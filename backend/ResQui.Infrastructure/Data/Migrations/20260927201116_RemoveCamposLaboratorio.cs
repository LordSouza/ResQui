using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCamposLaboratorio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AreaM2",
                table: "Laboratorios");

            migrationBuilder.DropColumn(
                name: "Areas",
                table: "Laboratorios");

            migrationBuilder.DropColumn(
                name: "Capacidade",
                table: "Laboratorios");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Laboratorios");

            migrationBuilder.DropColumn(
                name: "Ventilacao",
                table: "Laboratorios");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AreaM2",
                table: "Laboratorios",
                type: "numeric(8,2)",
                precision: 8,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<List<string>>(
                name: "Areas",
                table: "Laboratorios",
                type: "text[]",
                nullable: false);

            migrationBuilder.AddColumn<int>(
                name: "Capacidade",
                table: "Laboratorios",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Laboratorios",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ventilacao",
                table: "Laboratorios",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }
    }
}

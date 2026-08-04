using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDestinacaoMtr : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DataDestinacao",
                table: "Mtrs",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DestinadoPorId",
                table: "Mtrs",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Mtrs_DestinadoPorId",
                table: "Mtrs",
                column: "DestinadoPorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Mtrs_AspNetUsers_DestinadoPorId",
                table: "Mtrs",
                column: "DestinadoPorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Mtrs_AspNetUsers_DestinadoPorId",
                table: "Mtrs");

            migrationBuilder.DropIndex(
                name: "IX_Mtrs_DestinadoPorId",
                table: "Mtrs");

            migrationBuilder.DropColumn(
                name: "DataDestinacao",
                table: "Mtrs");

            migrationBuilder.DropColumn(
                name: "DestinadoPorId",
                table: "Mtrs");
        }
    }
}

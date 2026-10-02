using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRedefinicaoSenha : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RedefinicoesSenha",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<string>(type: "text", nullable: false),
                    TokenHash = table.Column<string>(type: "text", nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiraEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RedefinicoesSenha", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RedefinicoesSenha_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RedefinicoesSenha_TokenHash",
                table: "RedefinicoesSenha",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RedefinicoesSenha_UsuarioId_CriadaEm",
                table: "RedefinicoesSenha",
                columns: new[] { "UsuarioId", "CriadaEm" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RedefinicoesSenha");
        }
    }
}

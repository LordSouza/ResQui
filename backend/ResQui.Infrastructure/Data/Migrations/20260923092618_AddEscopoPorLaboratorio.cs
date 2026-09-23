using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEscopoPorLaboratorio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConviteLaboratorios",
                columns: table => new
                {
                    ConviteId = table.Column<int>(type: "integer", nullable: false),
                    LaboratorioId = table.Column<string>(type: "character varying(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConviteLaboratorios", x => new { x.ConviteId, x.LaboratorioId });
                    table.ForeignKey(
                        name: "FK_ConviteLaboratorios_Convites_ConviteId",
                        column: x => x.ConviteId,
                        principalTable: "Convites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ConviteLaboratorios_Laboratorios_LaboratorioId",
                        column: x => x.LaboratorioId,
                        principalTable: "Laboratorios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsuarioLaboratorios",
                columns: table => new
                {
                    UsuarioId = table.Column<string>(type: "text", nullable: false),
                    LaboratorioId = table.Column<string>(type: "character varying(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioLaboratorios", x => new { x.UsuarioId, x.LaboratorioId });
                    table.ForeignKey(
                        name: "FK_UsuarioLaboratorios_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsuarioLaboratorios_Laboratorios_LaboratorioId",
                        column: x => x.LaboratorioId,
                        principalTable: "Laboratorios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConviteLaboratorios_LaboratorioId",
                table: "ConviteLaboratorios",
                column: "LaboratorioId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioLaboratorios_LaboratorioId",
                table: "UsuarioLaboratorios",
                column: "LaboratorioId");

            migrationBuilder.Sql("""
                INSERT INTO "UsuarioLaboratorios" ("UsuarioId", "LaboratorioId")
                SELECT u."Id", l."Id"
                FROM "AspNetUsers" u
                CROSS JOIN "Laboratorios" l
                WHERE u."Arquivado" = false
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConviteLaboratorios");

            migrationBuilder.DropTable(
                name: "UsuarioLaboratorios");
        }
    }
}

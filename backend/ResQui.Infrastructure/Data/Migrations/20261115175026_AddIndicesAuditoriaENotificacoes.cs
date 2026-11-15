using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIndicesAuditoriaENotificacoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId_Tipo_ReferenciaId",
                table: "Notificacoes",
                columns: new[] { "UsuarioId", "Tipo", "ReferenciaId" });

            migrationBuilder.CreateIndex(
                name: "IX_Auditoria_Timestamp",
                table: "Auditoria",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notificacoes_UsuarioId_Tipo_ReferenciaId",
                table: "Notificacoes");

            migrationBuilder.DropIndex(
                name: "IX_Auditoria_Timestamp",
                table: "Auditoria");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes",
                column: "UsuarioId");
        }
    }
}

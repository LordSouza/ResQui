using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFkMtrResponsavel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ResponsavelId",
                table: "Mtrs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_Mtrs_ResponsavelId",
                table: "Mtrs",
                column: "ResponsavelId");

            migrationBuilder.AddForeignKey(
                name: "FK_Mtrs_AspNetUsers_ResponsavelId",
                table: "Mtrs",
                column: "ResponsavelId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Mtrs_AspNetUsers_ResponsavelId",
                table: "Mtrs");

            migrationBuilder.DropIndex(
                name: "IX_Mtrs_ResponsavelId",
                table: "Mtrs");

            // O AlterColumn abaixo emite SET DEFAULT + SET NOT NULL, mas não preenche as linhas
            // existentes — e NULL é exatamente o que o SetNull da FK produz quando um usuário é
            // excluído. Sem este backfill o rollback aborta com "column contains null values".
            migrationBuilder.Sql(@"UPDATE ""Mtrs"" SET ""ResponsavelId"" = '' WHERE ""ResponsavelId"" IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "ResponsavelId",
                table: "Mtrs",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}

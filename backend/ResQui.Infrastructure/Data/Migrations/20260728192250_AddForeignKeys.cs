using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "LaboratorioId",
                table: "Residuos",
                type: "character varying(20)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "GeradoPorId",
                table: "RelatoriosGerados",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ReagenteId",
                table: "ReagenteLotes",
                type: "character varying(20)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "LaboratorioId",
                table: "Chamados",
                type: "character varying(20)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AbertoPorId",
                table: "Chamados",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "AutorId",
                table: "ChamadoComentarios",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_SessoesTokens_UsuarioId",
                table: "SessoesTokens",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Residuos_LaboratorioId",
                table: "Residuos",
                column: "LaboratorioId");

            migrationBuilder.CreateIndex(
                name: "IX_Residuos_MtrId",
                table: "Residuos",
                column: "MtrId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatoriosGerados_GeradoPorId",
                table: "RelatoriosGerados",
                column: "GeradoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_ReagenteLotes_ReagenteId",
                table: "ReagenteLotes",
                column: "ReagenteId");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Chamados_AbertoPorId",
                table: "Chamados",
                column: "AbertoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_Chamados_LaboratorioId",
                table: "Chamados",
                column: "LaboratorioId");

            migrationBuilder.CreateIndex(
                name: "IX_ChamadoComentarios_AutorId",
                table: "ChamadoComentarios",
                column: "AutorId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChamadoComentarios_AspNetUsers_AutorId",
                table: "ChamadoComentarios",
                column: "AutorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Chamados_AspNetUsers_AbertoPorId",
                table: "Chamados",
                column: "AbertoPorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Chamados_Laboratorios_LaboratorioId",
                table: "Chamados",
                column: "LaboratorioId",
                principalTable: "Laboratorios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notificacoes_AspNetUsers_UsuarioId",
                table: "Notificacoes",
                column: "UsuarioId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ReagenteLotes_Reagentes_ReagenteId",
                table: "ReagenteLotes",
                column: "ReagenteId",
                principalTable: "Reagentes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RelatoriosGerados_AspNetUsers_GeradoPorId",
                table: "RelatoriosGerados",
                column: "GeradoPorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Residuos_Laboratorios_LaboratorioId",
                table: "Residuos",
                column: "LaboratorioId",
                principalTable: "Laboratorios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Residuos_Mtrs_MtrId",
                table: "Residuos",
                column: "MtrId",
                principalTable: "Mtrs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SessoesTokens_AspNetUsers_UsuarioId",
                table: "SessoesTokens",
                column: "UsuarioId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChamadoComentarios_AspNetUsers_AutorId",
                table: "ChamadoComentarios");

            migrationBuilder.DropForeignKey(
                name: "FK_Chamados_AspNetUsers_AbertoPorId",
                table: "Chamados");

            migrationBuilder.DropForeignKey(
                name: "FK_Chamados_Laboratorios_LaboratorioId",
                table: "Chamados");

            migrationBuilder.DropForeignKey(
                name: "FK_Notificacoes_AspNetUsers_UsuarioId",
                table: "Notificacoes");

            migrationBuilder.DropForeignKey(
                name: "FK_ReagenteLotes_Reagentes_ReagenteId",
                table: "ReagenteLotes");

            migrationBuilder.DropForeignKey(
                name: "FK_RelatoriosGerados_AspNetUsers_GeradoPorId",
                table: "RelatoriosGerados");

            migrationBuilder.DropForeignKey(
                name: "FK_Residuos_Laboratorios_LaboratorioId",
                table: "Residuos");

            migrationBuilder.DropForeignKey(
                name: "FK_Residuos_Mtrs_MtrId",
                table: "Residuos");

            migrationBuilder.DropForeignKey(
                name: "FK_SessoesTokens_AspNetUsers_UsuarioId",
                table: "SessoesTokens");

            migrationBuilder.DropIndex(
                name: "IX_SessoesTokens_UsuarioId",
                table: "SessoesTokens");

            migrationBuilder.DropIndex(
                name: "IX_Residuos_LaboratorioId",
                table: "Residuos");

            migrationBuilder.DropIndex(
                name: "IX_Residuos_MtrId",
                table: "Residuos");

            migrationBuilder.DropIndex(
                name: "IX_RelatoriosGerados_GeradoPorId",
                table: "RelatoriosGerados");

            migrationBuilder.DropIndex(
                name: "IX_ReagenteLotes_ReagenteId",
                table: "ReagenteLotes");

            migrationBuilder.DropIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes");

            migrationBuilder.DropIndex(
                name: "IX_Chamados_AbertoPorId",
                table: "Chamados");

            migrationBuilder.DropIndex(
                name: "IX_Chamados_LaboratorioId",
                table: "Chamados");

            migrationBuilder.DropIndex(
                name: "IX_ChamadoComentarios_AutorId",
                table: "ChamadoComentarios");

            // Os AlterColumn que devolvem as três colunas de autoria para NOT NULL emitem
            // SET DEFAULT + SET NOT NULL, mas não preenchem as linhas existentes — e NULL é
            // exatamente o que o SetNull das FKs produz a cada hard-delete de usuário. Sem este
            // backfill o rollback aborta com "column contains null values".
            migrationBuilder.Sql(@"UPDATE ""RelatoriosGerados"" SET ""GeradoPorId"" = '' WHERE ""GeradoPorId"" IS NULL;");
            migrationBuilder.Sql(@"UPDATE ""Chamados"" SET ""AbertoPorId"" = '' WHERE ""AbertoPorId"" IS NULL;");
            migrationBuilder.Sql(@"UPDATE ""ChamadoComentarios"" SET ""AutorId"" = '' WHERE ""AutorId"" IS NULL;");

            migrationBuilder.AlterColumn<string>(
                name: "LaboratorioId",
                table: "Residuos",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)");

            migrationBuilder.AlterColumn<string>(
                name: "GeradoPorId",
                table: "RelatoriosGerados",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ReagenteId",
                table: "ReagenteLotes",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)");

            migrationBuilder.AlterColumn<string>(
                name: "LaboratorioId",
                table: "Chamados",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AbertoPorId",
                table: "Chamados",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AutorId",
                table: "ChamadoComentarios",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}

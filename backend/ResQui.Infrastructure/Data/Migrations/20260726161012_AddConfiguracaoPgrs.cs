using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddConfiguracaoPgrs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "configuracao_pgrs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    RazaoSocial = table.Column<string>(type: "text", nullable: false),
                    Cnpj = table.Column<string>(type: "text", nullable: false),
                    Endereco = table.Column<string>(type: "text", nullable: false),
                    Unidade = table.Column<string>(type: "text", nullable: false),
                    RespTecnico = table.Column<string>(type: "text", nullable: false),
                    RespCrq = table.Column<string>(type: "text", nullable: false),
                    RespEmail = table.Column<string>(type: "text", nullable: false),
                    RespTel = table.Column<string>(type: "text", nullable: false),
                    GeradorPadrao = table.Column<string>(type: "text", nullable: false),
                    TransportadorPadrao = table.Column<string>(type: "text", nullable: false),
                    DestinadorPadrao = table.Column<string>(type: "text", nullable: false),
                    CodigoIbamaPadrao = table.Column<string>(type: "text", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AtualizadoPor = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_configuracao_pgrs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "configuracao_pgrs");
        }
    }
}

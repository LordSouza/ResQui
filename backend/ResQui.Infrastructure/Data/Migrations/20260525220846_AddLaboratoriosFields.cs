using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLaboratoriosFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS laboratorios_id_seq START 1;");

            migrationBuilder.DropTable(name: "Laboratorios");

            migrationBuilder.CreateTable(
                name: "Laboratorios",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false,
                        defaultValueSql: "'Lab-' || lpad(nextval('laboratorios_id_seq')::text, 3, '0')"),
                    Nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Responsavel = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Areas = table.Column<string[]>(type: "text[]", nullable: false),
                    Sala = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Armarios = table.Column<string[]>(type: "text[]", nullable: false),
                    Capacidade = table.Column<int>(type: "integer", nullable: false),
                    AreaM2 = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    Ventilacao = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Cor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Criado = table.Column<DateOnly>(type: "date", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Laboratorios", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Laboratorios");
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS laboratorios_id_seq;");
        }
    }
}

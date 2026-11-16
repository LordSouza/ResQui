using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Torna a trilha de auditoria somente de inclusão e encadeada por SHA-256.
    /// A serialização canônica precisa bater com ResQui.Application.Auditoria.CadeiaAuditoria.
    /// </summary>
    public partial class AddCadeiaAuditoria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Colunas nulas primeiro: com o default 0 do EF, o índice único quebraria nas linhas existentes.
            migrationBuilder.AddColumn<long>(
                name: "Sequencia",
                table: "Auditoria",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HashAnterior",
                table: "Auditoria",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Hash",
                table: "Auditoria",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.Sql("""
                CREATE FUNCTION auditoria_escapar(valor text) RETURNS text
                LANGUAGE sql IMMUTABLE AS $$
                    SELECT replace(replace(valor, '\', '\\'), '|', '\|')
                $$;

                CREATE FUNCTION auditoria_hash(
                    sequencia bigint, momento timestamptz, quem text, o_que text, onde text,
                    detalhe text, risco integer, hash_anterior text) RETURNS text
                LANGUAGE sql STABLE AS $$
                    SELECT encode(sha256(convert_to(
                        sequencia::text
                        || '|' || to_char(momento AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
                        || '|' || auditoria_escapar(quem)
                        || '|' || auditoria_escapar(o_que)
                        || '|' || auditoria_escapar(onde)
                        || '|' || auditoria_escapar(detalhe)
                        || '|' || risco::text
                        || '|' || hash_anterior,
                        'UTF8')), 'hex')
                $$;
                """);

            migrationBuilder.Sql("""
                LOCK TABLE "Auditoria" IN EXCLUSIVE MODE;

                DO $$
                DECLARE
                    registro record;
                    sequencia bigint := 0;
                    anterior text := repeat('0', 64);
                    atual text;
                BEGIN
                    FOR registro IN SELECT * FROM "Auditoria" ORDER BY "Timestamp", "Id" LOOP
                        sequencia := sequencia + 1;
                        atual := auditoria_hash(sequencia, registro."Timestamp", registro."Who", registro."What",
                            registro."Where", registro."Detail", registro."Risk", anterior);
                        UPDATE "Auditoria"
                           SET "Sequencia" = sequencia, "HashAnterior" = anterior, "Hash" = atual
                         WHERE "Id" = registro."Id";
                        anterior := atual;
                    END LOOP;
                END $$;
                """);

            migrationBuilder.AlterColumn<long>(
                name: "Sequencia",
                table: "Auditoria",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "HashAnterior",
                table: "Auditoria",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Hash",
                table: "Auditoria",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Auditoria_Sequencia",
                table: "Auditoria",
                column: "Sequencia",
                unique: true);

            // O lock consultivo serializa as inclusões; a consulta ao último elo roda depois dele, e em
            // READ COMMITTED cada consulta de função VOLATILE enxerga o que já foi confirmado.
            migrationBuilder.Sql("""
                CREATE FUNCTION auditoria_encadear() RETURNS trigger
                LANGUAGE plpgsql AS $$
                DECLARE
                    ultima_sequencia bigint;
                    ultimo_hash text;
                BEGIN
                    PERFORM pg_advisory_xact_lock(hashtext('ResQui.Auditoria.cadeia'));
                    SELECT "Sequencia", "Hash" INTO ultima_sequencia, ultimo_hash
                      FROM "Auditoria" ORDER BY "Sequencia" DESC LIMIT 1;
                    NEW."Sequencia" := coalesce(ultima_sequencia, 0) + 1;
                    NEW."HashAnterior" := coalesce(ultimo_hash, repeat('0', 64));
                    NEW."Hash" := auditoria_hash(NEW."Sequencia", NEW."Timestamp", NEW."Who", NEW."What",
                        NEW."Where", NEW."Detail", NEW."Risk", NEW."HashAnterior");
                    RETURN NEW;
                END $$;

                CREATE FUNCTION auditoria_recusar_alteracao() RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'A trilha de auditoria é somente de inclusão: % recusado na tabela "Auditoria".', TG_OP;
                END $$;

                CREATE TRIGGER auditoria_encadear_insert
                    BEFORE INSERT ON "Auditoria"
                    FOR EACH ROW EXECUTE FUNCTION auditoria_encadear();

                CREATE TRIGGER auditoria_bloquear_update_delete
                    BEFORE UPDATE OR DELETE ON "Auditoria"
                    FOR EACH ROW EXECUTE FUNCTION auditoria_recusar_alteracao();

                CREATE TRIGGER auditoria_bloquear_truncate
                    BEFORE TRUNCATE ON "Auditoria"
                    FOR EACH STATEMENT EXECUTE FUNCTION auditoria_recusar_alteracao();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER auditoria_bloquear_truncate ON "Auditoria";
                DROP TRIGGER auditoria_bloquear_update_delete ON "Auditoria";
                DROP TRIGGER auditoria_encadear_insert ON "Auditoria";
                DROP FUNCTION auditoria_recusar_alteracao();
                DROP FUNCTION auditoria_encadear();
                DROP FUNCTION auditoria_hash(bigint, timestamptz, text, text, text, text, integer, text);
                DROP FUNCTION auditoria_escapar(text);
                """);

            migrationBuilder.DropIndex(
                name: "IX_Auditoria_Sequencia",
                table: "Auditoria");

            migrationBuilder.DropColumn(
                name: "Hash",
                table: "Auditoria");

            migrationBuilder.DropColumn(
                name: "HashAnterior",
                table: "Auditoria");

            migrationBuilder.DropColumn(
                name: "Sequencia",
                table: "Auditoria");
        }
    }
}

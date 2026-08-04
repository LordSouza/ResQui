using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResQui.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckParCanonicoCompatOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "ck_compat_overrides_par_canonico",
                table: "compat_overrides",
                sql: "\"ClasseA\" < \"ClasseB\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_compat_overrides_par_canonico",
                table: "compat_overrides");
        }
    }
}

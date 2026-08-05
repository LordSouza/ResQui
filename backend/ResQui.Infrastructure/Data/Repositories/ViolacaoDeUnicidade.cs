using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ResQui.Infrastructure.Data.Repositories;

public static class ViolacaoDeUnicidade
{
    public static bool Detecta(DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: "23505" };
}

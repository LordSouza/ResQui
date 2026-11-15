using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Laboratorios;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Infrastructure.Data;
using ResQui.Infrastructure.Data.Repositories;

namespace ResQui.Tests.Integracao.Data;

public class TransacoesPostgresTests
{
    private static AuditoriaService Auditoria(AppDbContext db) => new(new EfAuditoriaRepository(db));

    private static async Task<(int Laboratorios, int Auditoria)> ContarAsync(BancoDeTeste banco)
    {
        await using var db = banco.NovoContexto();
        return (await db.Laboratorios.CountAsync(), await db.Auditoria.CountAsync());
    }

    [PostgresFact]
    public async Task Sucesso_ConfirmaANegocioEAAuditoriaJuntos()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            await new EfTransacoes(db).ExecutarAsync(async () =>
            {
                db.Laboratorios.Add(new Laboratorio { Id = "Lab-T1", Nome = "Teste" });
                await db.SaveChangesAsync();
                await Auditoria(db).RegistrarAsync("a@resqui.local", "lab.criar", "Laboratórios", "Lab-T1", RiscoAuditoria.Low);
            });
        }

        (await ContarAsync(banco)).Should().Be((1, 1));
    }

    [PostgresFact]
    public async Task FalhaDepoisDaAuditoria_DesfazANegocioEAAuditoria()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            var act = () => new EfTransacoes(db).ExecutarAsync(async () =>
            {
                db.Laboratorios.Add(new Laboratorio { Id = "Lab-T1", Nome = "Teste" });
                await db.SaveChangesAsync();
                await Auditoria(db).RegistrarAsync("a@resqui.local", "lab.criar", "Laboratórios", "Lab-T1", RiscoAuditoria.Low);
                throw new InvalidOperationException("queda simulada antes do commit");
            });
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        (await ContarAsync(banco)).Should().Be((0, 0));
    }

    [PostgresFact]
    public async Task Aninhada_FalhaNaExterna_DesfazOQueAInternaGravou()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            var transacoes = new EfTransacoes(db);
            var act = () => transacoes.ExecutarAsync(async () =>
            {
                await transacoes.ExecutarAsync(async () =>
                {
                    db.Laboratorios.Add(new Laboratorio { Id = "Lab-T1", Nome = "Teste" });
                    await db.SaveChangesAsync();
                });
                throw new InvalidOperationException("falha depois da interna");
            });
            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        (await ContarAsync(banco)).Should().Be((0, 0));
    }

    [PostgresFact]
    public async Task ViolacaoCapturadaDentro_NaoAbortaATransacao()
    {
        // O SaveChanges cria savepoint automático dentro de transação aberta; sem isso, o
        // PostgreSQL recusaria qualquer comando depois do erro capturado.
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            db.Laboratorios.Add(new Laboratorio { Id = "Lab-T1", Nome = "Existente" });
            await db.SaveChangesAsync();
        }

        await using (var db = banco.NovoContexto())
        {
            await new EfTransacoes(db).ExecutarAsync(async () =>
            {
                var duplicado = new Laboratorio { Id = "Lab-T1", Nome = "Duplicado" };
                db.Laboratorios.Add(duplicado);
                var duplicar = () => db.SaveChangesAsync();
                await duplicar.Should().ThrowAsync<DbUpdateException>();
                db.Entry(duplicado).State = EntityState.Detached;

                await Auditoria(db).RegistrarAsync("a@resqui.local", "lab.criar", "Laboratórios", "segue", RiscoAuditoria.Low);
            });
        }

        (await ContarAsync(banco)).Should().Be((1, 1));
    }

    [PostgresFact]
    public async Task CriarLaboratorio_VinculoComQuemCriaFalha_NaoDeixaLaboratorioOrfao()
    {
        await using var banco = await BancoDeTeste.CriarAsync();
        await using (var db = banco.NovoContexto())
        {
            var servico = new LaboratoriosService(
                new EfLaboratoriosRepository(db), Auditoria(db), new EfResiduosRepository(db),
                new EfUsuarioLaboratoriosRepository(db), new EfReagentesRepository(db), new EfTransacoes(db));
            // Usuário inexistente: o vínculo viola a FK depois de o laboratório já ter sido gravado.
            var solicitante = new Solicitante("usuario-inexistente", "prof@resqui.local", "Professor", []);

            var act = () => servico.CriarAsync(new CriarLaboratorioCmd("Química", "Prof. Ana", "Sala 1", ["Armário A"], "#123456"), solicitante);

            await act.Should().ThrowAsync<DbUpdateException>();
        }

        (await ContarAsync(banco)).Should().Be((0, 0));
    }
}

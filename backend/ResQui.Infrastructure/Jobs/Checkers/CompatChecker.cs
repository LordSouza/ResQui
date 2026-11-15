using Microsoft.Extensions.Logging;
using ResQui.Application.Compatibilidade;
using ResQui.Application.Email;
using ResQui.Domain.Entities;
using ResQui.Domain.Interfaces;

namespace ResQui.Infrastructure.Jobs.Checkers;

public class CompatChecker(
    IReagentesRepository reagentes,
    ICompatService compat,
    INotificacoesRepository notifs,
    IAuthRepository auth,
    IEmailService email,
    IUsuarioLaboratoriosRepository usuarioLabs,
    ILogger<CompatChecker> logger)
{
    private static readonly string[] Descricoes = ["Compatível", "Cautela", "Perigo", "Proibido"];

    public async Task RunAsync(CancellationToken ct = default)
    {
        var porLocal = (await reagentes.GetAllAsync())
            .Where(r => r.LaboratorioId is not null && r.ClasseReatividade > 0)
            .GroupBy(r => (r.LaboratorioId, r.Armario))
            .Where(g => g.Count() > 1)
            .ToList();

        if (porLocal.Count == 0) return;

        var destinatarios = await DestinatariosPorLaboratorio.CarregarAsync(auth, usuarioLabs);

        bool houveMudanca = false;
        var emails = new EmailsPendentes();

        foreach (var grupo in porLocal)
        {
            ct.ThrowIfCancellationRequested();
            var itens = grupo.ToList();
            var local = itens[0].DescreverLocal();
            for (var i = 0; i < itens.Count; i++)
            for (var j = i + 1; j < itens.Count; j++)
            {
                var (a, b) = (itens[i], itens[j]);
                if (a.ClasseReatividade == b.ClasseReatividade) continue;
                var result = await compat.ConsultarParAsync(a.ClasseReatividade, b.ClasseReatividade);
                if (result is null || result.Nivel < 2) continue;

                var refId = string.CompareOrdinal(a.Id, b.Id) < 0 ? $"{a.Id}|{b.Id}" : $"{b.Id}|{a.Id}";
                var nivel = Descricoes[result.Nivel];
                foreach (var u in destinatarios.Do(grupo.Key.LaboratorioId))
                {
                    if (await notifs.ExisteAsync(u.Id, "compat", refId)) continue;

                    await notifs.AddAsync(new Notificacao
                    {
                        UsuarioId = u.Id,
                        Mensagem = $"Armazenamento incompatível em {local}: {a.Nome} e {b.Nome} (nível {nivel}).",
                        Tipo = "compat",
                        ReferenciaId = refId,
                        Severidade = result.Nivel >= 3 ? "red" : "amber",
                    });
                    houveMudanca = true;

                    if (!string.IsNullOrEmpty(u.Email))
                    {
                        var prefsJson = await auth.GetNotificacaoPrefsJsonAsync(u.Id);
                        if (NotificacaoPrefs.Habilitada(prefsJson, "compat", logger, u.Id))
                        {
                            var (subject, html) = NotificacaoEmailBuilder.BuildCompatLocal(local, a.Nome, b.Nome, nivel);
                            emails.Adicionar(u.Email, subject, html);
                        }
                    }
                }
            }
        }

        if (!houveMudanca) return;
        await notifs.SaveChangesAsync();
        await emails.EnviarAsync(email, logger, ct);
    }
}

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
    ILogger<CompatChecker> logger)
{
    private static readonly string[] PapeisElegiveis = ["Professor"];
    private static readonly string[] Descricoes = ["Compatível", "Cautela", "Perigo", "Proibido"];

    public async Task RunAsync(CancellationToken ct = default)
    {
        var porLocal = (await reagentes.GetAllAsync())
            .Where(r => !string.IsNullOrWhiteSpace(r.Local) && r.ClasseReatividade > 0)
            .GroupBy(r => r.Local)
            .Where(g => g.Count() > 1)
            .ToList();

        if (porLocal.Count == 0) return;

        var usuarios = (await auth.GetAllAsync())
            .Where(u => !u.Arquivado && PapeisElegiveis.Contains(u.Papel))
            .ToList();

        bool houveMudanca = false;

        foreach (var grupo in porLocal)
        {
            var itens = grupo.ToList();
            for (var i = 0; i < itens.Count; i++)
            for (var j = i + 1; j < itens.Count; j++)
            {
                var (a, b) = (itens[i], itens[j]);
                if (a.ClasseReatividade == b.ClasseReatividade) continue;
                var result = await compat.ConsultarParAsync(a.ClasseReatividade, b.ClasseReatividade);
                if (result is null || result.Nivel < 2) continue;

                var refId = string.CompareOrdinal(a.Id, b.Id) < 0 ? $"{a.Id}|{b.Id}" : $"{b.Id}|{a.Id}";
                var nivel = Descricoes[result.Nivel];
                foreach (var u in usuarios)
                {
                    if (await notifs.ExisteNaoLidaAsync(u.Id, "compat", refId)) continue;

                    await notifs.AddAsync(new Notificacao
                    {
                        UsuarioId = u.Id,
                        Mensagem = $"Armazenamento incompatível em {grupo.Key}: {a.Nome} e {b.Nome} (nível {nivel}).",
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
                            var (subject, html) = NotificacaoEmailBuilder.BuildCompatLocal(grupo.Key, a.Nome, b.Nome, nivel);
                            await email.SendAsync(u.Email, subject, html);
                        }
                    }
                }
            }
        }

        if (houveMudanca) await notifs.SaveChangesAsync();
    }
}

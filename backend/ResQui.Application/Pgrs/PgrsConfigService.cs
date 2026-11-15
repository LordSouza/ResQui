using System.Globalization;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Domain.Entities;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Pgrs;

public class PgrsConfigService(IPgrsConfigRepository repo, IAuditoriaService auditoria, ITransacoes transacoes) : IPgrsConfigService
{
    public async Task<ConfiguracaoPgrsDto> ObterAsync() =>
        ToDto(await repo.GetAsync() ?? new ConfiguracaoPgrs());

    public async Task<IdentificacaoPgrsDto> ObterIdentificacaoAsync()
    {
        var cfg = await repo.GetAsync() ?? new ConfiguracaoPgrs();
        return new IdentificacaoPgrsDto(cfg.RazaoSocial, cfg.Unidade);
    }

    public async Task<ConfiguracaoPgrsDto> SalvarAsync(AtualizarConfiguracaoPgrsCmd cmd, string usuarioEmail)
    {
        var cnpj = N(cmd.Cnpj);
        if (cnpj.Length > 0 && cnpj.Count(char.IsDigit) != 14)
            throw new ValidationException("CNPJ deve ter 14 dígitos.");

        var email = N(cmd.RespEmail);
        if (email.Length > 0 && !email.Contains('@'))
            throw new ValidationException("E-mail do responsável técnico é inválido.");

        var cfg = await repo.GetAsync();
        if (cfg is not null && cfg.AtualizadoEm != cmd.AtualizadoEmEsperado)
            throw new ConflitoConcorrenciaException(DescreverConflito(cfg));

        if (cfg is null)
        {
            cfg = new ConfiguracaoPgrs { Id = 1 };
            await repo.AddAsync(cfg);
        }

        cfg.RazaoSocial = N(cmd.RazaoSocial);
        cfg.Cnpj = cnpj;
        cfg.Endereco = N(cmd.Endereco);
        cfg.Unidade = N(cmd.Unidade);
        cfg.RespTecnico = N(cmd.RespTecnico);
        cfg.RespCrq = N(cmd.RespCrq);
        cfg.RespEmail = email;
        cfg.RespTel = N(cmd.RespTel);
        cfg.GeradorPadrao = N(cmd.GeradorPadrao);
        cfg.TransportadorPadrao = N(cmd.TransportadorPadrao);
        cfg.DestinadorPadrao = N(cmd.DestinadorPadrao);
        cfg.CodigoIbamaPadrao = N(cmd.CodigoIbamaPadrao);
        cfg.AtualizadoEm = Truncar(DateTime.UtcNow);
        cfg.AtualizadoPor = usuarioEmail;

        await transacoes.ExecutarAsync(async () =>
        {
            await repo.SaveChangesAsync();
            await auditoria.RegistrarAsync(usuarioEmail, "pgrs.configurar", "Relatórios",
                "Atualizou a configuração institucional do PGRS", RiscoAuditoria.Medium);
        });

        return ToDto(cfg);
    }

    private static string N(string? s) => (s ?? "").Trim();

    private static DateTime Truncar(DateTime t) =>
        new(t.Ticks / TimeSpan.TicksPerMillisecond * TimeSpan.TicksPerMillisecond, t.Kind);

    private static string DescreverConflito(ConfiguracaoPgrs cfg)
    {
        if (cfg.AtualizadoEm is null)
            return "A configuração foi alterada por outra pessoa. Recarregue antes de salvar.";

        var quando = cfg.AtualizadoEm.Value.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
        return string.IsNullOrWhiteSpace(cfg.AtualizadoPor)
            ? $"A configuração foi alterada em {quando} (UTC). Recarregue antes de salvar."
            : $"A configuração foi alterada por {cfg.AtualizadoPor} em {quando} (UTC). Recarregue antes de salvar.";
    }

    private static ConfiguracaoPgrsDto ToDto(ConfiguracaoPgrs c) => new(
        c.RazaoSocial, c.Cnpj, c.Endereco, c.Unidade,
        c.RespTecnico, c.RespCrq, c.RespEmail, c.RespTel,
        c.GeradorPadrao, c.TransportadorPadrao, c.DestinadorPadrao, c.CodigoIbamaPadrao,
        c.AtualizadoEm);
}

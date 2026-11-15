using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ResQui.Application.Auditoria;
using ResQui.Application.Common;
using ResQui.Application.Email;
using ResQui.Domain.Enums;
using ResQui.Domain.Interfaces;

namespace ResQui.Application.Auth;

public class AuthService(IAuthRepository repo, JwtOptions jwtOptions, IAuditoriaService auditoria, ISessoesRepository sessoes, IEmailService email, ILoginThrottle throttle, IUsuarioLaboratoriosRepository usuarioLabs, ILaboratoriosRepository labRepo, IFalhasLoginPorIp falhasPorIp) : IAuthService
{
    private const int QuantidadeCodigosRecuperacao = 10;

    public async Task<LoginResultDto?> LoginAsync(LoginCmd cmd, string? userAgent = null, string? ip = null)
    {
        if (ip is not null && falhasPorIp.EstaBloqueado(ip))
            throw new ValidationException("Muitas tentativas de login malsucedidas a partir desta rede. Aguarde alguns minutos e tente novamente.");

        // Antes do FindByEmailAsync de propósito: assim a resposta do throttle é idêntica para
        // e-mail existente, arquivado e inexistente, e o vazamento de enumeração fica confinado
        // à mensagem de bloqueio abaixo — que é uma escolha declarada, não um descuido.
        if (!throttle.TentarConsumir(cmd.Email))
            throw new ValidationException("Muitas tentativas de login. Aguarde um momento e tente novamente.");

        var user = await repo.FindByEmailAsync(cmd.Email);
        if (user is null)
        {
            await RegistrarFalhaDeLoginAsync(cmd.Email, "e-mail não cadastrado", ip);
            await ContabilizarFalhaDoIpAsync(ip, cmd.Email);
            return null;
        }

        // Depois da busca e antes da senha: conta travada não paga PBKDF2.
        if (await repo.EstaBloqueadoAsync(user.Id))
            throw new ValidationException("Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em alguns minutos.");

        var valid = await repo.CheckPasswordAsync(user.Id, cmd.Senha);
        if (!valid)
        {
            await RegistrarFalhaDeLoginAsync(cmd.Email, "senha incorreta", ip);
            await ContabilizarFalhaAsync(user.Id, cmd.Email);
            await ContabilizarFalhaDoIpAsync(ip, cmd.Email);
            return null;
        }

        var viaRecuperacao = false;
        if (user.TwoFactorEnabled)
        {
            // Primeira etapa do fluxo de duas — não é tentativa de credencial: não conta nem zera.
            if (string.IsNullOrWhiteSpace(cmd.Codigo2fa))
                return new LoginResultDto(true, null);

            var fator = await VerificarSegundoFatorAsync(user.Id, cmd.Codigo2fa);
            if (fator == SegundoFator.Invalido)
            {
                await auditoria.RegistrarAsync(cmd.Email, "user.login-2fa-falha", "Auth",
                    $"Código 2FA inválido para {cmd.Email}", RiscoAuditoria.Medium);
                // O TOTP de 6 dígitos (10^6) é o alvo mais barato do sistema. Sem contar esta
                // falha, o lockout protegeria apenas a senha e o segundo fator ficaria livre.
                await ContabilizarFalhaAsync(user.Id, cmd.Email);
                await ContabilizarFalhaDoIpAsync(ip, cmd.Email);
                return null;
            }
            viaRecuperacao = fator == SegundoFator.Recuperacao;
        }

        // Só aqui, com o login inteiro aprovado. Zerar logo após a senha e antes do segundo fator
        // deixaria o TOTP sem custo, com a feature parecendo pronta.
        await repo.ZerarFalhasLoginAsync(user.Id);
        throttle.Zerar(cmd.Email);

        var expireAt = DateTime.UtcNow.AddHours(jwtOptions.ExpirationHours);
        var jti = Guid.NewGuid().ToString("N");
        var token = GenerateToken(user, expireAt, jti);
        await sessoes.AddAsync(new Domain.Entities.SessaoToken
        {
            UsuarioId = user.Id,
            Jti = jti,
            ExpiraEm = expireAt,
            UserAgent = userAgent is { Length: > 200 } ? userAgent[..200] : userAgent,
        });
        await sessoes.SaveChangesAsync();
        var profile = await MontarPerfilAsync(user);
        if (viaRecuperacao)
        {
            await auditoria.RegistrarAsync(cmd.Email, "user.2fa-recuperacao-usada", "Auth",
                $"Entrou com código de recuperação; restam {profile.CodigosRecuperacaoRestantes} código(s)", RiscoAuditoria.High);
            var (assunto, html) = NotificacaoEmailBuilder.BuildCodigoRecuperacaoUsado(profile.CodigosRecuperacaoRestantes);
            await email.SendAsync(user.Email, assunto, html);
        }
        await auditoria.RegistrarAsync(cmd.Email, "user.login", "Auth",
            $"Login de {cmd.Email}", RiscoAuditoria.Low);
        return new LoginResultDto(false, new TokenDto(token, expireAt, profile));
    }

    public async Task AlterarSenhaAsync(string userId, AlterarSenhaCmd cmd, string usuarioEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.NovaSenha))
            throw new ValidationException("Nova senha é obrigatória.");
        var ok = await repo.ChangePasswordAsync(userId, cmd.SenhaAtual, cmd.NovaSenha);
        if (!ok)
            throw new ValidationException("Senha atual incorreta ou nova senha não atende aos requisitos.");
        await auditoria.RegistrarAsync(usuarioEmail, "user.alterar-senha", "Auth",
            $"Alterou a própria senha", RiscoAuditoria.Medium);
    }

    public async Task<Setup2faDto?> Setup2faAsync(string userId, string senha)
    {
        var user = await repo.FindByIdAsync(userId);
        if (user is null) return null;
        // O JWT vive em localStorage: sem este gate, um token roubado exfiltra o segredo TOTP
        // (conta já protegida) ou ativa o 2FA e tranca o dono para fora (conta sem 2FA).
        if (string.IsNullOrWhiteSpace(senha) || !await repo.CheckPasswordAsync(userId, senha))
            throw new ValidationException("Senha incorreta.");
        // Redundância barata: não há caminho legítimo — o formulário só oferece "Ativar 2FA"
        // quando inativo, e /2fa/ativar já recusa reativação.
        if (user.TwoFactorEnabled)
            throw new ValidationException("2FA já está ativo. Desative antes de configurar um novo autenticador.");
        var key = await repo.ResetAuthenticatorKeyAsync(userId);
        if (key is null) return null;
        await auditoria.RegistrarAsync(user.Email, "user.2fa-configurado", "Auth",
            "Gerou nova chave do aplicativo autenticador (2FA ainda inativo)", RiscoAuditoria.Medium);
        var uri = $"otpauth://totp/ResQui:{Uri.EscapeDataString(user.Email)}?secret={key}&issuer=ResQui";
        return new Setup2faDto(key, uri, Convert.ToBase64String(QrCode.Png(uri, 6)));
    }

    public async Task<IEnumerable<string>> Ativar2faAsync(string userId, string codigo, string usuarioEmail)
    {
        var user = await repo.FindByIdAsync(userId)
            ?? throw new ValidationException("Usuário não encontrado.");
        // Reativar destruiria os códigos de recuperação já entregues (GerarCodigosRecuperacaoAsync
        // substitui o conjunto inteiro) — um clique acidental em "Ativar 2FA" invalidaria
        // silenciosamente os códigos guardados pelo usuário.
        if (user.TwoFactorEnabled)
            throw new ValidationException("2FA já está ativo. Use \"Gerar novos códigos\" para renovar os códigos de recuperação.");
        if (!await repo.VerifyTwoFactorCodeAsync(userId, codigo))
            throw new ValidationException("Código inválido — confira o aplicativo autenticador.");
        await repo.SetTwoFactorEnabledAsync(userId, true);
        var codigos = await repo.GerarCodigosRecuperacaoAsync(userId, QuantidadeCodigosRecuperacao);
        await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-ativado", "Auth",
            "Ativou autenticação em dois fatores", RiscoAuditoria.Medium);
        await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-codigos-gerados", "Auth",
            $"Gerou {QuantidadeCodigosRecuperacao} códigos de recuperação", RiscoAuditoria.Medium);
        return codigos;
    }

    public async Task Desativar2faAsync(string userId, string codigo, string usuarioEmail)
    {
        var user = await repo.FindByIdAsync(userId)
            ?? throw new ValidationException("Usuário não encontrado.");
        // Antes de verificar o segundo fator: o resgate é destrutivo, e sem esta guarda um POST
        // repetido queimaria um código de recuperação para um no-op (o Identity não apaga os
        // códigos ao desligar a flag) e gravaria auditoria High sem fato correspondente.
        if (!user.TwoFactorEnabled)
            throw new ValidationException("2FA não está ativo nesta conta.");
        var fator = await VerificarSegundoFatorAsync(userId, codigo);
        if (fator == SegundoFator.Invalido)
            throw new ValidationException("Código inválido — use o aplicativo autenticador ou um código de recuperação.");
        if (fator == SegundoFator.Recuperacao)
            await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-recuperacao-usada", "Auth",
                "Usou código de recuperação para desativar o 2FA", RiscoAuditoria.High);
        await repo.SetTwoFactorEnabledAsync(userId, false);
        // Sem isto, a chave usada para ativar continua valendo depois de desativar: um JWT
        // roubado + a chave exfiltrada reativam o 2FA via /2fa/ativar pulando o gate de senha
        // que /2fa/setup exige — exatamente o que esse gate existe para impedir.
        await repo.ResetAuthenticatorKeyAsync(userId);
        await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-desativado", "Auth",
            "Desativou autenticação em dois fatores", RiscoAuditoria.High);
    }

    public async Task<IEnumerable<string>> GerarCodigosRecuperacaoAsync(string userId, string codigo, string usuarioEmail)
    {
        var user = await repo.FindByIdAsync(userId)
            ?? throw new ValidationException("Usuário não encontrado.");
        if (!user.TwoFactorEnabled)
            throw new ValidationException("2FA não está ativo nesta conta.");
        var fator = await VerificarSegundoFatorAsync(userId, codigo);
        if (fator == SegundoFator.Invalido)
            throw new ValidationException("Código inválido — use o aplicativo autenticador ou um código de recuperação.");
        if (fator == SegundoFator.Recuperacao)
            await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-recuperacao-usada", "Auth",
                "Usou código de recuperação para gerar novos códigos", RiscoAuditoria.High);

        var codigos = await repo.GerarCodigosRecuperacaoAsync(userId, QuantidadeCodigosRecuperacao);
        await auditoria.RegistrarAsync(usuarioEmail, "user.2fa-codigos-gerados", "Auth",
            $"Gerou {QuantidadeCodigosRecuperacao} novos códigos de recuperação", RiscoAuditoria.Medium);
        return codigos;
    }

    public async Task<bool> ResetarSegundoFatorAsync(string alvoId, string requesterId, string requesterEmail)
    {
        // Sem esta guarda, um token de Admin roubado desliga o próprio 2FA sem saber código
        // nenhum. Um Admin trancado fora não conseguiria chamar este endpoint de qualquer forma.
        if (alvoId == requesterId)
            throw new ValidationException("Você não pode resetar o 2FA da própria conta.");
        var alvo = await repo.FindByIdIncluindoArquivadosAsync(alvoId);
        if (alvo is null) return false;

        await repo.SetTwoFactorEnabledAsync(alvoId, false);
        await repo.ResetAuthenticatorKeyAsync(alvoId);
        // Desligar a flag não apaga os códigos (Desativar2faAsync depende disso), e rotacionar
        // a chave também não: substituir o conjunto por vazio é o passo que os invalida.
        await repo.GerarCodigosRecuperacaoAsync(alvoId, 0);

        // O motivo canônico do reset é conta/aparelho comprometido, e o JWT vale até expirar
        // salvo revogação do jti: deixar as sessões vivas manteria o invasor logado.
        var ativas = (await sessoes.GetAtivasByUsuarioAsync(alvoId)).ToList();
        foreach (var s in ativas)
        {
            s.Revogada = true;
            await sessoes.UpdateAsync(s);
        }
        if (ativas.Count > 0) await sessoes.SaveChangesAsync();

        await auditoria.RegistrarAsync(requesterEmail, "user.2fa-reset-admin", "Usuários",
            $"Resetou o 2FA de {alvo.Email}; {ativas.Count} sessão(ões) revogada(s)", RiscoAuditoria.High);
        var (assunto, html) = NotificacaoEmailBuilder.Build2faResetadoPorAdmin(requesterEmail);
        await email.SendAsync(alvo.Email, assunto, html);
        return true;
    }

    public async Task<IEnumerable<SessaoDto>> ListarSessoesAsync(string userId, string? jtiAtual)
    {
        var ativas = await sessoes.GetAtivasByUsuarioAsync(userId);
        return ativas.Select(s => new SessaoDto(s.Jti, s.CriadaEm, s.ExpiraEm, s.UserAgent, s.Jti == jtiAtual));
    }

    public async Task<bool> RevogarSessaoAsync(string userId, string jti, string usuarioEmail)
    {
        var s = await sessoes.GetByJtiAsync(jti);
        if (s is null || s.UsuarioId != userId) return false;
        s.Revogada = true;
        await sessoes.UpdateAsync(s);
        await sessoes.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "user.sessao-revogada", "Auth",
            $"Revogou a sessão {jti[..8]}…", RiscoAuditoria.Medium);
        return true;
    }

    public async Task<int> RevogarOutrasSessoesAsync(string userId, string? jtiAtual, string usuarioEmail)
    {
        var ativas = (await sessoes.GetAtivasByUsuarioAsync(userId)).Where(s => s.Jti != jtiAtual).ToList();
        foreach (var s in ativas)
        {
            s.Revogada = true;
            await sessoes.UpdateAsync(s);
        }
        if (ativas.Count > 0) await sessoes.SaveChangesAsync();
        await auditoria.RegistrarAsync(usuarioEmail, "user.sessoes-revogadas", "Auth",
            $"Encerrou {ativas.Count} outra(s) sessão(ões)", RiscoAuditoria.Medium);
        return ativas.Count;
    }

    public async Task<UserProfileDto> RegisterAsync(RegisterCmd cmd, Solicitante solicitante)
    {
        if (string.IsNullOrWhiteSpace(cmd.Email) || !cmd.Email.Contains('@'))
            throw new ValidationException("E-mail inválido.");
        if (string.IsNullOrWhiteSpace(cmd.Senha))
            throw new ValidationException("Senha é obrigatória.");
        string[] papeisValidos = ["Admin", "Professor", "Aluno"];
        if (!papeisValidos.Contains(cmd.Papel))
            throw new ValidationException($"Papel inválido: {cmd.Papel}.");
        if (cmd.Papel != "Aluno" && solicitante.Papel != "Admin")
            throw new ValidationException($"Criar conta de {cmd.Papel} é só o Admin; você pode criar Aluno.");

        var laboratorios = (cmd.LaboratorioIds ?? []).Distinct().ToList();
        var existentes = (await labRepo.GetAllAsync()).Select(l => l.Id).ToHashSet();
        if (laboratorios.FirstOrDefault(labId => !existentes.Contains(labId)) is { } inexistente)
            throw new ValidationException($"Laboratório {inexistente} não encontrado.");
        if (solicitante.Papel != "Admin"
            && laboratorios.FirstOrDefault(labId => !solicitante.Responde(labId)) is { } alheio)
            throw new ValidationException($"Você não responde pelo laboratório {alheio}.");
        if (solicitante.Papel != "Admin" && laboratorios.Count == 0)
            throw new ValidationException("Escolha pelo menos um laboratório: conta sem laboratório só o Admin enxerga.");

        var id = await repo.CreateAsync(cmd.Email, cmd.Senha, cmd.Matricula, cmd.Papel, cmd.Nome);
        await repo.AddToRoleAsync(id, cmd.Papel);
        await usuarioLabs.DefinirAsync(id, laboratorios);
        var roles = await repo.GetRolesAsync(id);
        await auditoria.RegistrarAsync(solicitante.Email, "user.criar", "Usuários",
            $"Criou usuário {cmd.Email} com papel {cmd.Papel}", RiscoAuditoria.Medium);
        return new UserProfileDto(id, cmd.Email, cmd.Nome, cmd.Matricula, cmd.Papel, roles, laboratorios);
    }

    public async Task<UserProfileDto?> GetMeAsync(string userId)
    {
        var user = await repo.FindByIdAsync(userId);
        if (user is null) return null;
        return await MontarPerfilAsync(user);
    }

    public async Task<UserProfileDto> AtualizarPerfilAsync(string userId, AtualizarPerfilCmd cmd, string requesterEmail)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nome))
            throw new ValidationException("Nome é obrigatório.");
        if (string.IsNullOrWhiteSpace(cmd.Email) || !cmd.Email.Contains('@'))
            throw new ValidationException("E-mail inválido.");

        var atual = await repo.FindByIdAsync(userId)
            ?? throw new ValidationException("Usuário não encontrado.");

        var nome = cmd.Nome.Trim();
        var email = cmd.Email.Trim();

        if (!string.Equals(atual.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            var existente = await repo.FindByEmailAsync(email);
            if (existente is not null && existente.Id != userId)
                throw new ValidationException("E-mail já em uso.");
        }

        await repo.UpdateProfileAsync(userId, nome, email);
        await auditoria.RegistrarAsync(requesterEmail, "user.perfil-atualizar", "Conta",
            "Atualizou perfil (nome/e-mail)", RiscoAuditoria.Low);
        return (await GetMeAsync(userId))!;
    }

    private async Task<UserProfileDto> MontarPerfilAsync(UsuarioInfo user)
    {
        var restantes = user.TwoFactorEnabled
            ? await repo.ContarCodigosRecuperacaoAsync(user.Id)
            : 0;
        return new UserProfileDto(user.Id, user.Email, user.Nome, user.Matricula,
            user.Papel, user.Roles, await usuarioLabs.DoUsuarioAsync(user.Id), user.TwoFactorEnabled, restantes);
    }

    private enum SegundoFator { Invalido, Totp, Recuperacao }

    // Nome distinto do IAuthRepository.RegistrarFalhaLoginAsync que ele chama, para que a leitura
    // do LoginAsync não confunda o helper com o método do repositório.
    private async Task ContabilizarFalhaAsync(string userId, string email)
    {
        await repo.RegistrarFalhaLoginAsync(userId);
        // A falha que aciona o bloqueio ganha um registro próprio. Tentativas em conta já travada
        // não chegam aqui: auditá-las inundaria a trilha justamente durante o ataque.
        if (await repo.EstaBloqueadoAsync(userId))
            await auditoria.RegistrarAsync(email, "user.login-bloqueado", "Auth",
                "Conta bloqueada por excesso de tentativas de login", RiscoAuditoria.High);
    }

    // O e-mail vem cru da requisição e a coluna Who tem 200 caracteres.
    private async Task RegistrarFalhaDeLoginAsync(string email, string motivo, string? ip)
    {
        var quem = email.Length > 200 ? email[..200] : email;
        var origem = ip is null ? "" : $" a partir de {ip}";
        await auditoria.RegistrarAsync(quem, "user.login-falha", "Auth",
            $"Login recusado: {motivo}{origem}", RiscoAuditoria.Low);
    }

    private async Task ContabilizarFalhaDoIpAsync(string? ip, string email)
    {
        if (ip is null) return;
        if (falhasPorIp.RegistrarFalha(ip))
            await auditoria.RegistrarAsync(email, "auth.ip-bloqueado", "Auth",
                $"Logins malsucedidos a partir de {ip} atingiram o teto; novas tentativas desse endereço estão recusadas", RiscoAuditoria.High);
    }

    private async Task<SegundoFator> VerificarSegundoFatorAsync(string userId, string codigo)
    {
        // UserStoreBase.RedeemCodeAsync do Identity faz "".Split(';').Contains(code): com o
        // conjunto de códigos esgotado (ou a coluna de token ausente), um código vazio resgata
        // com sucesso. Sem este guarda, "" seria um segundo fator válido.
        if (string.IsNullOrWhiteSpace(codigo)) return SegundoFator.Invalido;
        if (await repo.VerifyTwoFactorCodeAsync(userId, codigo))
            return SegundoFator.Totp;
        if (await repo.ResgatarCodigoRecuperacaoAsync(userId, codigo))
            return SegundoFator.Recuperacao;
        return SegundoFator.Invalido;
    }

    private string GenerateToken(UsuarioInfo user, DateTime expireAt, string jti)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, jti),
            new("papel", user.Papel),
        };
        foreach (var role in user.Roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: jwtOptions.Issuer,
            audience: jwtOptions.Audience,
            claims: claims,
            expires: expireAt,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

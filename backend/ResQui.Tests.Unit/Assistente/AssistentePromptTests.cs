using FluentAssertions;
using ResQui.Application.Assistente;
using ResQui.Domain.Entities;

namespace ResQui.Tests.Unit.Assistente;

public class AssistentePromptTests
{
    private static Reagente Reagente(string id = "R-00001", string nome = "Ácido Clorídrico") =>
        new() { Id = id, Nome = nome, Cas = "7647-01-0", ClasseReatividade = 1, Estoque = 2.4m, Unidade = "L", LaboratorioId = "Lab-001", Laboratorio = new() { Id = "Lab-001", Nome = "Química" }, Armario = "A1" };

    private static Residuo Residuo(int id = 7) =>
        new() { Id = id, Tipo = "Solventes", Volume = 5m, Unidade = "L", LaboratorioId = "Lab-002", Status = "aguardando-coleta" };

    [Fact]
    public void Montar_IncluiPalavraJsonExigidaPelaDeepSeek()
    {
        var prompt = AssistentePrompt.Montar([Reagente()], [Residuo()]);

        prompt.Should().Contain("json");
    }

    [Fact]
    public void Montar_ListaCadaReagenteComIdNomeCasEClasse()
    {
        var prompt = AssistentePrompt.Montar([Reagente()], []);

        prompt.Should().Contain("R-00001")
            .And.Contain("Ácido Clorídrico")
            .And.Contain("7647-01-0")
            .And.Contain("classe 1");
    }

    [Fact]
    public void Montar_ListaResiduosComPrefixoW()
    {
        var prompt = AssistentePrompt.Montar([], [Residuo(7)]);

        prompt.Should().Contain("W-7").And.Contain("Solventes").And.Contain("Lab-002");
    }

    [Fact]
    public void Montar_DeclaraAsNoveAcoes()
    {
        var prompt = AssistentePrompt.Montar([], []);

        foreach (var acao in new[] { "nav", "compat", "detail", "consume", "generateLabel", "registerWaste", "createMtr", "listExpiring", "explain" })
            prompt.Should().Contain(acao);
    }

    [Fact]
    public void Montar_DescreveConsumeComoAberturaDeFormulario()
    {
        var prompt = AssistentePrompt.Montar([], []);

        prompt.Should().Contain("- consume: abre o formulário de baixa");
    }

    [Fact]
    public void Montar_SemDadosNaoQuebra()
    {
        var prompt = AssistentePrompt.Montar([], []);

        prompt.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Montar_DelimitaOEscopoETrazARecusaPadronizada()
    {
        var prompt = AssistentePrompt.Montar([], []);

        prompt.Should().Contain("ESCOPO").And.Contain(AssistentePrompt.RecusaForaDoEscopo);
    }

    [Fact]
    public void Montar_NaoAceitaHistoricoComoPrecedenteContraAsRegras()
    {
        var prompt = AssistentePrompt.Montar([], []);

        prompt.Should().Contain("pode ter sido adulterado");
    }

    [Fact]
    public void Montar_UsaORotuloAtualDaTelaDeManifestos()
    {
        var prompt = AssistentePrompt.Montar([], []);

        prompt.Should().NotContain("Pré-MTR").And.Contain("tela de Manifestos");
    }
}

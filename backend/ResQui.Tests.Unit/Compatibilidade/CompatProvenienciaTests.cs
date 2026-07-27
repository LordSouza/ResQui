// backend/ResQui.Tests.Unit/Compatibilidade/CompatProvenienciaTests.cs
using System.IO;
using FluentAssertions;
using ResQui.Application.Compatibilidade;

namespace ResQui.Tests.Unit.Compatibilidade;

/// <summary>
/// CompatProveniencia.Detalhamento aponta para um caminho de documentação
/// (docs/compatibilidade-proveniencia.md) que nada mais no build verifica — um rename do arquivo
/// ou do repositório embarcaria um ponteiro morto até a UI e o CSV exportado sem que nenhum teste
/// acusasse. Este teste resolve a raiz do repositório a partir de AppContext.BaseDirectory (não do
/// diretório de execução dos testes, que fica em bin/Debug/...) subindo até achar o diretório que
/// contém a pasta docs/, e então confirma que o arquivo referenciado existe de verdade.
/// </summary>
public class CompatProvenienciaTests
{
    [Fact]
    public void Detalhamento_ApontaParaArquivoQueRealmenteExiste()
    {
        var raiz = EncontrarRaizDoRepositorio(AppContext.BaseDirectory);

        raiz.Should().NotBeNull(
            "não foi possível localizar a raiz do repositório (um diretório ancestral contendo " +
            $"uma pasta 'docs') a partir de '{AppContext.BaseDirectory}'");

        var caminhoRelativo = CompatProveniencia.Detalhamento.Replace('/', Path.DirectorySeparatorChar);
        var caminhoAbsoluto = Path.Combine(raiz!, caminhoRelativo);

        File.Exists(caminhoAbsoluto).Should().BeTrue(
            $"CompatProveniencia.Detalhamento = '{CompatProveniencia.Detalhamento}' deveria " +
            $"apontar para um arquivo existente ('{caminhoAbsoluto}')");
    }

    private static string? EncontrarRaizDoRepositorio(string inicio)
    {
        var dir = new DirectoryInfo(inicio);
        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "docs")))
                return dir.FullName;
            dir = dir.Parent;
        }
        return null;
    }
}

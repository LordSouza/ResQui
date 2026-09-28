---
titulo: Como importar o inventário por planilha
resumo: Traga todos os reagentes de uma vez a partir de uma planilha, em vez de cadastrar um por um.
secao: primeiros-passos
ordem: 4
quem: Professor e Administrador
video: 11-importar-inventario.mp4
---
## Antes de começar

A importação lê a planilha do **Excel** (`.xlsx`) direto — não precisa converter. Só a **primeira aba** é lida. No Google Sheets, use **Arquivo › Fazer download › Microsoft Excel (.xlsx)**. Arquivos **CSV** e TSV também são aceitos; o formato antigo `.xls` (Excel 97–2003) não: abra-o no Excel e salve como `.xlsx`. A primeira linha da aba deve ter os nomes das colunas:

- Obrigatórias: **Nome**, **CAS**, **Estoque** (ou Quantidade), **Unidade** e **Classe** — a classe de reatividade, de 1 a 12.
- Opcionais: **Armário** (ou Local, ou Localização), **Fórmula**, **Validade** (uma célula de data do Excel; em CSV, no formato AAAA-MM-DD), **Controlado** e **Sinônimo**.

A planilha inteira entra num laboratório só, escolhido na tela de importação. Na coluna **Armário**, escreva o nome de um armário desse laboratório; planilhas no formato antigo, "Laboratório · Armário", também são aceitas. Se o laboratório tiver um armário só, a coluna pode ficar vazia.

## Passo a passo

1. No menu lateral, abra **Inventário**.
2. Clique em **Importar Excel**.
3. Em **Laboratório dos reagentes**, escolha o laboratório.
4. Clique na área tracejada e escolha o arquivo (ou arraste o arquivo até ela).
5. Confira a revisão: cada linha aparece como **Pronta**, **Com aviso** ou **Bloqueada**, com o motivo — um armário que o laboratório não tem bloqueia a linha.
6. Clique em **Importar N reagentes**. Depois, em **Ver inventário**.

## Bom saber

- Linhas bloqueadas são ignoradas; as demais são importadas. Corrija a planilha e importe só as que faltaram.
- Só aparecem os laboratórios pelos quais você responde.
- Uma linha sem classe de reatividade é sempre bloqueada: é a classe que diz ao sistema quais misturas são perigosas.
- O servidor confere cada linha de novo e informa, no fim, as que recusou e por quê.

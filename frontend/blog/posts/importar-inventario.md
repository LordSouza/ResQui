---
titulo: Como importar o inventário por planilha
resumo: Traga todos os reagentes de uma vez a partir de uma planilha, em vez de cadastrar um por um.
secao: primeiros-passos
ordem: 4
quem: Professor e Administrador
video: 11-importar-inventario.mp4
---
## Antes de começar

A importação lê arquivos **CSV** (ou TSV). No Excel, use **Arquivo › Salvar como › CSV**; no Google Sheets, **Arquivo › Fazer download › CSV**. A primeira linha da planilha deve ter os nomes das colunas:

- Obrigatórias: **Nome**, **CAS**, **Estoque** (ou Quantidade), **Unidade**, **Localização** (ou Local) e **Classe** — a classe de reatividade, de 1 a 12.
- Opcionais: **Fórmula**, **Validade** (de preferência no formato AAAA-MM-DD), **Controlado** e **Sinônimo**.

Na **Localização**, use o mesmo formato das opções do sistema: "Laboratório · Armário".

## Passo a passo

1. No menu lateral, abra **Inventário**.
2. Clique em **Importar CSV**.
3. Clique na área tracejada e escolha o arquivo (ou arraste o arquivo até ela).
4. Confira a revisão: cada linha aparece como **Pronta**, **Com aviso** ou **Bloqueada**, com o motivo.
5. Clique em **Importar N reagentes**. Depois, em **Ver inventário**.

## Bom saber

- Linhas bloqueadas são ignoradas; as demais são importadas. Corrija a planilha e importe só as que faltaram.
- Uma linha sem classe de reatividade é sempre bloqueada: é a classe que diz ao sistema quais misturas são perigosas.
- O servidor confere cada linha de novo e informa, no fim, as que recusou e por quê.

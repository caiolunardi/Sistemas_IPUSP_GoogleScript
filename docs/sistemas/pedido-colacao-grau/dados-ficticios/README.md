# Dados fictícios — Formulário de Pedido de Colação de Grau 2.0

Casos inventados, escritos à mão, para montar as cópias de **homologação** ([padrão](../../AMBIENTE_DE_HOMOLOGACAO.md)). Nenhuma linha vem de dado real. Troque os e-mails `exemplo.usp.br` pelas contas de teste reais **só na cópia de homologação**, nunca no Git.

| Arquivo | Onde colar |
| --- | --- |
| [`PLANILHA_ALUNOS.csv`](PLANILHA_ALUNOS.csv) | aba `Página1` da cópia de `PLANILHA_ALUNOS` (colunas A–F) |
| [`PERIODOS.csv`](PERIODOS.csv) | primeira aba da cópia de `PERIODOS` (colunas A–M); ajuste as datas para o dia do teste |
| [`EMISSAO_DIPLOMAS-Diplomas.csv`](EMISSAO_DIPLOMAS-Diplomas.csv) | aba `Diplomas` da cópia de `EMISSAO_DIPLOMAS` (só as colunas que o formulário lê) |
| `PEDIDOS_COLACAO-*.csv` | títulos das quatro abas de `PEDIDOS_COLACAO`; vazias no início (ou use `prepararPlanilhaPedidosColacao`) |

## Casos da `PLANILHA_ALUNOS`

| Linha | Caso | Resultado esperado no formulário |
| --- | --- | --- |
| 2 | cadastro único e completo | CONFIRMADO; nome e nº USP só leitura |
| 3 | cadastro único, sem e-mail secundário | CONFIRMADO; e-mail alternativo vazio |
| 4–5 | mesmo e-mail em duas linhas | PENDENTE (`EMAIL_REPETIDO`) para esse e-mail |
| 6–7 | mesmo nº USP com dois e-mails | PENDENTE (`NUSP_REPETIDO`) para os dois |
| 8 | nº USP vazio | PENDENTE (`NUSP_VAZIO`) |
| 9 | ingresso vazio | CONFIRMADO; o aluno digita o ano de ingresso |
| — | conta que não está na planilha | PENDENTE (`SEM_CADASTRO`); se digitar `9000001`, `CONFLITO_NUSP`, com a mesma tela |

## Casos da aba `Diplomas`

Os `Registro ID` dos CSV não existem em nenhum protocolo; servem para conferir a leitura. Para o teste H8, copie o `Registro ID` de um protocolo de teste para uma linha nova e preencha "Status — Dados Pessoais".

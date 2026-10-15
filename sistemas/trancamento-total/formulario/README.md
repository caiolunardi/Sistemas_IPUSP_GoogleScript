# Pedido de Trancamento Total de Matrícula (formulário dos alunos) — fonte v1.1

Web App em que o aluno, logado com a conta `@usp.br`, envia o pedido de trancamento total. O e-mail vem sempre da sessão do Google; nome, Nº USP e ano de ingresso são pré-preenchidos pela planilha de alunos e podem ser corrigidos. O pedido é gravado como `pendente` na planilha de respostas, que o [Gerenciador](../gerenciador/README.md) lê.

O GitHub não sincroniza com o Apps Script: a atualização é copiar os arquivos de `src/` para o projeto.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/Codigo.gs` | `doGet`, `ID_INDEX`, `obterDadosIniciais` (login, pré-preenchimento, pedidos anteriores do próprio e-mail) e `registrarSolicitacao` (validação e gravação). |
| `src/TrancamentoFormApp.html` | Página do formulário. v1.1: só `maxlength="4000"` na justificativa. |
| `testes/testar_backend.js` | Testes locais com dados sintéticos (`node testes/testar_backend.js`). Não vão para o Apps Script. |

## Configuração

1. **Implantação:** "Executar como" = **eu** (conta do Serviço de Graduação dona das planilhas); "Quem pode acessar" = qualquer pessoa da USP. Os alunos não devem ter acesso direto às planilhas nem ao `ID_INDEX`.
2. **Propriedades do script:** `ID_INDEX_SPREADSHEET_ID` = ID da planilha mestre `ID_INDEX`.
3. **`ID_INDEX`:** chaves `PLANILHA_ALUNOS` (a mesma da Comunidade IPUSP; títulos `Número USP`, `Nome do Aluno`, `Ingresso`, `eMail`, `eMail Secundario`) e `TRANCAMENTO_TOTAL_MATRICULA` (planilha de respostas).

Nenhum ID de planilha fica no código. Não registre os valores nesta documentação.

## Versões

| Versão | Alterações |
|---|---|
| v1.0 (em uso) | IDs das duas planilhas literais no código; alunos lidos pelas colunas A–D. SHA-256 `Codigo.gs` `11e38af7…731c6`, `TrancamentoFormApp.html` `a8e19acd…db0d0`. |
| v1.1 | IDs pelo `ID_INDEX`; alunos pelo título, login procurado também no `eMail Secundario`; planilha de alunos fora do ar não bloqueia o formulário; coluna da confirmação pelo título; gravação com `appendRow`; justificativa acima de 4.000 caracteres recusada (antes cortada em silêncio); trava ocupada com mensagem clara; erro de configuração não mostra detalhes técnicos ao aluno. |

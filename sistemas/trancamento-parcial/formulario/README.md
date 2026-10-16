# Pedido de Trancamento Parcial de Matrícula (formulário dos alunos) — fonte v1.1

Web App em que o aluno, logado com a conta `@usp.br`, pede o trancamento de matrícula em até 6 disciplinas do semestre. O formulário só abre no período configurado na planilha de Períodos. O aluno digita o **código** de cada disciplina e o nome vem do cadastro da planilha DISCIPLINAS; código fora do cadastro aceita o nome digitado. O pedido é gravado como `pendente` na planilha de respostas, que o gerenciador da equipe lê.

O GitHub não sincroniza com o Apps Script: a atualização é copiar os arquivos de `src/` para o projeto.

## Arquivos

Copie os nove arquivos de `src/` para o projeto Apps Script.

| Arquivo | Papel |
|---|---|
| `src/Codigo.gs` | `doGet`, `include_`, `ID_INDEX`, período, `obterDadosIniciais` (login, período, pré-preenchimento, pedidos do próprio e-mail), `obterCatalogoDisciplinas` (código, nome e créditos-aula do cadastro) e `registrarSolicitacao` (validação, gravação e recibo). |
| `src/TrancamentoParcialApp.html` | Página do formulário (tema GRADIP, disciplinas pelo código, validação no campo). |
| `src/TrancamentoParcialAjuda.html` | Conteúdo da Central de Ajuda. |
| `src/TrancamentoParcialAjudaEstilos.html`, `src/TrancamentoParcialAjudaUI.html` | Estilos e comportamento da Central (byte-idênticos a `shared/ajuda/`). |
| `src/GradipTema.html`, `src/GradipTemaControle.html`, `src/GradipMarcaIPUSP.html`, `src/GradipMarcaUSP.html` | Tema e marcas (byte-idênticos às cópias dos outros sistemas). |
| `testes/` | Testes locais com dados sintéticos. Não vão para o Apps Script. |

Documentação completa: [docs/sistemas/trancamento-parcial](../../../docs/sistemas/trancamento-parcial/README.md).

## Configuração

1. **Implantação:** "Executar como" = **eu** (conta do Serviço de Graduação dona das planilhas); "Quem pode acessar" = qualquer pessoa da USP.
2. **Propriedades do script:** `ID_INDEX_SPREADSHEET_ID` = ID da planilha mestre `ID_INDEX`.
3. **`ID_INDEX`:** chaves `PLANILHA_ALUNOS`, `TRANCAMENTO_PARCIAL_MATRICULA`, `PERIODOS` e `DISCIPLINAS`.

Nenhum ID de planilha fica no código. Não registre os valores nesta documentação.

## Versões

| Versão | Alterações |
|---|---|
| v1.0 (em uso até 16/10/2026) | Três IDs de planilha literais; colunas por posição fixa; cadastro automático do aluno não encontrado na planilha de alunos (colunas A–D fixas); disciplina em texto livre; erros em `alert`; sem tema nem ajuda. SHA-256 `Codigo.gs` `34a06544…332929`, `TrancamentoParcialApp.html` `87c68d08…623948`. |
| v1.1 | IDs pelo `ID_INDEX`; disciplinas pelo código com o cadastro DISCIPLINAS; colunas pelo título; sem cadastro automático de aluno e sem ano de ingresso; justificativa opcional; recibo por e-mail ao aluno; tema GRADIP, Central de Ajuda e validação no próprio campo. Exige nova autorização do script (envio de e-mail). |

# Formulário de Exclusão de Disciplinas (formulário dos alunos) — fonte v1.2

Web App em que o aluno, logado com a conta `@usp.br`, pede a exclusão de matrícula em até 6 disciplinas do semestre. O formulário só abre no período configurado na planilha de Períodos (tela própria no Painel dos servidores, com as datas de retificação). O aluno digita o **código** e a **turma** de cada disciplina; o nome vem do cadastro DISCIPLINAS, e um código fora do cadastro aceita o nome digitado. Cada disciplina vira uma linha na planilha de respostas, todas com o mesmo Pedido ID.

O GitHub não sincroniza com o Apps Script: a atualização é copiar os arquivos de `src/` para o projeto.

## Arquivos

Copie os nove arquivos de `src/` para o projeto Apps Script.

| Arquivo | Papel |
|---|---|
| `src/Codigo.gs` | `doGet`, `include_`, `ID_INDEX`, período, `obterDadosIniciais` (login, período, pré-preenchimento, pedidos do próprio e-mail), `obterCatalogoDisciplinas`, `registrarSolicitacao` (validação, gravação e recibo) e `diagnosticarConfiguracao`. |
| `src/ExclusaoApp.html` | Página do formulário (texto do requerimento, tema GRADIP, disciplinas pelo código, validação no campo). |
| `src/ExclusaoAjuda.html` | Conteúdo da Central de Ajuda. |
| `src/ExclusaoAjudaEstilos.html`, `src/ExclusaoAjudaUI.html` | Estilos e comportamento da Central (byte-idênticos a `shared/ajuda/`). |
| `src/GradipTema.html`, `src/GradipTemaControle.html`, `src/GradipMarcaIPUSP.html`, `src/GradipMarcaUSP.html` | Tema e marcas (byte-idênticos às cópias dos outros sistemas). |
| `testes/` | Testes locais com dados sintéticos. Não vão para o Apps Script. |

Documentação completa: [docs/sistemas/exclusao-disciplinas](../../../docs/sistemas/exclusao-disciplinas/README.md).

## Configuração

1. **Implantação:** "Executar como" = **eu** (conta do Serviço de Graduação dona das planilhas); "Quem pode acessar" = qualquer pessoa da USP.
2. **Propriedades do script:** `ID_INDEX_SPREADSHEET_ID` = ID da planilha mestre `ID_INDEX`.
3. **`ID_INDEX`:** chaves `PLANILHA_ALUNOS`, `EXCLUSAO_DISCIPLINAS`, `PERIODOS` e `DISCIPLINAS`.

Nenhum ID de planilha fica no código. Não registre os valores nesta documentação.

## Versões

| Versão | Alterações |
|---|---|
| v1.0 (em uso até 16/10/2026) | Três IDs de planilha literais; e-mail digitável (pedido e recibo para qualquer endereço); busca de aluno chamável pela página com qualquer e-mail; envio sem conferir o período; cadastro automático do aluno; disciplina em texto livre; recibo respondendo para a caixa da Graduação; sem tema nem ajuda. SHA-256 `Codigo.gs` `2bc46609…0ce010`, `ExclusaoApp.html` `deefbd4c…afd1f`. |
| v1.1 | IDs pelo `ID_INDEX`; identidade só pelo login `@usp.br`; período conferido na abertura e no envio; disciplinas pelo código com o cadastro DISCIPLINAS e turma livre; pedidos anteriores no topo, com aviso para disciplina já pendente; sem cadastro automático; recibo "não responder"; tema GRADIP, Central de Ajuda e validação no campo; `diagnosticarConfiguracao()`. Exige nova autorização do script se a conta ainda não tiver autorizado o envio de e-mail neste projeto. |
| v1.2 (16/10/2026) | Ambiente de homologação: numa cópia do projeto com a Script Property `AMBIENTE = homologacao`, as planilhas vêm da coluna `Homologação` do `ID_INDEX`, sem volta para a produção; a página mostra uma faixa de aviso e o recibo leva `[HOMOLOGAÇÃO]`. Sem a propriedade, nada muda. Mudam só `Codigo.gs` e `ExclusaoApp.html`. Ver [ambiente de homologação](../../../docs/sistemas/AMBIENTE_DE_HOMOLOGACAO.md). |

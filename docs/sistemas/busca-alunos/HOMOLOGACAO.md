# Homologação — Busca de Alunos (v1.0 e v1.1)

**Estado:** v1.1 verificada localmente em 13/10/2026; **homologação no `/exec` pendente**. A v1.0 foi colada no Apps Script pelo responsável funcional em 13/10/2026 (primeiro erro de configuração resolvido: ID no lugar do nome da propriedade) e revelou que o título real da coluna é `eMail`, não `Tr eMail`; isso motivou a v1.1. Esta página registra as diferenças, os hashes e os testes. Ela não atesta a configuração da implantação.

## Base recebida

Dois arquivos do projeto Apps Script em uso, recebidos em 13/10/2026:

| Arquivo original | SHA-256 |
|---|---|
| `Codigo.gs` | `68319f6e9883c96bdac3ace86468a340272b948ac6c00e03135caa4c0dd63f7e` |
| `BuscaAlunosApp.html` | `7f7edaf488a780add07aa75d4291d38208e2b795f543cfbd71c043688b76716c` |

Os originais **não** foram versionados: `Codigo.gs` continha o ID literal da planilha `ID_INDEX`.

## Arquivos da fonte v1.1

| Arquivo | SHA-256 v1.1 | Situação |
|---|---|---|
| `Codigo.gs` | `01c7b7c275e8396b945db471af379b518b0087ef85bc09a37ce6e5d3ffd8b34e` | alterado na v1.1 (v1.0: `dc55ff52…f8`) |
| `BuscaAlunosApp.html` | `5d89b38eabea36b42f97c6bd92b32a2356753f0aed70a8b748b024e1f97c20d9` | alterado na v1.1 (v1.0: `0d3c388e…f8`) |
| `BuscaAlunosAjuda.html` | `4f7268d6345cf89efa2ef43b1e8a7312d5c2b4ecbc25699e69505a825af754bc` | ampliado na v1.1 (v1.0: `44f9e224…64`) |
| `BuscaAlunosAjudaEstilos.html` | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` | igual à v1.0; byte-idêntico a `shared/ajuda/GradipAjudaEstilos.html` |
| `BuscaAlunosAjudaUI.html` | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` | igual à v1.0; byte-idêntico a `shared/ajuda/GradipAjudaUI.html` |
| `GradipTema.html` | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` | igual à v1.0; byte-idêntico às cópias do Painel de Solicitações e da Estrutura Curricular |
| `GradipTemaControle.html` | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` | igual à v1.0; byte-idêntico a `shared/` e às cópias dos dois sistemas |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` | igual à v1.0; byte-idêntico às cópias dos dois sistemas |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` | igual à v1.0; byte-idêntico às cópias dos dois sistemas |

`GradipTema.html` é a cópia dos sistemas (com `--gradip-border-strong` corrigido para ≥ 3:1), não a de `shared/`, que ainda tem o valor anterior.

## v1.1 — o que mudou

Pedido do responsável funcional em 13/10/2026: corrigir o título do e-mail; abrir a ficha do aluno ao clicar, com edição e gravação; filtrar por ano de ingresso (coluna C, `Ingresso`, AAAA/S) com combobox dos anos existentes; exportar a lista em PDF ou CSV. É mudança funcional, não só visual: backend e script da página foram alterados de propósito.

**`Codigo.gs`**

- `CABECALHOS_ALUNOS`: `email` passou de `"Tr eMail"` para `"eMail"` (o "Tт" do Sheets é o ícone de coluna de texto da tabela); entrou `ingresso: "Ingresso"`. Títulos comparados sem espaços nas pontas (`mapearColunas_`).
- `listarAlunosParaBusca()`: cada aluno ganhou `linha` e `ingresso`; leitura e filtragem de linhas vazias iguais. Extraídos `obterAbaAlunos_()` e `mapearColunas_()`, usados pelas funções novas.
- Novas: `obterFichaAluno()`, `salvarFichaAluno()`, `gerarPdfListaAlunos()` e auxiliares (`conferirLinhaAluno_`, `montarFicha_`, `usuarioPodeEditar_`, `validarCampo_`, `limparValor_`, `converterParaCelula_`, `escaparHtml_`). Novas constantes: `COLUNAS_SOMENTE_LEITURA`, `TAMANHO_MAXIMO_CAMPO`, `MAXIMO_LINHAS_EXPORTACAO`.
- Novos serviços: `Session.getActiveUser()`, `LockService`, `Spreadsheet.getEditors()/getOwner()`, `Utilities.newBlob().getAs("application/pdf")`. Exigem nova autorização do script. Continua sem `DriveApp`.

**`BuscaAlunosApp.html`**

- Script: `prepararAluno_` separa ano/semestre; `filtrarAlunos_` aplica ano, semestre e texto; turma sem texto em ordem alfabética; combobox de anos com contagem; exportação CSV (BOM, `;`, proteção contra fórmula) e PDF; card virou `<button>` com `data-linha`; ficha em modal com foco preso, ESC, retorno de foco, bloqueio de scroll, confirmação ao descartar alterações e atualização da lista após salvar. A busca por texto, o destaque e o limite de 60 continuam com a mesma lógica da v1.0.
- Layout: linha de filtros (Ano de ingresso, Semestre, Exportar CSV, Exportar PDF), ingresso ao lado do nome no card, terceiro gatilho de ajuda, modal da ficha (tela cheia em ≤ 480 px). Tokens novos usados: `primary`, `primary-hover`, `on-primary`, `success`, `surface-elevated`, `overlay`.

**`BuscaAlunosAjuda.html`**: seções novas "Ficha do aluno e edição" (`ajuda-ficha`) e "Filtrar por ingresso e exportar" (`ajuda-ingresso`); dois problemas comuns (permissão e exportação); duas FAQs (lista de e-mails de uma turma, conflito/planilha mudou); FAQ de correção e de limite de 60 atualizadas; card "Só consulta" substituído por "O que mais dá para fazer".

## v1.0 — diferença em relação ao original

### `Codigo.gs`

O backend não ficou byte-idêntico. Motivos e funções tocadas:

1. **`ID_PLANILHA_INDICE` → `obterIdIndice_()`** (segurança, não visual). O ID literal do `ID_INDEX` foi trocado pela leitura de `Script Properties["ID_INDEX_SPREADSHEET_ID"]`, conforme `docs/seguranca/SEGREDOS_E_CONFIGURACAO.md`. `obterIdProducao_()` passou a chamar `obterIdIndice_()`; o resto da função é idêntico.
2. **`doGet()` + novo `include_()`** (exigido pelo tema). `createHtmlOutputFromFile` virou `createTemplateFromFile(...).evaluate()` para a página incluir tema, marcas e ajuda. Título e meta viewport iguais.
3. **Novo `diagnosticarBuscaAlunos()`**, executado só manualmente no editor; não é chamado pela página.

`listarAlunosParaBusca()`, `CABECALHOS_ALUNOS`, `ABA_INDICE` e `CHAVE_PLANILHA_ALUNOS` são idênticos ao original. Regressões testadas: lista devolvida, linhas vazias, propriedade ausente, chave ausente, ID vazio, aba de fallback, coluna faltando, planilha vazia.

### `BuscaAlunosApp.html`

- CSS: todas as cores fixas foram trocadas por tokens; nenhuma cor hexadecimal restou fora de comentário. Tokens: `bg`, `surface`, `surface-2`, `text`, `text-muted`, `border`, `border-strong`, `header-bg`, `header-accent`, `link`, `link-hover`, `focus`, `info-bg`, `info-border`, `input-bg`, `input-text`, `disabled-bg`, `disabled-text`, `danger`, `danger-bg`, `danger-border`, `warning-bg`, `warning-border`, `shadow` (prefixo `--gradip-`).
- Cabeçalho no padrão dos outros sistemas: marca IPUSP, título, subtítulo, **Aparência**, **Ajuda**, marca USP e faixa azul; duas faixas em ≤ 480 px.
- Campo: rótulo visível "Buscar aluno" (o original só tinha placeholder), alvo ≥ 44 px, borda com `border-strong`, `:focus-visible`, `aria-live` na linha de contagem.
- Gatilhos "Como buscar?" e "Não encontrou o aluno?".
- `<mark>`: fundo e sublinhado de alerta, para o destaque não depender só da cor.
- `#listaResultados` recebeu `class="listaResultados"`. O original definia o CSS `.listaResultados` (gap de 8 px), mas o elemento só tinha `id`; os cards ficavam colados.
- Em ≤ 480 px o selo do número USP desce para a linha de baixo.
- Textos operacionais, IDs (`campoBusca`, `infoBusca`, `listaResultados`), rodapé e o bloco `<script>` inteiro foram preservados; o script é byte-idêntico ao original.

## Verificação local (v1.1)

Ambiente: Node 22 e Chromium (Playwright 1.56), com `SpreadsheetApp`, `PropertiesService`, `HtmlService`, `Session`, `LockService`, `Utilities` e `google.script.run` simulados; 122 alunos sintéticos com ingressos 2021–2024. Scripts em [`sistemas/busca-alunos/testes/`](../../../sistemas/busca-alunos/testes/README.md).

| Suíte | v1.0 | v1.1 |
|---|---|---|
| `testar_backend.js` | 11/11 | 33/33 |
| `testar_navegador.js` | 94/94 | 195/195 |

Cobertura acrescentada na v1.1:

- **Backend:** título `eMail` aceito e `Tr eMail` recusado; espaços nas pontas; falta de `Ingresso`; lista com `linha`/`ingresso` e sem `ID da Pasta`; ficha com todas as colunas, `ID da Pasta` e fórmulas somente leitura; permissão (editor, dono, não editor, sem e-mail, `getEditors` negado); linha inválida ou de outro aluno; gravação só do que mudou; número preservado como número; conflito; coluna inexistente; validações de Número USP, Ingresso, e-mail e nome; secundário apagável; controle de caracteres/tamanho; trava ocupada; PDF com HTML escapado, nome de arquivo saneado, lista vazia e acima do limite; nenhum log em operação normal.
- **Navegador (Claro e Escuro):** combobox com os anos e contagens; semestre só com ano; turma em ordem alfabética; filtro combinado; vazio com filtro; ingresso fora do formato só em "Todos os anos"; CSV (nome, BOM, cabeçalho, todas as linhas além das 60); PDF (todas as linhas, só cinco colunas, título); ficha (todas as colunas, foco, somente leitura, alteração marcada, envio só do campo alterado com valor original, lista atualizada, erro de validação, Tab preso, ESC com confirmação, retorno de foco ao card, Enter abre); conta sem permissão vê ficha só para consulta.
- **Contraste (WCAG 2.1):** elementos da ficha entre 5,10:1 e 14,76:1, mensagem de erro da ficha ≥ 4,5:1, nos dois temas; elementos da v1.0 mantidos.
- **Mobile:** 360, 390, 480 e 768 px sem rolagem horizontal com filtros ativos e com a ficha aberta; filtros e botões de exportação com ≥ 44 px.

Limites: PNG externo da marca USP simulado; sem planilhas reais, editor do Apps Script ou `/exec`. A geração real de PDF pelo Apps Script, as permissões efetivas de `getEditors()` e o download dentro do iframe do Apps Script **só podem ser confirmados no Google**.

## Para homologar

1. Instalar conforme o [manual](MANUAL_OPERACAO.md#instalar-ou-atualizar), cadastrar `ID_INDEX_SPREADSHEET_ID` e aceitar a nova autorização.
2. Rodar `diagnosticarBuscaAlunos()` e conferir o registro.
3. Fazer a conferência do manual no `/dev` e, depois de promover, no `/exec`, nos três modos de tema e no celular, incluindo gravação com conta editora e recusa com conta não editora, e um CSV/PDF real de um ano.
4. Decidir o modelo de acesso pendente em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md#4-web-app) e registrar `executeAs` e **Quem pode acessar**.
5. Registrar aqui data, responsável funcional e resultado.

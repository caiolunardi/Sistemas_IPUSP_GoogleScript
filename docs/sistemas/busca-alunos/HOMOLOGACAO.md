# Homologação — Gerenciador de Pessoas, antes Comunidade IPUSP e Busca de Alunos (v1.0 a v1.3)

**Estado:** v1.3 verificada localmente em 14/10/2026; **homologação no `/exec` pendente** (v1.1 a v1.3). A v1.0 foi colada no Apps Script pelo responsável funcional em 13/10/2026 (primeiro erro de configuração resolvido: ID no lugar do nome da propriedade) e revelou que o título real da coluna é `eMail`, não `Tr eMail`; isso motivou a v1.1. Esta página registra as diferenças, os hashes e os testes. Ela não atesta a configuração da implantação.

## Base recebida

Dois arquivos do projeto Apps Script em uso, recebidos em 13/10/2026:

| Arquivo original | SHA-256 |
|---|---|
| `Codigo.gs` | `68319f6e9883c96bdac3ace86468a340272b948ac6c00e03135caa4c0dd63f7e` |
| `BuscaAlunosApp.html` | `7f7edaf488a780add07aa75d4291d38208e2b795f543cfbd71c043688b76716c` |

Os originais **não** foram versionados: `Codigo.gs` continha o ID literal da planilha `ID_INDEX`.

## Arquivos da fonte v1.3

| Arquivo | SHA-256 v1.3 | Situação |
|---|---|---|
| `Codigo.gs` | `02ca7e2b91706b17f3d6676a5c6a3f01e0bcc8199985453012c69a585a6fc0c0` | alterado na v1.3 (v1.2: `cca5d9ca…fd`; v1.1: `01c7b7c2…4e`; v1.0: `dc55ff52…f8`) |
| `BuscaAlunosApp.html` | `4f5ac8473e0f3a56dbbf9e3593a38fda02e42a5436e11fcfa62159c5e65b91e1` | alterado na v1.3 (v1.2: `8c718c41…9f`; v1.1: `5d89b38e…d9`; v1.0: `0d3c388e…f8`) |
| `BuscaAlunosAjuda.html` | `c96a4377ed02d4a94599bda8a726beefa183904e81baee82e7f133a013bc070b` | alterado na v1.3 (v1.2: `47296129…da`; v1.1: `4f7268d6…bc`; v1.0: `44f9e224…64`) |
| `BuscaAlunosAjudaEstilos.html` | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` | igual à v1.0; byte-idêntico a `shared/ajuda/GradipAjudaEstilos.html` |
| `BuscaAlunosAjudaUI.html` | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` | igual à v1.0; byte-idêntico a `shared/ajuda/GradipAjudaUI.html` |
| `GradipTema.html` | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` | igual à v1.0; byte-idêntico às cópias do Painel de Solicitações e da Estrutura Curricular |
| `GradipTemaControle.html` | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` | igual à v1.0; byte-idêntico a `shared/` e às cópias dos dois sistemas |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` | igual à v1.0; byte-idêntico às cópias dos dois sistemas |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` | igual à v1.0; byte-idêntico às cópias dos dois sistemas |

`GradipTema.html` é a cópia dos sistemas (com `--gradip-border-strong` corrigido para ≥ 3:1), não a de `shared/`, que ainda tem o valor anterior.

## v1.3 — fichas de todos os vínculos e nº USP copiável

Pedido do responsável funcional em 14/10/2026, com o novo esquema das planilhas: servidores A `E-MAIL`, B `NOME`, C `Setor`, D `N.USP`, E `TIPO` (`SERVIDOR`/`SETOR`), F `ID da Pasta`, G `eMail Secundario`; docentes A `N. USP`, B `NOME`, C `M / F`, D `E-mail`, E `TRATAMENTO` (fórmula), F `ID da Pasta`, G `eMail Secundario`. Pediu ficha editável para docentes, servidores e setores; número USP de toda pessoa no card; cópia do número ao clicar, com a mensagem "Número USP copiado para área de transferência" por 3 s; e sugeriu trocar a fórmula de `TRATAMENTO` pela concordância feita no sistema (aceito).

**`Codigo.gs`**

- `CADASTROS` (alunos, docentes, servidores) com `CABECALHOS_DOCENTES`/`CABECALHOS_SERVIDORES`; títulos comparados sem acento, espaço nem maiúscula (`tituloComparavel_`), também para alunos; obrigatórias: os cinco títulos de alunos, `NOME` e e-mail nos outros dois. Saíram `COLUNAS_SERVIDORES`, `COLUNAS_DOCENTES`, `lerCadastroPorPosicao_`, `listarDocentes_`, `listarServidores_`.
- Leitura única `lerCadastro_` + `itemDaLinha_`; docentes e servidores ganham `numeroUsp` e `emailSecundario` (setor sem nº USP); vínculo pelo `TIPO`, com a regra antiga (`ehSetor_`) só para `TIPO` vazio. Gênero e `TRATAMENTO` não vão na lista.
- Novas públicas `obterFicha(ref)` e `salvarFicha(pedido)` com `cadastro`; `obterFichaAluno`/`salvarFichaAluno` viraram atalhos. Identidade por cadastro (alunos: nº USP + nome; demais: nome + e-mail); permissão pela planilha do cadastro; `TRATAMENTO` oculta e bloqueada; validação de `M / F` e `TIPO` (gravados em maiúscula); ficha de docente com `tratamento` (`tratamentoDocente_`). `resumo` traz o `tipo` atualizado.
- Diagnóstico confere as colunas dos três cadastros pelo título e avisa se `TRATAMENTO` ainda existe.

**`BuscaAlunosApp.html`**

- Card virou contêiner com dois botões irmãos: `button.abrirFicha` (dados; abre a ficha de qualquer vínculo; `data-chave` = `cadastro:linha`) e `button.copiarUsp` (selo do nº USP; alvo ≥ 44 px; `aria-label` "Copiar número USP …"). Pessoa sem número: "sem nº USP" sem botão; setor: nada.
- `copiarNumeroUsp_`: `navigator.clipboard.writeText` e, se indisponível ou recusado (contexto não seguro, iframe), `execCommand("copy")` com campo temporário; aviso `#avisoCopia` (`role="status"`, tokens `surface-elevated`, `text`, `border-strong`) por 3 s; falha avisa para copiar pela ficha.
- Ficha: rótulo por vínculo (`#fichaRotulo`), título com Prof./Profª. vindo do servidor, aviso de permissão com o nome do cadastro, chamadas `obterFicha`/`salvarFicha` com `cadastro` e identidade.

**`BuscaAlunosAjuda.html`**: "Copiar o número USP", ficha para todos os vínculos, quem pode editar por cadastro, formatos de `M / F` e `TIPO`, "Prof. ou Profª. no título da ficha do docente"; FAQ "Por que clicar num docente... não abre nada?" substituída por "Cliquei no número USP e apareceu 'Não consegui copiar'"; FAQs de cópia, correção e Servidor/Setor atualizadas.

## v1.2 — Comunidade IPUSP

Pedido do responsável funcional em 14/10/2026: renomear para **Comunidade IPUSP**, sem abas novas, mantendo a caixa de texto e a forma de busca, mas procurando também nos cadastros de servidores e de docentes, com um indicador no card dizendo se é docente, aluno, servidor ou setor. Mudança funcional: backend e script da página alterados de propósito. Os nomes de arquivo e a pasta `busca-alunos` foram mantidos para a atualização ser só substituir três arquivos.

**`Codigo.gs`**

- Novas constantes: `CHAVE_PLANILHA_SERVIDORES` (`SERVIDORES`), `CHAVE_PLANILHA_DOCENTES` (`PLANILHA_DOCENTES`), `COLUNAS_SERVIDORES` (A e-mail, B nome, C setor), `COLUNAS_DOCENTES` (D e-mail, B nome) e `INICIOS_NOME_SETOR`. Posições iguais às de `PESSOAS_AUDITORIA` da Estrutura Curricular 1.11.0.
- Nova `listarComunidadeParaBusca()`, que a página passa a chamar: junta alunos (`listarAlunosParaBusca()`, inalterada), docentes e servidores com `tipo`; cadastro que falha vai para `indisponiveis` com `mensagemSegura_()` (sem IDs nem e-mails); só se os três falharem o erro do primeiro sobe. Auxiliares: `listarDocentes_`, `listarServidores_`, `lerCadastroPorPosicao_`, `ehSetor_`, `comparavel_`.
- **Regra de Setor (decisão técnica, a confirmar com o responsável):** a planilha de servidores guarda também contas de setor; uma linha é Setor quando NOME está vazio, é igual ao Setor (sem acento/caixa) ou começa com Setor, Serviço, Seção, Secretaria, Assistência, Comissão, Departamento, Diretoria, Biblioteca, Laboratório, Coordenação ou Atendimento.
- `salvarFichaAluno()`: `resumo` ganhou `tipo: "aluno"`. `gerarPdfListaAlunos()`: colunas Vínculo, Nome, Setor, Número USP, Ingresso, E-mail, E-mail secundário; textos "pessoas"; título/arquivo padrão "Comunidade IPUSP"/`comunidade-ipusp`. `doGet()`: título "Comunidade IPUSP — Serviço de Graduação".
- `diagnosticarBuscaAlunos()` → `diagnosticarComunidadeIPUSP()`, que também confere `SERVIDORES` e `PLANILHA_DOCENTES` (títulos das colunas usadas) e conta por vínculo. Nenhum serviço novo do Google.

**`BuscaAlunosApp.html`**

- Título, cabeçalho ("👥 Comunidade IPUSP"), rótulo "Buscar pessoa", placeholder com "setor", gatilho "Não encontrou a pessoa?" e mensagens no plural de pessoas.
- Selo `.seloVinculo` antes do nome (Aluno = `info`, Docente = `success`, Servidor = `warning`, Setor = neutro tracejado; tokens `*-bg`, `*-border` e texto). O texto do vínculo sempre aparece: a cor não é o único indicador.
- Card de aluno continua `<button>` com ficha; docente, servidor e setor são `<div>` sem ficha, sem selo de nº USP e sem efeito de hover. Servidor mostra o setor no detalhe; setor só o mostra se diferente do nome.
- Setor entra no texto da busca. O filtro de ingresso só traz alunos. Contagem "N alunos, N docentes, N servidores e N setores carregados". Aviso `#avisoCadastros` (tokens `warning-bg`/`warning-border`, `role="status"`) quando um cadastro não abre.
- Exportação com colunas Vínculo e Setor; arquivo `comunidade_…` sem ano e `alunos_ingresso-…` com ano.

**`BuscaAlunosAjuda.html`**: textos de início, busca, resultados, ficha, filtro, "não encontrei", problemas e privacidade ampliados para os quatro vínculos; cards novos "Por setor", "Selo Aluno, Docente, Servidor ou Setor" e "Aviso 'Atenção: não consegui ler o cadastro de...'"; FAQs novas "Qual a diferença entre Servidor e Setor?" e "Por que clicar num docente ou servidor não abre nada?".

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

## Verificação local (v1.1 a v1.3)

Ambiente: Node 22 e Chromium (Playwright 1.56), com `SpreadsheetApp`, `PropertiesService`, `HtmlService`, `Session`, `LockService`, `Utilities` e `google.script.run` simulados; 122 alunos sintéticos com ingressos 2021–2024 e, na v1.2, 2 docentes, 1 servidor e 1 setor sintéticos. Scripts em [`sistemas/busca-alunos/testes/`](../../../sistemas/busca-alunos/testes/README.md).

| Suíte | v1.0 | v1.1 | v1.2 | v1.3 |
|---|---|---|---|---|
| `testar_backend.js` | 11/11 | 33/33 | 40/40 | 51/51 |
| `testar_navegador.js` | 94/94 | 195/195 | 233/233 | 268/268 |

Cobertura acrescentada na v1.3:

- **Backend:** esquema novo pelo título (títulos em outra ordem, sem `TIPO`); `TIPO` prevalece sobre o nome; setor sem nº USP; gênero/`TRATAMENTO`/`ID da Pasta` fora da lista; coluna obrigatória faltando em docentes → indisponível; ficha de docente sem `TRATAMENTO`, com Prof./Profª.; identidade nome + e-mail; cadastro desconhecido (inclusive `constructor`/`__proto__`); salvar docente (`M / F` em maiúscula, tratamento novo, resumo), validações de `M / F`, nome, e-mail, `TRATAMENTO` e `ID da Pasta` bloqueados; salvar servidor (`TIPO` → setor muda o resumo, `TIPO` inválido, nº USP numérico preservado, permissão da planilha de servidores); ficha de setor; nenhum log.
- **Navegador (Claro e Escuro):** nº USP copiável em servidor e docente, ausente em setor, "sem nº USP" sem botão; clique copia (lido de volta da área de transferência), mostra a mensagem exata, não abre a ficha e some após 3 s; cópia pelo método alternativo em contexto sem API; ficha de servidor (7 colunas, `TIPO` → "Ficha do setor" e selo trocado, retorno de foco pelo `data-chave`); ficha de docente ("Prof." → "Profª." ao salvar `F`, `M / F` inválido recusado, sem `TRATAMENTO`); chamadas com `cadastro` e identidade.
- **Contraste e alvo:** aviso da cópia 14,76:1 (Claro) e 13,33:1 (Escuro); botão do nº USP com 44 px de altura em 360–768 px.

Cobertura acrescentada na v1.2:

- **Backend:** três cadastros com `tipo` e campos exatos; espaços normalizados; linhas vazias ignoradas; regra de Setor (nome vazio, igual ao setor, palavra inicial; "Ana Secretaria" e "Setorial Silva" continuam Servidor); cadastro indisponível sem derrubar os outros e motivo sem ID longo; só servidores; nenhum cadastro → erro original; cadastros vazios; `resumo.tipo`; PDF com Vínculo/Setor; diagnóstico com títulos das colunas e contagens, sem nomes/e-mails/IDs, e com cadastro indisponível.
- **Navegador (Claro e Escuro):** contagem por vínculo; busca pelo setor traz Servidor e Setor; detalhe do servidor com setor; setor sem repetição; card não-aluno estático sem nº USP; destaque no setor; CSV misto (`comunidade_busca.csv`, colunas Vínculo e Setor); clicar em docente não abre ficha; ano filtra só alunos; aviso de cadastro indisponível com motivo, contagem dos demais e contraste.
- **Contraste dos selos (WCAG 2.1, texto ≥ 4,5:1):** Claro — Aluno 6,36, Docente 4,76, Servidor 4,71, Setor 14,76; Escuro — 7,25, 9,26, 9,43 e 15,36.
- **Mobile:** 360, 390, 480 e 768 px sem rolagem horizontal com resultados dos quatro vínculos.

Cobertura acrescentada na v1.1:

- **Backend:** título `eMail` aceito e `Tr eMail` recusado; espaços nas pontas; falta de `Ingresso`; lista com `linha`/`ingresso` e sem `ID da Pasta`; ficha com todas as colunas, `ID da Pasta` e fórmulas somente leitura; permissão (editor, dono, não editor, sem e-mail, `getEditors` negado); linha inválida ou de outro aluno; gravação só do que mudou; número preservado como número; conflito; coluna inexistente; validações de Número USP, Ingresso, e-mail e nome; secundário apagável; controle de caracteres/tamanho; trava ocupada; PDF com HTML escapado, nome de arquivo saneado, lista vazia e acima do limite; nenhum log em operação normal.
- **Navegador (Claro e Escuro):** combobox com os anos e contagens; semestre só com ano; turma em ordem alfabética; filtro combinado; vazio com filtro; ingresso fora do formato só em "Todos os anos"; CSV (nome, BOM, cabeçalho, todas as linhas além das 60); PDF (todas as linhas, só cinco colunas, título); ficha (todas as colunas, foco, somente leitura, alteração marcada, envio só do campo alterado com valor original, lista atualizada, erro de validação, Tab preso, ESC com confirmação, retorno de foco ao card, Enter abre); conta sem permissão vê ficha só para consulta.
- **Contraste (WCAG 2.1):** elementos da ficha entre 5,10:1 e 14,76:1, mensagem de erro da ficha ≥ 4,5:1, nos dois temas; elementos da v1.0 mantidos.
- **Mobile:** 360, 390, 480 e 768 px sem rolagem horizontal com filtros ativos e com a ficha aberta; filtros e botões de exportação com ≥ 44 px.

Limites: PNG externo da marca USP simulado; sem planilhas reais, editor do Apps Script ou `/exec`. A geração real de PDF pelo Apps Script, as permissões efetivas de `getEditors()` e o download dentro do iframe do Apps Script **só podem ser confirmados no Google**.

## Para homologar

1. Instalar conforme o [manual](MANUAL_OPERACAO.md#instalar-ou-atualizar), cadastrar `ID_INDEX_SPREADSHEET_ID` e aceitar a nova autorização.
2. Rodar `diagnosticarComunidadeIPUSP()` e conferir o registro: todas as colunas "ok" nos três cadastros.
3. Fazer a conferência do manual no `/dev` e, depois de promover, no `/exec`, nos três modos de tema e no celular, incluindo gravação com conta editora e recusa com conta não editora, e um CSV/PDF real de um ano.
4. Conferir a cópia do nº USP dentro do `/exec` (o iframe do Apps Script pode exigir o método alternativo), a ficha e a gravação de um docente e de um servidor, e o selo **Setor** das linhas com `TIPO` = `SETOR`.
5. Decidir o modelo de acesso pendente em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md#4-web-app) e registrar `executeAs` e **Quem pode acessar**.
6. Registrar aqui data, responsável funcional e resultado.

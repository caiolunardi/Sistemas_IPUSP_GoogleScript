# Homologação — Busca de Alunos GRADIP UI v1.0

**Estado:** verificação local concluída em 13/10/2026; **implantação e homologação no `/exec` pendentes**. Esta página registra a diferença exata em relação ao código em uso, os hashes e os testes executados. Ela não atesta a configuração da implantação.

## Base recebida

Dois arquivos do projeto Apps Script em uso, recebidos em 13/10/2026:

| Arquivo original | SHA-256 |
|---|---|
| `Codigo.gs` | `68319f6e9883c96bdac3ace86468a340272b948ac6c00e03135caa4c0dd63f7e` |
| `BuscaAlunosApp.html` | `7f7edaf488a780add07aa75d4291d38208e2b795f543cfbd71c043688b76716c` |

Os originais **não** foram versionados: `Codigo.gs` continha o ID literal da planilha `ID_INDEX`.

## Arquivos da fonte v1.0

| Arquivo | SHA-256 | Situação |
|---|---|---|
| `Codigo.gs` | `dc55ff52983b9d9d40922c95177ff9a778b9a79aeb9ff8430df4fb04dea483f8` | alterado (ver abaixo) |
| `BuscaAlunosApp.html` | `0d3c388ea428ece1fce930c1c91e8872885608bfa2f139ef82915bdc2f556cf8` | alterado; bloco `<script>` byte-idêntico |
| `BuscaAlunosAjuda.html` | `44f9e224af6ce5d91c3628145b413fdbb371be7bf7ce15d086a3e6406a549864` | novo |
| `BuscaAlunosAjudaEstilos.html` | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` | byte-idêntico a `shared/ajuda/GradipAjudaEstilos.html` |
| `BuscaAlunosAjudaUI.html` | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` | byte-idêntico a `shared/ajuda/GradipAjudaUI.html` |
| `GradipTema.html` | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` | byte-idêntico às cópias do Painel de Solicitações e da Estrutura Curricular |
| `GradipTemaControle.html` | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` | byte-idêntico a `shared/` e às cópias dos dois sistemas |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` | byte-idêntico às cópias dos dois sistemas |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` | byte-idêntico às cópias dos dois sistemas |

`GradipTema.html` é a cópia dos sistemas (com `--gradip-border-strong` corrigido para ≥ 3:1), não a de `shared/`, que ainda tem o valor anterior.

## Diferença em `Codigo.gs`

O backend não ficou byte-idêntico. Motivos e funções tocadas:

1. **`ID_PLANILHA_INDICE` → `obterIdIndice_()`** (segurança, não visual). O ID literal do `ID_INDEX` foi trocado pela leitura de `Script Properties["ID_INDEX_SPREADSHEET_ID"]`, conforme `docs/seguranca/SEGREDOS_E_CONFIGURACAO.md`. `obterIdProducao_()` passou a chamar `obterIdIndice_()`; o resto da função é idêntico.
2. **`doGet()` + novo `include_()`** (exigido pelo tema). `createHtmlOutputFromFile` virou `createTemplateFromFile(...).evaluate()` para a página incluir tema, marcas e ajuda. Título e meta viewport iguais.
3. **Novo `diagnosticarBuscaAlunos()`**, executado só manualmente no editor; não é chamado pela página.

`listarAlunosParaBusca()`, `CABECALHOS_ALUNOS`, `ABA_INDICE` e `CHAVE_PLANILHA_ALUNOS` são idênticos ao original. Regressões testadas: lista devolvida, linhas vazias, propriedade ausente, chave ausente, ID vazio, aba de fallback, coluna faltando, planilha vazia.

## Diferença em `BuscaAlunosApp.html`

- CSS: todas as cores fixas foram trocadas por tokens; nenhuma cor hexadecimal restou fora de comentário. Tokens: `bg`, `surface`, `surface-2`, `text`, `text-muted`, `border`, `border-strong`, `header-bg`, `header-accent`, `link`, `link-hover`, `focus`, `info-bg`, `info-border`, `input-bg`, `input-text`, `disabled-bg`, `disabled-text`, `danger`, `danger-bg`, `danger-border`, `warning-bg`, `warning-border`, `shadow` (prefixo `--gradip-`).
- Cabeçalho no padrão dos outros sistemas: marca IPUSP, título, subtítulo, **Aparência**, **Ajuda**, marca USP e faixa azul; duas faixas em ≤ 480 px.
- Campo: rótulo visível "Buscar aluno" (o original só tinha placeholder), alvo ≥ 44 px, borda com `border-strong`, `:focus-visible`, `aria-live` na linha de contagem.
- Gatilhos "Como buscar?" e "Não encontrou o aluno?".
- `<mark>`: fundo e sublinhado de alerta, para o destaque não depender só da cor.
- `#listaResultados` recebeu `class="listaResultados"`. O original definia o CSS `.listaResultados` (gap de 8 px), mas o elemento só tinha `id`; os cards ficavam colados.
- Em ≤ 480 px o selo do número USP desce para a linha de baixo.
- Textos operacionais, IDs (`campoBusca`, `infoBusca`, `listaResultados`), rodapé e o bloco `<script>` inteiro foram preservados; o script é byte-idêntico ao original.

## Verificação local

Ambiente: Node 22 e Chromium (Playwright 1.56), com `SpreadsheetApp`, `PropertiesService`, `HtmlService` e `google.script.run` simulados e 121 alunos sintéticos. Scripts em [`sistemas/busca-alunos/testes/`](../../../sistemas/busca-alunos/testes/README.md).

| Suíte | Resultado |
|---|---|
| `testar_backend.js` | 11/11 |
| `testar_navegador.js` | 94/94 |

Cobertura do navegador, nos temas Claro e Escuro:

- **Três modos:** Sistema resolve pelo `prefers-color-scheme`; troca manual grava `gradip-theme`; recarregar mantém; voltar a Sistema remove a chave e acompanha a mudança do sistema com a página aberta.
- **Contraste (WCAG 2.1, medido nos estilos computados):** textos de cabeçalho, rótulo, contagem, links, nome, detalhes, selo, rodapé, Ajuda, `<mark>`, seletor e FAQ entre 5,04:1 e 14,76:1 no Claro e entre 7,25:1 e 16,29:1 no Escuro; mensagem de erro no Escuro 6,13:1; borda do campo ≥ 3:1 nos dois.
- **Marcas:** só a variante do tema ativo visível.
- **Funcional:** carregamento, busca em ordem livre, sem acento, limite 60, e-mail secundário, vazio, destaque, estado de erro; nenhum erro de JavaScript.
- **Ajuda:** gatilho contextual abre a seção certa, scroll do `body` bloqueado e restaurado, busca por `data-search` e por texto visível, FAQ com `aria-expanded`, link interno, ESC fecha e devolve o foco.
- **Mobile:** 360, 390, 480 e 768 px sem rolagem horizontal, com e sem a Central aberta; Ajuda, Aparência e campo com ≥ 44 px.

Limites: o PNG externo da marca USP foi simulado (sem rede); não houve acesso a planilhas reais, ao editor do Apps Script nem ao `/exec`. Os resultados acima não substituem a conferência no ambiente Google.

## Para homologar

1. Instalar conforme o [manual](MANUAL_OPERACAO.md#instalar-ou-atualizar) e cadastrar `ID_INDEX_SPREADSHEET_ID`.
2. Rodar `diagnosticarBuscaAlunos()` e conferir o registro.
3. Fazer a conferência do manual no `/dev` e, depois de promover, no `/exec`, nos três modos de tema e no celular.
4. Decidir o modelo de acesso pendente em [DADOS_E_SEGURANCA.md](DADOS_E_SEGURANCA.md#4-web-app) e registrar `executeAs` e **Quem pode acessar**.
5. Registrar aqui data, responsável funcional e resultado.

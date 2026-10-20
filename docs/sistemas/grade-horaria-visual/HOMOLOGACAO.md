# Homologação — Grade Horária visual (v2.0)

**Estado:** verificada localmente em 13/10/2026; **homologação no `/exec` pendente**. Esta página registra a base recebida, as diferenças, os hashes e os testes. Ela não atesta a configuração da implantação.

## Base recebida

Pacote `GRADE.zip` com os 25 arquivos do projeto Apps Script vinculado à planilha original, recebido em 13/10/2026, e um export da planilha original (formato antigo: tipos "Obrigatórias/Optativas…", `DataBase!V3` = PAR, Sala só na aba PSA, quase sem preenchimento). Os originais **não** foram versionados: `FormataAba.gs` tinha a URL da implantação. SHA-256 dos arquivos que continuam na v2.0:

| Arquivo original | SHA-256 | Na v2.0 |
|---|---|---|
| `GradeGrid.html` | `797a22d5a65d03ce05a67e541f33f07dccd6ad49fc94137839d5240e8e203633` | adaptado |
| `Codigo.gs` | `055e0752a2b0e7d3c2d54e239af381a7dec3c284dde444e8ce9397c0df56bb1b` | substituído (era o `onEdit`) |
| `doGet.gs` | `b3694d14647b4ee69cb83d790fd0815d86164a3f23f74fae2dfac4f4136011db` | absorvido pelo `Codigo.gs` |
| `Gradehoraria.gs` | `cc4b498b7ca2463492aa2fafdc8baf93aab90903182f2a38bdd7623e632d3bbf` | absorvido pelo `Codigo.gs` |
| `obterConfiguracaoGrade.gs` | `839ebfb0b17794245091df7f350c05454896bdd5f284a3f558cc8b404e300049` | absorvido pelo `Codigo.gs` |
| `GradipTema.html`, `GradipTemaControle.html`, `GradipMarcaIPUSP.html`, `GradipMarcaUSP.html` | (com BOM e CRLF do download) | mesmo conteúdo; versionados sem BOM/CRLF, byte-idênticos às cópias da Busca de Alunos |

Os outros 16 arquivos (validações, preenchimento, backup, menu, novo semestre, registro, formatação, limpeza e `GradeHoraria.html`) foram descartados: [lista e motivos](MANUAL_OPERACAO.md#instalar-ou-atualizar).

## Arquivos da fonte v2.0

| Arquivo | SHA-256 | Situação |
|---|---|---|
| `Codigo.gs` | `31bad41de949a463bc93e062f1160e61bb18cab0b6e213f0e17fd3efd7f32cb7` | novo |
| `GradeGrid.html` | `8ac1f669b80c49b4fc53384f7c51570aad8b902c1000ff212f3af4f729a13993` | adaptado |
| `GradeAjuda.html` | `59741f1c8e92084162c9be465950afc1bb89385cdb03a8bca24e98ff82cd7851` | novo |
| `GradeAjudaEstilos.html` | `4b34766ecf2a6f194c9d04dad4a8b0a6b5c6109a99946e9f5a8079ca586ad2c7` | byte-idêntico a `shared/ajuda/GradipAjudaEstilos.html` |
| `GradeAjudaUI.html` | `dc571371baf84152e99785a24dab393f6221563f4f497dd0d58ea883ed0592b3` | byte-idêntico a `shared/ajuda/GradipAjudaUI.html` |
| `GradipTema.html` | `35ab5bdf248b7a4cfd2778d4cfdf26d338b8c05905dd1d65e406f9b3a832abae` | byte-idêntico à Busca de Alunos |
| `GradipTemaControle.html` | `fb779bf073d81f1e4c4f584b3c05b94574bb577bab13325acc827e27e66ba7c7` | byte-idêntico a `shared/` e à Busca de Alunos |
| `GradipMarcaIPUSP.html` | `7e43e3a175363c92c16a0ad21b090daf67e1a310b5c9156d70f635623629300b` | byte-idêntico à Busca de Alunos |
| `GradipMarcaUSP.html` | `7714a3fc7c5e5a384151ccb5d30c6342ad86481d15762d7b31a74defcc352734` | byte-idêntico à Busca de Alunos |

## O que mudou

Mudança funcional pedida pelo responsável funcional em 13/10/2026; backend e script da página foram alterados de propósito.

**Decisões tomadas com o responsável funcional antes da implementação (13/10/2026):**

1. Botões de semestre pela paridade do semestre da grade (AAAA/1 ímpares, AAAA/2 pares), mais um botão para qualquer outro semestre ideal que tenha disciplina na grade.
2. Disciplinas do IP para outros cursos (sem semestre ideal) não aparecem; disciplinas de outras unidades ministradas para o IP aparecem.
3. Sala procurada pelo título "Sala" (não existe em todas as abas).
4. Seletor com rótulo "Consultar Grades Anteriores", itens "AAAA - Xº Semestre", mais recentes primeiro; a página abre na grade atual.

**`Codigo.gs`** (novo): `doGet` e `include_` iguais aos de `doGet.gs`; `obterConfiguracaoGrade()` deixa de ler `DataBase!V3` e devolve `{atual, anteriores, avisoAnteriores}`; `obterDisciplinas(semestre)` virou `obterGrade(semestre)` — uma leitura por grade (as seis abas), filtrada no servidor, com cache, em vez de uma leitura por botão. Regras de entrada: as de `Gradehoraria.gs` (SIM, não Prática, com dia/início/fim) + semestre ideal 1–10, dia útil e horário válido. `ID_INDEX` lido como na Busca de Alunos (colunas pelo título). Novo `diagnosticarGradeVisual()`. O `onEdit` (validações e recarga por `DataBase!V2`) saiu.

**`GradeGrid.html`**: cabeçalho com o seletor, Ajuda e quebra em duas faixas abaixo de 1180 px; faixa da grade exibida com legenda; aviso de semestre vazio, horário fora do quadro e falha; botões de semestre com `aria-pressed`, filtrando no navegador; tipos novos (`Obrigatória/Eletiva/Livre`, normalizados no servidor); escape de HTML no post-it e na ficha (antes `innerHTML` com texto da planilha); ficha com ×, Esc, foco e Enter no post-it; disciplina fora do quadro não é mais desenhada no canto (antes ia para 0,0); PDF da grade selecionada, com o semestre no título e no nome do arquivo, e `try/finally` para não deixar a tela travada; respostas atrasadas descartadas; `console.log` de depuração removidos. Mantidos: desenho do quadro, horários, post-its, deslocamento em escada, hover, cores, mapa de departamentos, tela de carregamento e exportação lado a lado em paleta clara. Tokens novos usados: `input-bg`, `input-text`, `info-bg`, `info-border`, `warning`, `warning-bg`, `warning-border`, `danger-bg`, `danger-border`, `focus`.

## v2.1 — grade atual sem atraso (15/10/2026)

Pedido do responsável funcional: uma edição na planilha das secretarias tem de aparecer no próximo F5 da grade visual (antes levava 1 a 2 min).

- **Causa:** `obterGrade('')` guardava a grade atual inteira no `CacheService` por 120 s; durante esse tempo, qualquer F5 recebia a cópia guardada.
- **`Codigo.gs`:** o conteúdo da grade atual deixou de ir para o cache e é lido da planilha a cada carregamento. Para não abrir também o `ID_INDEX` a cada F5, só a referência à grade atual (`referenciaGradeAtual_()`: ID e semestre) fica 10 min no cache do script, que fica no servidor e nunca vai ao navegador. Grades anteriores e a lista delas continuam com o cache de antes. `lidaEm` passou a ter segundos, para conferir se a leitura é nova. `VERSAO_CACHE` foi para `v3`, então nada guardado pela v2.0 é reaproveitado.
- **`GradeAjuda.html`:** os dois textos que falavam em "alguns minutos" de atraso agora dizem que a grade é lida a cada carregamento.
- **Testes:** `testar_backend.js` ganhou o caso "a secretaria edita, a próxima leitura mostra a edição sem reabrir o `ID_INDEX`" e confere que a grade anterior continua em cache: 40 ok. `testar_navegador.js`: 148 ok.

## Verificação local

Ambiente: Node 22 e Chromium (Playwright 1.56), com `SpreadsheetApp`, `PropertiesService`, `CacheService`, `HtmlService`, `Utilities` e `google.script.run` simulados; html2canvas/jsPDF substituídos por versões locais que registram páginas e nome do arquivo. Scripts em [`sistemas/grade-horaria-visual/testes/`](../../../sistemas/grade-horaria-visual/testes/README.md).

| Suíte | Resultado |
|---|---|
| `testar_backend.js` | 36/36 |
| `testar_navegador.js` | 148/148 |

Cobertura do navegador: Claro e Escuro (preferência do sistema), contraste ≥ 4,5:1 em 17 elementos de texto + texto dos post-its + aviso de erro, persistência manual e mudança do sistema com a página aberta, 360/390/480/768/1024/1280 px nos dois temas sem rolagem horizontal da página e com alvos ≥ 44 px. Limites: o PDF real (html2canvas/jsPDF do CDN) e o comportamento das planilhas reais só podem ser conferidos no `/dev`.

## Para homologar

Seguir a [conferência do manual](MANUAL_OPERACAO.md#conferência-no-dev-e-no-exec) no `/dev` antes de criar a nova versão da implantação, e registrar aqui data, versão da implantação e resultado.

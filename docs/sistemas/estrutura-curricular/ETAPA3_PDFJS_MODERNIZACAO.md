# Etapa 3 — Preparação para modernizar o PDF.js da Estrutura Curricular

Investigação e prova de conceito isolada, feitas em 22/10/2026 sobre o `main` em `a49d378`. **Nada do sistema mudou:** `src/`, `LeitorPdfFontes.html`, URLs, SRI e o PDF.js de produção (3.11.174) continuam iguais, assim como o `package.json`/`package-lock.json` dos testes. O protótipo está em [`sistemas/estrutura-curricular/testes/prototipo-pdfjs/`](../../../sistemas/estrutura-curricular/testes/prototipo-pdfjs/README.md).

Legenda: **[comprovado]** = executado e conferido nesta etapa; **[inferência]** = conclusão a partir do código ou de evidência indireta; **[a validar]** = depende do Google (HtmlService) ou de material que não está no repositório.

## A. Diagnóstico do leitor atual

### A.1 Como o PDF.js 3.11.174 é carregado

- `LeitorPdfFontes.html` (incluído no `Painel.html` por `include_`) define `LIBS.pdfjs = { url: …/pdfjs-dist@3.11.174/build/pdf.min.js, integridade: sha384-/1qU…, worker: …/build/pdf.worker.min.js }`, servido pelo jsDelivr.
- O carregamento é **sob demanda**: só quando alguém escolhe um PDF. `carregarScript` insere um `<script src integrity crossorigin="anonymous">` (UMD clássico), guarda a promessa para carregar uma vez só e, se falhar, libera uma nova tentativa com a mensagem "Não foi possível baixar um componente de leitura de PDF…".
- O script clássico cria o global `window.pdfjsLib`. **[comprovado na Etapa 1]**

### A.2 Uso de `window.pdfjsLib`

- `abrirPdf`: `GlobalWorkerOptions.workerSrc = LIBS.pdfjs.worker` e `getDocument({ data: bytes, isEvalSupported: false }).promise`.
- `textoDaPagina`: `getViewport({ scale: 1 })`, `getTextContent()` e `pdfjsLib.Util.transform(vp.transform, item.transform)`.
- `ocrDaPagina`: `getViewport({ scale: 300/72 })` e `render({ canvasContext, viewport })`.

### A.3 Como o worker é iniciado

O `workerSrc` aponta para o jsDelivr, que é outra origem. O PDF.js 3.x detecta isso e cria um worker `blob:` que faz `importScripts(<URL do jsDelivr>)`. **O worker não tem SRI**: a página confere só o `pdf.min.js`. Se o worker falhar, o PDF.js tenta o "fake worker", que carrega o mesmo arquivo na página. O controle negativo da Etapa 1 mostrou essa queda: "Setting up fake worker failed". **[comprovado]**

### A.4 O que o leitor devolve

`LeitorPdfFontes.ler(bytes, { aoProgredir, sinal })` devolve `{ modo: 'texto' | 'ocr', paginas: [{ numero, largura, altura, tokens: [{ texto, x0, x1, y0, y1, conf }], tokensNumericos? }] }`. As coordenadas são em pontos do PDF, com origem no canto superior esquerdo.

Esse é o contrato que o `LeitorPdfJupiter.analisar(paginas, { modo, … })` consome:
- agrupa palavras em linhas por `y0/y1`;
- ordena por `x0`;
- usa `conf` (abaixo de 60 descarta no OCR) e `tokensNumericos` (2ª leitura dos números no OCR).

O `PainelImportacao.html` chama `ler` em dois lugares (leitura de um arquivo e leitura de CSV+PDF juntos) e mostra a mensagem do erro quando a leitura falha.

### A.5 Palavras, coordenadas, dimensões e páginas

- **Páginas:** uma de cada vez, em sequência, com `numero` de 1 a N; o cancelamento é conferido entre as páginas.
- **Dimensões:** `largura`/`altura` vêm do viewport em escala 1.
- **Palavras:** cada item não vazio de `getTextContent` vira um token, com `x0 = tx[4]`, `x1 = tx[4] + item.width`, `y1 = tx[5]`, `y0 = tx[5] − hypot(tx[2], tx[3])` (8 se zero) e `conf = 100`.

### A.6 Texto ou OCR

Uma página "tem texto" com 40 ou mais caracteres não brancos. Se metade ou mais das páginas tiver texto, o modo é `texto`. Senão, entra o OCR:
- Tesseract.js 7.0.0 do jsDelivr, com SRI no script;
- modelo `por.traineddata` (tessdata_fast 4.1.0), com SHA-256 conferido;
- cada página é desenhada a 300 dpi e lida duas vezes (texto e só dígitos).

O PDF.js é usado no OCR só para desenhar a página no canvas.

### A.7 Contratos que podem quebrar com o PDF.js moderno

| Ponto | 3.11.174 | 4.x / 5.x / 6.x | Efeito |
|---|---|---|---|
| Formato | UMD `pdf.min.js` | só módulos ES (`.mjs`) | `<script src>` não serve; é preciso `import()`. **[comprovado]** |
| Global `window.pdfjsLib` | criado pelo script | o código do leitor depende dele; o `import()` devolve o módulo | atribuir o módulo a `window.pdfjsLib` (ou a uma variável do leitor). **[comprovado no protótipo]** |
| SRI | `<script integrity>` | não existe `integrity` para `import()` nem para `new Worker()` | precisa de outro controle (seção C). |
| Worker | `workerSrc` + embrulho `blob:` com `importScripts` | worker de módulo; aceita `workerPort` | usar `workerPort` com o worker conferido. **[comprovado]** |
| `isEvalSupported` | existe; `false` evita o `eval` do CVE-2024-4367 | existe no 4.x; **removido no 5.x e no 6.x**, que não têm `new Function`/`eval` na biblioteca nem no worker | manter `isEvalSupported: false` não faz mal (é ignorado); a garantia passa a ser a ausência de `eval`, provada por CSP sem `'unsafe-eval'`. **[comprovado]** |
| `Util.transform`, `getTextContent`, `getViewport` | — | mesmos resultados | palavras e posições idênticas às do 3.11.174 (tolerância 0,01 pt). **[comprovado]** |
| `render({ canvasContext, viewport })` | — | aceito no 4.10.38 e no 6.4.299 | mesmo canvas e mesma contagem de pixels escuros. **[comprovado]** |
| `PDFDocumentProxy.destroy()` | existe | não existe no 6.x (usar `loadingTask.destroy()`) | o leitor atual não usa; só o protótipo precisou ajustar. **[comprovado]** |
| Requisitos do navegador | ES2017+ | o build **moderno** do 6.4.299 usa `Map.prototype.getOrInsertComputed`, ausente no Chromium 141 | o desenho da página falha (`getOrInsertComputed is not a function`); o build **legacy** traz polyfills e passa. **[comprovado]** |
| Erros | `InvalidPDFException` | mesmo nome | sem mudança. **[comprovado]** |
| Recursos auxiliares | não configurados | `standardFontDataUrl`, `cMapUrl`, `wasmUrl` (JPX/JBIG2) | não usados pelo leitor; PDFs com fontes padrão não incorporadas, CJK ou imagens JPX podem dar aviso ou desenhar diferente no OCR. **[inferência; a validar com os PDFs do Júpiter]** |

### A.8 HtmlService

O `doGet` usa `HtmlService.createTemplateFromFile('Painel').evaluate()`, sem `setSandboxMode` nem `setXFrameOptionsMode`, ou seja, o modo IFRAME padrão. A página roda num iframe de outra origem do Google. O projeto da Estrutura não tem `appsscript.json` versionado, então as configurações de execução não podem ser conferidas pelo repositório. **[a validar]**

## B. Comparação de versões

| Versão | Data | `npm audit` (isolado, 22/10/2026) | Situação |
|---|---|---|---|
| 3.11.174 (produção) | 09/2023 | GHSA-wgrm-67xf-hhpq (correção em 4.2.67) | Mitigado por `isEvalSupported: false`; continua vulnerável a falhas posteriores não cobertas por esse aviso. |
| 4.2.67 | 04/2024 | só a cadeia `canvas`/`tar` antiga | Primeira com a correção; sem motivo para escolher. |
| 4.10.38 | 01/2025 | 0 | Última 4.x; passa no protótipo, mas a linha 4.x não recebe mais versões. Ainda tem `new Function` (protegido por `isEvalSupported`). |
| 5.7.284 | 04/2026 | **GHSA-hq66-cqwq-w95j** ("Arbitrary JavaScript execution upon opening a malicious PDF", afeta `>=5.6.83 <6.2.108`) | **Descartada.** |
| 6.4.299 | 03/10/2026 | 0 | Mais recente; sem `eval` na biblioteca e no worker (`eval` só existe no `pdf.sandbox`, que não é carregado). Build moderno exige navegador recente; **legacy** funciona no Chromium 141. |

**Candidata proposta:** a linha **6.x no build `legacy/`**, fixada na versão exata e com os hashes conferidos no momento da Etapa 4 (hoje 6.4.299). Os motivos:
- é a linha mantida e não tem aviso conhecido;
- removeu o `eval`;
- o build legacy evita depender de recursos recentes do navegador da equipe.

Pontos de atenção:
- os polyfills do legacy alteram protótipos globais (por exemplo, `Map.prototype`) na página do painel;
- a versão 5.x mostra que versões novas também trazem falhas novas: reconferir os avisos na hora de fixar.

O PR #13 (6.4.299 só nos testes) **não** serve como solução: troca o espelho sem trocar a produção e quebra o carregamento clássico.

## C. Segurança da cadeia de carregamento

1. **SRI hoje:** cobre só o `pdf.min.js`; o worker é baixado sem conferência. O risco é potencial (CDN ou pacote comprometido; OWASP *Third Party JavaScript*). **Não há incidente conhecido.**
2. **Módulos ES:** `<script type="module" integrity>` confere só o arquivo da tag. `import()` não tem `integrity`. Os *import maps* com `integrity` cobrem módulos importados, mas não o `new Worker()`.
3. **Controle real proposto (protótipo):** baixar a biblioteca e o worker com `fetch` e calcular o SHA-384 com `crypto.subtle`. Se o hash for o esperado, executar **os mesmos bytes** via `blob:` (`import(blob)` e `new Worker(blob, { type: 'module' })`, entregue por `workerPort`); senão, não executar nada. O teste mostra que com um byte a mais ou com um 404, em qualquer dos dois arquivos, nada é executado e nenhum worker é criado. **[comprovado]** Não é uma verificação documental: o hash é calculado e comparado no navegador antes de executar.
4. **Requisitos:** CORS do jsDelivr (envia `access-control-allow-origin: *`; **[a validar no jsDelivr real]**), `connect-src` para o jsDelivr e `worker-src`/`script-src` com `blob:` se houver CSP.
5. **Desempenho:** cerca de 1,8 MB (biblioteca legacy de 524 KB e worker de 1,3 MB). A carga e a conferência levaram de 100 a 150 ms sem latência de rede. Na Etapa 4, tirar o `cache: 'no-store'` do protótipo para aproveitar o cache HTTP, já que o hash é conferido a cada uso.
6. **Menos dependência externa:** guardar os dois arquivos no próprio projeto Apps Script (como HTML incluído) e executar pelo mesmo mecanismo `blob:` eliminaria o jsDelivr. Isso depende dos limites de tamanho de arquivo do Apps Script e do custo de servir 1,8 MB em cada abertura do painel. **[a validar]** Por enquanto, a proposta é manter o jsDelivr com o hash fixado.
7. **CSP:** o protótipo usa uma CSP rígida, sem `'unsafe-eval'`. Com ela, o 3.11.174 com `isEvalSupported: false` e os candidatos rodaram sem nenhuma violação. A CSP real do HtmlService não está documentada no repositório. **[a validar]**
8. **Fora desta etapa:** o Tesseract também carrega worker e core do CDN sem conferência equivalente no worker (inventário da Etapa 5).

## D. Prova de conceito

- **Arquivos:** `prototipo-pdfjs/candidatos.json`, `preparar.js`, `carregador_verificado.js`, `testar_prototipo.js`, `README.md` e `.gitignore` (pasta `pacotes/`).
- **Versões:** referência 3.11.174 (`node_modules` dos testes); candidatos `6.4.299-legacy` e `4.10.38-moderno`; `6.4.299-moderno` como informativo.
- **Comandos:** `node preparar.js && node testar_prototipo.js`.
- **Resultado (Chromium 141.0.7390.37):** **39 passaram, 0 falharam, 1 falha informativa** (a esperada do `6.4.299-moderno`). Código de saída 0.
- **Integridade e carga:** pacotes conferidos por SHA-512 do npm, arquivos por SHA-384. Mensagens com o worker: 9 enviadas e 14 recebidas por leitura completa.
- **O que passou em cada candidato:**
  - leitura com 2 páginas de 595×842, texto com acentos e palavras e posições idênticas às do 3.11.174;
  - desenho a 300 dpi com 44.480 pixels escuros, igual à referência;
  - recusa de PDF corrompido e de texto puro com `InvalidPDFException`, e releitura normal depois;
  - nenhuma violação de CSP, erro, 4xx ou pedido falho;
  - 4 controles negativos (lib e worker com 404 ou adulterados).
- **Limitações:**
  - roda no Chromium do Playwright, não no HtmlService;
  - CDN simulada a partir dos pacotes conferidos;
  - sem OCR (Tesseract) e sem PDF do Júpiter;
  - só um navegador;
  - o leitor recebe a biblioteca por uma troca de `LeitorPdfFontes.LIBS.pdfjs` em tempo de execução (script vazio conferido), o que mostra que **só o carregamento** precisa mudar.

## E. Compatibilidade com o Google Apps Script

| Comprovado no Chromium | Depende do HtmlService |
|---|---|
| `import()` de `blob:`; Worker de módulo de `blob:`; `workerPort` | Se o iframe do HtmlService permite Worker de **módulo** criado de `blob:` (o worker `blob:` clássico do 3.x já funciona em produção **[inferência]**) |
| Conferência SHA-384 com `crypto.subtle` | `crypto.subtle` no iframe (exige contexto seguro; o HtmlService é https) **[a validar]** |
| `fetch` com CORS para o jsDelivr | CSP e permissões de rede do iframe **[a validar]** |
| Sem `eval` (CSP rígida) | CSP real do HtmlService **[a validar]** |
| Build legacy no Chromium 141; moderno falha | Versões de Chrome/Edge usadas pela equipe **[a validar]** |
| Palavras, posições e desenho iguais aos do 3.11.174 em PDF sintético | Mesmo resultado com o PDF do Júpiter "com texto" e o impresso (OCR) **[a validar com o responsável]** |

## F. Proposta para a Etapa 4 (não executada)

1. **Mudanças no sistema** (`LeitorPdfFontes.html`; nada no servidor):
   - `LIBS.pdfjs` passa a ter `lib { url, sha384 }` e `worker { url, sha384 }` da versão 6.x legacy fixada;
   - `abrirPdf` usa o carregamento conferido (integrado ao próprio arquivo), cria **um** Worker por sessão da página e o reaproveita por `workerPort`, e mantém `isEvalSupported: false` (ignorado no 6.x; fica como defesa explícita, caso alguém volte uma versão antiga);
   - a mensagem de falha de download continua a mesma, e a de integridade fica em linguagem de quem usa;
   - nenhuma mudança no OCR, no `LeitorPdfJupiter`, no `PainelImportacao` nem no backend.
2. **Espelho de testes** (no mesmo PR):
   - `pdfjs-dist` na mesma versão exata;
   - reavaliar o override da Etapa 2: o 6.x troca o `canvas` por `@napi-rs/canvas` opcional, que tem binário pronto e seria instalado na CI; decidir entre aceitar ou usar `npm ci --omit=optional`;
   - `ambiente_navegador.js` precisa servir `.mjs` como `text/javascript` (hoje cai em `application/octet-stream`).
3. **Testes:**
   - atualizar `testar_pdf_sintetico.js` (versão, `.mjs`, worker de módulo) e acrescentar os controles do protótipo (byte adulterado, CSP sem `eval`, comparação de palavras e posições com o 3.11.174 gravada como referência);
   - manter todos os controles negativos atuais;
   - rodar as suítes sintéticas e a CI completa.
4. **Validação controlada (com o responsável, sem versionar arquivos):**
   - rodar localmente `testar_pdf_texto.js`, `testar_navegador.js` e `gerar_paginas_ocr.js` com os PDFs do Júpiter, comparando o pacote lido pelo 3.11.174 e pelo candidato (vínculos, números, requisitos, conferência);
   - nenhum PDF real entra no Git.
5. **Homologação no Google:**
   - `clasp push` só com ordem expressa, para um projeto de **homologação** (`GRADIP · Estrutura Curricular · HOMOLOGAÇÃO`, a confirmar);
   - no `/dev`, importar o PDF sintético, um corrompido, o PDF do Júpiter com texto e o impresso (OCR);
   - no DevTools, conferir que não há erros nem violações de CSP, que existe um Worker `blob:` e que a rede respondeu 200;
   - testar no Chrome e no Edge da equipe.
6. **Critérios de aceite:**
   - versão fixada e hashes conferidos em produção e no espelho;
   - CI completa verde, com a suíte de PDF executada;
   - mesmo resultado da importação do 3.11.174 nos PDFs do Júpiter;
   - nenhum `eval` e nenhum fake worker;
   - recusa de arquivo adulterado;
   - homologação aprovada pelo responsável;
   - `npm audit` sem o GHSA-wgrm.
7. **Rollback:**
   - o `/exec` fica na versão implantada anterior até a nova ser aprovada; se der problema depois, editar a implantação e voltar à versão anterior;
   - no Git, reverter o merge.
   - Releases e tags seguem `docs/VERSOES.md`, sem mover tags.

## Riscos que continuam

- Produção segue no 3.11.174 (GHSA-wgrm mitigado, não corrigido) e com o worker sem conferência até a Etapa 4.
- As incógnitas do HtmlService (seção E) só se resolvem na homologação.
- O build legacy aumenta o tamanho (cerca de 65 KB a mais na biblioteca) e altera protótipos globais da página.
- Versões novas do PDF.js podem trazer avisos novos (caso do 5.x): reconferir na hora de fixar.

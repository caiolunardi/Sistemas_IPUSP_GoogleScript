# Etapa 4 — PDF.js 6.4.299 no leitor de PDF (Estrutura Curricular 1.12.1)

**Situação em 22/10/2026:** implementada num ramo próprio, com testes e documentação. **Não implantada nem homologada no Google.** A conferência com PDFs reais do Júpiter (seção 7) e a homologação no HtmlService (seção 8) dependem do responsável e de autorização própria.

Base: o relatório da [Etapa 3](ETAPA3_PDFJS_MODERNIZACAO.md) e o protótipo aprovado em `testes/prototipo-pdfjs/` (PR #24).

## 1. Avisos de segurança conferidos antes da implementação

Fontes consultadas em 22/10/2026: API de avisos do registro do npm (`/-/npm/v1/security/advisories/bulk`), o banco de avisos do GitLab e o OSV (páginas de CVE-2026-16633 e CVE-2024-4367). O texto do aviso no GitHub não pôde ser lido deste ambiente.

| Aviso | Versões afetadas | Mecanismo publicado | Correção | 6.4.299 |
|---|---|---|---|---|
| GHSA-wgrm-67xf-hhpq (CVE-2024-4367) | `<= 4.1.392` (corrigido em 4.2.67) | execução de JavaScript arbitrário ao abrir um PDF malicioso quando `isEvalSupported` é `true` (padrão); a correção removeu o uso de `eval` (PR mozilla/pdf.js#18015) | 4.2.67 | fora da faixa |
| GHSA-hq66-cqwq-w95j (CVE-2026-16633) | `>= 5.6.83 < 6.2.108` | execução de JavaScript arbitrário ao abrir um PDF malicioso **com `enableScripting` ligado** (o padrão do visualizador) e sem CSP que restrinja `script-src`; CWE-79. Contorno publicado: `enableScripting: false` ou CSP | 6.2.108 | fora da faixa |

- O commit da correção do GHSA-hq66 **não está listado** nas fontes consultadas (referências: o aviso do repositório mozilla/pdf.js e o bug 2055885 da Mozilla). Não afirmo qual linha de código foi corrigida.
- `npm audit` com o `package-lock.json` desta etapa: **0 vulnerabilidades**.
- A 4.10.38 continua documentada como alternativa técnica (passou no protótipo; linha 4.x sem versões novas). Ela **não** é fallback automático: o leitor só conhece uma versão.

## 2. Versão e arquivos

| | Valor |
|---|---|
| Versão | `pdfjs-dist` **6.4.299**, build `legacy` (traz polyfills; o build moderno falha no Chromium 141 por `Map.prototype.getOrInsertComputed`) |
| Pacote no npm | `sha512-AVl138zALtfaAPvADulE0PZThbYzCBS79nL4pOSL/6Sm/4AH5A21BD9VHt97OlCuzJuCpmeZtAtkinisF4Vb1g==` |
| Biblioteca | `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs` · `sha384-oPqHr8MeYfJpkh4zgHbWYiuwabTzthRiOS5tSWsWGmCVWlwqIkS9coGro5aa48OF` |
| Worker | `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs` · `sha384-tINN5IYq7dFaoHBUBBc2yfxGwR38mZn9GhaX31UofKYNgAg/3y8A7IjUI3GuEg/8` |

Os hashes são os do protótipo (`candidatos.json`) e a suíte oficial confere, a cada execução, que são iguais aos dos arquivos do `pdfjs-dist` instalado pelo `package-lock.json`.

## 3. O que mudou no código

| Arquivo | Mudança |
|---|---|
| `src/LeitorPdfFontes.html` | `LIBS.pdfjs` com versão, URL e SHA-384 da biblioteca e do worker. Novo carregamento (`carregarPdfJs`): `fetch` dos dois arquivos (`credentials: 'omit'`), SHA-384 com `crypto.subtle`, `blob:` com os mesmos bytes, `import()` da biblioteca, conferência de `version`, Worker de **módulo** criado do `blob:`, espera da mensagem de início do worker (até 30 s) e `new PDFWorker({ port })`. Cada leitura passa esse `PDFWorker` ao `getDocument` e, no fim (sucesso, erro ou cancelamento), chama `tarefa.destroy()`, que libera só aquele documento. `Util.transform` vem do módulo carregado, não de `window`. O `getDocument` recebe uma cópia dos bytes. O resto do arquivo (texto, OCR, Tesseract, modelo) não mudou. |
| `src/EstruturaAjuda.html` | o item "A leitura do PDF não começa, demora ou falha" cita o componente que chega diferente do esperado e ganhou os termos das mensagens novas na busca. |
| `src/Codigo.gs` | só `VERSAO_SISTEMA` = `1.12.1` (regra de versões do repositório). Nenhuma outra linha de servidor mudou. |

Nenhuma mudança em `LeitorPdf.html` (`LeitorPdfJupiter`), `PainelImportacao.html`, regras curriculares, planilhas, gravação ou OCR.

### Decisões e por quê

- **Um worker por página.** Criado na primeira leitura e reaproveitado, inclusive por leituras simultâneas (a importação lê o PDF em segundo plano enquanto se confere o CSV). O PDF.js não encerra um worker recebido por `port`; `tarefa.destroy()` libera só o documento.
- **`PDFWorker` explícito, não `GlobalWorkerOptions.workerPort`.** Com `workerPort`, o 6.4.299 guarda um `PDFWorker` compartilhado e o `destroy()` de uma tarefa o destrói (o código marca `_pendingDestroy` e quem abrir outro documento nesse intervalo recebe erro). Passando `worker:` a cada `getDocument`, a tarefa não toma posse do worker.
- **Sem "fake worker".** O leitor nunca define `workerSrc`; se o worker não iniciar, a leitura falha com mensagem, em vez de rodar o PDF.js na página.
- **Limpeza.** Os dois `blob:` são liberados assim que o módulo foi avaliado e o worker começou; numa falha, também (inclusive o do download que termina depois do erro do outro). O worker é encerrado se não iniciar. Um erro do worker **depois** de iniciado faz a próxima leitura carregar tudo de novo, sem encerrar o antigo, para não cortar documentos ainda em leitura.
- **Nova tentativa.** Qualquer falha de carga esquece a promessa guardada; a leitura seguinte baixa e confere de novo.
- **Mensagens** (as duas novas aparecem no alerta da tela de importação, como as de antes):
  - download, rede ou CORS: "Não foi possível baixar um componente de leitura de PDF. Verifique a conexão e tente de novo." (a mesma de antes);
  - hash ou versão diferente: "Um componente de leitura de PDF veio diferente do esperado e não foi usado. Tente de novo mais tarde; se continuar, avise a equipe de sistemas.";
  - worker ou módulo que não inicia: "O componente de leitura de PDF não pôde ser iniciado neste navegador. Atualize o navegador e tente de novo, ou use o CSV do Júpiter.".
- **`isEvalSupported: false` mantido.** O `getDocument` do 6.4.299 não lê essa opção (conferido no código); ela não causa incompatibilidade e fica como intenção explícita caso uma versão antiga volte.
- **`cache: 'no-store'` do protótipo retirado.** O cache HTTP pode ser usado porque o hash é conferido a cada carga.

### Recursos auxiliares do PDF.js

O leitor não configura `standardFontDataUrl`, `cMapUrl` nem `wasmUrl`, como antes. Com isso o PDF.js **não baixa** fontes padrão, CMaps nem WASM: na suíte, os únicos pedidos ao jsDelivr para o PDF.js são a biblioteca e o worker. Efeito conhecido: fontes padrão não incorporadas (como a Helvetica do PDF sintético) são desenhadas com uma fonte substituta, como já acontecia no 3.11.174; no PDF sintético, o desenho a 300 dpi ficou igual ao do 3.11.174. Para a camada de texto isso não muda as palavras; para o OCR, pode mudar o desenho de PDFs com fontes não incorporadas. A conferência com o Júpiter (seção 7) mostra se isso acontece com os relatórios reais. Se for preciso servir esses recursos, eles teriam de seguir a mesma política: versão fixa, hash conferido e origem documentada.

## 4. Scripts embutidos em PDF

- **Quem executa scripts de documento no 6.4.299** (conferido em `legacy/build/pdf.mjs`): a `AnnotationLayer` (`enableScripting: params.enableScripting === true`, desligado por padrão) e o visualizador (`pdf_viewer`, com o `pdf.sandbox`). `enableScripting` **não** é parâmetro do `getDocument()`. O núcleo só oferece `hasJSActions()`, `getJSActions()` e `getFieldObjects()`, que devolvem os scripts como dados.
- **O leitor** usa só `getDocument`, `getPage`, `getTextContent` e `render` no canvas. Não carrega `AnnotationLayer`, `pdf_viewer` nem `pdf.sandbox` e não chama `getJSActions`/`getFieldObjects` (busca no arquivo: 0 ocorrências). A superfície de scripting fica desligada por não ser carregada, não por uma opção suposta.
- **`annotationMode`:** mantido o padrão (`ENABLE`), que desenha no canvas a aparência das anotações, sem executar scripts. Não troquei para `DISABLE` porque isso pode mudar o desenho usado pelo OCR em PDFs com anotações e não há como provar a equivalência só com PDFs sintéticos. Fica como item da conferência com o Júpiter (seção 7): se os relatórios não tiverem anotações, `DISABLE` pode ser avaliado numa versão seguinte.
- **Teste** (`testar_pdf_sintetico.js`): `pdf_sintetico.js` monta um PDF **benigno** com o mesmo texto do PDF válido e um script que só tenta `app.alert("MARCADOR-SCRIPT-PDF")` e criar `globalThis.__marcadorScriptPdf`, ligado à abertura do documento (`/OpenAction` e `/Names /JavaScript`), à abertura da página (`/AA /O`) e a um link. A leitura e o desenho a 300 dpi não abrem diálogo, não criam o marcador e não pedem sandbox nem visualizador; numa página com CSP sem `'unsafe-eval'` também não há violação. O **controle** confirma que o PDF tem mesmo o script (`getJSActions` devolve `MarcadorTeste` e `OpenAction`) e que, quando o teste executa o script de propósito, o detector acusa o marcador. Uma mutação que faz o leitor executar os scripts do documento reprova a suíte.

## 5. Espelho de testes

- `package.json`: `pdfjs-dist` **6.4.299** e saída do `overrides` de `@mapbox/node-pre-gyp` da Etapa 2. O 6.x não depende de `canvas`; com isso `@mapbox/node-pre-gyp` e `tar` saíram da árvore (`npm ls tar` vazio) e o override ficaria inerte.
- `@napi-rs/canvas` 1.0.13 (opcional do 6.x) é instalado com o binário `linux-x64-gnu` (cerca de 36 MB, licença MIT, **sem script de instalação**). Os testes não o usam. Mantido para não mudar o `npm ci` da CI (`--omit=optional` exigiria mexer no workflow); se preferirem tirar, é uma mudança de uma linha no `ci.yml`.
- Os pacotes com script de instalação continuam os de antes (`tesseract.js` e `fsevents`, este só no macOS).
- O `pdfjs-dist` 6.x exige Node 22.13 ou mais novo; a CI usa `node-version: 22` (a mais recente da linha 22).
- `ambiente_navegador.js` serve `.mjs` como `text/javascript`.
- `referencia_pdfjs_3.11.174.json`: palavras, posições e desenho do PDF sintético pelo 3.11.174, com o leitor como estava em produção. É gerado e conferido pelo protótipo (`node testar_prototipo.js --gravar-referencia`), que agora baixa o 3.11.174 do npm (`referencia` em `candidatos.json`) e usa `prototipo-pdfjs/referencia/LeitorPdfFontes-3.11.174.html` (cópia do `main` 909b12a). A suíte oficial compara com esse arquivo as **palavras e posições** do leitor atual.
- **Desenho a 300 dpi — diferença encontrada na CI e como foi tratada:**
  - 1ª CI do PR #25 (781eb8f): o desenho do 6.4.299 deu 45.457 pixels escuros na CI e 44.480 aqui; a suíte comparava com o número gravado (44.480) e falhou (35 passaram, 2 falharam).
  - 1ª correção (42b5e19): desenhar também com o 3.11.174 na mesma execução. Na CI, o **3.11.174 deu 45.898** e o 6.4.299, 45.457 (36 passaram, 2 falharam). Ou seja, na CI as duas versões **desenham diferente** o PDF com texto; aqui, igual.
  - Diagnóstico: o PDF sintético usa Helvetica **não incorporada**. Registrando as fontes pedidas ao canvas, o 3.11.174 pede `g_d1_sf2,sans-serif` (a substituta, que cai na fonte genérica) e o 6.4.299 pede `"Helvetica",g_d1_sf2,sans-serif` (primeiro a fonte que o PDF nomeia). Nenhuma opção do `getDocument` volta ao comportamento antigo (`useSystemFonts: false` mantém "Helvetica"). Onde "Helvetica" e `sans-serif` resolvem para a mesma fonte, o desenho é igual; onde não, muda. Reproduzido aqui com um fontconfig que leva "Helvetica" à DejaVu Sans: 3.11.174 = 44.480, 6.4.299 = 49.171, e o 3.11.174 forçado a pedir "Helvetica" antes = 49.171.
  - Teste atual: (a) um **PDF só com imagem** (`pdfSoImagem`, como um relatório escaneado, que é o que o OCR desenha) precisa dar os mesmos pixels escuros nas duas versões, sem pedir fonte nenhuma; (b) no PDF com texto e no PDF com script, a suíte confere que a única diferença nas fontes pedidas é o `"Helvetica",` antes da substituta e exige os mesmos pixels quando o 3.11.174 é desenhado pedindo a mesma fonte; o número do 3.11.174 sem mudança fica informativo.
  - Efeito no sistema: o desenho só é usado pelo OCR, que entra quando menos que a fração mínima de páginas tem texto. Num PDF escaneado não há fonte. Num PDF misto (algumas páginas com texto em fonte não incorporada e o resto escaneado), as páginas com texto podem ser desenhadas com outra fonte que no 3.11.174, dependendo das fontes do computador. Isso entra na conferência com o Júpiter (seção 7).
  - O 3.11.174 vem do npm por `prototipo-pdfjs/preparar.js --referencia` (SHA-512 do pacote e SHA-384 dos dois arquivos conferidos, os mesmos de `candidatos.json`), chamado pela suíte quando o pacote não está em `prototipo-pdfjs/pacotes/`, e é lido pelo leitor congelado. Não entra no `package.json` nem no `package-lock.json` (sem alerta novo) e o `ci.yml` não mudou. O número gravado no arquivo fica só informativo.

## 6. Testes executados (22/10/2026, Chromium 141.0.7390.37, Node 22.22.0)

| Teste | Resultado |
|---|---|
| `npm ci` limpo | 19 pacotes; `npm audit`: 0 vulnerabilidades |
| `testar_pdf_sintetico.js` (CI) | **39 passaram, 0 falharam** (inclui o desenho do 3.11.174 na mesma execução; com o pacote de referência apagado, a suíte o baixou e conferiu sozinha) |
| A mesma suíte com `FONTCONFIG_FILE` levando "Helvetica" à DejaVu Sans | **39 passaram, 0 falharam**; 3.11.174 sem mudança 44.480 (informativo), 6.4.299 e 3.11.174 com a mesma fonte 49.171; PDF só com imagem 1.860.672 nas duas |
| Mutação do desenho (cópia temporária do teste, 1 pixel escuro a mais no 6.4.299) | reprovou os 3 testes de desenho (imagem 1.860.673 ≠ 1.860.672; texto e script 44.481 ≠ 44.480), código 1 |
| Protótipo com o mesmo `FONTCONFIG_FILE` | reprova o desenho do 4.10.38 e do 6.4.299 (mesma causa); o protótipo da Etapa 3 não foi mudado |
| Mutações em cópias descartáveis de `src/` (`DIR_SRC`) | todas reprovaram (código 1): sem conferência de hash (2 falhas), executando scripts do documento (2), sem liberar `blob:` (1), sem copiar os bytes (1), posições deslocadas 0,02 pt (3), worker sem `type: 'module'` (24) |
| `testar_pdf_ocr_sintetico.js` (local, com o modelo) | 4 passaram: modo `ocr`, contrato da página, palavras, `tokensNumericos` só com dígitos (`4 0 2 1 0 2`) |
| `comparar_pdfjs_versoes.js` com PDFs sintéticos | PDF com texto, PDF com script e PDF só com imagem (OCR): **0 diferenças** entre 3.11.174 e 6.4.299 nas palavras, nas posições e no pacote do `LeitorPdfJupiter` |
| Protótipo (`prototipo-pdfjs`) | 40 passaram, 0 falharam, 1 falha informativa (build moderno), incluindo "igual à referência gravada" |
| 13 suítes sintéticas da CI | todas com código 0, 0 falhas e 0 puladas (PDF 39, recomeço 4, etapa7 19, etapa8 26, etapa9 8, base de disciplinas 11, validações 7, proteção 6, ajuda 50, navegação visual 21, navegador etapa6 13, etapa8 27, etapa9 5) |
| `verificar_publicacao.js` e `verificar_copias_shared.js` | ok |

**O que a suíte cobre** (detalhe em `testes/README.md`): carga sob demanda; versão, URLs e hashes iguais aos do espelho; um Worker de módulo de `blob:`, reaproveitado; nenhum fake worker; `blob:` liberados; palavras, posições e desenho iguais aos do 3.11.174; progresso, cancelamento e leitura seguinte; duas leituras simultâneas; bytes de quem chamou intactos; PDF corrompido e texto puro recusados (leitor e tela); scripting de documento; CSP sem `'unsafe-eval'`; biblioteca ou worker com 404, adulterados, rede fora e worker que não inicia, cada um seguido de nova tentativa bem-sucedida.

**Não executado:** PDFs reais do Júpiter (seção 7), `testar_pdf_texto.js`, `testar_navegador.js` e `gerar_paginas_ocr.js` (precisam dos arquivos do Júpiter), qualquer teste no HtmlService, Edge e Chrome da equipe.

## 7. Conferência com PDFs reais do Júpiter (responsável, no computador autorizado)

Antes desta conferência, os testes complementares com um PDF misto **sintético** (texto + páginas escaneadas, OCR, `LeitorPdfJupiter`, 3.11.174 × 6.4.299) estão em [ETAPA4_TESTES_MISTOS.md](ETAPA4_TESTES_MISTOS.md). Eles não substituem esta seção.

Os arquivos ficam onde já estão; nenhum vai ao Git (`*.pdf`, `*.csv` e `saida/` estão no `.gitignore` de `testes/`) nem a outro serviço.

**Preparação** (uma vez, no ramo do PR):

```bash
cd sistemas/estrutura-curricular/testes
npm ci && npx playwright install chromium
(cd prototipo-pdfjs && node preparar.js)     # baixa e confere o 3.11.174 e os candidatos
# para PDFs sem texto: modelos/por.traineddata (ver testes/README.md, Preparação)
```

**Passo 1 — mesmo PDF, duas versões:**

```bash
node comparar_pdfjs_versoes.js "<pasta>/grade_curricular_com_texto.pdf" "<pasta>/grade_curricular_impresso.pdf"
```

Para cada arquivo, a ferramenta lê no painel (simulador) com o leitor anterior (3.11.174) e com o atual (6.4.299) e compara o modo, as palavras e posições (tolerância 0,01 pt) e o pacote do `LeitorPdfJupiter` (currículos, disciplinas, créditos, vínculos, requisitos, grupos, avisos). No terminal saem só contagens e caminhos; o detalhe fica em `saida/comparacao_pdfjs/<arquivo>.json`. Código 0 = nenhuma diferença.

Casos a incluir:
- PDF "Grade Curricular" salvo com texto (Chrome/Edge "Salvar como PDF");
- o mesmo relatório impresso sem texto (OCR, "Microsoft Print to PDF");
- relatórios com requisitos, grupos de optativas e créditos-trabalho;
- pelo menos um curso com vários currículos.

**Passo 2 — leitores do repositório com o PDF.js novo:**

```bash
node testar_pdf_texto.js "<csv>" ...        # compara o PDF com texto lido no painel com o CSV
node gerar_paginas_ocr.js "<pdf impresso>"   # OCR no navegador
node comparar_csv_pdf.js "<csv>" saida/...   # CSV × PDF lido por OCR
```

(argumentos como em `testes/README.md`).

**Passo 3 — CSV + PDF pela tela:** no simulador ou na homologação, importar o CSV e o PDF juntos e conferir a tela de conferência (vínculos, números confirmados, "Conferi no PDF").

**Critérios de aprovação:**
- `comparar_pdfjs_versoes.js` sem diferenças no pacote do `LeitorPdfJupiter`;
- diferença só em posições abaixo de 0,01 pt é aceita; qualquer outra é analisada antes de seguir;
- OCR: mesmo modo, mesmos números confirmados e mesmos avisos;
- `testar_pdf_texto.js` e `comparar_csv_pdf.js` com o mesmo resultado do 3.11.174;
- nenhuma diferença que mude currículo, disciplina, crédito, período, requisito ou grupo.

Se houver diferença no OCR, verificar primeiro se o PDF usa fonte padrão não incorporada (seção 3, recursos auxiliares; e seção 5: o 6.x pede ao navegador a fonte nomeada no PDF, então o desenho dessas páginas pode depender das fontes do computador) ou anotações (`annotationMode`, seção 4). Para isso, rodar a comparação no computador e no navegador em que a equipe usa o painel. **Sem essa conferência, não se declara equivalência com o Júpiter.**

## 8. Plano de homologação no HtmlService (não executado; exige autorização)

O Chromium do Playwright não é o iframe do HtmlService. Itens a provar lá:

1. **Projeto certo:** `GRADIP · Grade Horaria - Config · HOMOLOGAÇÃO` ([IMPLANTACAO.md](../../IMPLANTACAO.md), "Nome dos projetos no Google"). Se não existir, criar é uma decisão do responsável.
2. **Conta e destino do clasp:** conta institucional; `.clasp.json` em `sistemas/estrutura-curricular/src` apontando para o projeto de homologação. Rodar `clasp status` e conferir que a lista é só a do `.claspignore`.
3. **Cópia e comparação antes do push:** `clasp pull` para uma pasta fora do repositório e `node ferramentas/conferir_implantacao.js <pasta> sistemas/estrutura-curricular/src --procurar` para registrar de qual commit o remoto está mais perto ([IMPLANTACAO.md §4](../../IMPLANTACAO.md)). Guardar a pasta como cópia do código anterior.
4. **`clasp push`** do commit do PR, só com ordem expressa para esse push. Testar pelo `/dev` (implantação de teste); não criar nem alterar implantação `/exec`.
5. **No `/dev`, com o DevTools aberto (Console, Rede, Aplicativo):**
   - o painel abre sem pedir o PDF.js (pedidos só depois de escolher um PDF);
   - `fetch` dos dois `.mjs` no jsDelivr com status 200 (CORS do CDN real; o simulador responde `access-control-allow-origin: *`);
   - `crypto.subtle` disponível (o OCR de produção já usa `crypto.subtle.digest` para o modelo, o que indica que funciona no iframe, mas não prova);
   - `import()` de `blob:` e Worker de módulo de `blob:` aceitos (em Fontes/Threads aparece um worker `blob:`);
   - nenhuma violação de CSP no Console; anotar a CSP efetiva da resposta do iframe (cabeçalho `content-security-policy` em Rede);
   - nenhum aviso de "fake worker".
6. **Importações:** PDF sintético (`pdf_sintetico.js`), PDF corrompido, PDF do Júpiter com texto, PDF impresso (OCR) e CSV + PDF juntos. Em cada uma: progresso, resultado na conferência e mensagem de erro quando cabe.
7. **Recuperação:** com a rede desligada (DevTools → Offline) ao escolher o PDF, a mensagem de download aparece; religada, a nova tentativa funciona sem recarregar.
8. **Navegadores:** Chrome e Edge nas versões usadas pela equipe (anotar as versões). Se algum não aceitar Worker de módulo ou `import()` de `blob:`, a homologação para.
9. **Critérios de aprovação:** todos os itens acima sem erro; resultados das importações iguais aos da conferência da seção 7; nenhum erro no Console; nenhuma planilha alterada além do que a própria importação grava no ambiente de homologação.
10. **Se reprovar:** voltar o projeto de homologação ao código guardado no passo 3 e registrar o que falhou.

## 9. Volta atrás

1. **Versão anterior funcional:** `estrutura-curricular-v1.12.0` (Release e tag, `main` antes deste PR; o leitor com PDF.js 3.11.174 está também em `prototipo-pdfjs/referencia/`). No Google, a versão implantada é a registrada na Release e no README do sistema.
2. **Preservar o código anterior:** antes de qualquer push, `clasp pull` para uma pasta fora do repositório (seção 8, passo 3); no Git, o histórico e a tag já guardam a 1.12.0.
3. **Comparar o Google com o repositório:** `ferramentas/conferir_implantacao.js` (sem mostrar conteúdo), contra o commit esperado (`--commit`).
4. **Reverter no Git:** um PR de reversão do merge (`git revert -m 1 <merge>`), com CI verde e o ok do responsável, como qualquer mudança no `main` protegido. Nada de push direto nem de mover tags; se uma Release 1.12.1 já existir, a correção sai como 1.12.2.
5. **Restaurar o `/exec`:** no editor, **Implantar → Gerenciar implantações → editar a implantação ativa → Versão** e escolher a versão anterior (o `/exec` mantém o mesmo endereço). Só com autorização do responsável e só se uma versão futura publicada apresentar problema.
6. **Dados e planilhas:** esta mudança é só no navegador; o leitor não grava nada. A importação grava como antes, e só quando a pessoa confirma. Para confirmar que nada mudou, comparar a data de modificação e o histórico de versões das planilhas da estrutura no período do teste e, na homologação, usar só planilhas do ambiente de homologação.

Nenhum rollback preventivo foi feito e nenhuma implantação foi alterada.

## 10. Limitações conhecidas

- Sem conferência com PDFs reais do Júpiter e sem homologação no HtmlService.
- **Desenho com fonte não incorporada muda com o computador:** o 6.4.299 pede a fonte nomeada no PDF antes da substituta (seção 5). A equivalência exata está provada para página só com imagem e, para texto, quando as duas versões pedem a mesma fonte; não para o 3.11.174 sem mudança em qualquer máquina. A conclusão da Etapa 3 de "mesmos pixels" valia para o ambiente daquela execução.
- A equivalência do desenho é com o 3.11.174 no mesmo navegador; não prova o desenho no Chrome/Edge da equipe. As palavras e posições continuam comparadas com o arquivo gravado (Chromium 141.0.7390.37, Playwright 1.56.0); ao trocar o Playwright, regravar pelo protótipo se mudarem.
- A suíte da CI passa a baixar o pacote 3.11.174 do npm (conferido) a cada execução.
- Fontes padrão não incorporadas, CMaps e WASM não são servidos (seção 3).
- `annotationMode` continua `ENABLE` (seção 4).
- O build legacy acrescenta polyfills que alteram protótipos globais na página do painel; as 13 suítes e o OCR sintético passaram com eles, mas o painel real não foi testado no Google.
- Um worker que falhar depois de iniciado não é encerrado (para não interromper leituras em andamento); fica ocioso até a página fechar.
- A CSP dos testes permite `'unsafe-inline'`; a ausência de violações não prova resistência a XSS.
- O Tesseract.js (worker e núcleo) continua sem conferência de integridade equivalente (Etapa 5, não iniciada).
- O jsDelivr continua sendo fronteira de confiança; o hash impede executar bytes diferentes, mas não impede indisponibilidade.

## 11. Fora desta etapa

Merge do PR, tag e Release, `clasp push`, deploy, `/exec`, planilhas, Script Properties, permissões, Dependabot #12 e #13 e a Etapa 5.

# Protótipo isolado — PDF.js moderno com integridade conferida (Etapa 3)

**Não é usado pelo sistema nem pela CI.** Foi a prova da Etapa 3 ([relatório](../../../../docs/sistemas/estrutura-curricular/ETAPA3_PDFJS_MODERNIZACAO.md)). Desde a Etapa 4 ([relatório](../../../../docs/sistemas/estrutura-curricular/ETAPA4_PDFJS_MIGRACAO.md)), o sistema e a suíte oficial usam o PDF.js 6.4.299 legacy; o protótipo continua útil para comparar versões com o **3.11.174**, que agora também vem do npm (`referencia` em `candidatos.json`) e é lido pelo leitor como estava em produção (`referencia/LeitorPdfFontes-3.11.174.html`, cópia congelada do `main` 909b12a). Ele também confere que `../referencia_pdfjs_3.11.174.json`, usado pela suíte oficial, é o que o 3.11.174 produz; `node testar_prototipo.js --gravar-referencia` regrava esse arquivo.

## Como rodar

```bash
cd sistemas/estrutura-curricular/testes
npm ci && npx playwright install chromium   # o mesmo ambiente da suíte oficial
cd prototipo-pdfjs
node preparar.js          # baixa os candidatos com `npm pack`, confere SHA-512 do pacote e SHA-384 dos arquivos
node testar_prototipo.js  # ~5 s; código 0 = candidatos aprovados, 1 = reprovado, 3 = erro de infraestrutura
```

`preparar.js` grava só em `pacotes/` (ignorada pelo Git). Nada entra no `package.json` nem no `package-lock.json` dos testes, e nenhuma dependência opcional (como `@napi-rs/canvas`) é instalada.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `candidatos.json` | Referência (3.11.174) e versões testadas, integridade do pacote no npm e SHA-384 de cada arquivo (fixados em 22/10/2026). |
| `referencia/LeitorPdfFontes-3.11.174.html` | O leitor como estava em produção antes da Etapa 4, para a referência. |
| `preparar.js` | Baixa e confere os pacotes. |
| `carregador_verificado.js` | O carregamento proposto: baixa biblioteca e worker, confere o SHA-384 com `crypto.subtle`, importa a biblioteca de um `blob:` e cria o worker de módulo de outro `blob:`, entregue por `GlobalWorkerOptions.workerPort`. Se um dos dois não conferir, nada é executado. |
| `testar_prototipo.js` | A prova: página com CSP sem `'unsafe-eval'` (mas com `'unsafe-inline'`), o `LeitorPdfFontes.html` de produção **lido sem mudança**, PDFs de `../pdf_sintetico.js`. |

## O que o teste confere

Para a referência (3.11.174, como em produção) e para cada candidato:

- abertura do PDF sintético pela camada de texto, com 2 páginas de 595×842 e o texto com acentos;
- **as mesmas palavras e posições do 3.11.174** (`LeitorPdfFontes.ler` sem mudança, tolerância de 0,01 pt);
- o desenho da página a 300 dpi com `render({ canvasContext, viewport })`, como o OCR faz, com o mesmo tamanho de canvas e a mesma quantidade de pixels escuros do 3.11.174 calculada na mesma execução (igualdade obrigatória para os candidatos aprováveis);
- worker de verdade: um `Worker` de módulo, mensagens nos dois sentidos e nenhum fake worker;
- PDF corrompido e texto puro recusados com `InvalidPDFException`, e o leitor volta a funcionar depois;
- nenhuma violação de CSP (a política proíbe `'unsafe-eval'`, mas permite `'unsafe-inline'`; não é prova de resistência a XSS), erro de JavaScript, 4xx ou pedido falho;
- controles negativos: biblioteca ou worker ausentes (404) ou com um byte a mais são recusados sem executar nada.

`6.4.299-moderno` é **informativo**: falha no desenho da página no Chromium 141 (`getOrInsertComputed is not a function`), o que mostra por que a versão moderna sem polyfills não serve para navegadores que ainda não têm essa função. Essa falha aparece no log, mas não reprova a suíte.

## Limites

O protótipo roda no Chromium do Playwright, não no HtmlService do Google. A CDN é simulada a partir dos pacotes conferidos (o jsDelivr real não é acessado). Não cobre o OCR (Tesseract) nem PDFs reais do Júpiter. Não testa PDFs com scripts embutidos (`enableScripting`, ver a seção C.9 do relatório).

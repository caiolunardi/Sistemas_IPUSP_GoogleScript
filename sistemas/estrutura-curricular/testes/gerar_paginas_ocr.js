// Lê um PDF no Chromium real, com o mesmo código do painel
// (LeitorPdfFontes: camada de texto ou OCR), e salva as palavras de cada
// página em JSON. Esse arquivo alimenta testar_backend.js,
// testar_visual.js e testar_pdf_texto.js sem repetir o OCR (~2 min).
// Uso: node gerar_paginas_ocr.js <pdf> [saida.json] [--paginas N]
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');

const args = process.argv.slice(2).filter((a, i, l) => a !== '--paginas' && l[i - 1] !== '--paginas');
const [pdfPath, saidaArg] = args;
const iPag = process.argv.indexOf('--paginas');
const maxPaginas = iPag > 0 ? parseInt(process.argv[iPag + 1], 10) : undefined;
const SAIDA = saidaArg || path.join(__dirname, 'saida', 'paginas_ocr_navegador.json');

(async () => {
  if (!pdfPath) { console.log('Uso: node gerar_paginas_ocr.js <pdf> [saida.json] [--paginas N]'); process.exit(2); }
  const nav = await abrirNavegador();
  const amb = criarAmbiente({ dirSrc: DIR_SRC });
  const { pagina, errosPagina } = await abrirPainel(nav, { amb });
  await esperarCarregado(pagina);
  const t0 = Date.now();
  const r = await pagina.evaluate(async ({ arr, max }) => {
    const res = await LeitorPdfFontes.ler(new Uint8Array(arr), { _maxPaginas: max });
    return { paginas: res.paginas, modo: res.modo };
  }, { arr: Array.from(fs.readFileSync(pdfPath)), max: maxPaginas });
  await nav.close();
  if (errosPagina.length) { console.error('Erros de JavaScript na página:', errosPagina.join(' | ')); process.exit(1); }
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify(r));
  const palavras = r.paginas.reduce((s, p) => s + p.tokens.length, 0);
  console.log(`${r.paginas.length} páginas (${r.modo}), ${palavras} palavras, ${Math.round((Date.now() - t0) / 1000)} s → ${SAIDA}`);
})().catch((e) => { console.error(e); process.exit(1); });

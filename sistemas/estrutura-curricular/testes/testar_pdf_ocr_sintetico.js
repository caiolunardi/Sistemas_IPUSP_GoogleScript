// Leitura por OCR de um PDF SINTÉTICO sem camada de texto (só imagem), no
// painel de verdade, com o PDF.js do leitor (6.4.299 desde a Etapa 4) e o
// Tesseract.js 7.0.0 servidos de node_modules. Não roda na CI: precisa do
// modelo modelos/por.traineddata (ver README.md, "Modelo do OCR").
// A imagem é desenhada pelo próprio teste (texto inventado, prefixo ZZZ),
// convertida em PDF (imagem em tons de cinza, FlateDecode) e lida pelo
// LeitorPdfFontes.ler: confere o modo "ocr", as palavras, os números da
// segunda leitura (tokensNumericos), o progresso e o cancelamento.
// Uso: node testar_pdf_ocr_sintetico.js
// Código de saída: 0 = aprovada; 1 = alguma asserção reprovada; 2 = modelo ausente (não executado); 3 = erro de infraestrutura.
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { pdfDeImagem } = require('./pdf_sintetico');

const ADMIN = 'dono@unidade.example';
const MODELO = path.join(__dirname, 'modelos', 'por.traineddata');
const LIMITE_MS = 240000;
const LINHAS = [
  'GRADE CURRICULAR SINTETICA OCR',
  'Codigo Disciplina Aula Trab.',
  'ZZZ0001 Fundamentos 4 0',
  'ZZZ0002 Metodos 2 1',
  'ZZZ0003 Laboratorio 0 2'
];

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

(async () => {
  if (!fs.existsSync(MODELO)) {
    console.log('NÃO EXECUTADO: falta ' + path.relative(process.cwd(), MODELO) + ' (ver README.md, "Modelo do OCR").');
    process.exit(2);
  }
  const nav = await abrirNavegador();
  console.log('Chromium', nav.version());
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  const p = await abrirPainel(nav, { amb, latencia: 0 });
  await esperarCarregado(p.pagina);

  // Página de 2480×3508 px (A4 a 300 dpi), texto preto em fundo branco.
  const img = await p.pagina.evaluate((linhas) => {
    const c = document.createElement('canvas');
    c.width = 2480; c.height = 3508;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#000'; ctx.font = '60px Arial, Helvetica, sans-serif';
    linhas.forEach((l, i) => {
      if (i < 2) { ctx.fillText(l, 300, 300 + i * 100); return; }
      const [cod, nome, aula, trab] = l.split(' ');
      const y = 300 + i * 100;
      ctx.fillText(cod, 300, y); ctx.fillText(nome, 700, y);
      ctx.fillText(aula, 1290, y); ctx.fillText(trab, 1530, y);
    });
    // "Aula" e "Trab." do cabeçalho alinhados às colunas de números.
    ctx.fillStyle = '#fff'; ctx.fillRect(250, 330, 2000, 100);
    ctx.fillStyle = '#000';
    ctx.fillText('Codigo', 300, 400); ctx.fillText('Disciplina', 700, 400); ctx.fillText('Aula', 1240, 400); ctx.fillText('Trab.', 1480, 400);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const cinza = new Array(c.width * c.height);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) cinza[j] = d[i];
    return { largura: c.width, altura: c.height, cinza };
  }, LINHAS);
  const pdf = pdfDeImagem(Buffer.from(img.cinza), img.largura, img.altura);
  // Cópia local (saida/ e *.pdf estão no .gitignore), para comparar versões com comparar_pdfjs_versoes.js.
  fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'saida', 'ocr_sintetico.pdf'), pdf);
  console.log('     PDF só com imagem:', pdf.length, 'bytes (cópia em saida/ocr_sintetico.pdf)');

  const r = await p.pagina.evaluate(async ({ arr, limite }) => {
    const etapas = [];
    const tempo = new Promise((_, falha) => setTimeout(() => falha(new Error('tempo esgotado')), limite));
    try {
      const r = await Promise.race([LeitorPdfFontes.ler(new Uint8Array(arr), { aoProgredir: (i) => etapas.push(i.etapa) }), tempo]);
      return { ok: true, etapas, modo: r.modo, paginas: r.paginas.map((pg) => ({ numero: pg.numero, largura: pg.largura, altura: pg.altura, textos: pg.tokens.map((t) => t.texto), numeros: pg.tokensNumericos && pg.tokensNumericos.map((t) => t.texto) })) };
    } catch (e) { return { ok: false, etapas, mensagem: String(e && e.message || e) }; }
  }, { arr: Array.from(pdf), limite: LIMITE_MS });

  console.log('\n== Leitura por OCR (PDF sem camada de texto)');
  await teste('o leitor escolhe o OCR e devolve a página no contrato { numero, largura, altura, tokens, tokensNumericos }', async () => {
    verdade(r.ok, 'leitura falhou: ' + r.mensagem);
    igual(r.modo, 'ocr', 'modo');
    igual(r.paginas.length, 1, 'páginas');
    igual([r.paginas[0].numero, Math.round(r.paginas[0].largura), Math.round(r.paginas[0].altura)], [1, 595, 842], 'página');
    igual([...new Set(r.etapas)], ['carregando', 'texto', 'ocr-preparando', 'ocr'], 'etapas do progresso');
  });
  await teste('palavras reconhecidas pelo OCR (texto inventado)', async () => {
    verdade(r.ok, 'sem leitura');
    const lido = r.paginas[0].textos.join(' ');
    // As letras "ZZZ" dos códigos inventados confundem o OCR (ex.: "ZZ70001"); os dígitos finais não.
    ['GRADE', 'CURRICULAR', 'Codigo', 'Disciplina', 'Aula', 'Trab.', 'Fundamentos', 'Metodos', 'Laboratorio', '0001', '0002', '0003'].forEach((p) => verdade(lido.includes(p), 'sem "' + p + '" — lido: ' + lido));
    console.log('     lido:', lido);
  });
  await teste('segunda leitura só de dígitos na faixa das colunas numéricas', async () => {
    verdade(r.ok, 'sem leitura');
    verdade(Array.isArray(r.paginas[0].numeros), 'tokensNumericos ausente');
    const numeros = r.paginas[0].numeros.join(' ');
    verdade(r.paginas[0].numeros.every((t) => /^\d+$/.test(t)), 'só dígitos: ' + numeros);
    igual(r.paginas[0].numeros.join(' ').replace(/\s+/g, ' '), '4 0 2 1 0 2', 'números das colunas Aula e Trab.');
  });
  await teste('nenhum erro de JavaScript na página', async () => { igual(p.errosPagina, [], 'erros'); });

  await p.contexto.close();
  await nav.close();
  console.log('\n' + ok + ' passaram, ' + falhas + ' falharam' + (falhas ? ': ' + falhou.join(' | ') : ''));
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.error('ERRO DE INFRAESTRUTURA:', e && e.stack || e);
  process.exit(3);
});

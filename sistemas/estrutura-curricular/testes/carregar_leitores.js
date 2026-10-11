// Carrega os leitores (arquivos .html com <script>) num contexto do Node,
// do mesmo jeito que o navegador faria ao incluir os arquivos.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');

function corpoScript(nomeArquivo) {
  const html = fs.readFileSync(path.join(SRC, nomeArquivo), 'utf8');
  const partes = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) partes.push(m[1]);
  if (!partes.length) throw new Error('Sem <script> em ' + nomeArquivo);
  return partes.join('\n');
}

function carregar(arquivos) {
  const ctx = vm.createContext({ TextDecoder, console, Uint8Array, ArrayBuffer, Math, JSON, Date });
  (arquivos || ['LeitorComum.html', 'LeitorCsv.html', 'LeitorPdf.html']).forEach((a) => {
    vm.runInContext(corpoScript(a), ctx, { filename: a });
  });
  return ctx;
}

// Converte o TSV do Tesseract (300 dpi) em páginas de palavras em pontos.
// offsetX: deslocamento (px) quando o TSV veio de um recorte da página.
function paginasDoTsv(dir, prefixo, dpi, offsetX) {
  const escala = 72 / (dpi || 300);
  const dx = (offsetX || 0) * escala;
  const arquivos = fs.readdirSync(dir).filter((f) => f.startsWith(prefixo) && f.endsWith('.tsv')).sort();
  return arquivos.map((f, i) => {
    const linhas = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
    const cab = linhas[0].split('\t');
    const idx = (k) => cab.indexOf(k);
    const tokens = [];
    let largura = 0, altura = 0;
    linhas.slice(1).forEach((l) => {
      const c = l.split('\t');
      if (c.length < cab.length) return;
      if (c[idx('level')] === '1') { largura = +c[idx('width')] * escala; altura = +c[idx('height')] * escala; }
      if (c[idx('level')] !== '5') return;
      const texto = c[idx('text')];
      if (!texto || !texto.trim()) return;
      const x = +c[idx('left')] * escala + dx, y = +c[idx('top')] * escala;
      const w = +c[idx('width')] * escala, h = +c[idx('height')] * escala;
      tokens.push({ texto, x0: x, x1: x + w, y0: y, y1: y + h, conf: +c[idx('conf')] });
    });
    return { numero: i + 1, largura, altura, tokens };
  });
}

module.exports = { carregar, corpoScript, paginasDoTsv };

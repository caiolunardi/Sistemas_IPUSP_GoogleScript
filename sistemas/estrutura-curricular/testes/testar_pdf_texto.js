// Teste do caminho "PDF com texto" (camada de texto lida pelo PDF.js).
// Como só temos o PDF sem texto do Júpiter, montamos um PDF COM texto que
// reproduz a geometria real: cada palavra lida pelo OCR vira um texto
// posicionado no mesmo lugar (as colunas numéricas vêm da leitura só de
// dígitos). O Chromium imprime isso em PDF; depois o painel lê esse PDF
// pela camada de texto e o resultado é comparado com o CSV.
// Uso: node testar_pdf_texto.js <csv> <paginas_ocr.json>
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');

const [csvPath, paginasJson] = process.argv.slice(2);
const SAIDA = path.join(__dirname, 'saida');

// Monta um PDF COM texto a partir da leitura por OCR já conferida: texto
// fora da tabela = palavras do OCR; números da tabela = valores finais
// (confirmados pelas contas), escritos no centro de cada coluna, na mesma
// linha de base do texto da linha.
let Ld = null;
function htmlDasPaginas(paginas, depuracao) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const COLS = ['aula', 'trab', 'tot', 'ch', 'ce', 'cp', 'ext', 'atpa', 'periodo'];
  const ROT = { aula: /^aula$/i, trab: /^trab\.?$/i, tot: /^tot\.?$/i, ch: /^ch$/i, ce: /^ce$/i, cp: /^cp$/i, ext: /^ext$/i, atpa: /^atpa$/i, periodo: /^[il1|]deal$/i };
  const partes = paginas.map((p, i) => {
    const num = i + 1;
    const centros = {};
    COLS.forEach((c) => { const t = p.tokens.find((x) => ROT[c].test(x.texto)); if (t) centros[c] = (t.x0 + t.x1) / 2; });
    // Só páginas da grade (com a linha "Disciplina … Aula Trab. …"); as páginas
    // de informações também têm a palavra "Aula" no quadro de carga horária.
    const temTabela = centros.aula != null && centros.trab != null && p.tokens.some((x) => /^Disciplina$/i.test(x.texto));
    const passo = temTabela ? centros.trab - centros.aula : 0;
    const limite = temTabela ? centros.aula - passo * 0.5 : Infinity;
    const cabecalhoY = temTabela ? p.tokens.find((x) => ROT.aula.test(x.texto)).y1 + 2 : 0;
    // Corrige no texto sintético os códigos que o OCR leu com "O" no lugar de "0"
    // (num PDF com texto de verdade o código já vem certo).
    const corrigirCodigo = (texto) => texto.replace(/^([A-Za-z0-9|!]{7})(\(\d{1,2}\))/, (m, cod, ver) => {
      const c = Ld.LeitorPdfJupiter._lerCodigo(cod, 'ocr');
      return (c ? c.codigo : cod) + ver;
    });
    const palavras = p.tokens.filter((t) => !(temTabela && (t.x0 + t.x1) / 2 >= limite && t.y0 > cabecalhoY))
      .map((t) => Object.assign({}, t, { texto: corrigirCodigo(t.texto) }));
    const linhas = [];
    palavras.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1)).forEach((t) => {
      const yc = (t.y0 + t.y1) / 2;
      const l = linhas.find((x) => Math.abs(x.yc - yc) < 4);
      if (l) l.tokens.push(t); else linhas.push({ yc, tokens: [t] });
    });
    const spans = [];
    const numericas = depuracao.filter((d) => d.pagina === num);
    linhas.forEach((l) => {
      l.tokens.sort((a, b) => a.x0 - b.x0);
      const alturas = l.tokens.map((t) => t.y1 - t.y0).sort((a, b) => a - b);
      const fonte = Math.max(5, Math.min(14, alturas[Math.floor(alturas.length / 2)] * 1.05));
      const base = Math.max(...l.tokens.map((t) => t.y1));
      const topo = base - fonte * 0.8;
      const esquerda = l.tokens.filter((t) => t.x0 < limite);
      const direita = l.tokens.filter((t) => t.x0 >= limite);
      // palavras vizinhas viram um único texto (como um nó de texto de HTML);
      // palavras afastadas (células de tabela) ficam separadas.
      let bloco = [];
      const fechar = () => { if (bloco.length) spans.push(`<span style="left:${bloco[0].x0}pt;top:${topo.toFixed(2)}pt;font-size:${fonte.toFixed(2)}pt">${esc(bloco.map((t) => t.texto).join(' '))}</span>`); bloco = []; };
      esquerda.forEach((t) => { if (bloco.length && t.x0 - bloco[bloco.length - 1].x1 > 8) fechar(); bloco.push(t); });
      fechar();
      direita.forEach((t) => spans.push(`<span style="left:${t.x0}pt;top:${topo.toFixed(2)}pt;font-size:${fonte.toFixed(2)}pt">${esc(t.texto)}</span>`));
      // números desta linha (disciplina, subtotal ou total)
      const d = numericas.find((x) => Math.abs((x.y0 + x.y1) / 2 - l.yc) < 4);
      if (d) {
        d.usada = true;
        COLS.forEach((c) => {
          const v = d.valores[c];
          if (v == null || centros[c] == null) return;
          const largura = String(v).length * fonte * 0.556;
          spans.push(`<span style="left:${(centros[c] - largura / 2).toFixed(2)}pt;top:${topo.toFixed(2)}pt;font-size:${fonte.toFixed(2)}pt">${v}</span>`);
        });
      }
    });
    return `<div class="pagina">${spans.join('')}</div>`;
  });
  const sobras = depuracao.filter((d) => !d.usada).length;
  if (sobras) console.log('aviso: ' + sobras + ' linhas numéricas sem linha de texto correspondente');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: 595.32pt 841.92pt; margin: 0; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; }
    .pagina { position: relative; width: 595.32pt; height: 841.92pt; page-break-after: always; overflow: hidden; }
    .pagina span { position: absolute; white-space: nowrap; line-height: 1; }
  </style></head><body>${partes.join('')}</body></html>`;
}

(async () => {
  const r = JSON.parse(fs.readFileSync(paginasJson, 'utf8'));
  Ld = carregar();
  const lido = Ld.LeitorPdfJupiter.analisar(r.paginas, { modo: 'ocr', depurar: true });
  const nav = await abrirNavegador();
  // 1. gera o PDF com texto
  const ctxPdf = await nav.newContext();
  const pgPdf = await ctxPdf.newPage();
  await pgPdf.setContent(htmlDasPaginas(r.paginas, lido._depuracao.linhas));
  const arqPdf = path.join(SAIDA, 'grade_curricular_com_texto_sintetico.pdf');
  await pgPdf.pdf({ path: arqPdf, width: '8.2683in', height: '11.6933in', printBackground: false, preferCSSPageSize: true });
  await ctxPdf.close();

  // 2. o painel lê o PDF pela camada de texto
  const amb = criarAmbiente({ dirSrc: DIR_SRC });
  const { pagina, errosPagina } = await abrirPainel(nav, { amb });
  await esperarCarregado(pagina);
  const bytes = Array.from(fs.readFileSync(arqPdf));
  const t0 = Date.now();
  const resultado = await pagina.evaluate(async (arr) => {
    const r = await LeitorPdfFontes.ler(new Uint8Array(arr), {});
    const p = LeitorPdfJupiter.analisar(r.paginas, { modo: r.modo, arquivo: 'sintetico.pdf' });
    return { modo: r.modo, pacote: p };
  }, bytes);
  const segundos = (Date.now() - t0) / 1000;
  await nav.close();

  // 3. compara com o CSV
  const L = carregar();
  const csv = L.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'x.csv');
  const pdf = resultado.pacote;
  const falhas = [];
  if (resultado.modo !== 'texto') falhas.push('modo ' + resultado.modo);
  const v = (l) => new Set(l.map((x) => x.curriculo + '|' + x.disciplina + '|' + x.tipo + '|' + x.periodoIdeal));
  const vc = v(csv.vinculos), vp = v(pdf.vinculos);
  const vIguais = [...vc].filter((x) => vp.has(x)).length;
  if (vIguais !== vc.size || vp.size !== vc.size) falhas.push(`vínculos: ${vIguais} iguais de ${vc.size} (pdf ${vp.size})`);
  const dp = {}; pdf.disciplinas.forEach((d) => { dp[d.codigo] = d; });
  let dif = 0;
  csv.disciplinas.forEach((d) => ['creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'atpa'].forEach((k) => { if (!dp[d.codigo] || dp[d.codigo][k] !== d[k]) { dif++; console.log('   diferente', d.codigo, k, 'csv=' + d[k], 'pdf=' + (dp[d.codigo] && dp[d.codigo][k])); } }));
  (pdf.conferencia.itens || []).slice(0, 20).forEach((i) => console.log('   conferência p' + i.pagina, i.codigo, i.campo, 'lido=' + i.lido, i.situacao, i.motivo));
  if (dif) falhas.push('números diferentes: ' + dif);
  const rq = (l) => new Set(l.map((x) => x.curriculo + '|' + x.disciplina + '|' + x.requisito + '|' + x.versaoRequisito));
  const rc = rq(csv.requisitos), rp = rq(pdf.requisitos);
  if ([...rc].filter((x) => rp.has(x)).length !== rc.size) falhas.push('requisitos diferentes');
  const c = pdf.conferencia;
  console.log('PDF com texto lido em', segundos.toFixed(1), 's; modo', resultado.modo);
  console.log('conferência:', JSON.stringify({ linhas: c.linhasDisciplina, lidos: c.numerosLidos, corrigidos: c.numerosCorrigidos, aConferir: c.numerosAConferir, subtotais: c.subtotais + '/' + c.subtotaisConferem, totais: c.totaisSecao + '/' + c.totaisSecaoConferem, naoReconhecidas: c.totalLinhasNaoReconhecidas }));
  console.log('vínculos iguais', vIguais, '/', vc.size, '· EXT', pdf.disciplinas.filter((d) => d.ext != null).length, '· versões', pdf.disciplinas.filter((d) => d.versao != null).length, '· currículos com informações', pdf.curriculos.filter((x) => x.info).length);
  pdf.avisos.forEach((a) => console.log(' ', a.nivel, a.codigo, a.mensagem.slice(0, 160)));
  (c.linhasNaoReconhecidas || []).forEach((l) => console.log('   não reconhecida p' + l.pagina + ':', l.texto.slice(0, 90)));
  if (errosPagina.length) falhas.push('erros JS: ' + errosPagina.join(' | '));
  if (falhas.length) { console.log('FALHAS:', falhas.join('; ')); process.exit(1); }
  console.log('OK — caminho "PDF com texto" confere com o CSV.');
})().catch((e) => { console.error(e); process.exit(1); });

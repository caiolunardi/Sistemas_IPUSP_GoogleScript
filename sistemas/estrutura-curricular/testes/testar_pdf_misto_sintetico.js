// Testes complementares da Etapa 4: PDF SINTÉTICO MISTO (jupiter_sintetico.js)
// lido pelo PDF.js 3.11.174 (leitor congelado de prototipo-pdfjs/referencia/)
// e pelo 6.4.299 (leitor atual), no painel de verdade, com o mesmo Chromium,
// o mesmo arquivo e o mesmo modelo do Tesseract (tessdata_fast 4.1.0).
// A página 1 tem texto em Helvetica NÃO incorporada (o 6.x pede "Helvetica"
// antes da fonte-substituta; o 3.11.174 não); as páginas 2 e 3 são imagens.
// Com 1 de 3 páginas com texto, o leitor escolhe o OCR para as três.
//
// Cenários de fontes:
//  A. fontes do sistema, como estão;
//  B. fontconfig levando "Helvetica" a outra fonte instalada (a mesma
//     condição do diagnóstico da Etapa 4), sem mudar nada no PDF.js.
// Em cada cenário, cada versão roda com o seu comportamento natural.
//
// Critério principal: o resultado acadêmico (LeitorPdfJupiter.analisar) é
// IGUAL ao esperado escrito à mão (esperado_jupiter_sintetico.js) e igual
// entre as versões. Pixels, fontes pedidas e confiança do OCR são
// registrados para diagnóstico.
// Uso: node testar_pdf_misto_sintetico.js
// Código de saída: 0 = aprovada; 1 = alguma asserção reprovada; 2 = modelo do OCR ou fonte das imagens ausente (não executado); 3 = erro de infraestrutura.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULO || 'playwright');
const { abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { desenharImagens, montarPdfMisto, TABELA } = require('./jupiter_sintetico');
const { ESPERADO, CURRICULO } = require('./esperado_jupiter_sintetico');

const ADMIN = 'dono@unidade.example';
const MODELO = path.join(__dirname, 'modelos', 'por.traineddata');
const SHA256_MODELO = 'c4932b937207a9514b7514d518b931a99938c02a28a5a5a553f8599ed58b7deb';
// Fonte das imagens: Liberation Serif 2.1.5 (pacote fonts-liberation 1:2.1.5-3), conferida pelo SHA-256.
// Vale o primeiro arquivo que existir e conferir; a CI baixa o pacote para fontes/ (ver ci.yml).
const SHA256_FONTE = '705903ae1382f0150f115d6f10a30f5b2f3d6ade649c474afe6366c39174fb65';
const FONTES_CANDIDATAS = [
  path.join(__dirname, 'fontes', 'LiberationSerif-Regular.ttf'),
  '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'
];
const PROTOTIPO = path.join(__dirname, 'prototipo-pdfjs');
const PACOTE_REF = path.join(PROTOTIPO, 'pacotes', '3.11.174', 'package');
const LEITOR_REF = path.join(PROTOTIPO, 'referencia', 'LeitorPdfFontes-3.11.174.html');
const LIMITE_MS = 240000;
const FONTES_ALTERNATIVAS = ['DejaVu Sans', 'FreeSans', 'Noto Sans', 'Liberation Serif', 'DejaVu Serif'];

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ---------------------------------------------------------------------------
//  Resultado acadêmico: projeção do pacote e comparações
// ---------------------------------------------------------------------------

/** Só o que é informação acadêmica (e os avisos), no formato de ESPERADO. */
function academico(pacote) {
  return {
    curso: pacote.curso,
    curriculos: pacote.curriculos.map((c) => ({ codigo: c.codigo, habilitacao: c.habilitacao, habilitacaoNome: c.habilitacaoNome, ano: c.ano, semestre: c.semestre })),
    disciplinas: pacote.disciplinas.map((d) => [d.codigo, d.nome, d.versao, d.creditosAula, d.creditosTrabalho, d.ch, d.ce, d.cp, d.ext, d.atpa]),
    naoConfirmados: pacote.disciplinas.filter((d) => d.naoConfirmados.length).map((d) => d.codigo + ':' + d.naoConfirmados.join(',')),
    vinculos: pacote.vinculos.map((v) => [v.disciplina, v.tipo, v.periodoIdeal]),
    vinculosNaoConfirmados: pacote.vinculos.filter((v) => !v.periodoConfirmado || v.curriculo !== CURRICULO).map((v) => v.disciplina),
    requisitos: pacote.requisitos.map((q) => [q.disciplina, q.requisito, q.versaoRequisito, q.tipoRequisito, q.grupo]),
    requisitosDeOutroCurriculo: pacote.requisitos.filter((q) => q.curriculo !== CURRICULO).length,
    avisos: pacote.avisos.map((a) => a.nivel + ':' + a.codigo),
    conferencia: Object.fromEntries(Object.keys(ESPERADO.conferencia).map((k) => [k, pacote.conferencia[k]])),
    geradoEm: pacote.origem.geradoEm
  };
}

/** O que o teste espera, no mesmo formato de academico(). */
function esperadoAcademico() {
  return {
    curso: ESPERADO.curso,
    curriculos: ESPERADO.curriculos,
    disciplinas: ESPERADO.disciplinas,
    naoConfirmados: [],
    vinculos: ESPERADO.vinculos,
    vinculosNaoConfirmados: [],
    requisitos: ESPERADO.requisitos,
    requisitosDeOutroCurriculo: 0,
    avisos: ESPERADO.avisos,
    conferencia: ESPERADO.conferencia,
    geradoEm: ESPERADO.geradoEm
  };
}

/** Caminhos (sem valores) em que dois objetos diferem. */
function diferencas(a, b, caminho, saida) {
  saida = saida || [];
  caminho = caminho || '';
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (a !== b && !(Number.isNaN(a) && Number.isNaN(b))) saida.push(caminho || '(raiz)');
    return saida;
  }
  if (Array.isArray(a) !== Array.isArray(b)) { saida.push(caminho); return saida; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diferencas(a[k], b[k], caminho + (Array.isArray(a) ? '[' + k + ']' : '.' + k), saida);
  return saida;
}

/** Diferenças acadêmicas entre duas leituras (lista vazia = equivalentes). */
function compararVersoes(r1, r2) {
  const d = [];
  if (r1.modo !== r2.modo) d.push('modo');
  if (r1.paginas.length !== r2.paginas.length) d.push('paginas');
  return d.concat(diferencas(academico(r1.pacote), academico(r2.pacote), 'pacote'));
}

/** Diferenças com o esperado (lista vazia = aderente). */
function compararComEsperado(r) {
  const d = [];
  if (r.modo !== ESPERADO.modo) d.push('modo (' + r.modo + ')');
  if (r.paginas.length !== ESPERADO.paginas) d.push('páginas (' + r.paginas.length + ')');
  return d.concat(diferencas(academico(r.pacote), esperadoAcademico(), 'pacote'));
}

// ---------------------------------------------------------------------------
//  Ambiente: referência 3.11.174, cenário de fontes, leitura no painel
// ---------------------------------------------------------------------------

/** Pacote 3.11.174 conferido (preparar.js --referencia) e cópia de src/ com o leitor congelado. */
function prepararReferencia() {
  if (!fs.existsSync(path.join(PACOTE_REF, 'build', 'pdf.min.js')) || !fs.existsSync(path.join(PACOTE_REF, 'build', 'pdf.worker.min.js'))) {
    execFileSync(process.execPath, [path.join(PROTOTIPO, 'preparar.js'), '--referencia'], { stdio: ['ignore', 'inherit', 'inherit'] });
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'src-pdfjs-3.11.174-'));
  for (const f of fs.readdirSync(DIR_SRC)) fs.copyFileSync(path.join(DIR_SRC, f), path.join(dir, f));
  fs.copyFileSync(LEITOR_REF, path.join(dir, 'LeitorPdfFontes.html'));
  return dir;
}

/** fontconfig temporário que leva "Helvetica" a outra fonte instalada (cenário B). */
function prepararFontconfig() {
  let familias = '';
  try { familias = execFileSync('fc-list', [':', 'family'], { encoding: 'utf8' }); } catch (e) { return { erro: 'fc-list indisponível: ' + e.message }; }
  const alvo = FONTES_ALTERNATIVAS.find((f) => familias.split('\n').some((l) => l.split(',').includes(f)));
  if (!alvo) return { erro: 'nenhuma destas fontes instalada: ' + FONTES_ALTERNATIVAS.join(', ') };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fontconfig-helvetica-'));
  const arquivo = path.join(dir, 'fonts.conf');
  fs.writeFileSync(arquivo, '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n' +
    '  <match target="pattern">\n    <test name="family" qual="any"><string>Helvetica</string></test>\n' +
    '    <edit name="family" mode="assign" binding="strong"><string>' + alvo + '</string></edit>\n  </match>\n' +
    '  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n</fontconfig>\n');
  let resolvida = '';
  try { resolvida = execFileSync('fc-match', ['Helvetica'], { encoding: 'utf8', env: Object.assign({}, process.env, { FONTCONFIG_FILE: arquivo }) }).trim(); } catch (e) { /* só informativo */ }
  return { arquivo, alvo, resolvida, dir };
}

/**
 * Lê o PDF no painel com uma versão do PDF.js e analisa com o LeitorPdfJupiter.
 * versao: '3.11.174' (dirSrc = cópia com o leitor congelado) ou '6.4.299'.
 * Também desenha a página 1 a 300 dpi (como o OCR) e registra as fontes pedidas.
 */
async function lerComVersao(nav, versao, dirSrc, pdf) {
  const amb = criarAmbiente({ dirSrc, usuario: ADMIN, dono: ADMIN });
  const p = await abrirPainel(nav, { amb, latencia: 0 });
  if (versao === '3.11.174') {
    await p.contexto.route((u) => u.href.startsWith('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/'), (rota) => {
      const arq = path.join(PACOTE_REF, rota.request().url().split('pdfjs-dist@3.11.174/')[1].split('?')[0]);
      if (!fs.existsSync(arq)) return rota.fulfill({ status: 404, body: '' });
      return rota.fulfill({ status: 200, body: fs.readFileSync(arq), headers: { 'content-type': 'application/javascript', 'access-control-allow-origin': '*' } });
    });
  }
  await esperarCarregado(p.pagina);
  const r = await p.pagina.evaluate(async ({ arr, limite, versao }) => {
    const tempo = new Promise((_, falha) => setTimeout(() => falha(new Error('tempo esgotado')), limite));
    const etapas = [];
    try {
      const lido = await Promise.race([LeitorPdfFontes.ler(new Uint8Array(arr), { aoProgredir: (i) => etapas.push(i.etapa + (i.pagina ? ':' + i.pagina : '')) }), tempo]);
      const pacote = LeitorPdfJupiter.analisar(lido.paginas, { modo: lido.modo, arquivo: 'misto-sintetico.pdf', tamanhoBytes: arr.length });
      // Desenho da página 1 como o OCR faz, com o PDF.js desta versão.
      let lib, tarefa;
      if (versao === '3.11.174') { lib = window.pdfjsLib; tarefa = lib.getDocument({ data: new Uint8Array(arr), isEvalSupported: false }); }
      else { const c = await LeitorPdfFontes._carregarPdfJs(); lib = c.lib; tarefa = lib.getDocument({ data: new Uint8Array(arr), worker: c.pdfWorker, isEvalSupported: false }); }
      const doc = await tarefa.promise;
      const pg = await doc.getPage(1);
      const vp = pg.getViewport({ scale: 300 / 72 });
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
      const fontes = new Set();
      const original = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
      Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', { configurable: true, get: original.get, set(v) { if (/g_d\d/.test(v)) fontes.add(String(v).replace(/^.*?px\s*/, '').replace(/g_d\d+_sf\d+/g, 'g_dN')); original.set.call(this, v); } });
      try { await pg.render({ canvasContext: ctx, viewport: vp }).promise; } finally { Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', original); }
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let escuros = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 128) escuros++;
      await tarefa.destroy();
      return {
        ok: true, versaoCarregada: lib.version, modo: lido.modo, etapas,
        paginas: lido.paginas.map((pg2) => ({ numero: pg2.numero, largura: pg2.largura, altura: pg2.altura, tokens: pg2.tokens, tokensNumericos: pg2.tokensNumericos })),
        pacote, desenho1: { largura: cv.width, altura: cv.height, escuros, fontes: [...fontes].sort() }
      };
    } catch (e) {
      return { ok: false, mensagem: String(e && e.message || e), etapas };
    }
  }, { arr: Array.from(pdf), limite: LIMITE_MS, versao });
  r.errosPagina = p.errosPagina.slice();
  await p.contexto.close();
  return r;
}

/** Trechos em que duas listas de palavras diferem: "antes"(conf) → "depois"(conf). */
function diferencasDePalavras(a, b) {
  const fmt = (l) => l.map((t) => '"' + t.texto + '"(' + Math.round(t.conf) + ')').join(' ');
  // Maior subsequência comum, suficiente para páginas de algumas centenas de palavras.
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i].texto === b[j].texto ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const saida = [];
  let i = 0, j = 0, ia = [], jb = [];
  const fechar = () => { if (ia.length || jb.length) saida.push(fmt(ia) + ' → ' + fmt(jb)); ia = []; jb = []; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i].texto === b[j].texto) { fechar(); i++; j++; }
    else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) jb.push(b[j++]);
    else ia.push(a[i++]);
  }
  fechar();
  return saida;
}

const confMedia = (pg) => pg.tokens.length ? Math.round(pg.tokens.reduce((s, t) => s + (t.conf == null ? 0 : t.conf), 0) / pg.tokens.length * 10) / 10 : null;

/** Códigos e números que cada página do PDF mostra (da tabela inventada). */
function codigosDaPagina(n) { return TABELA[n - 1].filter((l) => l[0] === 'disc').map((l) => l[1].slice(0, 7)); }
function numerosDaPagina(n) {
  const out = [];
  TABELA[n - 1].forEach((l) => { if (l[0] === 'disc') out.push(...l[3]); else if (l[0] === 'sub') out.push(...l[1]); else if (l[0] === 'tot') out.push(...l[2]); });
  return out.map(String);
}

// ---------------------------------------------------------------------------

(async () => {
  if (!fs.existsSync(MODELO)) {
    console.log('NÃO EXECUTADO: falta ' + path.relative(process.cwd(), MODELO) + ' (ver README.md, "Modelo do OCR").');
    process.exit(2);
  }
  const shaModelo = sha256(fs.readFileSync(MODELO));
  if (shaModelo !== SHA256_MODELO) { console.log('ERRO: modelo do OCR diferente do esperado (' + shaModelo + ').'); process.exit(3); }
  const FONTE_IMAGENS = FONTES_CANDIDATAS.find((f) => fs.existsSync(f) && sha256(fs.readFileSync(f)) === SHA256_FONTE);
  if (!FONTE_IMAGENS) {
    console.log('NÃO EXECUTADO: falta LiberationSerif-Regular.ttf com sha256 ' + SHA256_FONTE + ' em ' + FONTES_CANDIDATAS.join(' ou ') + ' (ver README.md, "PDF misto sintético").');
    process.exit(2);
  }
  const dirAntigo = prepararReferencia();
  const fc = prepararFontconfig();

  console.log('\n== PDF sintético misto (jupiter_sintetico.js): geração');
  const navA = await chromium.launch({ args: ['--no-sandbox'] });
  console.log('     Chromium', navA.version(), '· modelo tessdata_fast 4.1.0 sha256', shaModelo.slice(0, 16) + '…');
  const ger = await abrirPainel(navA, { amb: criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN }), latencia: 0 });
  await esperarCarregado(ger.pagina);
  const fonte = fs.readFileSync(FONTE_IMAGENS);
  const imagens = await desenharImagens(ger.pagina, [2, 3], fonte);
  const pdf = montarPdfMisto(imagens);
  const pdf2 = montarPdfMisto(await desenharImagens(ger.pagina, [2, 3], fonte));
  const camadas = await ger.pagina.evaluate(async (arr) => {
    const { lib, pdfWorker } = await LeitorPdfFontes._carregarPdfJs();
    const tarefa = lib.getDocument({ data: new Uint8Array(arr), worker: pdfWorker, isEvalSupported: false });
    const doc = await tarefa.promise;
    const saida = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const tc = await (await doc.getPage(n)).getTextContent();
      saida.push(tc.items.map((i) => i.str).join('').replace(/\s/g, '').length);
    }
    await tarefa.destroy();
    return saida;
  }, Array.from(pdf));
  await ger.contexto.close();
  fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'saida', 'misto_sintetico.pdf'), pdf);
  console.log('     PDF:', pdf.length, 'bytes, sha256', sha256(pdf), '(cópia em saida/misto_sintetico.pdf)');
  console.log('     caracteres na camada de texto por página:', camadas.join(' / '), '· fonte das imagens:', FONTE_IMAGENS, 'sha256', sha256(fonte).slice(0, 16) + '…');
  await teste('geração determinística: mesmos bytes nas duas gerações', async () => igual(sha256(pdf2), sha256(pdf), 'sha256'));
  await teste('página 1 com texto selecionável (≥ 40 caracteres); páginas 2 e 3 sem nenhum texto', async () => {
    igual(camadas.length, 3, 'páginas');
    verdade(camadas[0] >= 40, 'página 1 com ' + camadas[0] + ' caracteres');
    igual([camadas[1], camadas[2]], [0, 0], 'caracteres nas páginas de imagem');
  });

  console.log('\n== Controles do próprio teste (o comparador acusa diferenças)');
  // Pacote mínimo no formato do LeitorPdfJupiter, montado a partir do esperado.
  const pacoteEsperado = () => ({
    origem: { geradoEm: ESPERADO.geradoEm },
    curso: Object.assign({}, ESPERADO.curso),
    curriculos: ESPERADO.curriculos.map((c) => Object.assign({}, c)),
    disciplinas: ESPERADO.disciplinas.map((d) => ({ codigo: d[0], nome: d[1], versao: d[2], creditosAula: d[3], creditosTrabalho: d[4], ch: d[5], ce: d[6], cp: d[7], ext: d[8], atpa: d[9], naoConfirmados: [] })),
    vinculos: ESPERADO.vinculos.map((v) => ({ curriculo: CURRICULO, disciplina: v[0], tipo: v[1], periodoIdeal: v[2], periodoConfirmado: true })),
    requisitos: ESPERADO.requisitos.map((q) => ({ curriculo: CURRICULO, disciplina: q[0], requisito: q[1], versaoRequisito: q[2], tipoRequisito: q[3], grupo: q[4] })),
    avisos: [],
    conferencia: Object.assign({}, ESPERADO.conferencia)
  });
  const leituraModelo = (alterar) => { const r = { modo: 'ocr', paginas: [{}, {}, {}], pacote: pacoteEsperado() }; if (alterar) alterar(r); return r; };
  const controles = [
    ['modo texto em vez de OCR', (r) => { r.modo = 'texto'; }],
    ['uma página a menos', (r) => { r.paginas.pop(); }],
    ['código de disciplina trocado', (r) => { r.pacote.disciplinas[2].codigo = 'TST0207'; }],
    ['código de disciplina perdido', (r) => { r.pacote.disciplinas.splice(3, 1); r.pacote.vinculos.splice(3, 1); }],
    ['crédito-trabalho lido errado', (r) => { r.pacote.disciplinas[4].creditosTrabalho = 2; }],
    ['período ideal errado', (r) => { r.pacote.vinculos[5].periodoIdeal = 8; }],
    ['requisito perdido', (r) => { r.pacote.requisitos.pop(); }],
    ['grupo de requisito trocado ("ou" virou "e")', (r) => { r.pacote.requisitos[2].grupo = 2; }],
    ['aviso a mais', (r) => { r.pacote.avisos.push({ nivel: 'aviso', codigo: 'PDF_OCR_NAO_CONFIRMADOS' }); }],
    ['subtotal que não confere', (r) => { r.pacote.conferencia.subtotaisConferem = 3; }]
  ];
  await teste('o pacote montado do esperado é aderente (base dos controles)', async () => igual(compararComEsperado(leituraModelo()), [], 'diferenças'));
  for (const [nome, alterar] of controles) {
    await teste('controle: "' + nome + '" é acusado contra o esperado e entre versões', async () => {
      const alterada = leituraModelo(alterar);
      verdade(compararComEsperado(alterada).length > 0, 'não acusado contra o esperado');
      verdade(compararVersoes(leituraModelo(), alterada).length > 0, 'não acusado entre versões');
    });
  }

  const cenarios = [{ id: 'A', nome: 'fontes do sistema', nav: navA }];
  if (fc.erro) {
    console.log('\n   Cenário B não pôde ser preparado: ' + fc.erro);
  } else {
    const navB = await chromium.launch({ args: ['--no-sandbox'], env: Object.assign({}, process.env, { FONTCONFIG_FILE: fc.arquivo }) });
    cenarios.push({ id: 'B', nome: 'fontconfig: "Helvetica" → ' + fc.alvo + (fc.resolvida ? ' (fc-match: ' + fc.resolvida + ')' : ''), nav: navB });
  }
  await teste('cenário B (outra resolução de fontes) preparado', async () => verdade(!fc.erro, fc.erro));

  const resultados = {};
  const registro = [];
  for (const cen of cenarios) {
    console.log('\n== Cenário ' + cen.id + ' — ' + cen.nome);
    const r3 = await lerComVersao(cen.nav, '3.11.174', dirAntigo, pdf);
    const r6 = await lerComVersao(cen.nav, '6.4.299', DIR_SRC, pdf);
    resultados[cen.id] = { '3.11.174': r3, '6.4.299': r6 };
    for (const [versao, r] of [['3.11.174', r3], ['6.4.299', r6]]) {
      const rot = cen.id + ' · ' + versao;
      await teste(rot + ': lido por OCR, 3 páginas 595×842, as três passaram pelo OCR, sem erro de JavaScript', async () => {
        verdade(r.ok, 'leitura falhou: ' + r.mensagem);
        igual(r.versaoCarregada, versao, 'PDF.js carregado');
        igual(r.modo, 'ocr', 'modo');
        igual(r.paginas.map((pg) => [pg.numero, Math.round(pg.largura), Math.round(pg.altura)]), [[1, 595, 842], [2, 595, 842], [3, 595, 842]], 'páginas');
        igual(r.etapas.filter((e) => /^ocr:/.test(e)), ['ocr:1', 'ocr:2', 'ocr:3'], 'páginas lidas por OCR');
        igual(r.errosPagina, [], 'erros na página');
      });
      await teste(rot + ': em cada página, a 2ª leitura só de dígitos (tokensNumericos) traz exatamente os números da tabela, na ordem', async () => {
        verdade(r.ok, 'sem leitura');
        r.paginas.forEach((pg, i) => {
          verdade(Array.isArray(pg.tokensNumericos) && pg.tokensNumericos.length, 'página ' + (i + 1) + ' sem tokensNumericos');
          igual(pg.tokensNumericos.map((t) => t.texto), numerosDaPagina(i + 1), 'números da página ' + (i + 1));
        });
        // Registro: como o OCR escreveu cada código (o LeitorPdfJupiter corrige O→0, l→1… pelo formato).
        const comoLidos = r.paginas.map((pg, i) => codigosDaPagina(i + 1).map((c) => {
          const tok = pg.tokens.find((t) => t.texto.replace(/\(.*$/, '').toUpperCase().replace(/O/g, '0').replace(/[IL|]/g, '1') === c.replace(/O/g, '0').replace(/I/g, '1') || t.texto.startsWith(c));
          return tok ? (tok.texto.startsWith(c) ? c : c + '←"' + tok.texto + '"') : c + '←(não achado)';
        }).join(' ')).join(' | ');
        console.log('     códigos como o OCR escreveu:', comoLidos);
        console.log('     confiança média do OCR por página:', r.paginas.map(confMedia).join(' / '), '· palavras:', r.paginas.map((pg) => pg.tokens.length).join(' / '));
      });
      await teste(rot + ': resultado do LeitorPdfJupiter igual ao esperado (códigos, nomes, versões, créditos, CH, CE, CP, EXT, ATPA, períodos, requisitos e grupos, conferência, avisos)', async () => {
        verdade(r.ok, 'sem leitura');
        const d = compararComEsperado(r);
        igual(d, [], 'diferenças com o esperado');
      });
    }
    await teste(cen.id + ': 3.11.174 × 6.4.299 — mesmo resultado acadêmico e mesma 2ª leitura dos números; palavras diferentes listadas uma a uma', async () => {
      verdade(r3.ok && r6.ok, 'leitura falhou');
      igual(compararVersoes(r3, r6), [], 'diferenças acadêmicas');
      const difNumeros = [];
      r3.paginas.forEach((pg, i) => { if (JSON.stringify(pg.tokensNumericos.map((t) => t.texto)) !== JSON.stringify(r6.paginas[i].tokensNumericos.map((t) => t.texto))) difNumeros.push(i + 1); });
      igual(difNumeros, [], 'páginas com números diferentes na 2ª leitura');
      // Palavras: cada diferença é mostrada (com a confiança), para não esconder erro de leitura.
      const outras = diferencas(r3.pacote, r6.pacote, 'pacote');
      igual(outras, [], 'diferenças em qualquer campo do pacote do LeitorPdfJupiter');
      const difPalavras = r3.paginas.map((pg, i) => diferencasDePalavras(pg.tokens, r6.paginas[i].tokens)).map((l, i) => l.length ? 'página ' + (i + 1) + ': ' + l.join('; ') : null).filter(Boolean);
      console.log('     palavras diferentes (3.11.174 → 6.4.299):', difPalavras.length ? '\n       ' + difPalavras.join('\n       ') : 'nenhuma');
      console.log('     confiança média 3.11.174:', r3.paginas.map(confMedia).join(' / '), '· 6.4.299:', r6.paginas.map(confMedia).join(' / '));
      registro.push({ cenario: cen.id, palavrasDiferentes: difPalavras, conf311: r3.paginas.map(confMedia), conf64: r6.paginas.map(confMedia), pixels311: r3.desenho1.escuros, pixels64: r6.desenho1.escuros });
    });
    await teste(cen.id + ': desenho da página 1 (registro): tamanho igual; fontes pedidas e pixels escuros de cada versão', async () => {
      verdade(r3.ok && r6.ok, 'leitura falhou');
      igual([r3.desenho1.largura, r3.desenho1.altura], [r6.desenho1.largura, r6.desenho1.altura], 'tamanho do canvas');
      igual(r6.desenho1.fontes, r3.desenho1.fontes.map((f) => f.replace('g_dN', '"Helvetica",g_dN')), 'o 6.4.299 pede "Helvetica" antes da substituta do 3.11.174');
      console.log('     fontes 3.11.174:', JSON.stringify(r3.desenho1.fontes), '· 6.4.299:', JSON.stringify(r6.desenho1.fontes));
      console.log('     pixels escuros da página 1 — 3.11.174:', r3.desenho1.escuros, '· 6.4.299:', r6.desenho1.escuros,
        r3.desenho1.escuros === r6.desenho1.escuros ? '(iguais neste cenário)' : '(DIFERENTES neste cenário: ' + (r6.desenho1.escuros - r3.desenho1.escuros) + ')');
    });
  }
  if (resultados.B) {
    await teste('o cenário B mudou mesmo a fonte usada pelo 6.4.299 na página 1 (pixels diferentes do cenário A)', async () => {
      verdade(resultados.A['6.4.299'].ok && resultados.B['6.4.299'].ok, 'leitura falhou');
      verdade(resultados.A['6.4.299'].desenho1.escuros !== resultados.B['6.4.299'].desenho1.escuros,
        'mesmos pixels nos dois cenários (' + resultados.B['6.4.299'].desenho1.escuros + '): o cenário B não mudou a fonte');
    });
  }

  fs.writeFileSync(path.join(__dirname, 'saida', 'misto_sintetico_registro.json'), JSON.stringify(registro, null, 1));
  for (const cen of cenarios) await cen.nav.close();
  fs.rmSync(dirAntigo, { recursive: true, force: true });
  if (fc.dir) fs.rmSync(fc.dir, { recursive: true, force: true });
  console.log('\n' + ok + ' passaram, ' + falhas + ' falharam' + (falhas ? ': ' + falhou.join(' | ') : ''));
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.error('ERRO DE INFRAESTRUTURA:', e && e.stack || e);
  process.exit(3);
});

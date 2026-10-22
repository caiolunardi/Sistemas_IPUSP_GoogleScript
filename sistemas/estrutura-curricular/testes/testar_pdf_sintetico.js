// Leitura de PDF no Chromium real, só com PDFs SINTÉTICOS (roda na CI).
// Usa o painel de verdade (Painel.html pelo doGet do simulador), o mesmo
// LeitorPdfFontes.html de produção e o PDF.js que o simulador serve de
// node_modules no lugar do jsDelivr (ambiente_navegador.js).
// Desde a Etapa 4: PDF.js 6.4.299 (build legacy, módulos ES), biblioteca e
// worker baixados e conferidos por SHA-384 antes de executar.
// Confere:
// - carga sob demanda, versão e hashes iguais aos do pacote do espelho;
// - worker de módulo de verdade (sem "fake worker"), um só para a página;
// - URLs blob: liberados depois da carga;
// - palavras, posições e desenho a 300 dpi iguais aos do PDF.js 3.11.174
//   (referencia_pdfjs_3.11.174.json, gravada e conferida pelo protótipo);
// - progresso, cancelamento, leituras simultâneas e bytes de quem chamou intactos;
// - PDF corrompido e arquivo que não é PDF recusados (leitor e tela);
// - controles negativos: biblioteca ou worker ausentes, adulterados, rede
//   fora e worker que não inicia; nada é executado e a nova tentativa funciona;
// - JavaScript de documento (PDF sintético benigno) não é executado, numa
//   página com CSP sem 'unsafe-eval', e o detector acusa quando o script roda.
// Os PDFs são gerados por pdf_sintetico.js; nenhum arquivo do Júpiter.
// Uso: node testar_pdf_sintetico.js
// Código de saída: 0 = aprovada; 1 = alguma asserção reprovada; 3 = erro de infraestrutura.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { corpoScript } = require('./carregar_leitores');
const { pdfValido, pdfCorrompido, naoPdf, pdfComScript, PAGINAS, MARCADOR_SCRIPT } = require('./pdf_sintetico');

const VERSAO = require('pdfjs-dist/package.json').version;
const URL_LIB = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VERSAO + '/legacy/build/pdf.min.mjs';
const URL_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VERSAO + '/legacy/build/pdf.worker.min.mjs';
const ARQ_LIB = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.min.mjs');
const ARQ_WORKER = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
const REFERENCIA = JSON.parse(fs.readFileSync(path.join(__dirname, 'referencia_pdfjs_3.11.174.json'), 'utf8'));
const ADMIN = 'dono@unidade.example';
const LIMITE_MS = 60000;
const MSG_DOWNLOAD = /Não foi possível baixar um componente de leitura de PDF/;
const MSG_INTEGRIDADE = /veio diferente do esperado e não foi usado/;
const MSG_INICIO = /não pôde ser iniciado neste navegador/;

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sri384 = (b) => 'sha384-' + crypto.createHash('sha384').update(b).digest('base64');

/**
 * Registra, na página, os URLs blob: criados e liberados, os Workers criados
 * (e com que tipo) e os diálogos (alert) — antes de o leitor carregar o PDF.js.
 */
function instrumentar(pagina) {
  return pagina.evaluate(() => {
    window.__blobs = { criados: [], liberados: [] };
    const criar = URL.createObjectURL.bind(URL), liberar = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = function (b) { const u = criar(b); window.__blobs.criados.push({ url: u, tipo: b && b.type }); return u; };
    URL.revokeObjectURL = function (u) { window.__blobs.liberados.push(u); return liberar(u); };
    window.__workers = [];
    const WorkerReal = window.Worker;
    window.__WorkerReal = WorkerReal;
    window.Worker = function (url, opcoes) { window.__workers.push({ url: String(url), tipo: opcoes && opcoes.type }); return new WorkerReal(url, opcoes); };
    window.Worker.prototype = WorkerReal.prototype;
  });
}

/**
 * Painel novo num contexto próprio (cache de scripts limpo), com registro
 * de respostas HTTP, pedidos que falharam, workers e diálogos.
 * alterar: { trecho: '404' | 'adulterar' | 'rede' } para os controles negativos.
 */
async function abrir(nav, alterar) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  const p = await abrirPainel(nav, { amb, latencia: 0 });
  p.respostas = [];
  p.falhasRede = [];
  p.workers = [];
  p.dialogos = [];
  p.contexto.on('response', (r) => p.respostas.push({ url: r.url(), status: r.status(), tipo: r.headers()['content-type'] }));
  p.contexto.on('requestfailed', (r) => p.falhasRede.push(r.url() + ' — ' + (r.failure() && r.failure().errorText)));
  p.pagina.on('worker', (w) => p.workers.push(w.url()));
  p.pagina.on('dialog', (d) => { p.dialogos.push(d.message()); d.dismiss().catch(() => {}); });
  p.avisos = [];
  p.pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'warn') p.avisos.push(m.text()); });
  // Rotas registradas depois têm prioridade sobre as do simulador.
  p.alteracoes = [];
  for (const [trecho, acao] of Object.entries(alterar || {})) {
    const manipulador = (rota) => {
      if (acao === '404') return rota.fulfill({ status: 404, body: 'bloqueado pelo teste: ' + trecho });
      if (acao === 'rede') return rota.abort('failed');
      const arq = trecho.includes('worker') ? ARQ_WORKER : ARQ_LIB;
      const corpo = Buffer.concat([fs.readFileSync(arq), Buffer.from('\n/* um byte a mais */\n')]);
      return rota.fulfill({ status: 200, body: corpo, headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' } });
    };
    const filtro = (u) => u.href.includes(trecho);
    await p.contexto.route(filtro, manipulador);
    p.alteracoes.push([filtro, manipulador]);
  }
  await esperarCarregado(p.pagina);
  await instrumentar(p.pagina);
  return p;
}
async function desfazerAlteracoes(p) {
  for (const [filtro, manipulador] of p.alteracoes) await p.contexto.unroute(filtro, manipulador);
  p.alteracoes = [];
}

/** LeitorPdfFontes.ler na página, com limite de tempo. Nunca lança: devolve { ok, ... } ou { erro }. */
function lerNaPagina(pagina, bytes) {
  return pagina.evaluate(async ({ arr, limite }) => {
    const tempo = new Promise((_, falha) => setTimeout(() => falha(new Error('tempo esgotado (' + limite + ' ms)')), limite));
    const entrada = new Uint8Array(arr);
    try {
      const r = await Promise.race([LeitorPdfFontes.ler(entrada, {}), tempo]);
      return {
        ok: true,
        modo: r.modo,
        bytesDepois: entrada.length,
        paginas: r.paginas.map((p) => ({ numero: p.numero, largura: p.largura, altura: p.altura, tokens: p.tokens, tokensNumericos: p.tokensNumericos }))
      };
    } catch (e) {
      return { ok: false, nome: e && e.name, mensagem: String(e && e.message || e), tipo: e && e.tipo };
    }
  }, { arr: Array.from(bytes), limite: LIMITE_MS });
}

/** O mesmo desenho que o OCR faz (ocrDaPagina): página 1 a 300 dpi num canvas branco, com o PDF.js e o worker do leitor. */
function desenharPagina(pagina, bytes) {
  return pagina.evaluate(async (arr) => {
    try {
      const { lib, pdfWorker } = await LeitorPdfFontes._carregarPdfJs();
      const tarefa = lib.getDocument({ data: new Uint8Array(arr), worker: pdfWorker, isEvalSupported: false });
      const doc = await tarefa.promise;
      const pg = await doc.getPage(1);
      const vp = pg.getViewport({ scale: 300 / 72 });
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let escuros = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 128) escuros++;
      await tarefa.destroy();
      return { ok: true, largura: c.width, altura: c.height, escuros };
    } catch (e) {
      return { ok: false, mensagem: String(e && e.message || e) };
    }
  }, Array.from(bytes));
}

const normal = (s) => String(s).replace(/\s+/g, ' ').trim();
const ruins = (p) => p.respostas.filter((r) => r.status >= 400);
const marcadorNaPagina = (pagina) => pagina.evaluate(() => (typeof window.__marcadorScriptPdf === 'undefined' ? null : window.__marcadorScriptPdf));

/** Palavras e posições iguais às da referência 3.11.174 (tolerância de 0,01 pt). */
function compararComReferencia(r) {
  igual(r.paginas.length, REFERENCIA.paginas.length, 'páginas');
  r.paginas.forEach((pg, i) => {
    const ref = REFERENCIA.paginas[i];
    igual([pg.numero, pg.largura, pg.altura], [ref.numero, ref.largura, ref.altura], 'página ' + (i + 1));
    igual(pg.tokens.map((t) => t.texto), ref.tokens.map((t) => t.texto), 'palavras da página ' + (i + 1));
    pg.tokens.forEach((t, j) => ['x0', 'x1', 'y0', 'y1', 'conf'].forEach((k) => {
      verdade(Math.abs(t[k] - ref.tokens[j][k]) < 0.01, 'página ' + (i + 1) + ' "' + t.texto + '" ' + k + ': ' + t[k] + ' ≠ ' + ref.tokens[j][k]);
    }));
  });
}

/** Página isolada com CSP sem 'unsafe-eval' e o LeitorPdfFontes.html de produção. */
const CSP = "default-src 'none'; script-src 'unsafe-inline' blob: https://cdn.jsdelivr.net; worker-src blob:; " +
  "connect-src https://cdn.jsdelivr.net; img-src blob: data:; style-src 'unsafe-inline'";
async function abrirIsolada(nav) {
  const contexto = await nav.newContext({ locale: 'pt-BR' });
  const p = { contexto, respostas: [], erros: [], dialogos: [], pedidosCdn: [] };
  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Leitor isolado</title>' +
    '<script>window.__csp = []; document.addEventListener("securitypolicyviolation", function (e) { window.__csp.push(e.violatedDirective + " " + e.blockedURI + " " + (e.sample || "")); });</script>' +
    '<script>' + corpoScript('LeitorPdfFontes.html') + '</script></head><body><p>Leitor isolado — PDFs sintéticos</p></body></html>';
  await contexto.route('https://cdn.jsdelivr.net/**', (rota) => {
    const url = rota.request().url();
    p.pedidosCdn.push(url);
    const arq = url === URL_LIB ? ARQ_LIB : url === URL_WORKER ? ARQ_WORKER : null;
    if (!arq) return rota.fulfill({ status: 404, body: 'não servido no teste: ' + url });
    return rota.fulfill({ status: 200, body: fs.readFileSync(arq), headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' } });
  });
  await contexto.route('https://leitor.teste/**', (rota) => rota.fulfill({ status: 200, body: html, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP } }));
  p.pagina = await contexto.newPage();
  contexto.on('response', (r) => p.respostas.push({ url: r.url(), status: r.status() }));
  p.pagina.on('pageerror', (e) => p.erros.push(String(e)));
  p.pagina.on('console', (m) => { if (m.type() === 'error') p.erros.push('console: ' + m.text()); });
  p.pagina.on('dialog', (d) => { p.dialogos.push(d.message()); d.dismiss().catch(() => {}); });
  await p.pagina.goto('https://leitor.teste/');
  return p;
}

(async () => {
  const valido = pdfValido();
  const corrompido = pdfCorrompido();
  const textoPuro = naoPdf();
  const comScript = pdfComScript();

  console.log('\n== PDFs sintéticos (pdf_sintetico.js) e referência');
  await teste('geração determinística: mesmos bytes a cada chamada', async () => {
    igual(sha256(pdfValido()), sha256(valido), 'PDF válido');
    igual(sha256(pdfCorrompido()), sha256(corrompido), 'PDF corrompido');
    igual(sha256(pdfComScript()), sha256(comScript), 'PDF com script');
    verdade(valido.subarray(0, 8).toString('latin1') === '%PDF-1.4', 'cabeçalho %PDF-1.4');
    verdade(/%%EOF\n$/.test(valido.toString('latin1')), 'termina com %%EOF');
    verdade(corrompido.subarray(0, 5).toString('latin1') === '%PDF-', 'o corrompido começa como PDF (passa pelo filtro da tela)');
    console.log('     válido:', valido.length, 'bytes, sha256', sha256(valido));
    console.log('     corrompido:', corrompido.length, 'bytes, sha256', sha256(corrompido));
    console.log('     com script:', comScript.length, 'bytes, sha256', sha256(comScript));
  });
  await teste('a referência 3.11.174 é deste mesmo PDF sintético', async () => {
    igual(REFERENCIA.versaoPdfJs, '3.11.174', 'versão da referência');
    igual(REFERENCIA.pdfSha256, sha256(valido), 'PDF da referência');
  });

  const nav = await abrirNavegador();
  console.log('     Chromium', nav.version(), '· referência gravada no Chromium', REFERENCIA.chromium);

  console.log('\n== Leitura do PDF válido no painel (PDF.js ' + VERSAO + ' + worker de módulo)');
  const p = await abrir(nav);
  await teste('o PDF.js só é baixado depois da escolha de um PDF (carregamento sob demanda)', async () => {
    igual(await p.pagina.evaluate(() => typeof window.pdfjsLib), 'undefined');
    igual(p.pedidosCdn.filter((u) => u.includes('pdfjs-dist')), [], 'pedidos ao PDF.js antes da leitura');
  });
  const r = await lerNaPagina(p.pagina, valido);
  await teste('PDF sintético aberto pela camada de texto', async () => {
    verdade(r.ok, 'leitura falhou: ' + r.nome + ': ' + r.mensagem);
    igual(r.modo, 'texto', 'modo');
    igual(r.paginas.length, PAGINAS.length, 'páginas');
    r.paginas.forEach((pg, i) => {
      igual(pg.numero, i + 1, 'número da página');
      igual([Math.round(pg.largura), Math.round(pg.altura)], [595, 842], 'tamanho da página ' + (i + 1));
      igual(pg.tokensNumericos, undefined, 'tokensNumericos (só no OCR)');
    });
  });
  await teste('texto extraído igual ao escrito no PDF (página a página, com acentos)', async () => {
    verdade(r.ok, 'sem leitura');
    PAGINAS.forEach((linhas, i) => {
      const lido = normal(r.paginas[i].tokens.map((t) => t.texto).join(' '));
      linhas.forEach((l) => verdade(lido.includes(normal(l)), 'página ' + (i + 1) + ' sem "' + l + '" — lido: ' + lido.slice(0, 200)));
    });
    verdade(r.paginas[0].tokens.map((t) => t.texto).join(' ').includes('Ciência'), 'acento (WinAnsi) preservado');
    verdade(r.paginas[1].tokens.map((t) => t.texto).join(' ').includes('PDFJS-SINTETICO-OK'), 'marcador final');
  });
  await teste('mesmas palavras e posições do PDF.js 3.11.174 (referência gravada, tolerância 0,01 pt)', async () => {
    verdade(r.ok, 'sem leitura');
    compararComReferencia(r);
  });
  await teste('os bytes de quem chamou continuam inteiros depois da leitura', async () => {
    igual(r.bytesDepois, valido.length, 'tamanho do Uint8Array depois de ler');
  });
  await teste('PDF.js ' + VERSAO + ' carregado pelas URLs e hashes fixados no leitor, iguais aos do pacote do espelho', async () => {
    const info = await p.pagina.evaluate(async () => {
      const c = await LeitorPdfFontes._carregarPdfJs();
      return { versao: c.lib.version, libs: LeitorPdfFontes.LIBS.pdfjs, global: typeof window.pdfjsLib };
    });
    igual(info.libs.versao, VERSAO, 'versão no leitor = versão do pdfjs-dist do espelho');
    igual(info.versao, VERSAO, 'pdfjsLib.version');
    igual(info.libs.lib.url, URL_LIB, 'URL da biblioteca');
    igual(info.libs.worker.url, URL_WORKER, 'URL do worker');
    igual(info.libs.lib.sha384, sri384(fs.readFileSync(ARQ_LIB)), 'SHA-384 da biblioteca');
    igual(info.libs.worker.sha384, sri384(fs.readFileSync(ARQ_WORKER)), 'SHA-384 do worker');
    console.log('     versão', info.versao, '· lib', info.libs.lib.sha384, '· worker', info.libs.worker.sha384);
  });
  await teste('worker do PDF.js de verdade: um Worker de módulo de blob:, sem "fake worker"', async () => {
    verdade(p.pedidosCdn.includes(URL_LIB), 'pedido da biblioteca: ' + JSON.stringify(p.pedidosCdn));
    verdade(p.pedidosCdn.includes(URL_WORKER), 'pedido do worker: ' + JSON.stringify(p.pedidosCdn));
    const w = await p.pagina.evaluate(() => window.__workers);
    igual(w.length, 1, 'Workers criados pela página');
    verdade(w[0].url.startsWith('blob:') && w[0].tipo === 'module', 'worker: ' + JSON.stringify(w));
    igual(p.workers.length, 1, 'workers vistos pelo navegador');
    igual(await p.pagina.evaluate(() => typeof window.pdfjsWorker), 'undefined', 'pdfjsWorker no contexto da página (= fake worker)');
    verdade(!p.avisos.some((a) => /fake worker/i.test(a)), 'aviso de fake worker: ' + p.avisos.join(' | '));
    for (const u of [URL_LIB, URL_WORKER]) {
      const resp = p.respostas.filter((x) => x.url === u);
      verdade(resp.length === 1 && resp[0].status === 200 && /text\/javascript/.test(resp[0].tipo), u + ' servido uma vez com 200 e text/javascript: ' + JSON.stringify(resp));
    }
  });
  await teste('URLs blob: da biblioteca e do worker liberados depois da carga', async () => {
    const b = await p.pagina.evaluate(() => window.__blobs);
    const js = b.criados.filter((x) => x.tipo === 'text/javascript').map((x) => x.url);
    igual(js.length, 2, 'blob: de JavaScript criados');
    js.forEach((u) => verdade(b.liberados.includes(u), 'não liberado: ' + u));
  });
  const desenho = await desenharPagina(p.pagina, valido);
  await teste('desenho da página para o OCR (300 dpi): mesmo tamanho e mesmos pixels escuros do 3.11.174', async () => {
    verdade(desenho.ok, desenho.mensagem);
    igual([desenho.largura, desenho.altura], [REFERENCIA.desenho.largura, REFERENCIA.desenho.altura], 'tamanho do canvas');
    verdade(desenho.escuros > 0, 'página em branco');
    igual(desenho.escuros, REFERENCIA.desenho.escuros, 'pixels escuros iguais aos do 3.11.174');
    console.log('     canvas', desenho.largura + '×' + desenho.altura, '· pixels escuros', desenho.escuros, '(referência ' + REFERENCIA.desenho.escuros + ')');
  });
  await teste('progresso e cancelamento: a leitura cancelada para e a seguinte funciona', async () => {
    const res = await p.pagina.evaluate(async (arr) => {
      const etapas = [];
      const sinal = { cancelado: false };
      let cancelada;
      try {
        await LeitorPdfFontes.ler(new Uint8Array(arr), { sinal, aoProgredir: (i) => { etapas.push(i.etapa + (i.pagina ? ':' + i.pagina + '/' + i.total : '')); if (i.etapa === 'texto' && i.pagina === 1) sinal.cancelado = true; } });
        cancelada = { ok: true };
      } catch (e) { cancelada = { ok: false, cancelado: !!e.cancelado, mensagem: e.message }; }
      const completas = [];
      const r2 = await LeitorPdfFontes.ler(new Uint8Array(arr), { aoProgredir: (i) => completas.push(i.etapa + (i.pagina ? ':' + i.pagina + '/' + i.total : '')) });
      return { etapas, cancelada, completas, modo: r2.modo, paginas: r2.paginas.length };
    }, Array.from(valido));
    igual(res.cancelada, { ok: false, cancelado: true, mensagem: 'Leitura cancelada.' }, 'leitura cancelada');
    igual(res.etapas, ['carregando', 'texto:1/2'], 'progresso até o cancelamento');
    igual(res.completas, ['carregando', 'texto:1/2', 'texto:2/2'], 'progresso da leitura completa');
    igual([res.modo, res.paginas], ['texto', 2], 'leitura depois do cancelamento');
  });
  await teste('duas leituras ao mesmo tempo usam o mesmo worker e terminam bem', async () => {
    const res = await p.pagina.evaluate(async (arr) => {
      const [a, b] = await Promise.all([LeitorPdfFontes.ler(new Uint8Array(arr), {}), LeitorPdfFontes.ler(new Uint8Array(arr), {})]);
      return [a.paginas.length, b.paginas.length, window.__workers.length];
    }, Array.from(valido));
    igual(res, [2, 2, 1], '[páginas A, páginas B, Workers criados]');
  });
  await teste('nenhuma resposta 4xx/5xx, pedido falho ou erro de JavaScript', async () => {
    igual(ruins(p), [], 'respostas com erro');
    igual(p.falhasRede, [], 'pedidos que falharam');
    igual(p.errosPagina, [], 'erros na página');
  });

  console.log('\n== PDF inválido pelo leitor (mesma página)');
  const rc = await lerNaPagina(p.pagina, corrompido);
  await teste('PDF corrompido (começa com %PDF-, resto ilegível) é recusado com erro do PDF.js', async () => {
    verdade(!rc.ok, 'o PDF corrompido foi aceito: ' + JSON.stringify(rc).slice(0, 200));
    igual(rc.nome, 'InvalidPDFException', 'tipo do erro (' + rc.mensagem + ')');
    console.log('     ', rc.nome + ':', rc.mensagem);
  });
  const rt = await lerNaPagina(p.pagina, textoPuro);
  await teste('arquivo de texto puro é recusado', async () => {
    verdade(!rt.ok, 'texto puro aceito como PDF');
    igual(rt.nome, 'InvalidPDFException', 'tipo do erro (' + rt.mensagem + ')');
  });
  const rv = await lerNaPagina(p.pagina, valido);
  await teste('depois das recusas, o leitor continua abrindo o PDF válido (mesmo worker)', async () => {
    verdade(rv.ok && rv.modo === 'texto' && rv.paginas.length === PAGINAS.length, JSON.stringify(rv).slice(0, 200));
    igual(await p.pagina.evaluate(() => window.__workers.length), 1, 'Workers criados');
  });
  await teste('as recusas não deixaram erro não tratado, 404 nem pedido falho', async () => {
    igual(p.errosPagina, [], 'erros na página');
    igual(ruins(p), [], 'respostas com erro');
    igual(p.falhasRede, [], 'pedidos que falharam');
  });

  console.log('\n== JavaScript de documento (PDF sintético benigno)');
  const rs = await lerNaPagina(p.pagina, comScript);
  await teste('PDF com JavaScript de documento é lido normalmente, sem executar o script', async () => {
    verdade(rs.ok && rs.modo === 'texto', JSON.stringify(rs).slice(0, 200));
    compararComReferencia(rs);
    const desenhoScript = await desenharPagina(p.pagina, comScript);
    verdade(desenhoScript.ok, desenhoScript.mensagem);
    igual(desenhoScript.escuros, REFERENCIA.desenho.escuros, 'desenho a 300 dpi (o link não tem aparência)');
    igual(p.dialogos, [], 'diálogos (app.alert)');
    igual(await marcadorNaPagina(p.pagina), null, 'window.__marcadorScriptPdf');
    igual(p.pedidosCdn.filter((u) => /sandbox|pdf_viewer/.test(u)), [], 'pedidos de sandbox ou visualizador');
  });
  await teste('controle: o PDF tem mesmo o script, e o detector acusa quando ele é executado', async () => {
    const res = await p.pagina.evaluate(async (arr) => {
      const { lib, pdfWorker } = await LeitorPdfFontes._carregarPdfJs();
      const tarefa = lib.getDocument({ data: new Uint8Array(arr), worker: pdfWorker });
      const doc = await tarefa.promise;
      const acoes = await doc.getJSActions(); // um Map no 6.x
      const lista = acoes instanceof Map ? [...acoes.entries()] : Object.entries(acoes || {});
      const codigo = lista.map((e) => e[1]).flat()[0] || '';
      new Function(codigo)(); // o "caminho ativado": roda o script do documento na página
      await tarefa.destroy();
      return { nomes: lista.map((e) => e[0]), temMarcador: codigo.includes('__marcadorScriptPdf') };
    }, Array.from(comScript));
    verdade(res.temMarcador, 'script do documento não encontrado: ' + JSON.stringify(res));
    igual(await marcadorNaPagina(p.pagina), MARCADOR_SCRIPT, 'marcador depois de executar o script de propósito');
    await p.pagina.evaluate(() => { delete window.__marcadorScriptPdf; });
    console.log('     ações de JavaScript no PDF:', res.nomes.join(', '));
  });
  await p.contexto.close();

  console.log('\n== Página com CSP sem \'unsafe-eval\' (mas com \'unsafe-inline\'), só o leitor');
  const iso = await abrirIsolada(nav);
  const ri = await lerNaPagina(iso.pagina, valido);
  const ris = await lerNaPagina(iso.pagina, comScript);
  await teste('o leitor funciona com a CSP: PDF válido e PDF com script lidos, sem executar o script', async () => {
    verdade(ri.ok && ri.modo === 'texto', JSON.stringify(ri).slice(0, 200));
    compararComReferencia(ri);
    verdade(ris.ok && ris.modo === 'texto', JSON.stringify(ris).slice(0, 200));
    igual(iso.dialogos, [], 'diálogos');
    igual(await marcadorNaPagina(iso.pagina), null, 'window.__marcadorScriptPdf');
  });
  await teste('nenhuma violação de CSP, erro de JavaScript ou 4xx nos cenários executados', async () => {
    igual(await iso.pagina.evaluate(() => window.__csp), [], 'violações de CSP');
    igual(iso.erros, [], 'erros');
    igual(ruins(iso), [], 'respostas com erro');
  });
  await iso.contexto.close();

  console.log('\n== PDF inválido pela tela de importação');
  const t = await abrir(nav);
  async function escolher(nome, bytes) {
    await t.pagina.click('[data-abrir-importacao]');
    await t.pagina.waitForSelector('#modalImportacao:not([hidden]) #entradaArquivo', { state: 'attached' });
    await t.pagina.setInputFiles('#entradaArquivo', { name: nome, mimeType: 'application/pdf', buffer: bytes });
    await t.pagina.waitForSelector('#importacaoCorpo .alerta--erro[role="alert"]', { timeout: LIMITE_MS });
    return normal(await t.pagina.textContent('#importacaoCorpo .alerta--erro'));
  }
  await teste('PDF corrompido: alerta "Não foi possível usar este arquivo" e volta à escolha do arquivo', async () => {
    const msg = await escolher('corrompido-sintetico.pdf', corrompido);
    verdade(/Não foi possível usar este arquivo/.test(msg), 'alerta: ' + msg);
    verdade(/Invalid PDF/i.test(msg), 'motivo do PDF.js no alerta: ' + msg);
    verdade(await t.pagina.$('#modalImportacao:not([hidden]) #entradaArquivo'), 'campo de arquivo de volta');
    console.log('     alerta:', msg);
    await t.pagina.click('[data-imp="fechar"]');
  });
  await teste('arquivo .pdf que não é PDF: recusado antes do PDF.js', async () => {
    const msg = await escolher('nao-e-pdf-sintetico.pdf', textoPuro);
    verdade(/não é um PDF válido/.test(msg), 'alerta: ' + msg);
    await t.pagina.click('[data-imp="fechar"]');
  });
  await teste('tela de importação sem erro de JavaScript nem 404', async () => {
    igual(t.errosPagina, [], 'erros na página');
    igual(ruins(t), [], 'respostas com erro');
  });
  await t.contexto.close();

  console.log('\n== Controles negativos: sem o recurso conferido, nada é executado; depois, a nova tentativa funciona');
  const casos = [
    ['worker indisponível (404)', { '/legacy/build/pdf.worker.min.mjs': '404' }, MSG_DOWNLOAD, URL_WORKER],
    ['biblioteca indisponível (404)', { '/legacy/build/pdf.min.mjs': '404' }, MSG_DOWNLOAD, URL_LIB],
    ['worker adulterado (um byte a mais)', { '/legacy/build/pdf.worker.min.mjs': 'adulterar' }, MSG_INTEGRIDADE, null],
    ['biblioteca adulterada (um byte a mais)', { '/legacy/build/pdf.min.mjs': 'adulterar' }, MSG_INTEGRIDADE, null],
    ['falha de rede ao baixar a biblioteca', { '/legacy/build/pdf.min.mjs': 'rede' }, MSG_DOWNLOAD, null]
  ];
  for (const [nome, alterar, mensagem, url404] of casos) {
    const n = await abrir(nav, alterar);
    const rn = await lerNaPagina(n.pagina, valido);
    const estado = await n.pagina.evaluate(() => ({ global: typeof window.pdfjsLib, fake: typeof window.pdfjsWorker, workers: window.__workers.length, blobs: window.__blobs }));
    await teste(nome + ': a leitura falha com a mensagem certa, sem executar a biblioteca nem criar worker', async () => {
      verdade(!rn.ok, 'leu o PDF: ' + JSON.stringify(rn).slice(0, 200));
      verdade(mensagem.test(rn.mensagem), 'mensagem: ' + rn.mensagem);
      igual([estado.global, estado.fake, estado.workers], ['undefined', 'undefined', 0], '[pdfjsLib executado, fake worker, Workers criados]');
      igual(n.workers, [], 'workers vistos pelo navegador');
      const js = estado.blobs.criados.filter((x) => x.tipo === 'text/javascript').map((x) => x.url);
      js.forEach((u) => verdade(estado.blobs.liberados.includes(u), 'blob: não liberado: ' + u));
      if (url404) verdade(ruins(n).some((x) => x.url === url404 && x.status === 404), '404 não registrado: ' + JSON.stringify(ruins(n)));
      console.log('     ', rn.mensagem);
    });
    await desfazerAlteracoes(n);
    const rn2 = await lerNaPagina(n.pagina, valido);
    await teste(nome + ': com o recurso de volta, a nova tentativa lê o PDF', async () => {
      verdade(rn2.ok && rn2.modo === 'texto' && rn2.paginas.length === PAGINAS.length, JSON.stringify(rn2).slice(0, 200));
      igual(await n.pagina.evaluate(() => window.__workers.length), 1, 'Workers criados');
    });
    await n.contexto.close();
  }

  const fi = await abrir(nav);
  await fi.pagina.evaluate(() => {
    // Worker que não inicia (como se o navegador ou a CSP recusassem o worker de módulo).
    window.Worker = function (url, opcoes) {
      window.__workers.push({ url: String(url), tipo: opcoes && opcoes.type, falso: true });
      const t = new EventTarget();
      t.postMessage = function () {};
      t.terminate = function () { t.encerrado = true; };
      window.__workerFalso = t;
      setTimeout(() => t.dispatchEvent(new Event('error', { cancelable: true })), 0);
      return t;
    };
  });
  const rf = await lerNaPagina(fi.pagina, valido);
  await teste('worker que não inicia: a leitura falha com a mensagem de início, o worker é encerrado e os blob: liberados', async () => {
    verdade(!rf.ok, 'leu o PDF: ' + JSON.stringify(rf).slice(0, 200));
    verdade(MSG_INICIO.test(rf.mensagem), 'mensagem: ' + rf.mensagem);
    const est = await fi.pagina.evaluate(() => ({ encerrado: !!(window.__workerFalso && window.__workerFalso.encerrado), fake: typeof window.pdfjsWorker, blobs: window.__blobs }));
    verdade(est.encerrado, 'worker que falhou não foi encerrado');
    igual(est.fake, 'undefined', 'fake worker');
    const js = est.blobs.criados.filter((x) => x.tipo === 'text/javascript').map((x) => x.url);
    igual(js.length, 2, 'blob: criados');
    js.forEach((u) => verdade(est.blobs.liberados.includes(u), 'blob: não liberado: ' + u));
    console.log('     ', rf.mensagem);
  });
  await fi.pagina.evaluate(() => { window.Worker = window.__WorkerReal; });
  const rf2 = await lerNaPagina(fi.pagina, valido);
  await teste('worker que não inicia: depois, a nova tentativa carrega tudo de novo e lê o PDF', async () => {
    verdade(rf2.ok && rf2.modo === 'texto', JSON.stringify(rf2).slice(0, 200));
    igual(fi.workers.length, 1, 'workers de verdade');
  });
  await fi.contexto.close();

  await nav.close();
  console.log('\n' + ok + ' passaram, ' + falhas + ' falharam' + (falhas ? ': ' + falhou.join(' | ') : ''));
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.error('ERRO DE INFRAESTRUTURA:', e && e.stack || e);
  process.exit(3);
});

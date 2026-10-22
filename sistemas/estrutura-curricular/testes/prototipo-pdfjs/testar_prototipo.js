// Etapa 3 — PROTÓTIPO ISOLADO: PDF.js moderno (módulos ES) no Chromium, com
// worker de verdade e integridade conferida da biblioteca e do worker.
// Não substitui nada: o sistema e a suíte oficial continuam no PDF.js
// 3.11.174. Nenhum arquivo de src/ é alterado; o LeitorPdfFontes.html de
// produção é só LIDO e executado numa página de teste, e a função ler() dele
// roda sem mudança sobre cada candidato (só a carga da biblioteca é trocada
// pelo carregador_verificado.js, que é o que a Etapa 4 teria de mudar).
// A página de teste tem uma CSP rígida, sem 'unsafe-eval'.
// PDFs só sintéticos (../pdf_sintetico.js).
// Uso: node preparar.js && node testar_prototipo.js
// Código de saída: 0 = candidatos aprovados; 1 = alguma asserção de candidato reprovada; 3 = erro de infraestrutura.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULO || 'playwright');
const { corpoScript } = require('../carregar_leitores');
const { pdfValido, pdfCorrompido, naoPdf, PAGINAS } = require('../pdf_sintetico');

const AQUI = __dirname;
const MODULOS = path.join(AQUI, '..', 'node_modules');
const PACOTES = path.join(AQUI, 'pacotes');
const { candidatos } = JSON.parse(fs.readFileSync(path.join(AQUI, 'candidatos.json'), 'utf8'));
const BASE = '3.11.174';
const CDN = (versao, caminho) => 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + versao + '/' + caminho;
const LIMITE_MS = 60000;
// CSP da página de teste: sem 'unsafe-eval'; scripts só inline, blob: e jsDelivr.
const CSP = "default-src 'none'; script-src 'unsafe-inline' blob: https://cdn.jsdelivr.net; worker-src blob:; " +
  "connect-src https://cdn.jsdelivr.net; img-src blob: data:; style-src 'unsafe-inline'";

let ok = 0, falhas = 0, informativas = 0;
const falhou = [];
let papelAtual = 'candidato';
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) {
    const msg = String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ');
    if (papelAtual === 'informativo') { informativas++; console.log('  ✗ [informativo]', nome, '\n     ', msg); return; }
    falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', msg);
  }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
const normal = (s) => String(s).replace(/\s+/g, ' ').trim();

function arquivoDoCdn(url) {
  const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@([^/]+)\/(.+)$/.exec(url.split('?')[0]);
  if (!m) return null;
  return m[1] === BASE ? path.join(MODULOS, 'pdfjs-dist', m[2]) : path.join(PACOTES, m[1], 'package', m[2]);
}

const paginaHtml = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Protótipo PDF.js</title>' +
  '<script>window.__csp = []; document.addEventListener("securitypolicyviolation", function (e) { window.__csp.push(e.violatedDirective + " " + e.blockedURI + " " + (e.sample || "")); });</script>' +
  '<script>' + corpoScript('LeitorPdfFontes.html') + '</script>' +
  '<script>' + fs.readFileSync(path.join(AQUI, 'carregador_verificado.js'), 'utf8') + '</script>' +
  '</head><body><p>Protótipo isolado — PDFs sintéticos</p></body></html>';

/** Página nova (contexto próprio). alterar: { trecho: '404' | 'adulterar' } para controles negativos. */
async function abrir(nav, alterar) {
  const contexto = await nav.newContext({ locale: 'pt-BR' });
  const p = { contexto, respostas: [], falhasRede: [], workers: [], erros: [], avisos: [], pedidosCdn: [] };
  await contexto.route('https://cdn.jsdelivr.net/**', (rota) => {
    const url = rota.request().url();
    p.pedidosCdn.push(url);
    for (const [trecho, acao] of Object.entries(alterar || {})) {
      if (!url.includes(trecho)) continue;
      if (acao === '404') return rota.fulfill({ status: 404, body: 'bloqueado pelo teste' });
      if (acao === 'adulterar') {
        const corpo = Buffer.concat([fs.readFileSync(arquivoDoCdn(url)), Buffer.from('\n/* um byte a mais */\n')]);
        return rota.fulfill({ status: 200, body: corpo, headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' } });
      }
    }
    const arq = arquivoDoCdn(url);
    if (!arq || !fs.existsSync(arq)) return rota.fulfill({ status: 404, body: 'não encontrado: ' + url });
    return rota.fulfill({ status: 200, body: fs.readFileSync(arq), headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' } });
  });
  await contexto.route('https://prototipo.teste/**', (rota) => rota.fulfill({ status: 200, body: paginaHtml, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP } }));
  const pagina = await contexto.newPage();
  p.pagina = pagina;
  contexto.on('response', (r) => p.respostas.push({ url: r.url(), status: r.status() }));
  contexto.on('requestfailed', (r) => p.falhasRede.push(r.url() + ' — ' + (r.failure() && r.failure().errorText)));
  pagina.on('worker', (w) => p.workers.push(w.url()));
  pagina.on('pageerror', (e) => p.erros.push(String(e)));
  pagina.on('console', (m) => {
    if (m.type() === 'error') p.erros.push('console: ' + m.text());
    if (m.type() === 'warning' || m.type() === 'warn') p.avisos.push(m.text());
  });
  await pagina.goto('https://prototipo.teste/');
  return p;
}

/** Carrega um candidato pelo carregador verificado e liga o LeitorPdfFontes a ele (sem mudar o arquivo). */
function prepararCandidato(pagina, cand) {
  const cfg = { lib: { url: CDN(cand.versao, cand.lib.caminho), sha384: cand.lib.sha384 }, worker: { url: CDN(cand.versao, cand.worker.caminho), sha384: cand.worker.sha384 } };
  return pagina.evaluate(async (cfg) => {
    const t0 = performance.now();
    try {
      const r = await CarregadorPdfVerificado.carregar(cfg);
      // Conta as mensagens trocadas com o worker entregue ao PDF.js.
      window.__msgs = { para: 0, de: 0 };
      const enviar = r.worker.postMessage.bind(r.worker);
      r.worker.postMessage = function () { window.__msgs.para++; return enviar.apply(null, arguments); };
      r.worker.addEventListener('message', () => { window.__msgs.de++; });
      window.pdfjsLib = r.lib;
      // O leitor de produção insere <script src integrity> antes de usar window.pdfjsLib:
      // aqui ele recebe um script vazio, conferido, porque a biblioteca já foi carregada.
      const vazio = '/* PDF.js já carregado e conferido pelo CarregadorPdfVerificado */';
      const h = await crypto.subtle.digest('SHA-384', new TextEncoder().encode(vazio));
      LeitorPdfFontes.LIBS.pdfjs = { url: URL.createObjectURL(new Blob([vazio], { type: 'text/javascript' })), integridade: 'sha384-' + CarregadorPdfVerificado._base64(h), worker: cfg.worker.url };
      return { ok: true, versao: r.lib.version, ms: Math.round(performance.now() - t0) };
    } catch (e) {
      return { ok: false, mensagem: String(e && e.message || e) };
    }
  }, cfg);
}

function lerNaPagina(pagina, bytes) {
  return pagina.evaluate(async ({ arr, limite }) => {
    const tempo = new Promise((_, falha) => setTimeout(() => falha(new Error('tempo esgotado (' + limite + ' ms)')), limite));
    try {
      const r = await Promise.race([LeitorPdfFontes.ler(new Uint8Array(arr), {}), tempo]);
      return { ok: true, modo: r.modo, paginas: r.paginas.map((p) => ({ numero: p.numero, largura: p.largura, altura: p.altura, tokens: p.tokens })) };
    } catch (e) {
      return { ok: false, nome: e && e.name, mensagem: String(e && e.message || e) };
    }
  }, { arr: Array.from(bytes), limite: LIMITE_MS });
}

/** O mesmo desenho que o OCR faz (ocrDaPagina): página 1 a 300 dpi num canvas branco. */
function desenharPagina(pagina, bytes) {
  return pagina.evaluate(async (arr) => {
    try {
      const tarefa = pdfjsLib.getDocument({ data: new Uint8Array(arr), isEvalSupported: false });
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
      await tarefa.destroy(); // PDFDocumentProxy.destroy() não existe mais no 6.x; a tarefa existe em todos
      return { ok: true, largura: c.width, altura: c.height, escuros };
    } catch (e) {
      return { ok: false, mensagem: String(e && e.message || e) };
    }
  }, Array.from(bytes));
}

const ruins = (p) => p.respostas.filter((r) => r.status >= 400);

async function verificarLeitura(p, r, rotulo) {
  await teste(rotulo + ': PDF sintético aberto pela camada de texto (2 páginas, 595×842)', async () => {
    verdade(r.ok, 'leitura falhou: ' + r.nome + ': ' + r.mensagem);
    igual(r.modo, 'texto', 'modo');
    igual(r.paginas.map((pg) => [pg.numero, Math.round(pg.largura), Math.round(pg.altura)]), PAGINAS.map((_, i) => [i + 1, 595, 842]), 'páginas');
  });
  await teste(rotulo + ': texto extraído igual ao escrito (com acentos)', async () => {
    verdade(r.ok, 'sem leitura');
    PAGINAS.forEach((linhas, i) => {
      const lido = normal(r.paginas[i].tokens.map((t) => t.texto).join(' '));
      linhas.forEach((l) => verdade(lido.includes(normal(l)), 'página ' + (i + 1) + ' sem "' + l + '" — lido: ' + lido.slice(0, 160)));
    });
  });
}

(async () => {
  const valido = pdfValido();
  const corrompido = pdfCorrompido();
  const textoPuro = naoPdf();
  for (const c of candidatos) {
    for (const parte of [c.lib, c.worker]) {
      const arq = path.join(PACOTES, c.versao, 'package', parte.caminho);
      if (!fs.existsSync(arq)) throw new Error('falta ' + arq + ' — rode antes: node preparar.js');
    }
  }
  const nav = await chromium.launch({ args: ['--no-sandbox'] });
  console.log('Chromium', nav.version(), '· CSP da página:', CSP);

  // ---------------------------------------------------------------- referência
  console.log('\n== Referência: PDF.js ' + BASE + ' (produção), leitor sem mudança, mesma CSP');
  const ref = await abrir(nav);
  const rRef = await lerNaPagina(ref.pagina, valido);
  await verificarLeitura(ref, rRef, BASE);
  const desenhoRef = await desenharPagina(ref.pagina, valido);
  await teste(BASE + ': desenho da página para o OCR (canvas a 300 dpi)', async () => {
    verdade(desenhoRef.ok && desenhoRef.escuros > 0, JSON.stringify(desenhoRef));
  });
  await teste(BASE + ': sem violação de CSP, erro de JavaScript ou 4xx', async () => {
    igual(await ref.pagina.evaluate(() => window.__csp), [], 'violações de CSP');
    igual(ref.erros, [], 'erros');
    igual(ruins(ref), [], 'respostas com erro');
  });
  await ref.contexto.close();

  // ---------------------------------------------------------------- candidatos
  const resumo = [];
  for (const cand of candidatos) {
    papelAtual = cand.papel;
    const rot = cand.id;
    console.log('\n== Candidato ' + rot + (cand.papel === 'informativo' ? ' (INFORMATIVO: falha não reprova a suíte)' : ''));
    const linha = { id: rot, papel: cand.papel };
    resumo.push(linha);

    for (const parte of [cand.lib, cand.worker]) {
      const txt = fs.readFileSync(path.join(PACOTES, cand.versao, 'package', parte.caminho), 'latin1');
      console.log('     ' + parte.caminho + ': ' + txt.length + ' bytes · "new Function(" ' + (txt.split('new Function(').length - 1) + ' · "eval(" ' + (txt.split('eval(').length - 1));
    }

    const p = await abrir(nav);
    const prep = await prepararCandidato(p.pagina, cand);
    await teste(rot + ': biblioteca e worker baixados, SHA-384 conferido, módulo ES importado', async () => {
      verdade(prep.ok, prep.mensagem);
      igual(prep.versao, cand.versao, 'pdfjsLib.version');
      linha.cargaMs = prep.ms;
    });
    if (!prep.ok) { await p.contexto.close(); linha.resultado = 'não carregou: ' + prep.mensagem; continue; }

    const r = await lerNaPagina(p.pagina, valido);
    await verificarLeitura(p, r, rot);
    await teste(rot + ': mesmas palavras e posições do ' + BASE + ' (contrato de LeitorPdfFontes.ler)', async () => {
      verdade(r.ok && rRef.ok, 'sem leitura');
      r.paginas.forEach((pg, i) => {
        const a = rRef.paginas[i].tokens, b = pg.tokens;
        igual(b.map((t) => t.texto), a.map((t) => t.texto), 'palavras da página ' + (i + 1));
        b.forEach((t, j) => ['x0', 'x1', 'y0', 'y1'].forEach((k) => {
          verdade(Math.abs(t[k] - a[j][k]) < 0.01, 'página ' + (i + 1) + ' "' + t.texto + '" ' + k + ': ' + t[k] + ' ≠ ' + a[j][k]);
        }));
        igual([pg.largura, pg.altura], [rRef.paginas[i].largura, rRef.paginas[i].altura], 'tamanho');
      });
    });
    await teste(rot + ': worker de verdade (Worker de módulo, mensagens nos dois sentidos, sem fake worker)', async () => {
      const m = await p.pagina.evaluate(() => ({ msgs: window.__msgs, fake: typeof globalThis.pdfjsWorker }));
      verdade(p.workers.length >= 1 && p.workers.every((u) => u.startsWith('blob:')), 'workers: ' + JSON.stringify(p.workers));
      verdade(m.msgs.para > 0 && m.msgs.de > 0, 'mensagens com o worker: ' + JSON.stringify(m.msgs));
      igual(m.fake, 'undefined', 'pdfjsWorker na página (fake worker)');
      verdade(!p.avisos.some((a) => /fake worker/i.test(a)), 'aviso de fake worker');
      linha.mensagensWorker = m.msgs;
    });
    const desenho = await desenharPagina(p.pagina, valido);
    await teste(rot + ': desenho da página para o OCR (render com canvasContext, como ocrDaPagina; mesmos pixels escuros do ' + BASE + ')', async () => {
      verdade(desenho.ok, desenho.mensagem);
      igual([desenho.largura, desenho.altura], [desenhoRef.largura, desenhoRef.altura], 'tamanho do canvas');
      verdade(desenho.escuros > 0, 'página em branco');
      igual(desenho.escuros, desenhoRef.escuros, 'pixels escuros iguais aos do ' + BASE);
      linha.pixelsEscuros = desenho.escuros + ' (referência ' + desenhoRef.escuros + ')';
    });
    const rc = await lerNaPagina(p.pagina, corrompido);
    const rt = await lerNaPagina(p.pagina, textoPuro);
    const rv = await lerNaPagina(p.pagina, valido);
    await teste(rot + ': PDF corrompido e texto puro recusados; o leitor continua funcionando depois', async () => {
      verdade(!rc.ok && /InvalidPDFException/.test(rc.nome), 'corrompido: ' + JSON.stringify(rc).slice(0, 160));
      verdade(!rt.ok && /InvalidPDFException/.test(rt.nome), 'texto puro: ' + JSON.stringify(rt).slice(0, 160));
      verdade(rv.ok && rv.modo === 'texto', 'releitura do válido: ' + JSON.stringify(rv).slice(0, 160));
      linha.recusa = rc.nome + ': ' + rc.mensagem;
    });
    await teste(rot + ': sem violação de CSP (sem eval), erro de JavaScript, 4xx ou pedido falho', async () => {
      igual(await p.pagina.evaluate(() => window.__csp), [], 'violações de CSP');
      igual(p.erros, [], 'erros');
      igual(ruins(p), [], 'respostas com erro');
      igual(p.falhasRede, [], 'pedidos que falharam');
    });
    linha.avisos = [...new Set(p.avisos)].slice(0, 5);
    await p.contexto.close();

    // Controles negativos: nada pode ser executado sem os dois arquivos íntegros.
    for (const [qual, acao] of [[cand.lib.caminho, '404'], [cand.worker.caminho, '404'], [cand.lib.caminho, 'adulterar'], [cand.worker.caminho, 'adulterar']]) {
      const n = await abrir(nav, { [cand.versao + '/' + qual]: acao });
      const prepN = await prepararCandidato(n.pagina, cand);
      const esperado = acao === '404' ? /Não foi possível baixar .*HTTP 404/ : /Integridade: .* diferente do esperado/;
      await teste(rot + ': ' + path.basename(qual) + ' ' + (acao === '404' ? 'ausente (404)' : 'com um byte a mais') + ' → recusado, sem executar nada', async () => {
        verdade(!prepN.ok, 'carregou mesmo assim');
        verdade(esperado.test(prepN.mensagem), 'mensagem: ' + prepN.mensagem);
        igual(n.workers, [], 'Worker criado');
        igual(await n.pagina.evaluate(() => typeof window.pdfjsLib), 'undefined', 'pdfjsLib');
      });
      await n.contexto.close();
    }
    linha.resultado = 'ver testes acima';
  }
  papelAtual = 'candidato';

  await nav.close();
  console.log('\nResumo por candidato:');
  resumo.forEach((l) => console.log('  ' + JSON.stringify(l)));
  console.log('\n' + ok + ' passaram, ' + falhas + ' falharam' + (informativas ? ', ' + informativas + ' falhas informativas' : '') + (falhas ? ': ' + falhou.join(' | ') : ''));
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.error('ERRO DE INFRAESTRUTURA:', e && e.stack || e);
  process.exit(3);
});

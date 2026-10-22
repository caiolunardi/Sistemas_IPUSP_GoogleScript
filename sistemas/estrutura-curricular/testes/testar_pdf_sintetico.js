// Leitura de PDF no Chromium real, só com PDFs SINTÉTICOS (roda na CI).
// Usa o painel de verdade (Painel.html pelo doGet do simulador), o mesmo
// LeitorPdfFontes.html de produção e o PDF.js 3.11.174 que o simulador
// serve de node_modules no lugar do jsDelivr (ambiente_navegador.js).
// Confere: carregamento da biblioteca (com SRI) e da versão esperada,
// worker de verdade (não o "fake worker" da página), abertura do PDF,
// texto extraído, nenhuma resposta 4xx/5xx nem erro de JavaScript, PDF
// corrompido e arquivo que não é PDF recusados (pelo leitor e pela tela
// de importação) e, como controle negativo, que a leitura FALHA quando o
// worker ou a biblioteca não estão disponíveis.
// Os PDFs são gerados por pdf_sintetico.js; nenhum arquivo do Júpiter.
// Uso: node testar_pdf_sintetico.js
// Código de saída: 0 = aprovada; 1 = alguma asserção reprovada; 3 = erro de infraestrutura.
'use strict';
const crypto = require('crypto');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { pdfValido, pdfCorrompido, naoPdf, PAGINAS } = require('./pdf_sintetico');

const VERSAO = '3.11.174';
const URL_LIB = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VERSAO + '/build/pdf.min.js';
const URL_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VERSAO + '/build/pdf.worker.min.js';
const ADMIN = 'dono@unidade.example';
const LIMITE_MS = 60000;

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

/**
 * Painel novo num contexto próprio (cache de scripts limpo), com registro
 * de respostas HTTP, pedidos que falharam e workers criados pela página.
 * bloquear: lista de trechos de URL a responder com 404 (controle negativo).
 */
async function abrir(nav, bloquear) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  const p = await abrirPainel(nav, { amb, latencia: 0 });
  p.respostas = [];
  p.falhasRede = [];
  p.workers = [];
  p.contexto.on('response', (r) => p.respostas.push({ url: r.url(), status: r.status() }));
  p.contexto.on('requestfailed', (r) => p.falhasRede.push(r.url() + ' — ' + (r.failure() && r.failure().errorText)));
  p.pagina.on('worker', (w) => p.workers.push(w.url()));
  p.avisos = [];
  p.pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'warn') p.avisos.push(m.text()); });
  // Rotas registradas depois têm prioridade sobre as do simulador.
  for (const trecho of bloquear || []) {
    await p.contexto.route((u) => u.href.includes(trecho), (rota) => rota.fulfill({ status: 404, body: 'bloqueado pelo teste: ' + trecho }));
  }
  await esperarCarregado(p.pagina);
  return p;
}

/** LeitorPdfFontes.ler na página, com limite de tempo. Nunca lança: devolve { ok, ... } ou { erro }. */
function lerNaPagina(pagina, bytes) {
  return pagina.evaluate(async ({ arr, limite }) => {
    const tempo = new Promise((_, falha) => setTimeout(() => falha(new Error('tempo esgotado (' + limite + ' ms)')), limite));
    try {
      const r = await Promise.race([LeitorPdfFontes.ler(new Uint8Array(arr), {}), tempo]);
      return {
        ok: true,
        modo: r.modo,
        paginas: r.paginas.map((p) => ({ numero: p.numero, largura: p.largura, altura: p.altura, textos: p.tokens.map((t) => t.texto) }))
      };
    } catch (e) {
      return { ok: false, nome: e && e.name, mensagem: String(e && e.message || e) };
    }
  }, { arr: Array.from(bytes), limite: LIMITE_MS });
}

const normal = (s) => String(s).replace(/\s+/g, ' ').trim();
const ruins = (p) => p.respostas.filter((r) => r.status >= 400);

(async () => {
  const valido = pdfValido();
  const corrompido = pdfCorrompido();
  const textoPuro = naoPdf();

  console.log('\n== PDFs sintéticos (pdf_sintetico.js)');
  await teste('geração determinística: mesmos bytes a cada chamada', async () => {
    igual(sha256(pdfValido()), sha256(valido), 'PDF válido');
    igual(sha256(pdfCorrompido()), sha256(corrompido), 'PDF corrompido');
    verdade(valido.subarray(0, 8).toString('latin1') === '%PDF-1.4', 'cabeçalho %PDF-1.4');
    verdade(/%%EOF\n$/.test(valido.toString('latin1')), 'termina com %%EOF');
    verdade(corrompido.subarray(0, 5).toString('latin1') === '%PDF-', 'o corrompido começa como PDF (passa pelo filtro da tela)');
    console.log('     válido:', valido.length, 'bytes, sha256', sha256(valido));
    console.log('     corrompido:', corrompido.length, 'bytes, sha256', sha256(corrompido));
  });

  const nav = await abrirNavegador();
  console.log('     Chromium', nav.version());

  console.log('\n== Leitura do PDF válido no painel (PDF.js ' + VERSAO + ' + worker)');
  const p = await abrir(nav);
  await teste('a biblioteca só existe depois da escolha de um PDF (carregamento sob demanda)', async () => {
    igual(await p.pagina.evaluate(() => typeof window.pdfjsLib), 'undefined');
  });
  const r = await lerNaPagina(p.pagina, valido);
  await teste('PDF sintético aberto pela camada de texto', async () => {
    verdade(r.ok, 'leitura falhou: ' + r.nome + ': ' + r.mensagem);
    igual(r.modo, 'texto', 'modo');
    igual(r.paginas.length, PAGINAS.length, 'páginas');
    r.paginas.forEach((pg, i) => {
      igual(pg.numero, i + 1, 'número da página');
      igual([Math.round(pg.largura), Math.round(pg.altura)], [595, 842], 'tamanho da página ' + (i + 1));
    });
  });
  await teste('texto extraído igual ao escrito no PDF (página a página, com acentos)', async () => {
    verdade(r.ok, 'sem leitura');
    PAGINAS.forEach((linhas, i) => {
      const lido = normal(r.paginas[i].textos.join(' '));
      linhas.forEach((l) => verdade(lido.includes(normal(l)), 'página ' + (i + 1) + ' sem "' + l + '" — lido: ' + lido.slice(0, 200)));
    });
    verdade(r.paginas[0].textos.join(' ').includes('Ciência'), 'acento (WinAnsi) preservado');
    verdade(r.paginas[1].textos.join(' ').includes('PDFJS-SINTETICO-OK'), 'marcador final');
  });
  await teste('PDF.js carregado na versão ' + VERSAO + ' pela URL e SRI de produção', async () => {
    const info = await p.pagina.evaluate((url) => {
      const s = document.querySelector('script[src="' + url + '"]');
      return {
        versao: window.pdfjsLib && window.pdfjsLib.version,
        workerSrc: window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions.workerSrc,
        integridade: s && s.integrity,
        integridadeLeitor: LeitorPdfFontes.LIBS.pdfjs.integridade,
        urlLeitor: LeitorPdfFontes.LIBS.pdfjs.url
      };
    }, URL_LIB);
    igual(info.urlLeitor, URL_LIB, 'URL da biblioteca no leitor');
    igual(info.versao, VERSAO, 'pdfjsLib.version');
    igual(info.workerSrc, URL_WORKER, 'workerSrc');
    verdade(info.integridade && info.integridade === info.integridadeLeitor, 'script com o integrity do leitor (o navegador recusaria bytes diferentes)');
    console.log('     pdfjsLib.version =', info.versao, '· integrity', info.integridade);
  });
  await teste('worker do PDF.js de verdade (thread própria, sem "fake worker" na página)', async () => {
    verdade(p.pedidosCdn.includes(URL_LIB), 'pedido da biblioteca: ' + JSON.stringify(p.pedidosCdn));
    verdade(p.pedidosCdn.includes(URL_WORKER), 'pedido do worker: ' + JSON.stringify(p.pedidosCdn));
    verdade(p.workers.length >= 1, 'nenhum Worker criado pela página');
    igual(await p.pagina.evaluate(() => typeof window.pdfjsWorker), 'undefined', 'pdfjsWorker no contexto da página (= fake worker)');
    verdade(!p.avisos.some((a) => /fake worker/i.test(a)), 'aviso de fake worker: ' + p.avisos.join(' | '));
    const doWorker = p.respostas.filter((x) => x.url === URL_WORKER);
    verdade(doWorker.length >= 1 && doWorker.every((x) => x.status === 200), 'worker servido com 200: ' + JSON.stringify(doWorker));
    console.log('     workers:', p.workers.length, '· pedidos ao CDN:', p.pedidosCdn.length);
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
  await teste('depois das recusas, o leitor continua abrindo o PDF válido', async () => {
    verdade(rv.ok && rv.modo === 'texto' && rv.paginas.length === PAGINAS.length, JSON.stringify(rv).slice(0, 200));
  });
  await teste('as recusas não deixaram erro não tratado, 404 nem pedido falho', async () => {
    igual(p.errosPagina, [], 'erros na página');
    igual(ruins(p), [], 'respostas com erro');
    igual(p.falhasRede, [], 'pedidos que falharam');
  });
  await p.contexto.close();

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

  console.log('\n== Controle negativo: sem o recurso, a leitura tem de falhar');
  const semWorker = await abrir(nav, ['/build/pdf.worker.min.js']);
  const rw = await lerNaPagina(semWorker.pagina, valido);
  await teste('worker indisponível (404): a leitura falha e o 404 aparece', async () => {
    verdade(!rw.ok, 'leu o PDF sem o worker: ' + JSON.stringify(rw).slice(0, 200));
    verdade(ruins(semWorker).some((x) => x.url === URL_WORKER && x.status === 404), '404 do worker não registrado: ' + JSON.stringify(ruins(semWorker)));
    console.log('     ', rw.nome + ':', rw.mensagem);
  });
  await semWorker.contexto.close();
  const semLib = await abrir(nav, ['/build/pdf.min.js']);
  const rl = await lerNaPagina(semLib.pagina, valido);
  await teste('biblioteca indisponível (404): a leitura falha com a mensagem do leitor', async () => {
    verdade(!rl.ok, 'leu o PDF sem a biblioteca');
    verdade(/Não foi possível baixar um componente de leitura de PDF/.test(rl.mensagem), 'mensagem: ' + rl.mensagem);
    verdade(ruins(semLib).some((x) => x.url === URL_LIB && x.status === 404), '404 da biblioteca não registrado');
    igual(await semLib.pagina.evaluate(() => typeof window.pdfjsLib), 'undefined', 'pdfjsLib');
  });
  await semLib.contexto.close();

  await nav.close();
  console.log('\n' + ok + ' passaram, ' + falhas + ' falharam' + (falhas ? ': ' + falhou.join(' | ') : ''));
  process.exit(falhas ? 1 : 0);
})().catch((e) => {
  console.error('ERRO DE INFRAESTRUTURA:', e && e.stack || e);
  process.exit(3);
});

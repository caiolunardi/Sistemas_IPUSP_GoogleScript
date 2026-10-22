// Etapa 4 — comparação, com PDFs REAIS do Júpiter, entre o leitor anterior
// (PDF.js 3.11.174) e o atual (PDF.js da versão do package-lock, 6.4.299).
// Roda só no computador de quem tem os arquivos; nada vai ao Git (*.pdf e
// saida/ estão no .gitignore) e nada é enviado a outro lugar.
// Para cada PDF, no painel de verdade (simulador), lê com as duas versões:
// LeitorPdfFontes.ler (modo, páginas, palavras e posições) e, em seguida,
// LeitorPdfJupiter.analisar (o pacote que a importação usa: currículos,
// disciplinas, créditos, vínculos, requisitos, grupos, avisos).
// No terminal aparecem só contagens e caminhos das diferenças, sem conteúdo;
// o detalhe vai para saida/comparacao_pdfjs/<arquivo>.json, local.
// Antes: npm ci; cd prototipo-pdfjs && node preparar.js (baixa o 3.11.174 conferido).
// Para PDFs sem texto (OCR), também modelos/por.traineddata.
// Uso: node comparar_pdfjs_versoes.js <arquivo.pdf> [outro.pdf ...]
// Código de saída: 0 = nenhuma diferença; 1 = alguma diferença; 3 = erro de infraestrutura.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');

const ADMIN = 'dono@unidade.example';
const PROTOTIPO = path.join(__dirname, 'prototipo-pdfjs');
const PACOTE_ANTIGO = path.join(PROTOTIPO, 'pacotes', '3.11.174', 'package');
const LEITOR_ANTIGO = path.join(PROTOTIPO, 'referencia', 'LeitorPdfFontes-3.11.174.html');
const SAIDA = path.join(__dirname, 'saida', 'comparacao_pdfjs');
const LIMITE_MS = 15 * 60 * 1000;

/** Cópia temporária de src/ com o LeitorPdfFontes.html de antes da Etapa 4. */
function srcAntigo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'src-pdfjs-3.11.174-'));
  for (const f of fs.readdirSync(DIR_SRC)) fs.copyFileSync(path.join(DIR_SRC, f), path.join(dir, f));
  fs.copyFileSync(LEITOR_ANTIGO, path.join(dir, 'LeitorPdfFontes.html'));
  return dir;
}

async function lerCom(nav, dirSrc, bytes, nome) {
  const amb = criarAmbiente({ dirSrc, usuario: ADMIN, dono: ADMIN });
  const p = await abrirPainel(nav, { amb, latencia: 0 });
  // O 3.11.174 vem do pacote conferido pelo protótipo (o node_modules tem a versão nova).
  await p.contexto.route((u) => u.href.startsWith('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/'), (rota) => {
    const arq = path.join(PACOTE_ANTIGO, rota.request().url().split('pdfjs-dist@3.11.174/')[1].split('?')[0]);
    if (!fs.existsSync(arq)) return rota.fulfill({ status: 404, body: '' });
    return rota.fulfill({ status: 200, body: fs.readFileSync(arq), headers: { 'content-type': 'application/javascript', 'access-control-allow-origin': '*' } });
  });
  await esperarCarregado(p.pagina);
  const r = await p.pagina.evaluate(async ({ arr, nome, limite }) => {
    const tempo = new Promise((_, falha) => setTimeout(() => falha(new Error('tempo esgotado')), limite));
    try {
      const lido = await Promise.race([LeitorPdfFontes.ler(new Uint8Array(arr), {}), tempo]);
      const pacote = LeitorPdfJupiter.analisar(lido.paginas, { modo: lido.modo, arquivo: nome, tamanhoBytes: arr.length });
      const versao = window.pdfjsLib ? window.pdfjsLib.version : null;
      return { ok: true, versao, modo: lido.modo, paginas: lido.paginas, pacote };
    } catch (e) {
      return { ok: false, mensagem: String(e && e.message || e) };
    }
  }, { arr: Array.from(bytes), nome, limite: LIMITE_MS });
  r.errosPagina = p.errosPagina.slice();
  await p.contexto.close();
  return r;
}

/** Caminhos (sem valores) em que dois objetos diferem; números com tolerância. */
function diferencas(a, b, caminho, tolerancia, saida) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > tolerancia) saida.push(caminho);
    return saida;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (a !== b) saida.push(caminho);
    return saida;
  }
  if (Array.isArray(a) !== Array.isArray(b)) { saida.push(caminho); return saida; }
  const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of chaves) diferencas(a[k], b[k], caminho + (Array.isArray(a) ? '[' + k + ']' : '.' + k), tolerancia, saida);
  return saida;
}

(async () => {
  const arquivos = process.argv.slice(2);
  if (!arquivos.length) { console.error('Uso: node comparar_pdfjs_versoes.js <arquivo.pdf> [...]'); process.exit(3); }
  for (const f of [path.join(PACOTE_ANTIGO, 'build', 'pdf.min.js'), LEITOR_ANTIGO]) {
    if (!fs.existsSync(f)) { console.error('Falta ' + f + ' — rode antes: cd prototipo-pdfjs && node preparar.js'); process.exit(3); }
  }
  fs.mkdirSync(SAIDA, { recursive: true });
  const antigo = srcAntigo();
  const nav = await abrirNavegador();
  let comDiferenca = 0;
  for (const arq of arquivos) {
    const bytes = fs.readFileSync(arq);
    const nome = path.basename(arq);
    console.log('\n== ' + nome + ' (' + bytes.length + ' bytes)');
    const a = await lerCom(nav, antigo, bytes, nome);
    const b = await lerCom(nav, DIR_SRC, bytes, nome);
    if (!a.ok || !b.ok) {
      comDiferenca++;
      console.log('   leitura falhou —', a.ok ? '' : '3.11.174: ' + a.mensagem, b.ok ? '' : 'atual: ' + b.mensagem);
      continue;
    }
    // Campos de tempo variam a cada leitura e não entram na comparação.
    for (const r of [a, b]) if (r.pacote && r.pacote.origem) delete r.pacote.origem.segundosLeitura;
    const difPaginas = diferencas(a.paginas, b.paginas, 'paginas', 0.01, []);
    const difPacote = diferencas(a.pacote, b.pacote, 'pacote', 0, []);
    const resumo = {
      arquivo: nome,
      versoes: [a.versao, b.versao],
      modo: [a.modo, b.modo],
      paginas: [a.paginas.length, b.paginas.length],
      palavras: [a.paginas.reduce((s, p) => s + p.tokens.length, 0), b.paginas.reduce((s, p) => s + p.tokens.length, 0)],
      diferencasNasPalavras: difPaginas.length,
      diferencasNoPacote: difPacote.length,
      errosPagina: [a.errosPagina.length, b.errosPagina.length]
    };
    console.log('   versões', resumo.versoes.join(' × '), '· modo', resumo.modo.join(' × '), '· páginas', resumo.paginas.join(' × '), '· palavras', resumo.palavras.join(' × '));
    console.log('   diferenças: palavras/posições', difPaginas.length, '· pacote do Júpiter', difPacote.length, '· erros na página', resumo.errosPagina.join(' × '));
    difPacote.slice(0, 30).forEach((c) => console.log('     ', c));
    if (difPacote.length > 30) console.log('      … e mais', difPacote.length - 30);
    fs.writeFileSync(path.join(SAIDA, nome + '.json'), JSON.stringify({ resumo, difPaginas, difPacote, anterior: a, atual: b }, null, 1));
    if (difPaginas.length || difPacote.length || a.modo !== b.modo || a.errosPagina.length || b.errosPagina.length) comDiferenca++;
  }
  await nav.close();
  fs.rmSync(antigo, { recursive: true, force: true });
  console.log('\n' + arquivos.length + ' arquivo(s), ' + comDiferenca + ' com diferença. Detalhes (locais, não versionar): ' + path.relative(process.cwd(), SAIDA));
  process.exit(comDiferenca ? 1 : 0);
})().catch((e) => {
  console.error('ERRO DE INFRAESTRUTURA:', e && e.stack || e);
  process.exit(3);
});

// Mutações temporárias para provar que testar_pdf_misto_sintetico.js reprova
// quando deve (local, fora da CI: cada rodada leva cerca de 1 minuto).
// Cada mutação troca um trecho numa CÓPIA de src/ (ou do próprio teste) num
// diretório temporário, roda a suíte com DIR_SRC apontando para a cópia e
// exige código de saída 1. Nada em src/ é alterado; a cópia é apagada no fim.
// Uso: node mutacoes_pdf_misto.js
// Código de saída: 0 = todas as mutações reprovaram a suíte; 1 = alguma passou ou não se aplicou.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'src');
const TESTE = path.join(__dirname, 'testar_pdf_misto_sintetico.js');

// [nome, arquivo ('src/…' ou 'teste'), trecho original, trecho mutado]
const MUTACOES = [
  ['o leitor escolhe a camada de texto (limiar 0,5 → 0,3)', 'src/LeitorPdfFontes.html',
    'var MIN_FRACAO_PAGINAS_COM_TEXTO = 0.5;', 'var MIN_FRACAO_PAGINAS_COM_TEXTO = 0.3;'],
  ['o OCR deixa de ler a última página', 'src/LeitorPdfFontes.html',
    'var total = maxPaginas ? Math.min(maxPaginas, pdf.numPages) : pdf.numPages;', 'var total = (maxPaginas ? Math.min(maxPaginas, pdf.numPages) : pdf.numPages) - 1;'],
  ['código de disciplina alterado (último dígito)', 'src/LeitorPdf.html',
    '    var codigo = inicio + fim;\n', '    var codigo = inicio + fim.slice(0, 3) + (fim.slice(3) === \'1\' ? \'7\' : fim.slice(3));\n'],
  ['crédito-trabalho interpretado errado (+1)', 'src/LeitorPdf.html',
    "        if (vals.length === 1) d[mapa[c]] = parseInt(vals[0], 10);", "        if (vals.length === 1) d[mapa[c]] = parseInt(vals[0], 10) + (c === 'trab' ? 1 : 0);"],
  ['"Requisito fraco" deixa de ser reconhecido (requisito some)', 'src/LeitorPdf.html',
    'requisito: /^(Requisito(?:\\s+fraco)?|', 'requisito: /^(Requisito|'],
  ['"ou" deixa de juntar requisitos (grupo muda)', 'src/LeitorPdf.html',
    'if (RE.ou.test(texto)) { est.pendenteOu = true; return; }', 'if (RE.ou.test(texto)) { return; }'],
  ['o comparador entre versões deixa de acusar diferenças', 'teste',
    'function compararVersoes(r1, r2) {\n  const d = [];', 'function compararVersoes(r1, r2) {\n  return [];\n  const d = [];'],
  ['o comparador com o esperado deixa de acusar diferenças', 'teste',
    'function compararComEsperado(r) {\n  const d = [];', 'function compararComEsperado(r) {\n  return [];\n  const d = [];']
];

let ruins = 0;
for (const [nome, alvo, de, para] of MUTACOES) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutacao-misto-'));
  const dirSrc = path.join(dir, 'src');
  fs.mkdirSync(dirSrc);
  for (const f of fs.readdirSync(SRC)) fs.copyFileSync(path.join(SRC, f), path.join(dirSrc, f));
  let teste = TESTE;
  const arquivo = alvo === 'teste' ? path.join(__dirname, '_mutacao_' + path.basename(dir) + '.js') : path.join(dirSrc, alvo.replace('src/', ''));
  const original = fs.readFileSync(alvo === 'teste' ? TESTE : arquivo, 'utf8');
  const vezes = original.split(de).length - 1;
  if (vezes !== 1) {
    console.log('✗ ' + nome + ': trecho encontrado ' + vezes + ' vez(es) — mutação não aplicada');
    ruins++;
    fs.rmSync(dir, { recursive: true, force: true });
    continue;
  }
  fs.writeFileSync(arquivo, original.replace(de, para));
  if (alvo === 'teste') teste = arquivo;
  const r = spawnSync(process.execPath, [teste], { cwd: __dirname, env: Object.assign({}, process.env, { DIR_SRC: dirSrc }), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const reprovados = (r.stdout.match(/^ {2}✗ .*$/mg) || []).map((l) => l.replace(/^ {2}✗ /, '').trim());
  const resumo = (r.stdout.trim().split('\n').pop() || '').slice(0, 120);
  if (r.status === 1 && reprovados.length) {
    console.log('✓ ' + nome + ': suíte reprovou (código 1, ' + reprovados.length + ' teste(s)) — ' + reprovados.slice(0, 3).map((t) => t.slice(0, 90)).join(' | '));
  } else {
    console.log('✗ ' + nome + ': código ' + r.status + ' — ' + resumo + (r.stderr ? ' · ' + r.stderr.slice(0, 200) : ''));
    ruins++;
  }
  if (alvo === 'teste') fs.rmSync(arquivo, { force: true });
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('\n' + (MUTACOES.length - ruins) + ' de ' + MUTACOES.length + ' mutações reprovaram a suíte.');
process.exit(ruins ? 1 : 0);

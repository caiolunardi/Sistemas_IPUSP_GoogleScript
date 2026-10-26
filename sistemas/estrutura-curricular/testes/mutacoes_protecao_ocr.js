// Mutações temporárias para provar que testar_protecao_ocr.js reprova quando
// a proteção B2 é retirada ou enfraquecida. Cada mutação troca um trecho numa
// CÓPIA de src/ num diretório temporário, roda a suíte com DIR_SRC apontando
// para a cópia e exige código de saída 1 com pelo menos um teste reprovado.
// Nada em src/ é alterado (nem Importacao.gs: a mutação do servidor é só na
// cópia); a cópia é apagada no fim.
// Uso: node mutacoes_protecao_ocr.js
// Código de saída: 0 = todas as mutações reprovaram a suíte; 1 = alguma passou ou não se aplicou.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'src');
const TESTE = path.join(__dirname, 'testar_protecao_ocr.js');

// [nome, arquivo em src/, trecho original, trecho mutado]
const MUTACOES = [
  ['detector de disciplina ilegível desligado (D1)', 'LeitorPdf.html',
    '        if (pareceDisciplina(linha)) { suspeitarDisciplina(numPag, texto); return; }\n', ''],
  ['disciplina ilegível não invalida est.ultima', 'LeitorPdf.html',
    "      suspeitar('disciplina', numPag, texto);\n      est.ultima = null;\n", "      suspeitar('disciplina', numPag, texto);\n"],
  ['critério de dígitos afrouxado (qualquer código de 6 a 9 caracteres)', 'LeitorPdf.html',
    'return !!m && digitos(m[1]) >= 3;', 'return !!m;'],
  ['requisito com código ilegível não acusado (D2)', 'LeitorPdf.html',
    "        if (modo === 'ocr' && !semCodigoPossivel) suspeitar('requisito', numPag, texto);\n        else naoReconhecidas", "        naoReconhecidas"],
  ['rótulo de requisito mal lido não acusado (D2)', 'LeitorPdf.html',
    'return ROTULOS_REQUISITO.some(', 'return false && ROTULOS_REQUISITO.some('],
  ['requisito sem disciplina não acusado (D3)', 'LeitorPdf.html',
    "if (modo === 'ocr') { suspeitar('requisitoSemDisciplina', numPag, texto); est.pendenteOu = false; }", "if (false) { suspeitar('requisitoSemDisciplina', numPag, texto); }"],
  ['disciplina ilegível rebaixada de erro para aviso', 'LeitorPdf.html',
    "C.avisar(pacote, 'erro', 'PDF_OCR_DISCIPLINA_ILEGIVEL',", "C.avisar(pacote, 'aviso', 'PDF_OCR_DISCIPLINA_ILEGIVEL',"],
  ['erros deixam de vir antes dos avisos', 'LeitorPdf.html',
    "      pacote.avisos = pacote.avisos.filter(function (a) { return a.nivel === 'erro'; })\n        .concat(pacote.avisos.filter(function (a) { return a.nivel !== 'erro'; }));\n", ''],
  ['contas que não fecham sem aviso (D5)', 'LeitorPdf.html',
    "      if (contasDivergentes.length) {\n        C.avisar(", "      if (false) {\n        C.avisar("],
  ['modo texto passa a acusar suspeitas (comportamento do texto muda)', 'LeitorPdf.html',
    "      if (modo === 'ocr') {\n        // Rótulo de requisito mal lido", "      if (true) {\n        // Rótulo de requisito mal lido"],
  ['painel deixa "Ver o que vai mudar" ativo com erro', 'PainelImportacao.html',
    "(erros ? ' disabled' : '')", "''"],
  ['painel sem a lista de linhas não reconhecidas (D6)', 'PainelImportacao.html',
    '      html += listaNaoReconhecidas(cf);\n', ''],
  ['painel sem escapar o texto do PDF', 'PainelImportacao.html',
    "': <span class=\"mono\">«' + esc(l.texto) + '»</span></li>'", "': <span class=\"mono\">«' + l.texto + '»</span></li>'"],
  ['servidor deixa de bloquear avisos de nível erro (só na cópia)', 'Importacao.gs',
    "    if (a.nivel === 'erro') p.errosDoArquivo.push(msg);\n    else ", '    ']
];

let ruins = 0;
for (const [nome, alvo, de, para] of MUTACOES) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutacao-b2-'));
  const dirSrc = path.join(dir, 'src');
  fs.mkdirSync(dirSrc);
  for (const f of fs.readdirSync(SRC)) fs.copyFileSync(path.join(SRC, f), path.join(dirSrc, f));
  const arquivo = path.join(dirSrc, alvo);
  const original = fs.readFileSync(arquivo, 'utf8');
  const vezes = original.split(de).length - 1;
  if (vezes !== 1) {
    console.log('✗ ' + nome + ': trecho encontrado ' + vezes + ' vez(es) — mutação não aplicada');
    ruins++;
    fs.rmSync(dir, { recursive: true, force: true });
    continue;
  }
  fs.writeFileSync(arquivo, original.replace(de, para));
  const r = spawnSync(process.execPath, [TESTE], { cwd: __dirname, env: Object.assign({}, process.env, { DIR_SRC: dirSrc }), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const reprovados = (r.stdout.match(/^ {2}✗ .*$/mg) || []).map((l) => l.replace(/^ {2}✗ /, '').trim());
  if (r.status === 1 && reprovados.length) {
    console.log('✓ ' + nome + ': suíte reprovou (' + reprovados.length + ' teste(s)) — ' + reprovados.slice(0, 2).map((t) => t.slice(0, 90)).join(' | '));
  } else {
    console.log('✗ ' + nome + ': suíte NÃO reprovou (código ' + r.status + ') — ' + (r.stdout.trim().split('\n').pop() || '') + (r.stderr ? ' · ' + r.stderr.slice(0, 300) : ''));
    ruins++;
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('\n' + (MUTACOES.length - ruins) + ' de ' + MUTACOES.length + ' mutações reprovaram a suíte');
process.exit(ruins ? 1 : 0);

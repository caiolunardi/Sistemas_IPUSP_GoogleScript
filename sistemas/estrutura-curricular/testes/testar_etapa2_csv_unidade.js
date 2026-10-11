// Etapa 2 — validação do CSV da "Lista de disciplinas por unidade" (1.8.2).
// Falhas confirmadas na 1.8.1:
//   A) créditos negativos aceitos (ex.: -2 → CH -30);
//   B) número inválido ("abc") vira "vazio" sem aviso;
//   C) aspas abertas e não encerradas: os campos seguintes entram no nome e
//      a linha passa como válida.
// Exercita as funções reais (previaDisciplinasUnidade e
// incluirDisciplinasUnidade, Preparacao.gs) no simulador, confere o que
// ficou GRAVADO na aba e relê depois de reabrir o contexto.
// Dados 100% sintéticos; e-mails .example.
// Uso:
//   node testar_etapa2_csv_unidade.js [--evidencias arquivo]
//   DIR_SRC=/caminho/fonte/src node testar_etapa2_csv_unidade.js   (fonte a testar; padrão ../src)
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa2_csv_unidade.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);

let ok = 0, falhas = 0;
const falhou = [];
function teste(nome, fn) {
  ev('\n--- ' + nome);
  try { fn(); ok++; console.log('  ✓', nome); ev('RESULTADO: ok'); }
  catch (e) {
    falhas++; falhou.push(nome);
    console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e);
    ev('RESULTADO: FALHOU — ' + (e && e.message));
  }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const ABA = 'Disciplinas para outros cursos';
const TITULOS = ['Disciplina', 'Nome', 'Ativação', 'Desativação', 'Tipo', 'Créditos aula', 'Créditos trabalho'];
const CAB = TITULOS.join(';');
const csv = (...linhas) => [CAB].concat(linhas).join('\n');
/** Linha ";" com créditos aula/trabalho dados (texto cru). */
const lin = (codigo, aula, trab, nome) => [codigo, nome || 'Sintética ' + codigo, '01/01/2026', '', 'Semestral', aula, trab].join(';');

// ---------------------------------------------------------------- apoio
function novoAmbiente() {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(amb.ctx.obterDadosPainel());
  return amb;
}
function reabrir(amb) {
  const novo = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(novo.ctx.obterDadosPainel());
  return novo;
}
/** Linhas GRAVADAS na aba (pelo título), sem passar pelo sistema. */
function linhasGravadas(amb) {
  const s = amb.estrutura().getSheetByName(ABA);
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => {
    const o = {}; v[0].forEach((t, i) => { o[t] = l[i] instanceof Date ? l[i].toISOString() : l[i]; }); return o;
  });
}
const porCodigo = (linhas, c) => linhas.filter((l) => l['Código'] === c);
const resumo = (l) => [l['Identificador'], l['Código'], l['Nome'], l['Créditos-aula'], l['Créditos-trabalho'], l['CH total (h)']];
function previa(amb, texto) { return pedir(amb.ctx.previaDisciplinasUnidade(texto, 'unidade_sintetica.csv')); }
const motivos = (p) => p.invalidas.map((i) => (i.ate ? 'Linhas ' + i.linha + ' a ' + i.ate : 'Linha ' + i.linha) + ': ' + i.motivo);
function registrarPrevia(p) {
  ev('Prévia: total ' + p.total + ' · novas ' + JSON.stringify(p.novas.map((n) => [n.codigo, n.nome, n.creditosAula, n.creditosTrabalho, n.ch])) +
    ' · conhecidas ' + p.conhecidas + ' · repetidas ' + p.repetidas);
  ev('Linhas ignoradas: ' + JSON.stringify(motivos(p)));
}
/** Prévia + inclusão de todos os códigos indicados (padrão: as novas). */
function incluir(amb, texto, codigos) {
  const p = previa(amb, texto);
  return { p, r: amb.ctx.incluirDisciplinasUnidade(texto, 'unidade_sintetica.csv', p.assinatura, codigos || p.novas.map((n) => n.codigo)) };
}
/** A linha "linha" é recusada com um motivo que casa com "re" e o código não está entre as novas. */
function recusada(p, linha, re, codigo) {
  const m = p.invalidas.find((i) => i.linha === linha);
  verdade(m, 'linha ' + linha + ' deveria estar entre as ignoradas; ignoradas = ' + JSON.stringify(motivos(p)) + '; novas = ' + JSON.stringify(p.novas.map((n) => [n.codigo, n.nome, n.creditosAula, n.creditosTrabalho, n.ch])));
  verdade(re.test(m.motivo), 'motivo da linha ' + linha + ': "' + m.motivo + '" não casa com ' + re);
  if (codigo) verdade(!p.novas.some((n) => n.codigo === codigo), codigo + ' não pode aparecer como nova');
}
/** (1.8.3) A linha física "linha" está coberta por algum motivo (linha própria ou faixa "linha … ate"). */
const cobre = (p, linha) => p.invalidas.some((i) => i.linha === linha || (i.ate && i.linha <= linha && linha <= i.ate));
/** Nada gravado (nem antes nem depois de reabrir) além de "esperado". */
function gravadas(amb, esperado, msg) {
  igual(linhasGravadas(amb).map(resumo), esperado, msg || 'aba');
  igual(linhasGravadas(reabrir(amb)).map(resumo), esperado, (msg || 'aba') + ' após reabrir');
}

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 2 — validação do CSV da lista de disciplinas por unidade ===');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* sem versão */ }

// =====================================================================
console.log('\n== R. Retrato das três falhas confirmadas (só registra; asserções em 1–13)');
(function retrato() {
  ev('\n--- R. Retrato das três falhas');
  [['A) crédito negativo', csv(lin('PST0391', '-2', '0'))],
    ['B) texto em campo numérico', csv(lin('PST0392', '2', 'abc'))],
    ['C) aspas não encerradas no nome', csv('PST0393;"Nome sem fim;01/01/2026;;Semestral;2;0')]].forEach(([titulo, texto]) => {
    const amb = novoAmbiente();
    ev(titulo + ' — CSV: ' + JSON.stringify(texto.split('\n')[1]));
    const p = previa(amb, texto);
    registrarPrevia(p);
    const r = amb.ctx.incluirDisciplinasUnidade(texto, 'u.csv', p.assinatura, p.novas.map((n) => n.codigo).concat(['PST0391', 'PST0392', 'PST0393']));
    ev('Inclusão (todas as novas + o código da linha): ' + (r.ok ? 'ok, ' + r.dados.incluidas + ' incluída(s)' : r.codigo));
    ev('Gravado após reabrir (Identificador | Código | Nome | Créd.-aula | Créd.-trabalho | CH): ' + JSON.stringify(linhasGravadas(reabrir(amb)).map(resumo)));
  });
  console.log('  (retrato gravado nas evidências)');
})();

// =====================================================================
console.log('\n== 1. Créditos negativos');
teste('1a. créditos-aula negativo (-2; 0): linha recusada com motivo, nada gravado (nem com chamada direta)', () => {
  const amb = novoAmbiente();
  const t = csv(lin('PST0391', '-2', '0'));
  const { p, r } = incluir(amb, t, ['PST0391']);
  registrarPrevia(p);
  recusada(p, 2, /^PST0391 — Créditos-aula: valor negativo \(-2\)$/, 'PST0391');
  igual(r.ok, false, 'inclusão recusada');
  gravadas(amb, []);
});
teste('1b. créditos-trabalho negativo (2; -1): linha recusada com motivo, nada gravado', () => {
  const amb = novoAmbiente();
  const { p, r } = incluir(amb, csv(lin('PST0391', '2', '-1')), ['PST0391']);
  recusada(p, 2, /^PST0391 — Créditos-trabalho: valor negativo \(-1\)$/, 'PST0391');
  igual(r.ok, false);
  gravadas(amb, []);
});
teste('1c. os dois negativos: um motivo para cada campo', () => {
  const amb = novoAmbiente();
  const p = previa(amb, csv(lin('PST0391', '-2', '-3')));
  recusada(p, 2, /^PST0391 — Créditos-aula: valor negativo \(-2\); Créditos-trabalho: valor negativo \(-3\)$/, 'PST0391');
});

// =====================================================================
console.log('\n== 2. Texto, conversão parcial, fração, NaN e Infinity');
teste('2. "abc", "2abc", "2 créditos", "1/2", "1,5", "1.5", "NaN", "Infinity", "+2", "1e1": todas recusadas com o valor no motivo', () => {
  const amb = novoAmbiente();
  const casos = [['abc', 'valor inválido'], ['2abc', 'valor inválido'], ['2 créditos', 'valor inválido'], ['1/2', 'valor inválido'], ['1,5', 'valor fracionário'], ['1.5', 'valor fracionário'],
    ['NaN', 'valor inválido'], ['Infinity', 'valor inválido'], ['+2', 'valor inválido'], ['1e1', 'valor inválido']];
  const linhas = casos.map(([v], i) => lin('PST05' + String(10 + i), '2', v));
  linhas.push(lin('PST0599', 'abc', '0'));
  const t = csv(...linhas);
  const { p, r } = incluir(amb, t, casos.map((_, i) => 'PST05' + String(10 + i)).concat(['PST0599']));
  registrarPrevia(p);
  casos.forEach(([v, tipo], i) => {
    const esc = v.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    recusada(p, i + 2, new RegExp('^PST05' + String(10 + i) + ' — Créditos-trabalho: ' + tipo + ' \\(' + esc + '\\)$'), 'PST05' + String(10 + i));
  });
  recusada(p, casos.length + 2, /^PST0599 — Créditos-aula: valor inválido \(abc\)$/, 'PST0599');
  igual(p.novas, []);
  igual(r.ok, false, 'nada a incluir');
  gravadas(amb, []);
});

// =====================================================================
console.log('\n== 3. Zero e inteiros válidos');
teste('3. 0/0, 2/1, 4/0, 0/2, "02" e "3,0": aceitos, CH = 15 × aula + 30 × trabalho, gravados e lidos iguais', () => {
  const amb = novoAmbiente();
  const t = csv(lin('PST0601', '0', '0'), lin('PST0602', '2', '1'), lin('PST0603', '4', '0'), lin('PST0604', '0', '2'), lin('PST0605', '02', '1'), lin('PST0606', '3,0', '0'));
  const { p, r } = incluir(amb, t);
  registrarPrevia(p);
  igual(p.invalidas, []);
  igual(p.novas.map((n) => [n.codigo, n.creditosAula, n.creditosTrabalho, n.ch]),
    [['PST0601', 0, 0, 0], ['PST0602', 2, 1, 60], ['PST0603', 4, 0, 60], ['PST0604', 0, 2, 60], ['PST0605', 2, 1, 60], ['PST0606', 3, 0, 45]]);
  igual(pedir(r).incluidas, 6);
  gravadas(amb, [['PST0601', 'PST0601', 'Sintética PST0601', 0, 0, 0], ['PST0602', 'PST0602', 'Sintética PST0602', 2, 1, 60], ['PST0603', 'PST0603', 'Sintética PST0603', 4, 0, 60],
    ['PST0604', 'PST0604', 'Sintética PST0604', 0, 2, 60], ['PST0605', 'PST0605', 'Sintética PST0605', 2, 1, 60], ['PST0606', 'PST0606', 'Sintética PST0606', 3, 0, 45]]);
});

// =====================================================================
console.log('\n== 4. Ausências legítimas (comportamento anterior preservado)');
teste('4. aula vazia, trabalho vazio, ambos vazios, só espaços e colunas finais ausentes: aceitos como antes', () => {
  const amb = novoAmbiente();
  const t = csv(lin('PST0701', '', '1'), lin('PST0702', '2', ''), lin('PST0703', '', ''), lin('PST0704', '   ', ' '), 'PST0705;Sem colunas de créditos;01/01/2026;;Semestral', 'PST0706;Só código e nome');
  const { p, r } = incluir(amb, t);
  registrarPrevia(p);
  igual(p.invalidas, []);
  igual(p.novas.map((n) => [n.codigo, n.creditosAula, n.creditosTrabalho, n.ch]),
    [['PST0701', null, 1, 30], ['PST0702', 2, null, 30], ['PST0703', null, null, null], ['PST0704', null, null, null], ['PST0705', null, null, null], ['PST0706', null, null, null]]);
  igual(pedir(r).incluidas, 6);
  gravadas(amb, [['PST0701', 'PST0701', 'Sintética PST0701', '', 1, 30], ['PST0702', 'PST0702', 'Sintética PST0702', 2, '', 30], ['PST0703', 'PST0703', 'Sintética PST0703', '', '', ''],
    ['PST0704', 'PST0704', 'Sintética PST0704', '', '', ''], ['PST0705', 'PST0705', 'Sem colunas de créditos', '', '', ''], ['PST0706', 'PST0706', 'Só código e nome', '', '', '']]);
});

// =====================================================================
console.log('\n== 5. Aspas não encerradas');
teste('5a. aspas não encerradas no nome: recusada (não engole os campos seguintes), nada gravado', () => {
  const amb = novoAmbiente();
  const { p, r } = incluir(amb, csv('PST0801;"Nome sem fim;01/01/2026;;Semestral;2;0'), ['PST0801']);
  registrarPrevia(p);
  recusada(p, 2, /aspas não encerradas/, 'PST0801');
  igual(r.ok, false);
  gravadas(amb, []);
});
teste('5b. aspas não encerradas em campo numérico: recusada, nada gravado', () => {
  const amb = novoAmbiente();
  const { p, r } = incluir(amb, csv('PST0802;Nome;01/01/2026;;Semestral;"2;0'), ['PST0802']);
  recusada(p, 2, /aspas não encerradas/, 'PST0802');
  igual(r.ok, false);
  gravadas(amb, []);
});
teste('5c. campo entre aspas que continua na linha seguinte (quebra de linha dentro de aspas): as duas linhas recusadas, nenhum fragmento vira disciplina', () => {
  // (1.8.3) Ajustado: as linhas 2 e 3 são UM registro (campo com quebra de
  // linha), descartado inteiro numa faixa "Linhas 2 a 3"; antes eram dois
  // motivos separados. A exigência central não mudou: nenhum fragmento entra.
  const amb = novoAmbiente();
  const t = csv('PST0803;"Nome em', 'duas linhas";01/01/2026;;Semestral;2;0', lin('PST0804', '2', '0'));
  const { p, r } = incluir(amb, t, ['PST0803', 'PST0804']);
  registrarPrevia(p);
  recusada(p, 2, /aspas não encerradas/, 'PST0803');
  verdade(cobre(p, 3), 'linha 3 (o resto do campo) também recusada');
  igual(p.novas.map((n) => n.codigo), ['PST0804']);
  pedir(r);
  gravadas(amb, [['PST0804', 'PST0804', 'Sintética PST0804', 2, 0, 30]]);
});
teste('5d. aspas no meio de um campo sem aspas e texto depois das aspas de fechamento: recusadas (interpretação ambígua)', () => {
  const amb = novoAmbiente();
  const t = csv('PST0805;Nome "apelido; x";01/01/2026;;Semestral;2;0', 'PST0806;"Nome"resto;01/01/2026;;Semestral;2;0');
  const p = previa(amb, t);
  registrarPrevia(p);
  recusada(p, 2, /aspas/, 'PST0805');
  recusada(p, 3, /aspas/, 'PST0806');
});
teste('5e. mais colunas preenchidas que o cabeçalho (ex.: "1,5" num arquivo separado por vírgula): recusada', () => {
  const amb = novoAmbiente();
  const t = TITULOS.join(',') + '\nPST0807,Nome,01/01/2026,,Semestral,1,5,0\nPST0808,Nome com coluna final vazia,01/01/2026,,Semestral,2,0,\n';
  const p = previa(amb, t);
  registrarPrevia(p);
  recusada(p, 2, /colunas/, 'PST0807');
  igual(p.novas.map((n) => [n.codigo, n.creditosAula, n.creditosTrabalho]), [['PST0808', 2, 0]], 'coluna final vazia continua aceita');
});
teste('5f. cabeçalho com aspas não encerradas: erro amigável (PACOTE_INVALIDO), sem prévia', () => {
  const amb = novoAmbiente();
  const t = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;"Créditos trabalho\n' + lin('PST0809', '2', '0');
  const r = amb.ctx.previaDisciplinasUnidade(t, 'u.csv');
  ev('Resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo, erro: r.erro, novas: r.dados && r.dados.novas.map((n) => n.codigo) }));
  igual([r.ok, r.codigo], [false, 'PACOTE_INVALIDO']);
  verdade(/cabeçalho/i.test(r.erro) && /aspas/i.test(r.erro), r.erro);
  verdade(!/at |Error|\.gs/.test(r.erro), 'sem detalhe técnico');
  const r2 = amb.ctx.incluirDisciplinasUnidade(t, 'u.csv', 'x', ['PST0809']);
  igual([r2.ok, r2.codigo], [false, 'PACOTE_INVALIDO']);
  gravadas(amb, []);
});

// =====================================================================
console.log('\n== 6. Aspas válidas');
teste('6. nome entre aspas com separador e com aspas escapadas (""): aceitos e gravados certos', () => {
  const amb = novoAmbiente();
  const t = csv('PST0901;"Nome; com ponto e vírgula";01/01/2026;;Semestral;2;0', 'PST0902;"Nome com ""aspas"" internas";01/01/2026;;Semestral;3;1', '"PST0903";"Tudo entre aspas";"01/01/2026";"";"Semestral";"2";"2"', 'PST0904; "Aspas depois de espaço" ;01/01/2026;;Semestral;1;0');
  const { p, r } = incluir(amb, t);
  registrarPrevia(p);
  igual(p.invalidas, []);
  igual(p.novas.map((n) => [n.codigo, n.nome, n.ch]), [['PST0901', 'Nome; com ponto e vírgula', 30], ['PST0902', 'Nome com "aspas" internas', 75], ['PST0903', 'Tudo entre aspas', 90], ['PST0904', 'Aspas depois de espaço', 15]]);
  pedir(r);
  igual(linhasGravadas(reabrir(amb)).map((l) => l['Nome']), ['Nome; com ponto e vírgula', 'Nome com "aspas" internas', 'Tudo entre aspas', 'Aspas depois de espaço']);
});

// =====================================================================
console.log('\n== 7. Separadores, BOM, LF/CRLF e linhas vazias');
teste('7. ";", "," e tabulação; BOM; LF e CRLF; linhas vazias: mesma prévia', () => {
  const amb = novoAmbiente();
  const dados = [['PST1001', 'Um', '2', '1'], ['PST1002', 'Dois', '0', '2']];
  const montar = (sep, fim, bom) => (bom ? '﻿' : '') + [TITULOS.join(sep)].concat(['', ...dados.map((d) => [d[0], d[1], '01/01/2026', '', 'Semestral', d[2], d[3]].join(sep)), '  ', '']).join(fim);
  const esperado = [['PST1001', 'Um', 2, 1, 60], ['PST1002', 'Dois', 0, 2, 60]];
  [[';', '\n', false], [',', '\n', false], ['\t', '\n', false], [';', '\r\n', true], [',', '\r\n', true], ['\t', '\r\n', true], [';', '\r', false]].forEach(([sep, fim, bom]) => {
    const p = previa(amb, montar(sep, fim, bom));
    igual([p.total, p.invalidas, p.novas.map((n) => [n.codigo, n.nome, n.creditosAula, n.creditosTrabalho, n.ch])], [2, [], esperado], JSON.stringify([sep, fim, bom]));
  });
  const t = montar('\t', '\r\n', true);
  const { r } = incluir(amb, t);
  pedir(r);
  gravadas(amb, [['PST1001', 'PST1001', 'Um', 2, 1, 60], ['PST1002', 'PST1002', 'Dois', 0, 2, 60]]);
});

// =====================================================================
console.log('\n== 8. Arquivo misto');
const MISTO = csv(lin('PST1101', '2', '1'), lin('PST1102', '-2', '0'), lin('PST1103', '3', '0'), lin('PST1104', '2', 'abc'), 'PST1105;"Sem fim;01/01/2026;;Semestral;2;0', lin('PST1106', '4', '2'));
teste('8. misto: motivos de todas as inválidas, só as válidas selecionáveis, inclusão só das válidas, registros anteriores intactos', () => {
  // (1.8.3) Ajustado: a linha 6 abre aspas que não fecham até o fim do
  // arquivo, então a linha 7 (PST1106) está DENTRO desse campo e não pode
  // ser oferecida — a 1.8.2 a oferecia (era o defeito). Arquivo misto só
  // com créditos inválidos: teste 8b.
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Pré-existente', oferecimento: '1' }, observacoes: 'não pode mudar' }));
  const antes = linhasGravadas(amb);
  const p = previa(amb, MISTO);
  registrarPrevia(p);
  igual(p.novas.map((n) => n.codigo), ['PST1101', 'PST1103']);
  igual(motivos(p).length, 3);
  recusada(p, 3, /^PST1102 — Créditos-aula: valor negativo \(-2\)$/);
  recusada(p, 5, /^PST1104 — Créditos-trabalho: valor inválido \(abc\)$/);
  recusada(p, 6, /aspas não encerradas/);
  verdade(cobre(p, 7), 'linha 7 (dentro do campo aberto) coberta pelo motivo');
  const r = pedir(amb.ctx.incluirDisciplinasUnidade(MISTO, 'u.csv', p.assinatura, p.novas.map((n) => n.codigo)));
  igual(r.incluidas, 2);
  const depois = linhasGravadas(reabrir(amb));
  igual(depois[0], antes[0], 'pré-existente intacta');
  igual(depois.slice(1).map(resumo), [['PST1101', 'PST1101', 'Sintética PST1101', 2, 1, 60], ['PST1103', 'PST1103', 'Sintética PST1103', 3, 0, 45]]);
});
teste('8b. (1.8.3) misto só com créditos inválidos (sem problema de aspas): todas as válidas continuam oferecidas e gravadas', () => {
  const amb = novoAmbiente();
  const t = csv(lin('PST1111', '2', '1'), lin('PST1112', '-2', '0'), lin('PST1113', '3', '0'), lin('PST1114', '2', 'abc'), lin('PST1115', '1,5', '0'), lin('PST1116', '4', '2'));
  const p = previa(amb, t);
  registrarPrevia(p);
  igual(p.novas.map((n) => n.codigo), ['PST1111', 'PST1113', 'PST1116']);
  igual([p.invalidas.map((i) => i.linha), p.totalInvalidas], [[3, 5, 6], 3]);
  const r = pedir(amb.ctx.incluirDisciplinasUnidade(t, 'u.csv', p.assinatura, p.novas.map((n) => n.codigo)));
  igual(r.incluidas, 3);
  igual(linhasGravadas(reabrir(amb)).map((l) => l['Código']), ['PST1111', 'PST1113', 'PST1116']);
});

// =====================================================================
console.log('\n== 9. Arquivo totalmente inválido');
teste('9. só linhas inválidas: nenhuma nova, inclusão recusada, aba inalterada (inclusive após reabrir)', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Pré-existente' } }));
  const antes = linhasGravadas(amb);
  const t = csv(lin('PST1201', '-1', '0'), lin('PST1202', 'x', '0'), 'PST1203;"aberta;;;;2;0', lin('XX12', '2', '0'));
  const p = previa(amb, t);
  registrarPrevia(p);
  // (1.8.3) Ajustado: a linha 4 abre aspas que não fecham, então a linha 5
  // está dentro desse campo — um só motivo cobre as linhas 4 a 5 (eram 4
  // motivos na 1.8.2). A exigência central não muda: nenhuma nova, nada gravado.
  igual([p.novas.length, p.invalidas.length], [0, 3]);
  [2, 3, 4, 5].forEach((l) => verdade(cobre(p, l), 'linha ' + l + ' coberta'));
  const escritasAntes = amb.estado.escritas;
  const r = amb.ctx.incluirDisciplinasUnidade(t, 'u.csv', p.assinatura, ['PST1201', 'PST1202', 'PST1203']);
  igual(r.ok, false, 'recusada');
  igual(amb.estado.escritas, escritasAntes, 'nenhuma escrita na planilha');
  igual(linhasGravadas(reabrir(amb)), antes, 'aba inalterada após reabrir');
});

// =====================================================================
console.log('\n== 10. Chamada direta à inclusão');
teste('10. incluir direto o código de uma linha inválida (com a assinatura da prévia): não grava esse código', () => {
  const amb = novoAmbiente();
  const p = previa(amb, MISTO);
  const r = pedir(amb.ctx.incluirDisciplinasUnidade(MISTO, 'u.csv', p.assinatura, ['PST1101', 'PST1102', 'PST1104', 'PST1105']));
  igual(r.incluidas, 1, 'só a válida');
  const gr = linhasGravadas(reabrir(amb));
  igual(gr.map((l) => l['Código']), ['PST1101']);
  const p2 = previa(amb, MISTO);   // a lista mudou: prévia nova (assinatura atual)
  const r2 = amb.ctx.incluirDisciplinasUnidade(MISTO, 'u.csv', p2.assinatura, ['PST1102']);
  igual([r2.ok, r2.codigo], [false, 'DADOS_INVALIDOS'], 'só o inválido: recusado');
  igual(linhasGravadas(reabrir(amb)).map((l) => l['Código']), ['PST1101']);
});

// =====================================================================
console.log('\n== 11. Conhecidas e repetidas com conteúdo inválido');
teste('11. código já na lista e código repetido no arquivo, com crédito inválido: aparecem como inválidos, não como "conhecida"/"repetida"', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST1301', nome: 'Já na lista' } }));
  const t = csv(lin('PST1301', '-2', '0'), lin('PST1302', '2', '0'), lin('PST1302', 'abc', '0'), 'PST1301;"Conhecida com aspas abertas;;;;;');
  const p = previa(amb, t);
  registrarPrevia(p);
  recusada(p, 2, /^PST1301 — Créditos-aula: valor negativo \(-2\)$/);
  recusada(p, 4, /^PST1302 — Créditos-aula: valor inválido \(abc\)$/);
  recusada(p, 5, /aspas não encerradas/);
  igual([p.conhecidas, p.repetidas, p.novas.map((n) => n.codigo)], [0, 0, ['PST1302']]);
  // linhas válidas continuam classificadas como antes
  const p2 = previa(amb, csv(lin('PST1301', '2', '0'), lin('PST1302', '2', '0'), lin('PST1302', '2', '0')));
  igual([p2.conhecidas, p2.repetidas, p2.invalidas.length, p2.novas.map((n) => n.codigo)], [1, 1, 0, ['PST1302']]);
});

// =====================================================================
console.log('\n== 12. Fluxos válidos');
const LOTE = csv(lin('PST1401', '2', '1'), lin('PSA1402', '4', '0'), lin('4701403', '2', '2'), lin('PSE1404', '0', '2'));
teste('12a. importação válida normal', () => {
  const amb = novoAmbiente();
  const { p, r } = incluir(amb, LOTE);
  igual([p.total, p.novas.length, p.invalidas.length], [4, 4, 0]);
  igual(pedir(r).incluidas, 4);
  igual(linhasGravadas(reabrir(amb)).map((l) => [l['Identificador'], l['CH total (h)'], l['Origem']]),
    [['PST1401', 60, 'Lista de disciplinas por unidade (Júpiter)'], ['PSA1402', 60, 'Lista de disciplinas por unidade (Júpiter)'], ['4701403', 90, 'Lista de disciplinas por unidade (Júpiter)'], ['PSE1404', 60, 'Lista de disciplinas por unidade (Júpiter)']]);
});
teste('12b. seleção parcial e reimportação: as não escolhidas continuam novas; as incluídas viram conhecidas', () => {
  const amb = novoAmbiente();
  incluir(amb, LOTE, ['PSA1402', 'PSE1404']);
  const p = previa(amb, LOTE);
  igual([p.novas.map((n) => n.codigo), p.conhecidas], [['PST1401', '4701403'], 2]);
  incluir(amb, LOTE);
  const p3 = previa(amb, LOTE);
  igual([p3.novas, p3.conhecidas], [[], 4]);
  igual(linhasGravadas(reabrir(amb)).length, 4);
});

// =====================================================================
console.log('\n== 13. Regressão da etapa 1 (amostra; a suíte completa da etapa 1 roda à parte)');
teste('13. código corrigido + CSV com o código antigo: registro novo PST0391-2, o corrigido intacto; com crédito inválido, nada', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Original', oferecimento: '1' }, observacoes: 'obs' }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { codigo: 'PST0392', nome: 'Corrigida' } }));
  const antes = linhasGravadas(amb);
  const { p: pi, r: ri } = incluir(amb, csv(lin('PST0391', '-2', '0')), ['PST0391']);
  recusada(pi, 2, /negativo/, 'PST0391');
  igual(ri.ok, false);
  igual(linhasGravadas(amb), antes, 'inválida não mexe em nada');
  pedir(incluir(amb, csv(lin('PST0391', '2', '0'))).r);
  const g = linhasGravadas(reabrir(amb));
  igual(g[0], antes[0], 'corrigido intacto');
  igual(resumo(g[1]), ['PST0391-2', 'PST0391', 'Sintética PST0391', 2, 0, 30]);
});

// =====================================================================
console.log('\n== 14. (1.8.3) Campo entre aspas com várias linhas: nenhum fragmento vira disciplina');
// Reprodução EXATA da revisão (arquivo completo):
const REPRO_PST0999 = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\n' +
  'PST0803;"Nome em várias linhas\n' +
  'PST0999;Trecho do nome que parece registro;01/01/2026;;Semestral;2;0\n' +
  'fim do nome";01/01/2026;;Semestral;2;0\n' +
  'PST0804;Disciplina real;01/01/2026;;Semestral;2;0\n';
(function retratoPst0999() {
  ev('\n--- R2. (1.8.3) Retrato da reprodução PST0999 e de "3.000" (só registra; asserções em 14a e 15a)');
  const amb = novoAmbiente();
  const p = previa(amb, REPRO_PST0999);
  registrarPrevia(p);
  const r = amb.ctx.incluirDisciplinasUnidade(REPRO_PST0999, 'u.csv', p.assinatura, ['PST0803', 'PST0999', 'PST0804']);
  ev('Inclusão direta de PST0803, PST0999 e PST0804: ' + (r.ok ? 'ok, ' + r.dados.incluidas + ' incluída(s)' : r.codigo));
  ev('Gravado após reabrir (Identificador | Código | Nome | Créd.-aula | Créd.-trabalho | CH): ' + JSON.stringify(linhasGravadas(reabrir(amb)).map(resumo)));
  const amb2 = novoAmbiente();
  const t = csv(lin('PST0901', '3.000', '0', 'Disciplina teste'));
  const p2 = previa(amb2, t);
  registrarPrevia(p2);
  console.log('  (retrato R2 gravado nas evidências)');
})();
teste('14a. reprodução exata: PST0999 (dentro do nome de PST0803) nunca é oferecida nem gravada, nem por chamada direta; PST0804 continua', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Pré-existente', oferecimento: '1' }, observacoes: 'não pode mudar' }));
  const antes = linhasGravadas(amb);
  const escritas = amb.estado.escritas;
  const p = previa(amb, REPRO_PST0999);
  registrarPrevia(p);
  igual(amb.estado.escritas, escritas, 'a prévia não escreve');
  verdade(!p.novas.some((n) => n.codigo === 'PST0999'), 'PST0999 não pode ser oferecida');
  verdade(!p.novas.some((n) => n.codigo === 'PST0803'), 'PST0803 (registro com quebra de linha) não é oferecida');
  igual(p.novas.map((n) => [n.codigo, n.nome]), [['PST0804', 'Disciplina real']], 'retoma depois do fechamento seguro');
  [2, 3, 4].forEach((l) => verdade(cobre(p, l), 'linha ' + l + ' coberta pelo motivo'));
  const r = pedir(amb.ctx.incluirDisciplinasUnidade(REPRO_PST0999, 'u.csv', p.assinatura, ['PST0803', 'PST0999', 'PST0804']));
  igual(r.incluidas, 1, 'chamada direta: só PST0804');
  const depois = linhasGravadas(reabrir(amb));
  igual(depois[0], antes[0], 'pré-existente intacta');
  igual(depois.map((l) => l['Código']), ['PST0391', 'PST0804']);
  verdade(!depois.some((l) => /Trecho do nome/.test(l['Nome'])), 'nenhum nome de fragmento');
  const p2 = previa(reabrir(amb), REPRO_PST0999);
  const r2 = amb.ctx.incluirDisciplinasUnidade(REPRO_PST0999, 'u.csv', p2.assinatura, ['PST0999']);
  igual(r2.ok, false, 'só PST0999 direto: recusado');
  igual(linhasGravadas(reabrir(amb)).map((l) => l['Código']), ['PST0391', 'PST0804']);
});
teste('14b. continuação com VÁRIAS linhas parecidas com registros válidos: nenhuma é oferecida; o registro real seguinte é', () => {
  const amb = novoAmbiente();
  const t = csv('PST0811;"Nome', lin('PST0812', '2', '0', 'Parece registro um'), lin('PST0813', '3', '1', 'Parece registro dois'), 'fim";01/01/2026;;Semestral;2;0', lin('PST0814', '2', '0', 'Real depois'));
  const { p, r } = incluir(amb, t, ['PST0811', 'PST0812', 'PST0813', 'PST0814']);
  registrarPrevia(p);
  verdade(!p.novas.some((n) => ['PST0811', 'PST0812', 'PST0813'].includes(n.codigo)), 'nenhum fragmento oferecido');
  igual(p.novas.map((n) => n.codigo), ['PST0814']);
  [2, 3, 4, 5].forEach((l) => verdade(cobre(p, l), 'linha ' + l + ' coberta'));
  igual(pedir(r).incluidas, 1);
  gravadas(amb, [['PST0814', 'PST0814', 'Real depois', 2, 0, 30]]);
});
teste('14c. campo aberto até o FIM do arquivo, com linhas posteriores parecidas com registros: nada a partir da abertura é lido; as anteriores continuam', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Pré-existente' } }));
  const antes = linhasGravadas(amb);
  const t = csv(lin('PST0820', '2', '0', 'Válida antes'), 'PST0821;"Nome aberto;01/01/2026;;Semestral;2;0', lin('PST0822', '2', '0', 'Parece registro'), lin('PST0823', '4', '2', 'Parece registro 2'));
  const escritas = amb.estado.escritas;
  const p = previa(amb, t);
  registrarPrevia(p);
  igual(amb.estado.escritas, escritas, 'a prévia não escreve');
  verdade(!p.novas.some((n) => ['PST0821', 'PST0822', 'PST0823'].includes(n.codigo)), 'nenhum fragmento oferecido');
  igual(p.novas.map((n) => n.codigo), ['PST0820']);
  [3, 4, 5].forEach((l) => verdade(cobre(p, l), 'linha ' + l + ' coberta'));
  const r = pedir(amb.ctx.incluirDisciplinasUnidade(t, 'u.csv', p.assinatura, ['PST0820', 'PST0821', 'PST0822', 'PST0823']));
  igual(r.incluidas, 1);
  const depois = linhasGravadas(reabrir(amb));
  igual(depois[0], antes[0], 'pré-existente intacta');
  igual(depois.map((l) => l['Código']), ['PST0391', 'PST0820']);
});
teste('14d. aspas escapadas ("") dentro do campo de várias linhas não fecham o campo (nenhum fechamento falso)', () => {
  const amb = novoAmbiente();
  const t = csv('PST0830;"Nome com ""aspas"" e', 'PST0831;Parece "";01/01/2026;;Semestral;2;0', 'continua ""aqui"" fim";01/01/2026;;Semestral;2;0', lin('PST0832', '2', '0', 'Real depois'));
  const { p, r } = incluir(amb, t, ['PST0830', 'PST0831', 'PST0832']);
  registrarPrevia(p);
  verdade(!p.novas.some((n) => n.codigo === 'PST0831' || n.codigo === 'PST0830'), 'nenhum fragmento oferecido');
  igual(p.novas.map((n) => n.codigo), ['PST0832']);
  pedir(r);
  gravadas(amb, [['PST0832', 'PST0832', 'Real depois', 2, 0, 30]]);
});
teste('14e. campo de várias linhas que fecha de forma inválida (texto depois das aspas): fim do registro ambíguo, nada a partir dele é lido; o anterior continua', () => {
  const amb = novoAmbiente();
  const t = csv(lin('PST0839', '2', '0', 'Válida antes'), 'PST0840;"Nome', 'fim"x;01/01/2026;;Semestral;2;0', lin('PST0841', '2', '0', 'Parece registro'));
  const { p, r } = incluir(amb, t, ['PST0839', 'PST0840', 'PST0841']);
  registrarPrevia(p);
  verdade(!p.novas.some((n) => n.codigo === 'PST0840' || n.codigo === 'PST0841'), 'nada depois da abertura');
  igual(p.novas.map((n) => n.codigo), ['PST0839']);
  [3, 4, 5].forEach((l) => verdade(cobre(p, l), 'linha ' + l + ' coberta'));
  pedir(r);
  gravadas(amb, [['PST0839', 'PST0839', 'Válida antes', 2, 0, 30]]);
});
teste('14f. cabeçalho com campo entre aspas que quebra a linha: arquivo recusado (PACOTE_INVALIDO), nada gravado', () => {
  const amb = novoAmbiente();
  const t = 'Disciplina;"Nome\ncontinua";Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\n' + lin('PST0850', '2', '0');
  const r = amb.ctx.previaDisciplinasUnidade(t, 'u.csv');
  igual([r.ok, r.codigo], [false, 'PACOTE_INVALIDO']);
  verdade(/cabeçalho/i.test(r.erro), r.erro);
  gravadas(amb, []);
});

// =====================================================================
console.log('\n== 15. (1.8.3) Inteiro com zeros decimais');
teste('15a. 3.000, 3,000, 0002.0000, 0.0000 e 9999.000 (aula e trabalho): aceitos como inteiros, CH certa, gravados e relidos', () => {
  const amb = novoAmbiente();
  const t = csv(lin('PST1501', '3.000', '0'), lin('PST1502', '3,000', '0'), lin('PST1503', '0002.0000', '1'), lin('PST1504', '0.0000', '0.0000'),
    lin('PST1505', '9999.000', '0'), lin('PST1506', '0', '3.000'), lin('PST1507', '1', '3,000'), lin('PST1508', '0', '0002.0000'), lin('PST1509', '0', '9999.000'), lin('PST1510', '00009999', '0'));
  const { p, r } = incluir(amb, t);
  registrarPrevia(p);
  igual(p.invalidas, [], 'nenhuma recusada');
  const esperado = [['PST1501', 3, 0, 45], ['PST1502', 3, 0, 45], ['PST1503', 2, 1, 60], ['PST1504', 0, 0, 0], ['PST1505', 9999, 0, 149985],
    ['PST1506', 0, 3, 90], ['PST1507', 1, 3, 105], ['PST1508', 0, 2, 60], ['PST1509', 0, 9999, 299970], ['PST1510', 9999, 0, 149985]];
  igual(p.novas.map((n) => [n.codigo, n.creditosAula, n.creditosTrabalho, n.ch]), esperado);
  igual(pedir(r).incluidas, 10);
  igual(linhasGravadas(reabrir(amb)).map((l) => [l['Código'], l['Créditos-aula'], l['Créditos-trabalho'], l['CH total (h)']]), esperado);
});
teste('15b. CSV separado por vírgula: "3,000" corretamente entre aspas = 3', () => {
  const amb = novoAmbiente();
  const t = TITULOS.join(',') + '\nPST1520,Vírgula,01/01/2026,,Semestral,"3,000","0,00"\n';
  const p = previa(amb, t);
  igual([p.invalidas, p.novas.map((n) => [n.codigo, n.creditosAula, n.creditosTrabalho, n.ch])], [[], [['PST1520', 3, 0, 45]]]);
});
teste('15c. frações reais continuam recusadas (3.001, 2,0001, muitos zeros e depois um dígito) e acima de 9999 também', () => {
  const amb = novoAmbiente();
  const t = csv(lin('PST1531', '3.001', '0'), lin('PST1532', '0', '2,0001'), lin('PST1533', '1.0000000000000000000001', '0'), lin('PST1534', '0', '0.00000000000000000000001'), lin('PST1535', '10000.000', '0'), lin('PST1536', '-3.000', '0'));
  const { p, r } = incluir(amb, t, ['PST1531', 'PST1532', 'PST1533', 'PST1534', 'PST1535', 'PST1536']);
  registrarPrevia(p);
  igual(p.novas, []);
  recusada(p, 2, /Créditos-aula: valor fracionário \(3\.001\)/);
  recusada(p, 3, /Créditos-trabalho: valor fracionário \(2,0001\)/);
  recusada(p, 4, /Créditos-aula: valor fracionário/);
  recusada(p, 5, /Créditos-trabalho: valor fracionário/);
  recusada(p, 6, /Créditos-aula: /);   // recusada (1.8.3: "acima do máximo aceito, 9999")
  recusada(p, 7, /Créditos-aula: valor negativo/);
  igual(r.ok, false);
  gravadas(amb, []);
});

// =====================================================================
console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
ev('\n=== TOTAL: ' + ok + ' ok, ' + falhas + ' falha(s) ===');
try { fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true }); fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n'); } catch (e) { console.log('evidências não gravadas: ' + e.message); }
process.exit(falhas ? 1 : 0);

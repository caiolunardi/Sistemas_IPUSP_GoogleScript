// Testes do código da planilha das secretarias (planilha-grade/Validacoes.gs)
// com uma planilha SINTÉTICA mínima: não precisa de CSV do Júpiter nem do
// simulador completo. Cobre conflito (nota, limpeza e, desde a 1.1, a caixa
// de aviso), colagem com vários conflitos, falha da caixa e modalidade Prática.
// Uso: node testar_validacoes_planilha.js [--evidencias arquivo]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ARQ_VALIDACOES = path.join(__dirname, '..', 'planilha-grade', 'Validacoes.gs');
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_validacoes_planilha.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);

let ok = 0, falhas = 0;
const falhou = [];
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

// ---------------------------------------------------------------- planilha sintética
const ABAS = ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades', 'DataBase'];
function criarPlanilha(diario) {
  const ss = { abas: {} };
  ABAS.forEach((nome) => {
    const cel = {}; const notas = {};
    const chave = (l, c) => l + ',' + c;
    const aba = {
      nome, cel, notas,
      getName: () => nome,
      getParent: () => ss,
      getLastRow: () => Object.keys(cel).reduce((m, k) => (cel[k] !== '' ? Math.max(m, +k.split(',')[0]) : m), 0),
      set(l, c, v) { cel[chave(l, c)] = v; },
      get(l, c) { const v = cel[chave(l, c)]; return v === undefined ? '' : v; },
      getRange(l, c, nl, nc) {
        nl = nl || 1; nc = nc || 1;
        return {
          getSheet: () => aba, getRow: () => l, getColumn: () => c, getNumRows: () => nl, getNumColumns: () => nc,
          getValues() { const o = []; for (let i = 0; i < nl; i++) { const r = []; for (let j = 0; j < nc; j++) r.push(aba.get(l + i, c + j)); o.push(r); } return o; },
          getValue: () => aba.get(l, c),
          setValue(v) { diario.push('valor ' + nome + '!' + l + ',' + c); aba.set(l, c, v); },
          setValues(vs) { diario.push('valores ' + nome + '!' + l + ',' + c); vs.forEach((r, i) => r.forEach((v, j) => aba.set(l + i, c + j, v))); },
          clearContent() { diario.push('limpa ' + nome + '!' + l + ',' + c + ' (' + nl + 'x' + nc + ')'); for (let i = 0; i < nl; i++) for (let j = 0; j < nc; j++) aba.set(l + i, c + j, ''); },
          setNote(t) { diario.push('nota ' + nome + '!' + l + ',' + c); notas[chave(l, c)] = t; },
          clearNote() { delete notas[chave(l, c)]; },
          getNote: () => notas[chave(l, c)] || ''
        };
      }
    };
    ss.abas[nome] = aba;
  });
  ss.getSheetByName = (n) => ss.abas[n] || null;
  return ss;
}
// linha: C código, D nome, E tipo, F modalidade, I semestre ideal, J créditos, K dia, L início
function disciplina(aba, l, d) {
  aba.set(l, 3, d.codigo); aba.set(l, 4, d.nome); aba.set(l, 5, d.tipo); aba.set(l, 6, d.modalidade || 'Teórica');
  aba.set(l, 9, d.sem); aba.set(l, 10, d.cred); aba.set(l, 11, d.dia || ''); aba.set(l, 12, d.ini || '');
}

function ambiente(opcoes) {
  opcoes = opcoes || {};
  const diario = [];
  const alertas = [];
  const avisos = [];
  const ss = criarPlanilha(diario);
  const ui = {
    ButtonSet: { OK: 'OK' },
    alert(titulo, texto, botoes) {
      diario.push('alerta');
      if (opcoes.semUi) throw new Error('Cannot call SpreadsheetApp.getUi() from this context.');
      alertas.push({ titulo, texto, botoes });
      return 'OK';
    }
  };
  const ctx = {
    console: { log() {}, error: (m) => { throw new Error('validação lançou: ' + m); }, warn: (m) => avisos.push(m) },
    SpreadsheetApp: { getUi: () => ui },
    String, Number, Math, Object, Array, Date, RegExp
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(ARQ_VALIDACOES, 'utf8'), ctx, { filename: 'Validacoes.gs' });
  const psa = ss.getSheetByName('PSA'), psc = ss.getSheetByName('PSC');
  // obrigatória do 3º semestre na PSC, terça 10:00–12:00
  disciplina(psc, 4, { codigo: 'PSC0001', nome: 'Obrigatória Fictícia', tipo: 'Obrigatória', sem: 3, cred: 2, dia: 'Terça-Feira', ini: '10:00' });
  // optativas do 3º semestre na PSA, ainda sem horário
  disciplina(psa, 4, { codigo: 'PSA0001', nome: 'Eletiva Fictícia A', tipo: 'Eletiva', sem: 3, cred: 2 });
  disciplina(psa, 5, { codigo: 'PSA0002', nome: 'Livre Fictícia B', tipo: 'Livre', sem: 3, cred: 2 });
  disciplina(psa, 6, { codigo: 'PSA0003', nome: 'Eletiva Fictícia C', tipo: 'Eletiva', sem: 5, cred: 2 });
  const editar = (aba, l, c, valor) => { aba.set(l, c, valor); ctx.onEdit({ range: aba.getRange(l, c), value: valor }); };
  const colar = (aba, l, c, linhas) => { linhas.forEach((r, i) => r.forEach((v, j) => aba.set(l + i, c + j, v))); ctx.onEdit({ range: aba.getRange(l, c, linhas.length, linhas[0].length) }); };
  return { ss, psa, psc, ctx, diario, alertas, avisos, editar, colar };
}

console.log('\n== Validações da planilha das secretarias (planilha-grade/Validacoes.gs), planilha sintética');

teste('conflito: dia e início apagados, nota no dia e UMA caixa "Conflito de horário" com o mesmo texto, depois da nota e da limpeza', () => {
  const a = ambiente();
  a.editar(a.psa, 4, 11, 'Terça-Feira');
  igual(a.alertas.length, 0, 'só o dia: ainda sem conflito');
  a.diario.length = 0;
  a.editar(a.psa, 4, 12, '11:00');
  igual([a.psa.get(4, 11), a.psa.get(4, 12)], ['', ''], 'dia e início apagados');
  const nota = a.psa.getRange(4, 11).getNote();
  verdade(/^Conflito de horário\./.test(nota) && nota.indexOf('PSC0001') >= 0 && nota.indexOf('aba PSC') >= 0 && nota.indexOf('10:00–12:00') >= 0, nota);
  igual(a.alertas.length, 1, 'uma caixa');
  igual(a.alertas[0].titulo, 'Conflito de horário');
  igual(a.alertas[0].botoes, 'OK');
  const detalhe = nota.split('\n\n')[1];
  verdade(a.alertas[0].texto.indexOf(detalhe) === 0, 'caixa começa com o texto da nota: ' + a.alertas[0].texto);
  verdade(/nota da célula "Dia da semana"/.test(a.alertas[0].texto), 'caixa diz onde fica a nota');
  const iNota = a.diario.findIndex((x) => x.startsWith('nota')), iLimpa = a.diario.findIndex((x) => x.startsWith('limpa')), iAlerta = a.diario.indexOf('alerta');
  verdade(iNota >= 0 && iLimpa >= 0 && iAlerta > iNota && iAlerta > iLimpa, 'ordem: ' + a.diario.join(' | '));
  ev('[conflito] ordem das operações: ' + a.diario.join(' → '));
  ev('[conflito] caixa "' + a.alertas[0].titulo + '": ' + a.alertas[0].texto.replace(/\n+/g, ' '));
});

teste('sem conflito: nenhuma caixa, a nota antiga sai; obrigatória e semestre diferente não abrem caixa', () => {
  const a = ambiente();
  a.editar(a.psa, 4, 11, 'Terça-Feira'); a.editar(a.psa, 4, 12, '11:00');
  igual(a.alertas.length, 1);
  a.editar(a.psa, 4, 11, 'Terça-Feira'); a.editar(a.psa, 4, 12, '08:00');   // 08:00–10:00 termina quando a obrigatória começa
  igual([a.psa.get(4, 11), a.psa.get(4, 12), a.psa.getRange(4, 11).getNote()], ['Terça-Feira', '08:00', '']);
  a.editar(a.psa, 6, 11, 'Terça-Feira'); a.editar(a.psa, 6, 12, '10:00');   // 5º semestre
  a.editar(a.psc, 4, 12, '10:30');                                           // a própria obrigatória
  igual(a.alertas.length, 1, 'nenhuma caixa nova');
});

teste('colagem com dois conflitos: as duas linhas limpas e com nota, e UMA caixa listando as duas', () => {
  const a = ambiente();
  a.colar(a.psa, 4, 11, [['Terça-Feira', '10:00'], ['Terça-Feira', '11:30'], ['Terça-Feira', '10:00']]);
  igual([a.psa.get(4, 11), a.psa.get(5, 11), a.psa.get(6, 11)], ['', '', 'Terça-Feira'], 'a do 5º semestre fica');
  verdade(a.psa.getRange(4, 11).getNote() && a.psa.getRange(5, 11).getNote(), 'notas nas duas');
  igual(a.alertas.length, 1, 'uma caixa só');
  const t = a.alertas[0].texto;
  verdade(/^2 disciplinas/.test(t) && t.indexOf('• PSA0001') >= 0 && t.indexOf('• PSA0002') >= 0 && t.indexOf('PSA0003') < 0, t);
  ev('[colagem] caixa: ' + t.replace(/\n+/g, ' '));
});

teste('muitos conflitos: a caixa lista 10 e resume o resto em "e mais N"', () => {
  const a = ambiente();
  for (let i = 0; i < 12; i++) disciplina(a.psa, 10 + i, { codigo: 'PSA1' + ('0' + i).slice(-2), nome: 'Optativa ' + i, tipo: 'Livre', sem: 3, cred: 2 });
  a.colar(a.psa, 10, 11, Array.from({ length: 12 }, () => ['Terça-Feira', '10:00']));
  igual(a.alertas.length, 1);
  const t = a.alertas[0].texto;
  igual((t.match(/• /g) || []).length, 10, 'itens listados');
  verdade(/^12 disciplinas/.test(t) && /… e mais 2\./.test(t), t);
});

teste('caixa indisponível (ex.: contexto sem tela): a nota e a limpeza valem do mesmo jeito, sem erro', () => {
  const a = ambiente({ semUi: true });
  a.editar(a.psa, 4, 11, 'Terça-Feira'); a.editar(a.psa, 4, 12, '11:00');
  igual([a.psa.get(4, 11), a.psa.get(4, 12)], ['', '']);
  verdade(a.psa.getRange(4, 11).getNote(), 'nota gravada');
  igual(a.avisos.length, 1, 'registra só um aviso no log');
  verdade(!/PSA0001|PSC0001/.test(a.avisos[0]), 'log sem dados da grade: ' + a.avisos[0]);
});

teste('modalidade "Prática" e abas fora da grade: sem caixa', () => {
  const a = ambiente();
  a.editar(a.psa, 4, 6, 'Prática');
  igual([a.psa.get(4, 11), a.psa.get(4, 12)], ['Horário Variável', '-- : --']);
  const db = a.ss.getSheetByName('DataBase'); a.editar(db, 5, 12, '10:00');
  igual(a.alertas.length, 0);
});

teste('o código da planilha continua só com onEdit (sem menu, acionadores, serviços externos)', () => {
  const src = fs.readFileSync(ARQ_VALIDACOES, 'utf8');
  verdade(!/onOpen|createMenu|DriveApp|ScriptApp|doGet|HtmlService|UrlFetchApp|PropertiesService|showModalDialog|showSidebar/.test(src), 'só planilha');
  const a = ambiente();
  igual(Object.keys(a.ctx).filter((k) => typeof a.ctx[k] === 'function' && !/_$/.test(k) && !['String', 'Number', 'Math', 'Object', 'Array', 'Date', 'RegExp'].includes(k)), ['onEdit']);
});

ev('\n=== RESULTADO ===\nExecutados: ' + (ok + falhas) + ' (' + ok + ' ok, ' + falhas + ' falha(s)); pulados: 0');
fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0  — evidências em ${path.relative(process.cwd(), ARQ_EVIDENCIAS)}`);
if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }

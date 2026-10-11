// Testes do "Enviar Grade para Preenchimento" (1.5.0, EnvioGrade.gs) no
// simulador: cópia de segurança + índice, limpeza de B4:S999 nas 6 abas,
// gravação de C/D/E/I/J, renomeação, regras (uma linha por disciplina,
// tipo e semestre ideal pelo Psicólogo → Bacharelado → Licenciatura,
// outros cursos sem tipo/semestre, ordem), e tudo o que deve recusar SEM
// mudar nada. A planilha das secretarias é um modelo FICTÍCIO montado pelo
// simulador (mesmas abas e cabeçalho da real; dados antigos inventados).
// Uso: node testar_envio_grade.js <grade_curricular.csv> <disciplinas_unidade.csv> [--evidencias arquivo]
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const { carregar } = require('./carregar_leitores');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const [csvPath, unidadePath] = process.argv.slice(2);
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_envio_grade.txt');
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

const L = carregar();
const csvBase = L.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const pacoteCsv = () => JSON.parse(JSON.stringify(csvBase));
const textoUnidade = L.LeitorCsvJupiter._decodificarBytes(new Uint8Array(fs.readFileSync(unidadePath))).texto;
const ABAS = [['PSA', 'PSA'], ['PSC', 'PSC'], ['PSE', 'PSE'], ['PST', 'PST'], ['INTER', 'Interdepartamentais'], ['OUTRAS', 'Outras Unidades']];
const AGORA = new Date('2026-10-01T18:30:00Z');   // 15:30 em São Paulo

function importar(amb, pacote) {
  const prev = amb.ctx.prepararImportacao(pacote);
  if (!prev.ok) throw new Error('prévia: ' + prev.erro);
  const r = amb.ctx.confirmarImportacao(pacote, prev.dados.assinatura, { operacao: prev.dados.operacao, previa: prev.dados.impressao });
  if (!r.ok) throw new Error('confirmação: ' + r.erro);
}
function pedir(r) { if (!r.ok) throw new Error(r.codigo + ': ' + r.erro); return r.dados; }

// (1.8.12) O envio exige a identificação da prévia conferida. Cada cenário obtém a prévia
// do servidor na sua preparação (contexto de administrador sobre a MESMA persistência, sem as
// falhas injetadas para o envio) e envia com ela; as verificações do envio continuam as mesmas.
function comPrevia(a, semestre, ano, esperado) {
  const falhas = a.estado.falhas; a.estado.falhas = [];
  try {
    const adm = criarAmbiente({ dirSrc: DIR_SRC, reusar: a, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
    const r = typeof adm.ctx.previaEnvioGrade === 'function' ? adm.ctx.previaEnvioGrade({ semestre, ano }) : null;
    return Object.assign({ semestre, ano }, esperado ? { esperado } : {}, r && r.ok ? { assinatura: r.dados.assinatura } : {});
  } finally { a.estado.falhas = falhas; }
}function painel(amb) { const r = amb.ctx.obterDadosPainel(); if (!r.ok) throw new Error(r.codigo + ' ' + r.erro); return r.dados; }

/**
 * Base com a estrutura inteira na grade, as disciplinas da lista por
 * unidade incluídas, PST0391 (outros cursos) no 1º semestre com
 * observação e PSA1505 com observação.
 */
function ambienteComGrade(opGrade) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, agora: AGORA });
  amb.ctx.obterDadosPainel();
  importar(amb, pacoteCsv());
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'u.csv'));
  pedir(amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'u.csv', p.assinatura, p.novas.map((x) => x.codigo)));
  const d = painel(amb);
  const pst = d.preparacao.outros.find((o) => o.codigo === 'PST0391');
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: pst.chave, campos: { oferecimento: '1' }, observacoes: 'Para a FEA' }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1505', campos: {}, observacoes: 'Para o Curso de enfermagem' }));
  pedir(amb.ctx.adicionarAGrade(d.base.disciplinas.map((x) => ({ origem: 'estrutura', chave: x.codigo })).concat([{ origem: 'outros', chave: pst.chave }])));
  amb.criarPlanilhaGrade(opGrade);
  return amb;
}

// Esperado, calculado aqui a partir do CSV, sem o código do sistema:
// uma linha por disciplina; tipo/semestre ideal da habilitação de menor código
// (0 = Psicólogo, 100 = Bacharelado, 200 = Licenciatura); semestre de
// oferecimento pelos períodos (ímpar = 1º, par = 2º, os dois = ambos).
const ROT = { OBRIGATORIA: 'Obrigatória', OPTATIVA_ELETIVA: 'Eletiva', OPTATIVA_LIVRE: 'Livre' };
const habDe = {}; csvBase.curriculos.forEach((c) => { habDe[c.codigo] = Number(c.habilitacao); });
function grupoDe(cod) { const p = cod.slice(0, 3); return ['PSA', 'PSC', 'PSE', 'PST'].includes(p) ? p : p === '470' ? 'INTER' : 'OUTRAS'; }
function esperadoDo(semestre, extras) {
  const g = {}; ABAS.forEach(([k]) => { g[k] = []; });
  csvBase.disciplinas.forEach((d) => {
    const vs = csvBase.vinculos.filter((v) => v.disciplina === d.codigo);
    const par = new Set(vs.filter((v) => v.periodoIdeal).map((v) => v.periodoIdeal % 2));
    const of = par.has(1) && par.has(0) ? 'ambos' : par.has(1) ? '1' : par.has(0) ? '2' : '';
    if (of !== 'ambos' && of !== semestre) return;
    const pr = vs.slice().sort((a, b) => habDe[a.curriculo] - habDe[b.curriculo])[0];
    const obs = (extras.obs || {})[d.codigo];
    g[grupoDe(d.codigo)].push({ c: d.codigo, d: obs ? d.nome + ' – ' + obs : d.nome, e: pr ? ROT[pr.tipo] : '', i: pr && pr.periodoIdeal ? pr.periodoIdeal : '', j: d.creditosAula });
  });
  (extras.outros || []).forEach((o) => g[grupoDe(o.c)].push(o));
  const ord = { 'Obrigatória': 0, 'Eletiva': 1, 'Livre': 2, '': 3 };
  Object.values(g).forEach((l) => l.sort((x, y) => (ord[x.e] - ord[y.e]) || ((x.i || 99) - (y.i || 99)) || (x.c < y.c ? -1 : x.c > y.c ? 1 : 0)));
  return g;
}
function lidoDaAba(aba, n) {
  return aba.getRange(4, 3, n, 8).getValues().map((l) => ({ c: l[0], d: l[1], e: l[2], i: l[6], j: l[7] }));
}
/** (1.6.2) Fórmula esperada do Horário de Fim, escrita aqui à mão. */
function formulaFim(r, sep) {
  const I = `IF(ISNUMBER(L${r});L${r};TIMEVALUE(L${r}))`;
  const f = `=IF(L${r}="";"";IF(ISERROR(${I});L${r};IF(J${r}="";"";TEXT(${I}+J${r}/24;"HH:mm"))))`;
  return sep === ',' ? f.replace(/;/g, ',') : f;   // 1.6.3: planilha pt_BR → ";"
}
/**
 * (1.6.2) Avaliador mínimo de fórmulas, só com o que a fórmula do fim usa
 * (IF, ISNUMBER, ISERROR, TIMEVALUE, TEXT "HH:mm", =, +, /), com a regra
 * do Sheets: TIMEVALUE de texto que não é hora dá erro; texto numérico
 * vira número na conta. Serve para conferir o RESULTADO da fórmula.
 */
function avaliar(formula, celulas) {
  const ERRO = { erro: '#VALUE!' };
  const toks = formula.slice(1).replace(/;/g, ',').match(/"[^"]*"|[A-Z]+\d+|[A-Z]+(?=\()|\d+(\.\d+)?|[(),=+/]/g);
  let p = 0;
  const num = (v) => { if (v && v.erro) return v; if (typeof v === 'number') return v; if (v === '') return 0; const n = Number(v); return isNaN(n) ? ERRO : n; };
  function prim() {
    const t = toks[p++];
    if (t[0] === '"') return t.slice(1, -1);
    if (/^\d/.test(t)) return Number(t);
    if (t === '(') { const v = expr(); p++; return v; }
    if (/^[A-Z]+\d+$/.test(t)) { const v = celulas[t]; return v === undefined ? '' : v; }
    p++;   // (
    const args = []; while (toks[p] !== ')') { args.push(() => null); const ini = p; let prof = 0; while (!(prof === 0 && (toks[p] === ',' || toks[p] === ')'))) { if (toks[p] === '(') prof++; if (toks[p] === ')') prof--; p++; } args[args.length - 1] = toks.slice(ini, p); if (toks[p] === ',') p++; }
    p++;   // )
    const ev = (ts) => avaliar('=' + ts.join(''), celulas);
    if (t === 'IF') { const c = ev(args[0]); if (c && c.erro) return c; return c ? ev(args[1]) : ev(args[2]); }
    if (t === 'ISNUMBER') return typeof ev(args[0]) === 'number';
    if (t === 'ISERROR') { const v = ev(args[0]); return !!(v && v.erro); }
    if (t === 'TIMEVALUE') { const v = ev(args[0]); if (v && v.erro) return v; const m = typeof v === 'string' && v.trim().match(/^(\d{1,2}):(\d{2})$/); return m ? (+m[1] * 60 + +m[2]) / 1440 : ERRO; }
    if (t === 'TEXT') { const v = num(ev(args[0])); if (v && v.erro) return v; const min = Math.round((v % 1) * 1440); return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
    throw new Error('função não suportada: ' + t);
  }
  function termo() { let v = prim(); while (toks[p] === '/') { p++; const d = num(prim()); v = num(v); v = v.erro ? v : d.erro ? d : v / d; } return v; }
  function soma() { let v = termo(); while (toks[p] === '+') { p++; const b = num(termo()); v = num(v); v = v.erro ? v : b.erro ? b : v + b; } return v; }
  function expr() { const a = soma(); if (toks[p] === '=') { p++; const b = soma(); return a === b; } return a; }
  return expr();
}
function contagensDe(g) { const r = {}; ABAS.forEach(([k]) => { r[k] = g[k].length; }); return r; }
/** Fotografia de tudo o que o envio pode mudar (para provar que nada mudou). */
function foto(amb) {
  const g = amb.grade();
  return JSON.stringify({ nome: g.getName(), abas: g.getSheets().map((s) => [s.getName(), [...s.cells.entries()]]), indice: [...amb.indiceGrades().getSheets()[0].cells.entries()], copias: [...amb.planilhas.keys()].filter((k) => /^ID_COPIA_/.test(k)) });
}

const EXTRAS_1 = {
  obs: { PSA1505: 'Para o Curso de enfermagem' },
  outros: [{ c: 'PST0391', d: null, e: '', i: '', j: null }]
};

(() => {
  console.log('\n== Envio da grade 2027/1');
  let amb, esperado, r;
  teste('2027/1: cópia de segurança na pasta + linha no índice (2026/1 pelo nome atual), B4:S999 apagado nas 6 abas, C/D/E/I/J gravados, arquivo renomeado', () => {
    amb = ambienteComGrade();
    const d = painel(amb);
    const pst = d.preparacao.outros.find((o) => o.codigo === 'PST0391');
    EXTRAS_1.outros[0].d = pst.nome + ' – Para a FEA';
    EXTRAS_1.outros[0].j = pst.creditosAula === undefined || pst.creditosAula === null ? '' : pst.creditosAula;
    esperado = esperadoDo('1', EXTRAS_1);
    const copiaAntes = JSON.stringify(amb.grade().getSheetByName('PSA').getRange(4, 2, 27, 18).getValues());
    r = pedir(amb.ctx.enviarGradeParaPreenchimento(comPrevia(amb, '1', 2027, contagensDe(esperado))));
    igual(r.contagens, contagensDe(esperado), 'contagens');
    igual([r.grade, r.nomeNovo, r.nomeAnterior], ['2027/1', 'Grade Horária - 1º semestre de 2027', 'Grade Horária - 1º Semestre de 2026']);
    igual(amb.grade().getName(), 'Grade Horária - 1º semestre de 2027', 'arquivo renomeado');
    // cópia de segurança
    igual(r.backup.nome, 'Grade Horária - 1º Semestre de 2026 (cópia de 01/10/2026 15:30)');
    igual(r.backup.semestre, '2026/1');
    const pasta = amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE');
    igual(pasta.arquivos, ['ID_COPIA_1'], 'cópia na pasta de backup');
    const copia = amb.planilhas.get('ID_COPIA_1');
    igual(copia.getName(), r.backup.nome);
    igual(JSON.stringify(copia.getSheetByName('PSA').getRange(4, 2, 27, 18).getValues()), copiaAntes, 'a cópia tem os dados de ANTES do envio');
    igual(copia.getSheets().map((s) => s.getName()), amb.grade().getSheets().map((s) => s.getName()), 'cópia com todas as abas');
    verdade(copia.getSheetByName('Disciplinas').isSheetHidden(), 'aba oculta continua oculta na cópia');
    igual(amb.indiceGrades().getSheets()[0].getRange(1, 1, 4, 3).getValues(), [['Semestre', 'ID', 'Auditoria_ID'], ['2025/2', 'ID_COPIA_ANTIGA', ''], ['2026/1', 'ID_COPIA_1', ''], ['2027/1', '', 'ID_NOVA_2']],
      'índice (1.6.0): cópia de 2026/1 na coluna B (linha nova, semestre como texto); auditoria de 2027/1 na coluna C, em outra linha');
    // ordem: cópia ANTES de apagar
    const tipos = amb.estado.eventos.map((e) => e.tipo);
    verdade(tipos.indexOf('makeCopy') >= 0 && tipos.indexOf('makeCopy') < tipos.indexOf('clearContent'), 'cópia antes de apagar');
    const ultimaEscritaGrade = amb.estado.eventos.map((e, i) => (/^set(Values|Formulas)$/.test(e.tipo) && ABAS.some(([, n]) => n === e.aba) ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
    verdade(tipos.lastIndexOf('rename') > ultimaEscritaGrade, 'renomeia depois de gravar as abas');
    verdade(tipos.indexOf('createSpreadsheet') > tipos.indexOf('makeCopy') && tipos.indexOf('createSpreadsheet') < tipos.indexOf('clearContent'), 'auditoria criada depois da cópia e antes de apagar');
    ev('[envio 2027/1] grade "Grade Horária - 1º Semestre de 2026" → cópia "' + r.backup.nome + '" na pasta de backup, índice: 2026/1 + ID da cópia; arquivo renomeado "' + r.nomeNovo + '"; contagens ' + JSON.stringify(r.contagens));
  });
  teste('cada aba: uma linha por disciplina, na ordem tipo → semestre ideal → código; código, nome (+ " – " observações), tipo, semestre ideal (número) e créditos-aula', () => {
    const g = amb.grade();
    ABAS.forEach(([k, nome]) => {
      const n = esperado[k].length;
      if (!n) return;
      igual(lidoDaAba(g.getSheetByName(nome), n), esperado[k], nome);
    });
    const psa = lidoDaAba(g.getSheetByName('PSA'), esperado.PSA.length);
    igual(psa.find((l) => l.c === 'PSA1505').d, 'Avaliação da Inteligência – Para o Curso de enfermagem', 'nome + observações');
    verdade(psa.every((l) => typeof l.i === 'number' && l.i >= 1 && l.i <= 10), 'semestre ideal só o número');
    const cods = psa.map((l) => l.c);
    igual(new Set(cods).size, cods.length, 'sem disciplina repetida');
    ev('[envio 2027/1] linhas iguais ao esperado calculado do CSV em todas as abas: ' + ABAS.map(([k, n]) => n + ' ' + esperado[k].length).join(', ') + '; PSA1505 → "Avaliação da Inteligência – Para o Curso de enfermagem"');
  });
  teste('habilitações divergentes: tipo e semestre ideal pelo Psicólogo (4701784: Obrigatória 7º no Bacharelado, Eletiva 9º no Psicólogo → Eletiva, 9); FSL0118 → Obrigatória, 1', () => {
    const inter = lidoDaAba(amb.grade().getSheetByName('Interdepartamentais'), esperado.INTER.length);
    const x = inter.find((l) => l.c === '4701784');
    verdade(x, '4701784 na aba Interdepartamentais');
    igual([x.e, x.i], ['Eletiva', 9]);
    igual(typeof x.c, 'string', 'código só com dígitos gravado como texto');
    const fsl = lidoDaAba(amb.grade().getSheetByName('Outras Unidades'), esperado.OUTRAS.length).find((l) => l.c === 'FSL0118');
    igual([fsl.e, fsl.i], ['Obrigatória', 1]);
    ev('[regra Psicólogo] 4701784 → Eletiva 9 (do Psicólogo, não Obrigatória 7 do Bacharelado); FSL0118 → Obrigatória 1');
  });
  teste('disciplina para outros cursos (PST0391): Tipo (E) e Semestre Ideal (I) em branco, no fim da aba PST', () => {
    const pst = lidoDaAba(amb.grade().getSheetByName('PST'), esperado.PST.length);
    const ult = pst[pst.length - 1];
    igual([ult.c, ult.e, ult.i], ['PST0391', '', '']);
    verdade(/– Para a FEA$/.test(ult.d), ult.d);
  });
  teste('o que NÃO pode mudar: colunas das práticas (U–W), cabeçalho (linhas 1–3), linha 1000, abas Informações, Disciplinas (oculta) e DataBase; e o resto de B:S fica vazio', () => {
    const g = amb.grade();
    const psa = g.getSheetByName('PSA');
    igual(psa.getRange(4, 21, 1, 3).getValues(), [['Docente da prática 4', '02', 5]], 'práticas intactas');
    igual(psa.getRange(30, 21, 1, 1).getValue(), 'Docente da prática 30');
    igual(psa.getRange(3, 3, 1, 3).getValues(), [['Código', 'Nome', 'Tipo']]);
    igual(psa.getRange(2, 16).getValue(), 'Cadastrar como Especial no jupiterweb');
    igual(psa.getRange(1000, 3).getValue(), 'linha 1000 (não apagar)');
    igual(psa.getRange(999, 19).getValue(), '', 'linha 999 apagada');
    const n = esperado.PSA.length;
    igual(psa.getRange(4, 2, 1, 1).getValue(), '', 'Cadastro (B) apagado');
    igual(psa.getRange(4, 6, n, 3).getValues().flat().filter(Boolean), [], 'F, G, H vazios');
    igual(psa.getRange(4, 11, n, 2).getValues().flat().filter(Boolean), [], 'K e L vazios');
    igual(psa.getRange(4, 14, n, 6).getValues().flat().filter(Boolean), [], 'N a S vazios');
    igual(psa.getRange(4, 13, 2, 1).getFormulas(), [[formulaFim(4)], [formulaFim(5)]], '(1.6.0/1.6.2) M = fórmula do horário de fim, linha a linha');
    verdade(psa.tipadas.has(13) && !psa.fmts.has('4,13'), '(1.6.2) coluna M tipada da Tabela: o envio não tenta mudar o formato');
    igual(psa.getRange(4 + n, 13).getFormulas()[0][0], '', 'sem fórmula depois da última disciplina');
    verdade(![4, 50, 91].some((r) => psa.listas.has(r + ',13')), '(1.6.1) a lista suspensa da coluna M (que recusava a fórmula) foi retirada');
    igual(psa.getRange(4 + n, 2, 30 - 3 - n, 18).getValues().flat().filter(Boolean), [], 'linhas antigas abaixo apagadas');
    ['Informações', 'Disciplinas', 'DataBase'].forEach((a) => igual(g.getSheetByName(a).getRange(1, 1).getValue(), 'Aba ' + a + ' (não deve mudar)', a));
    verdade(g.getSheetByName('Disciplinas').isSheetHidden(), 'Disciplinas continua oculta');
    // em todas as abas, abaixo das linhas gravadas, os dados antigos sumiram
    ABAS.forEach(([k, nome]) => igual(g.getSheetByName(nome).getRange(4 + esperado[k].length, 2, 999 - 3 - esperado[k].length, 18).getValues().flat().filter(Boolean), [], nome + ': abaixo das linhas gravadas, vazio'));
    ev('[preservado] práticas (U–W), linhas 1–3, linha 1000, abas Informações/Disciplinas(oculta)/DataBase; B4:S999 vazio fora das linhas gravadas nas 6 abas');
  });
  teste('segundo envio (2027/2): nova cópia com o semestre do NOME ATUAL (2027/1), índice com mais uma linha; grade do 2º semestre', () => {
    const esp2 = esperadoDo('2', { obs: EXTRAS_1.obs });
    const r2 = pedir(amb.ctx.enviarGradeParaPreenchimento(comPrevia(amb, '2', 2027, contagensDe(esp2))));
    igual([r2.backup.semestre, r2.nomeNovo], ['2027/1', 'Grade Horária - 2º semestre de 2027']);
    igual(amb.indiceGrades().getSheets()[0].getRange(4, 1, 2, 3).getValues(), [['2027/1', 'ID_COPIA_3', 'ID_NOVA_2'], ['2027/2', '', 'ID_NOVA_4']], 'cópia de 2027/1 na MESMA linha da auditoria de 2027/1; auditoria de 2027/2 em linha nova');
    igual(lidoDaAba(amb.grade().getSheetByName('PSA'), esp2.PSA.length), esp2.PSA, 'PSA do 2º semestre');
    const lic = lidoDaAba(amb.grade().getSheetByName('Interdepartamentais'), esp2.INTER.length).find((l) => l.c === '4705291');
    igual([lic.e, lic.i], ['Eletiva', 8], '4705291: Livre no Bacharelado, Eletiva no Psicólogo, Obrigatória na Licenciatura → Eletiva (Psicólogo)');
    verdade(!lidoDaAba(amb.grade().getSheetByName('PST'), esp2.PST.length).some((l) => l.c === 'PST0391'), 'PST0391 é só do 1º semestre');
    ev('[envio 2027/2] cópia do arquivo "Grade Horária - 1º semestre de 2027" registrada como 2027/1; 4705291 → Eletiva 8 (Psicólogo)');
  });

  console.log('\n== Ajustes do painel valem no envio');
  teste('código, nome e créditos ajustados, oferta ajustada (tipo), exclusão e semestre de oferecimento ajustado', () => {
    const a = ambienteComGrade();
    pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: { nome: 'Nome Ajustado', creditosAula: '6' } }));
    pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { codigo: 'PSC9322' } }));
    const of = painel(a).base.vinculos.filter((v) => v.codigo === 'PSA1301').map((v) => ({ curriculo: v.curriculo, tipo: v.tipo === 'OBRIGATORIA' ? 'OPTATIVA_LIVRE' : v.tipo, periodo: v.periodoIdeal }));
    pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1301', campos: {}, oferta: of }));
    pedir(a.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSA1200' }], true));
    pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1709', campos: { oferecimento: '2' } }));
    const d = painel(a);
    const esp = {}; ABAS.forEach(([k]) => { esp[k] = 0; });
    // contagens pelo próprio servidor numa tentativa com contagem errada (devolve PREVIA_DESATUALIZADA)…
    igual(a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, esp)).codigo, 'PREVIA_DESATUALIZADA');
    // …e com as contagens da prévia calculadas como o painel (mesma seleção)
    const base1 = esperadoDo('1', EXTRAS_1);
    const cont = contagensDe(base1);
    cont.PSA -= 2;   // PSA1200 excluída; PSA1709 ajustada para o 2º semestre
    const rr = pedir(a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, cont)));
    const psa = lidoDaAba(a.grade().getSheetByName('PSA'), rr.contagens.PSA);
    verdade(!psa.some((l) => l.c === 'PSA1200' || l.c === 'PSA1709'), 'excluída e ajustada para o 2º semestre ficam de fora');
    const p1302 = psa.find((l) => l.c === 'PSA1302');
    igual([p1302.d, p1302.j], ['Nome Ajustado', 6], 'nome e créditos ajustados');
    igual(psa.find((l) => l.c === 'PSA1301').e, 'Livre', 'oferta ajustada no painel muda o tipo');
    verdade(lidoDaAba(a.grade().getSheetByName('PSC'), rr.contagens.PSC).some((l) => l.c === 'PSC9322'), 'código ajustado');
    verdade(d.preparacao.ajustes.length > 0);
    ev('[ajustes] nome/créditos ajustados (PSA1302), código ajustado (PSC1322 → PSC9322), oferta ajustada muda o tipo (PSA1301 → Livre), excluída (PSA1200) e 2º semestre ajustado (PSA1709) fora');
  });

  console.log('\n== Recusas: nada muda');
  function recusa(nome, prep, chamada, codigo, extra) {
    teste(nome, () => {
      const a = ambienteComGrade(prep && prep.opGrade);
      if (prep && prep.depois) prep.depois(a);
      const antes = foto(a);
      const res = chamada(a);
      igual(res.ok, false, 'recusado');
      igual(res.codigo, codigo, res.erro);
      if (!(extra && extra.mudaIndiceOuCopia)) igual(foto(a), antes, 'nada mudou (grade, índice, cópias)');
      if (extra && extra.depois) extra.depois(a, res, antes);
      ev('[recusa ' + codigo + '] ' + nome + ' — "' + res.erro + '"');
    });
  }
  const certo = (a, sem) => contagensDe(esperadoDo(sem || '1', { obs: EXTRAS_1.obs, outros: sem === '2' ? [] : [{ c: 'PST0391' }] }));
  recusa('contagens diferentes das da prévia (grade mudou)', null, (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, Object.assign(certo(a), { PSA: 1 }))), 'PREVIA_DESATUALIZADA');
  // (1.8.12) sem a identificação da prévia conferida: recusado mesmo com as contagens certas (chamada antiga)
  recusa('sem "esperado" e sem a identificação da prévia', null, (a) => a.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027 }), 'PREVIA_INVALIDA');
  recusa('(1.8.12) chamada antiga só com as contagens certas, sem a identificação da prévia', null, (a) => a.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027, esperado: certo(a) }), 'PREVIA_INVALIDA');
  recusa('semestre ou ano inválidos', null, (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '3', 2027, certo(a))), 'DADOS_INVALIDOS');
  recusa('nome atual sem semestre ("Grade Horária - Preenchimento")', { opGrade: { nome: 'Grade Horária - Preenchimento' } }, (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'NOME_SEM_SEMESTRE');
  recusa('aba "PST" não existe na planilha das secretarias', { opGrade: { semAba: 'PST' } }, (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'PLANILHA_GRADE_FORA_DO_PADRAO');
  recusa('cabeçalho diferente (PSC, coluna I3)', { opGrade: { cabecalhoErrado: true } }, (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'PLANILHA_GRADE_FORA_DO_PADRAO');
  ['GRADE_HORARIA_PREENCHIMENTO', 'INDEX_GRADE_HORARIA_VERSOES_ANTERIORES', 'BACKUP_GRADES_ANTERIORES'].forEach((ch) => {
    recusa('chave ' + ch + ' ausente no ID_INDEX', { opGrade: { semChaves: [ch] } }, (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'CONFIGURACAO', {
      depois: (a, res) => verdade(res.erro.indexOf(ch) >= 0 && !/ID_/.test(res.erro.replace(ch, '').replace('ID_INDEX', '')), 'mensagem cita a chave e não mostra IDs: ' + res.erro)
    });
  });
  recusa('(1.5.1) projeto sem a autorização do Google Drive: AUTORIZACAO_DRIVE explica o que fazer (diagnosticarEnvioGrade no editor)', { depois: (a) => { a.estado.semAutorizacaoDrive = true; } },
    (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'AUTORIZACAO_DRIVE', {
      depois: (a, res) => {
        verdade(/diagnosticarEnvioGrade/.test(res.erro) && /Google Drive/.test(res.erro), res.erro);
        const log = a.estado.erros.join('\n');
        verdade(/BACKUP_GRADES_ANTERIORES: Exceção: Você não tem permissão/.test(log) && !/ID_PASTA/.test(log), 'motivo técnico no registro, sem ID: ' + log);
        igual(a.ctx.diagnosticarEnvioGrade().codigo, 'AUTORIZACAO_DRIVE', 'o diagnóstico diz o mesmo');
      }
    });
  recusa('(1.5.1) pasta que a conta do sistema não enxerga: CONFIGURACAO pede para compartilhar com a conta que implantou', { depois: (a) => { a.estado.pastas.delete('ID_PASTA_BACKUP_TESTE'); } },
    (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'CONFIGURACAO', {
      depois: (a, res) => verdade(/compartilhe com ela, como Editor/.test(res.erro) && /BACKUP_GRADES_ANTERIORES/.test(res.erro), res.erro)
    });
  recusa('grade vazia no semestre', { depois: (a) => { const d = painel(a); pedir(a.ctx.removerDaGrade(d.preparacao.ajustes.filter((x) => x.naGrade).map((x) => ({ origem: 'estrutura', chave: x.chave })).concat(d.preparacao.outros.filter((o) => o.naGrade).map((o) => ({ origem: 'outros', chave: o.chave }))))); } },
    (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, { PSA: 0, PSC: 0, PSE: 0, PST: 0, INTER: 0, OUTRAS: 0 })), 'GRADE_VAZIA');
  recusa('leitor (não administrador)', { depois: (a) => { a.permitir('leitor@unidade.example', 'LEITOR'); a.trocarUsuario('leitor@unidade.example'); } },
    (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'SO_ADMIN');
  recusa('trava ocupada', null, (a) => { const b = criarAmbiente({ dirSrc: DIR_SRC, reusar: a, travaOcupada: true }); return b.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))); }, 'OCUPADO');
  recusa('falha ao copiar o arquivo: nada apagado nem gravado', { depois: (a) => a.injetarFalha((e) => e.tipo === 'makeCopy') },
    (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'BACKUP_FALHOU');
  recusa('falha ao registrar no índice: a cópia fica na pasta, a grade não muda', { depois: (a) => a.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Página1') },
    (a) => a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))), 'BACKUP_FALHOU', {
      mudaIndiceOuCopia: true,
      depois: (a, res, antes) => {
        const f = JSON.parse(antes);
        igual(a.grade().getName(), f.nome, 'nome igual');
        igual(JSON.stringify(a.grade().getSheets().map((s) => [s.getName(), [...s.cells.entries()]])), JSON.stringify(f.abas), 'grade intacta');
        igual(a.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length, 1, 'a cópia ficou na pasta');
        verdade(/cópia de segurança foi feita/.test(res.erro) && /Nada foi apagado/.test(res.erro), res.erro);
      }
    });

  console.log('\n== Horário de Fim (1.6.2)');
  teste('fórmula do fim: início como texto "08:00" (lista da Tabela) ou como hora; resultado em texto HH:mm; "-- : --" e "Não será oferecida" repetidos; sem início ou sem créditos, vazio', () => {
    const f = a2 => a2;   // só para legibilidade
    const casos = [
      [{ L4: '08:00', J4: 4 }, '12:00'], [{ L4: '19:30', J4: 2 }, '21:30'], [{ L4: 8 / 24, J4: 2 }, '10:00'],
      [{ L4: '14:00', J4: '4' }, '18:00'], [{ L4: '-- : --', J4: 4 }, '-- : --'], [{ L4: 'Não será oferecida', J4: 2 }, 'Não será oferecida'],
      [{ L4: '', J4: 4 }, ''], [{ L4: '08:00', J4: '' }, ''], [{ L4: '-- : --', J4: '' }, '-- : --']
    ];
    casos.forEach(([cel, esp]) => { igual(avaliar(formulaFim(4), cel), f(esp), JSON.stringify(cel)); igual(avaliar(formulaFim(4, ','), cel), f(esp), 'com "," ' + JSON.stringify(cel)); });
    ev('[fim 1.6.2] fórmula avaliada: "08:00"+4 → 12:00; hora 08:00 (fração)+2 → 10:00; "-- : --" repetido; vazio sem início/créditos');
  });
  teste('planilha em Tabela com colunas tipadas: envio completo, sem setNumberFormat na coluna M; sem Tabela também funciona', () => {
    [{}, { semTabela: true }].forEach((op) => {
      const a = ambienteComGrade(op);
      const r1 = pedir(a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))));
      igual(r1.nomeNovo, 'Grade Horária - 1º semestre de 2027');
      igual(r1.avisos.filter((x) => /Horário de Fim/.test(x)), [], 'sem aviso de erro na coluna M');
      const psa = a.grade().getSheetByName('PSA');
      igual(psa.getRange(4, 13).getFormulas()[0][0], formulaFim(4));
      verdade(![...psa.fmts.keys()].some((k) => k.endsWith(',13')), 'nenhum formato aplicado em M');
    });
  });
  teste('fórmula do fim calculando com erro (#ERROR!): o envio conclui e avisa quantas linhas e quais', () => {
    const a = ambienteComGrade();
    a.estado.formulaComErro = true;
    const cont = certo(a);
    const r1 = pedir(a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, cont)));
    const total = Object.values(cont).reduce((x, y) => x + y, 0);
    const aviso = r1.avisos.find((x) => /Horário de Fim \(M\) mostra erro/.test(x));
    verdade(aviso && aviso.indexOf('em ' + total + ' linha(s)') >= 0 && /PSA linha 4, PSA linha 5/.test(aviso) && /…/.test(aviso), aviso);
    igual(a.grade().getSheetByName('PSA').getRange(4, 13).getFormulas()[0][0], formulaFim(4), '(1.6.3) o 2º separador também deu erro: volta ao da localidade');
    verdade(a.estado.logs.some((l) => /Horário de Fim com ";": \d+ erro\(s\); com ",": \d+/.test(l)), '(1.6.3) tentativa com o outro separador registrada');
    igual(a.grade().getName(), 'Grade Horária - 1º semestre de 2027', 'renomeou (o envio foi gravado)');
    verdade(a.estado.logs.concat(a.estado.erros).some((l) => /Horário de Fim com erro em \d+ linha/.test(l)), 'registrado no log');
    ev('[fim 1.6.2] fórmula com #ERROR! → envio concluído + aviso "' + aviso.slice(0, 90) + '…"');
  });

  console.log('\n== Separador das fórmulas (1.6.3)');
  teste('planilha pt_BR (a real): fórmula com ";" — com "," o Sheets dá "Erro de análise de fórmula" (o simulador reproduz o #ERROR! da fonte 1.6.2)', () => {
    const a = ambienteComGrade();
    const r1 = pedir(a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))));
    const psa = a.grade().getSheetByName('PSA');
    igual(psa.getRange(4, 13).getFormulas()[0][0], formulaFim(4, ';'));
    igual(psa.getRange(4, 13, 3, 1).getDisplayValues().flat().filter((x) => /^#(ERROR!|VALUE!)/.test(x)), [], 'sem #ERROR!');
    igual(r1.avisos.filter((x) => /Horário de Fim/.test(x)), [], 'sem aviso');
    verdade(!a.estado.logs.some((l) => /Horário de Fim com/.test(l)), 'acertou de primeira (sem 2ª tentativa)');
    psa.getRange(4, 13).setFormulas([[formulaFim(4, ',')]]);
    igual(psa.getRange(4, 13).getDisplayValue(), '#ERROR!', 'a mesma fórmula com "," (como gravava a 1.6.2) dá erro de análise');
    ev('[separador 1.6.3] pt_BR → ";" de primeira, sem #ERROR!; com "," → #ERROR! (o erro real da 1.6.2)');
  });
  teste('outras localidades: en_US → ","; localidade ilegível → ";"; localidade que engana → o envio tenta o outro separador e fica com o que funciona', () => {
    const casos = [
      [{ locale: 'en_US' }, ',', false],
      [{}, ';', false, (a) => { a.estado.semLocalidade = true; }],
      [{ locale: 'xx_XX', separadorReal: ';' }, ';', true]
    ];
    casos.forEach(([op, sepFinal, tentou, prep]) => {
      const a = ambienteComGrade(op);
      if (prep) prep(a);
      const r1 = pedir(a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, certo(a))));
      const psa = a.grade().getSheetByName('PSA');
      igual(psa.getRange(4, 13).getFormulas()[0][0], formulaFim(4, sepFinal), JSON.stringify(op));
      igual(r1.avisos.filter((x) => /Horário de Fim/.test(x)), [], 'sem aviso: ' + JSON.stringify(op));
      igual(a.estado.logs.some((l) => /Horário de Fim com ",": \d+ erro\(s\); com ";": 0/.test(l)), tentou, '2ª tentativa: ' + JSON.stringify(op));
    });
  });

  console.log('\n== Falha no meio da gravação');
  teste('falha ao gravar a aba PSE: ENVIO_INCOMPLETO com o nome da cópia; enviar de novo completa (e faz outra cópia)', () => {
    const a = ambienteComGrade();
    a.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'PSE');
    const cont = certo(a);
    verdade(cont.PSE > 0, 'PSE tem disciplinas nesta grade');
    const r1 = a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, cont));
    igual(r1.codigo, 'ENVIO_INCOMPLETO', r1.erro);
    verdade(/cópia de segurança/.test(r1.erro) && r1.erro.indexOf('(cópia de 01/10/2026 15:30)') >= 0, r1.erro);
    igual(a.grade().getName(), 'Grade Horária - 1º Semestre de 2026', 'não renomeou');
    const r2 = pedir(a.ctx.enviarGradeParaPreenchimento(comPrevia(a, '1', 2027, cont)));
    igual(r2.nomeNovo, a.grade().getName());
    igual(a.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length, 2, 'duas cópias');
    igual(a.indiceGrades().getSheets()[0].getRange(3, 1, 3, 3).getValues(), [['2026/1', 'ID_COPIA_1', ''], ['2027/1', '', 'ID_NOVA_2'], ['2026/1', 'ID_COPIA_3', '']], 'índice: 2ª cópia de 2026/1 em linha nova; a auditoria de 2027/1 é a mesma');
    igual(a.estado.pastas.get('ID_PASTA_AUDITORIA_TESTE').arquivos.length, 1, 'uma auditoria só (reaproveitada no reenvio)');
    ev('[envio incompleto] falha no setValues da aba PSE → ENVIO_INCOMPLETO citando a cópia; arquivo não renomeado; novo envio completa, com uma segunda cópia');
  });

  console.log('\n== Diagnóstico');
  teste('diagnosticarEnvioGrade: só lê; nomes (sem IDs), semestre do nome, abas conferidas; recusa leitor', () => {
    const a = ambienteComGrade();
    const antes = foto(a);
    const r = pedir(a.ctx.diagnosticarEnvioGrade());
    igual([r.planilhaDaGrade, r.semestreNoNome, r.pastaDasCopias], ['Grade Horária - 1º Semestre de 2026', '2026/1', 'Grades anteriores']);
    igual(r.localidadeDaPlanilha, 'pt_BR (fórmulas com ";")', '(1.6.3) localidade');
    verdade(/1 cópia\(s\) registrada/.test(r.indice), r.indice);
    verdade(!/ID_/.test(JSON.stringify(r)), 'sem IDs');
    igual(foto(a), antes, 'nada mudou');
    a.permitir('leitor@unidade.example', 'LEITOR'); a.trocarUsuario('leitor@unidade.example');
    igual(a.ctx.diagnosticarEnvioGrade().codigo, 'SO_ADMIN');
  });

  console.log('\n== Registros');
  teste('logs sem e-mail, sem IDs e sem nomes de disciplinas', () => {
    const logs = amb.estado.logs.concat(amb.estado.erros).join('\n');
    verdade(/enviarGradeParaPreenchimento: grade 2027\/1/.test(logs), 'registra o envio');
    verdade(!/@/.test(logs) && !/ID_[A-Z]/.test(logs) && logs.indexOf('Inteligência') < 0, logs.slice(0, 400));
  });

  ev('\n=== RESULTADO ===\nExecutados: ' + (ok + falhas) + ' (' + ok + ' ok, ' + falhas + ' falha(s)); pulados: 0');
  fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
  fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
  console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0  — evidências em ${path.relative(process.cwd(), ARQ_EVIDENCIAS)}`);
  if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }
})();

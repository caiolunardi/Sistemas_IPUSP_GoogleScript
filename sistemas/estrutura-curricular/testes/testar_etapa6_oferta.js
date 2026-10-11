// Etapa 6 (1.8.9; 1.8.10: seção N, restauração explícita) — oferta ajustada depois de uma troca de currículo.
//
// A oferta ajustada no painel ("Oferta ajustada" em "Ajustes manuais",
// lista [{curriculo, tipo, periodo}]) é gravada com o número do currículo
// em uso. Quando uma importação substitui esse currículo, a 1.8.8 lia a
// mesma lista de quatro jeitos diferentes: o painel (indexar) descartava os
// vínculos do currículo antigo (oferta vazia, semestre ""), o servidor
// (oferecimentoCalculado_) usava todos (semestre "2"), o envio da grade
// (ofertaPrincipal_) não achava a oferta principal (tipo e período vazios) e
// adicionarAGrade aceitava a disciplina.
//
// Esta suíte usa as funções REAIS dos dois lados sobre a MESMA persistência:
//  - servidor: contextoPreparacao_, oferecimentoEfetivo_, ofertaPrincipal_,
//    linhasDaGrade_, salvarDisciplina, adicionarAGrade, obterDadosPainel;
//  - painel: o script real do PainelApp.html (cliente_painel.js) —
//    indexar, ofertasDe, oferecimentoDe — sobre a resposta de
//    obterDadosPainel de um CONTEXTO NOVO (reabertura).
// Estrutura curricular SINTÉTICA do curso 47012 (currículos 47012 0000/0100/
// 0200 262 e sucessores 271/272; disciplinas PST1001… "Sintética"). E-mails
// .example. Nenhum dado real além do formato dos números de currículo.
//
// Uso: node testar_etapa6_oferta.js [--evidencias arq]
//      DIR_SRC=/caminho/fonte/src … para rodar em outra fonte (ex.: 1.8.8, "antes").
//      DIR_SRC_LEGADO=/caminho/fonte-1.8.8/src … para o caso G (base criada e
//      importada pela 1.8.8, aberta pela fonte testada). Sem ela, G é PULADO.
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const { carregarCliente } = require('./cliente_painel');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const DIR_SRC_LEGADO = process.env.DIR_SRC_LEGADO || '';
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa6_oferta.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);

let ok = 0, falhas = 0;
const falhou = [], pulados = [];
function teste(nome, fn) {
  ev('\n--- ' + nome);
  try { fn(); ok++; console.log('  ✓', nome); ev('RESULTADO: ok'); }
  catch (e) {
    falhas++; falhou.push(nome);
    console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e);
    ev('RESULTADO: FALHOU — ' + String(e && e.message || e).split('\n')[0]);
  }
}
function pular(nome, motivo) { pulados.push(nome + ' — ' + motivo); console.log('  - PULADO', nome, '(' + motivo + ')'); ev('\n--- ' + nome + '\nRESULTADO: PULADO — ' + motivo); }
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

// ---------------------------------------------------------------- dados sintéticos
const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';
const AJ = 'Ajustes manuais';
const OU = 'Disciplinas para outros cursos';
const META_ATIVA = 'estruturaCurricular.ativa';
const HAB = { 0: 'Psicólogo', 100: 'Psicologia - Bacharelado', 200: 'Psicologia - Licenciatura' };
// Currículos: P = Psicólogo (0000), B = Bacharelado (0100), L = Licenciatura (0200); 262 → 271 → 272.
const P262 = '470120000262', B262 = '470120100262', L262 = '470120200262';
const P271 = '470120000271', B271 = '470120100271', L271 = '470120200271';
const P272 = '470120000272';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA', LI = 'OPTATIVA_LIVRE';

/** Pacote no formato do leitor (validarPacote_) a partir de [currículo, disciplina, tipo, período]. */
function pacoteCurso(vinc, formato) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: String(parseInt(c.slice(5, 9), 10)), habilitacaoNome: HAB[parseInt(c.slice(5, 9), 10)], ano: 2000 + parseInt(c.slice(9, 11), 10), semestre: +c.slice(11), situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: 'Sintética ' + d, versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 })),
    vinculos: vinc.map((v) => ({ curriculo: v[0], disciplina: v[1], tipo: v[2], periodoIdeal: v[3] })),
    requisitos: [], avisos: [], conferencia: null,
    origem: { formato: 'csv', leitura: 'csv', arquivo: 'sintetico.csv', tamanhoBytes: 1000, codificacao: 'UTF-8', geradoEm: null }
  };
  if (formato === 'pdf') {
    p.origem = { formato: 'pdf', leitura: 'texto', arquivo: 'sintetico.pdf', tamanhoBytes: null, geradoEm: '2026-09-26T10:00:00', paginas: 1 };
    p.disciplinas.forEach((d) => { d.versao = 1; d.versaoOrigem = 'pdf'; d.ext = 0; d.naoConfirmados = []; d.paginas = [1]; });
    p.vinculos.forEach((v) => { v.periodoConfirmado = true; });
  }
  const por = {};
  curs.forEach((c) => {
    const vs = p.vinculos.filter((v) => v.curriculo === c);
    por[c] = { disciplinas: vs.length, OBRIGATORIA: vs.filter((v) => v.tipo === OB).length, OPTATIVA_ELETIVA: vs.filter((v) => v.tipo === EL).length, OPTATIVA_LIVRE: vs.filter((v) => v.tipo === LI).length, requisitos: 0 };
  });
  p.resumoLeitura = { curriculos: curs.length, disciplinas: discs.length, vinculos: vinc.length, requisitos: 0, porCurriculo: por };
  if (formato === 'pdf') p.resumoLeitura.paginas = 1;
  return p;
}
function importar(amb, pk) {
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  return pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
}
function ambienteVazio(dirSrc) {
  const amb = criarAmbiente({ dirSrc: dirSrc || DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(amb.ctx.obterDadosPainel());
  return amb;
}
function reabrir(origem, usuario, dirSrc) { return criarAmbiente({ dirSrc: dirSrc || DIR_SRC, reusar: origem, usuario: usuario || ADMIN, dono: ADMIN }); }
const E = (k) => ({ origem: 'estrutura', chave: k });
function salvarOferta(amb, chave, oferta, extra) { return amb.ctx.salvarDisciplina(Object.assign({ origem: 'estrutura', chave, campos: {}, oferta }, extra || {})); }

// Base do caso principal (reprodução): só a habilitação 0, PST1001 obrigatória no período 1.
const BASE_A = [[P262, 'PST1001', OB, 1], [P262, 'PST1002', OB, 2]];
const SUCESSOR_A = [[P271, 'PST1001', OB, 1], [P271, 'PST1002', OB, 2]];
// Base com as três habilitações.
const BASE_3 = [
  [P262, 'PST1001', OB, 1], [B262, 'PST1001', OB, 1], [L262, 'PST1001', OB, 1],
  [P262, 'PST1002', OB, 2], [B262, 'PST1002', EL, 2],
  [L262, 'PST1003', OB, 3],
  [P262, 'PSA1004', LI, null], [B262, 'PSA1004', LI, null],
  [P262, 'PSE1005', OB, 5], [B262, 'PSE1005', OB, 5], [L262, 'PSE1005', OB, 5]
];
const troca = (lista, de, para) => lista.map((v) => [v[0] === de ? para : v[0], v[1], v[2], v[3]]);
const SUCESSOR_3 = troca(troca(troca(BASE_3, P262, P271), B262, B271), L262, L271);

// ---------------------------------------------------------------- leitura DIRETA da persistência
function metadado(ss, k) { const m = ss.meta.find((x) => x.k === k); return m ? m.v : null; }
function abaAtiva(amb, nome) { const ss = amb.estrutura(); const m = JSON.parse(metadado(ss, META_ATIVA)); return ss.sheets.find((s) => s.getSheetId() === m.abas[nome]); }
function tabela(aba) { return aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues(); }
function celula(aba, tituloChave, chave, tituloCol) {
  const v = tabela(aba);
  const ck = v[0].indexOf(tituloChave), cc = v[0].indexOf(tituloCol);
  const i = v.findIndex((l, n) => n > 0 && String(l[ck]) === chave);
  return i < 0 ? undefined : v[i][cc];
}
function mudarCelula(aba, tituloChave, chave, tituloCol, valor) {
  const v = tabela(aba);
  const ck = v[0].indexOf(tituloChave), cc = v[0].indexOf(tituloCol);
  const i = v.findIndex((l, n) => n > 0 && String(l[ck]) === chave);
  if (i < 0 || cc < 0) throw new Error('célula não encontrada: ' + chave + ' / ' + tituloCol);
  aba.getRange(i + 1, cc + 1).setValue(valor);
}
const CHAVE_AJ = 'Disciplina (código no Júpiter)';
function ofertaGuardada(amb, chave) { const v = celula(amb.estrutura().getSheetByName(AJ), CHAVE_AJ, chave, 'Oferta ajustada'); return v === undefined ? '(sem linha)' : v; }
function guardarOferta(amb, chave, texto) { mudarCelula(amb.estrutura().getSheetByName(AJ), CHAVE_AJ, chave, 'Oferta ajustada', texto); }
function mudarVigente(amb, curriculo, texto) { mudarCelula(abaAtiva(amb, 'Currículos'), 'Currículo', curriculo, 'Na base atual', texto); }
function ajustesBrutos(amb) { return JSON.stringify(tabela(amb.estrutura().getSheetByName(AJ))); }
function escritasAjustes(amb) { return amb.estado.eventos.filter((e) => /^set/.test(e.tipo) && e.aba === AJ && !/Depois$/.test(e.tipo)).length; }

// ---------------------------------------------------------------- os dois lados
const curto = (o) => o ? o.curriculo + ':' + o.tipo + ':' + (o.periodo === null || o.periodo === undefined || o.periodo === '' ? '-' : Number(o.periodo)) : null;
/** Servidor: contexto novo sobre a persistência; funções reais. */
function servidor(amb, chave) {
  const ctx = amb.ctx.contextoPreparacao_(amb.estrutura());
  const aj = ctx.ajustes[chave];
  let vinculos;
  if (typeof amb.ctx.ofertaEfetiva_ === 'function') vinculos = amb.ctx.ofertaEfetiva_(ctx, chave, aj).vinculos;
  else {   // fonte sem resolvedor (1.8.8): a lista que oferecimentoCalculado_ usava
    let l = null; if (aj && aj.oferta) { try { l = JSON.parse(aj.oferta); } catch (e) { l = null; } }
    vinculos = l || ctx.ofertaJupiter[chave] || [];
  }
  return {
    oferecimento: amb.ctx.oferecimentoEfetivo_(ctx, E(chave)),
    principal: curto(amb.ctx.ofertaPrincipal_(ctx, chave, aj)),
    vinculos: vinculos.map(curto).sort()
  };
}
/** Painel: script real do PainelApp sobre a resposta de obterDadosPainel. */
function cliente(dados, chave, dirSrc) {
  const c = carregarCliente(dirSrc || DIR_SRC);
  c.indexar(dados);
  const ofertas = c.ofertasDe(chave);
  const d = c.disciplina(chave);
  return {
    oferecimento: c.oferecimentoDe(chave),
    principal: curto(ofertas.filter((o) => o.tipo)[0] || null),   // ofertasDe já vem em ordem de habilitação
    vinculos: ofertas.map(curto).sort(),
    pendencias: (d._ofertaPendencias || []).length,
    associada: d._ofertaAssociada || 0,
    _c: c
  };
}
function ajusteDoPainel(dados, chave) { return (dados.preparacao.ajustes || []).find((a) => a.chave === chave) || null; }
function verLados(amb, chave, usuario) {
  const a = reabrir(amb, usuario);
  const dados = pedir(a.ctx.obterDadosPainel());
  const s = servidor(a, chave);
  const c = cliente(dados, chave);
  const aj = ajusteDoPainel(dados, chave);
  ev('  [' + (usuario === LEITOR ? 'leitor' : 'admin') + '] ' + chave + ' servidor ' + JSON.stringify(s) + ' · painel ' + JSON.stringify({ oferecimento: c.oferecimento, principal: c.principal, vinculos: c.vinculos, pendencias: c.pendencias, associada: c.associada }));
  ev('    contrato: oferta=' + JSON.stringify(aj && aj.oferta) + ' ofertaEfetiva=' + JSON.stringify(aj && aj.ofertaEfetiva) + ' ofertaPendencias=' + JSON.stringify(aj && aj.ofertaPendencias) + ' ofertaAssociada=' + JSON.stringify(aj && aj.ofertaAssociada));
  return { a, dados, s, c, aj };
}
function coerente(l, msg) {
  igual(l.c.oferecimento, l.s.oferecimento, (msg || '') + ' semestre de oferecimento painel × servidor');
  igual(l.c.principal, l.s.principal, (msg || '') + ' oferta principal painel × servidor (grade)');
  igual(l.c.vinculos, l.s.vinculos, (msg || '') + ' oferta efetiva painel × servidor (filtros)');
}
/** O que a ficha manda ao salvar sem mexer em "Onde aparece": a oferta mostrada (efetiva). */
function ofertaDaFicha(l, chave) { return l.c._c.ofertasDe(chave).filter((o) => o.tipo).map((o) => ({ curriculo: o.curriculo, tipo: o.tipo, periodo: o.periodo || null })); }

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 6 — oferta ajustada depois de troca de currículo ===');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* */ }

/** Cenário A: base 262 (hab 0), oferta ajustada PST1001 → 262 OBRIGATORIA 4, sucessor 271. */
function cenarioA() {
  const amb = ambienteVazio();
  importar(amb, pacoteCurso(BASE_A));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P262, tipo: OB, periodo: 4 }]));
  return amb;
}

// =====================================================================
console.log('\n== A. Reprodução: oferta ajustada no currículo 262, importação do sucessor 271');
teste('A1. painel e servidor concordam (semestre "2", principal 271 obrigatória 4) — admin e leitor, contexto novo', () => {
  const amb = cenarioA();
  const guardada = ofertaGuardada(amb, 'PST1001');
  const antes = verLados(amb, 'PST1001');
  coerente(antes, 'antes da troca:');
  igual(antes.s.oferecimento, '2', 'antes da troca');
  const esc0 = escritasAjustes(amb);
  importar(amb, pacoteCurso(SUCESSOR_A));
  ev('  escritas em "Ajustes manuais" durante a importação: ' + (escritasAjustes(amb) - esc0));
  igual(escritasAjustes(amb) - esc0, 0, 'a importação não escreve em Ajustes manuais');
  igual(ofertaGuardada(amb, 'PST1001'), guardada, 'lista guardada intacta (aponta para 262)');
  for (const u of [ADMIN, LEITOR]) {
    const l = verLados(amb, 'PST1001', u);
    coerente(l, u + ':');
    igual(l.s.oferecimento, '2', u + ': semestre pelo período ajustado 4');
    igual(l.s.principal, P271 + ':OBRIGATORIA:4', u + ': principal associada ao sucessor, tipo/período ajustados');
    igual([l.c.pendencias, l.c.associada], [0, 1], u + ': nada a revisar; 1 vínculo associado');
    igual(l.aj.oferta, [{ curriculo: P262, tipo: OB, periodo: 4 }], u + ': contrato mantém a lista original');
  }
});
teste('A2. adicionarAGrade aceita e a linha da grade sai com tipo e período ajustados (sem oferta principal vazia)', () => {
  const amb = cenarioA();
  importar(amb, pacoteCurso(SUCESSOR_A));
  const a = reabrir(amb);
  const r = pedir(a.ctx.adicionarAGrade([E('PST1001')]));
  ev('  adicionarAGrade: ' + JSON.stringify({ adicionadas: r.adicionadas, semOferecimento: r.semOferecimento }));
  const ctx = a.ctx.contextoPreparacao_(a.estrutura());
  const g2 = a.ctx.linhasDaGrade_(ctx, '2').PST.filter((x) => x.codigo === 'PST1001');
  const g1 = a.ctx.linhasDaGrade_(ctx, '1').PST.filter((x) => x.codigo === 'PST1001');
  ev('  linhasDaGrade_ 2º: ' + JSON.stringify(g2.map((x) => [x.codigo, x.tipo, x.semestreIdeal])) + ' · 1º: ' + JSON.stringify(g1.map((x) => x.codigo)));
  igual(g2.map((x) => [x.tipo, x.semestreIdeal]), [['Obrigatória', 4]], 'linha da grade do 2º semestre');
  igual(g1.length, 0, 'fora do 1º semestre');
  // prévia do painel (mesmo critério: adicionada + oferecida no semestre) × grade
  const l = verLados(a, 'PST1001');
  verdade(l.c._c.disciplina('PST1001')._naGrade, 'marcada no painel');
  igual([l.c._c.oferecidaNoSemestre('PST1001', '2'), l.c._c.oferecidaNoSemestre('PST1001', '1')], [true, false], 'prévia do painel: 2º sim, 1º não');
});

// =====================================================================
console.log('\n== B. Paridades, várias habilitações e filtros');
teste('B1. três habilitações trocadas: ímpar/par/sem período → "ambos"; principal Psicólogo; filtros iguais', () => {
  const amb = ambienteVazio();
  importar(amb, pacoteCurso(BASE_3));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P262, tipo: OB, periodo: 3 }, { curriculo: B262, tipo: EL, periodo: 4 }, { curriculo: L262, tipo: LI, periodo: null }]));
  pedir(salvarOferta(amb, 'PST1002', [{ curriculo: P262, tipo: OB, periodo: 5 }, { curriculo: B262, tipo: EL, periodo: 7 }]));
  pedir(salvarOferta(amb, 'PST1003', [{ curriculo: B262, tipo: EL, periodo: 2 }, { curriculo: L262, tipo: OB, periodo: 6 }]));
  importar(amb, pacoteCurso(SUCESSOR_3));
  const esperado = {
    PST1001: ['ambos', P271 + ':OBRIGATORIA:3', [B271 + ':OPTATIVA_ELETIVA:4', L271 + ':OPTATIVA_LIVRE:-', P271 + ':OBRIGATORIA:3'].sort(), 3],
    PST1002: ['1', P271 + ':OBRIGATORIA:5', [B271 + ':OPTATIVA_ELETIVA:7', P271 + ':OBRIGATORIA:5'].sort(), 2],
    PST1003: ['2', B271 + ':OPTATIVA_ELETIVA:2', [B271 + ':OPTATIVA_ELETIVA:2', L271 + ':OBRIGATORIA:6'].sort(), 2]
  };
  Object.keys(esperado).forEach((k) => {
    const l = verLados(amb, k);
    coerente(l, k + ':');
    igual([l.s.oferecimento, l.s.principal, l.s.vinculos, l.c.associada, l.c.pendencias], esperado[k].concat([0]), k);
  });
  // filtros do painel (semestre, habilitação, período): mesma oferta efetiva
  const l = verLados(amb, 'PST1001');
  const c = l.c._c;
  igual(['PST1001', 'PST1002', 'PST1003'].filter((k) => c.oferecidaNoSemestre(k, '1')), ['PST1001', 'PST1002'], 'filtro 1º semestre');
  igual(['PST1001', 'PST1002', 'PST1003'].filter((k) => c.oferecidaNoSemestre(k, '2')), ['PST1001', 'PST1003'], 'filtro 2º semestre');
  igual(c.ofertasDe('PST1001').map((o) => o.habCodigo + '/' + (o.periodo || '-')), ['0/3', '100/4', '200/-'], 'habilitações e períodos no filtro');
});
teste('B2. só uma habilitação trocada: vínculo direto (Bacharelado 262 em uso) e associado (Psicólogo 262 → 271) juntos', () => {
  const amb = ambienteVazio();
  importar(amb, pacoteCurso(BASE_3));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: B262, tipo: EL, periodo: 6 }]));
  importar(amb, pacoteCurso(BASE_3.filter((v) => v[0] === P262).map((v) => [P271, v[1], v[2], v[3]])));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.s.vinculos, l.c.associada, l.c.pendencias], ['2', P271 + ':OBRIGATORIA:4', [B262 + ':OPTATIVA_ELETIVA:6', P271 + ':OBRIGATORIA:4'].sort(), 1, 0]);
});
teste('B3. prioridade da grade: sem Psicólogo na oferta ajustada, a principal é a do Bacharelado (antes da Licenciatura)', () => {
  const amb = ambienteVazio();
  importar(amb, pacoteCurso(BASE_3));
  pedir(salvarOferta(amb, 'PSE1005', [{ curriculo: L262, tipo: OB, periodo: 1 }, { curriculo: B262, tipo: EL, periodo: 8 }]));
  importar(amb, pacoteCurso(SUCESSOR_3));
  const l = verLados(amb, 'PSE1005');
  coerente(l);
  igual([l.s.principal, l.s.oferecimento], [B271 + ':OPTATIVA_ELETIVA:8', 'ambos']);
});

// =====================================================================
console.log('\n== C. Reimportação do mesmo currículo, complemento por PDF e disciplina sem ajuste');
teste('C1. reimportar o MESMO currículo (CSV, Júpiter com outro período): oferta ajustada continua valendo, nada associado', () => {
  const amb = cenarioA();
  const guardada = ofertaGuardada(amb, 'PST1001');
  importar(amb, pacoteCurso([[P262, 'PST1001', OB, 3], [P262, 'PST1002', OB, 2]]));
  igual(ofertaGuardada(amb, 'PST1001'), guardada, 'lista guardada intacta');
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.c.associada, l.c.pendencias], ['2', P262 + ':OBRIGATORIA:4', 0, 0]);
});
teste('C2. complemento por PDF do mesmo currículo: oferta ajustada intacta e coerente', () => {
  const amb = cenarioA();
  const guardada = ofertaGuardada(amb, 'PST1001');
  let r;
  try { r = importar(amb, pacoteCurso(BASE_A, 'pdf')); }
  catch (e) { ev('  complemento por PDF recusado pelo servidor: ' + e.message); throw e; }
  ev('  importação PDF: ' + JSON.stringify(r && (r.resumo || r.registro || Object.keys(r))).slice(0, 300));
  igual(ofertaGuardada(amb, 'PST1001'), guardada, 'lista guardada intacta');
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal], ['2', P262 + ':OBRIGATORIA:4']);
});
teste('C3. disciplina SEM ajuste depois da troca: oferta do Júpiter (sucessor) nos dois lados; contrato sem oferta efetiva', () => {
  const amb = cenarioA();
  importar(amb, pacoteCurso([[P271, 'PST1001', OB, 1], [P271, 'PST1002', OB, 3]]));
  const l = verLados(amb, 'PST1002');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.aj], ['1', P271 + ':OBRIGATORIA:3', null], 'sem linha de ajuste');
});

// =====================================================================
console.log('\n== D. Oferta [] intencional');
teste('D1. [] continua sendo "retirada de todas as habilitações" depois da troca: sem oferta, sem pendência, sem Júpiter', () => {
  const amb = cenarioA();
  pedir(salvarOferta(amb, 'PST1002', []));
  igual(ofertaGuardada(amb, 'PST1002'), '[]', 'gravado []');
  importar(amb, pacoteCurso(SUCESSOR_A));
  const l = verLados(amb, 'PST1002');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.s.vinculos, l.c.pendencias], ['', null, [], 0]);
  igual([l.aj.oferta, l.aj.ofertaEfetiva], [[], []], 'contrato: [] e efetiva []');
  // diferente de "sem ajuste" (Júpiter) e de "a revisar"
  const sem = verLados(amb, 'PST1001');
  verdade(sem.s.vinculos.length === 1, 'a outra disciplina tem oferta');
  const r = reabrir(amb).ctx.adicionarAGrade([E('PST1002')]);
  igual(pedir(r).semOferecimento.map((x) => x.chave), ['PST1002'], 'grade: [] sem semestre não entra');
});

// =====================================================================
console.log('\n== E. Vínculos que não podem ser associados com segurança');
function cenarioE() { const amb = cenarioA(); importar(amb, pacoteCurso(SUCESSOR_A)); return amb; }
teste('E1. currículo desconhecido na lista guardada: a revisar, com motivo; não conta no semestre nem na grade', () => {
  const amb = cenarioE();
  guardarOferta(amb, 'PST1001', JSON.stringify([{ curriculo: '470120900262', tipo: OB, periodo: 4 }]));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.s.vinculos], ['', null, []], 'sem influência escondida');
  igual(l.aj.ofertaPendencias.map((p) => [p.curriculo, p.tipo, p.periodo]), [['470120900262', OB, 4]], 'preservado');
  verdade(/desconhecido/.test(l.aj.ofertaPendencias[0].motivo), 'motivo: ' + l.aj.ofertaPendencias[0].motivo);
  igual(pedir(l.a.ctx.adicionarAGrade([E('PST1001')])).semOferecimento.map((x) => x.chave), ['PST1001'], 'grade: não entra sem semestre');
});
teste('E2. currículo fora de uso SEM sucessor registrado (texto "Não" sem número): a revisar', () => {
  const amb = cenarioE();
  mudarVigente(amb, P262, 'Não');
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.c.pendencias], ['', null, 1]);
  verdade(/sem sucessor/.test(l.aj.ofertaPendencias[0].motivo), l.aj.ofertaPendencias[0].motivo);
});
teste('E3. sucessor registrado de OUTRA habilitação: a revisar (nunca associa entre habilitações)', () => {
  const amb = ambienteVazio();
  importar(amb, pacoteCurso(BASE_3));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: B262, tipo: EL, periodo: 5 }]));
  importar(amb, pacoteCurso(SUCESSOR_3));
  mudarVigente(amb, P262, 'Não — substituído por ' + B271 + ' em 01/01/2027');
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.vinculos, l.s.oferecimento, l.c.pendencias], [[B271 + ':OPTATIVA_ELETIVA:5'], '1', 1]);
  verdade(/outra habilitação/.test(l.aj.ofertaPendencias[0].motivo), l.aj.ofertaPendencias[0].motivo);
});
teste('E4. conflito: vínculo antigo (262 → 271) e vínculo direto 271 com períodos diferentes — o direto vale, o antigo fica a revisar', () => {
  const amb = cenarioE();
  guardarOferta(amb, 'PST1001', JSON.stringify([{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: P271, tipo: OB, periodo: 7 }]));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.vinculos, l.s.oferecimento, l.c.pendencias, l.c.associada], [[P271 + ':OBRIGATORIA:7'], '1', 1, 0]);
  verdade(/conflito/.test(l.aj.ofertaPendencias[0].motivo), l.aj.ofertaPendencias[0].motivo);
});
teste('E5. resolvedor (função do servidor): conflito sem direto, equivalentes, ilegível, circular, cadeia, fora do padrão', () => {
  const amb = ambienteVazio();
  const c = amb.ctx;
  verdade(typeof c.resolverOferta_ === 'function', 'resolverOferta_ existe');
  const linha = (cur, vig, hab) => ({ curriculo: cur, curso: '47012 - Psicologia', habilitacaoCodigo: hab === undefined ? String(parseInt(cur.slice(5, 9), 10)) : hab, vigente: vig });
  const t = c.tabelaCurriculos_([
    linha('470120000252', 'Não — substituído por 470120000262 em 01/01/2026'), linha(P262, 'Não — substituído por ' + P271 + ' em 01/01/2027'), linha(P271, 'Sim'),
    linha('470120100252', 'Não — substituído por 470120100261 em 01/01/2026'), linha('470120100261', 'Não — substituído por 470120100252 em 01/01/2026'),
    linha(B262, 'Sim')
  ]);
  const r1 = c.resolverOferta_([{ curriculo: '470120000252', tipo: OB, periodo: 2 }, { curriculo: P262, tipo: OB, periodo: 3 }], t);
  ev('  sem direto, valores diferentes: ' + JSON.stringify(r1));
  igual([r1.vinculos.length, r1.pendentes.length], [0, 2], 'conflito sem direto: todos a revisar');
  const r2 = c.resolverOferta_([{ curriculo: '470120000252', tipo: OB, periodo: 3 }, { curriculo: P262, tipo: OB, periodo: 3 }], t);
  igual([r2.vinculos.map(curto), r2.pendentes.length, r2.associados], [[P271 + ':OBRIGATORIA:3'], 0, 1], 'equivalentes: vale um só');
  const r3 = c.resolverOferta_([null, 'x', { curriculo: '470120100252', tipo: OB, periodo: 1 }, { curriculo: '4701200', tipo: OB, periodo: 1 }, { curriculo: P262, tipo: EL, periodo: 9 }], t);
  ev('  ilegível/circular/fora do padrão: ' + JSON.stringify(r3));
  igual(r3.vinculos.map(curto), [P271 + ':OPTATIVA_ELETIVA:9'], 'cadeia 262 → 271');
  igual(r3.pendentes.map((p) => p.motivo.replace(/\d{12}/g, 'N')), ['vínculo ilegível', 'vínculo ilegível', 'sucessão circular a partir do currículo N', 'referência de currículo fora do padrão (12 dígitos)']);
  const r4 = c.resolverOferta_([{ curriculo: '470120000252', tipo: OB, periodo: 2 }], t);
  igual([r4.vinculos.map((v) => [v.curriculo, v.origem]), r4.associados], [[[P271, '470120000252']], 1], 'duas trocas seguidas (252 → 262 → 271)');
  // mesma habilitação pelos dígitos, mas coluna "Cód. habilitação" divergente: não associa
  const t2 = c.tabelaCurriculos_([linha(P262, 'Não — substituído por ' + P271 + ' em 01/01/2027'), linha(P271, 'Sim', '100')]);
  igual(c.resolverOferta_([{ curriculo: P262, tipo: OB, periodo: 2 }], t2).pendentes.length, 1, 'coluna da habilitação divergente');
});

// =====================================================================
console.log('\n== F. Resolução parcial');
teste('F1. um vínculo associado, um direto e um a revisar: só os dois primeiros valem; o terceiro fica visível', () => {
  const amb = ambienteVazio();
  importar(amb, pacoteCurso(BASE_3));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: B262, tipo: EL, periodo: 6 }]));
  importar(amb, pacoteCurso(BASE_3.filter((v) => v[0] === P262).map((v) => [P271, v[1], v[2], v[3]])));
  const lista = JSON.parse(ofertaGuardada(amb, 'PST1001'));
  lista.push({ curriculo: '470120300262', tipo: LI, periodo: 1 });
  guardarOferta(amb, 'PST1001', JSON.stringify(lista));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.vinculos, l.s.oferecimento, l.s.principal, l.c.associada, l.c.pendencias], [[B262 + ':OPTATIVA_ELETIVA:6', P271 + ':OBRIGATORIA:4'].sort(), '2', P271 + ':OBRIGATORIA:4', 1, 1], 'o período ímpar do vínculo a revisar não conta');
});

// =====================================================================
console.log('\n== G. Base legada (criada, ajustada e importada pela 1.8.8), aberta sem reimportar');
if (!DIR_SRC_LEGADO) pular('G1. base legada', 'DIR_SRC_LEGADO não definido');
else teste('G1. legado: admin e leitor veem a oferta associada, coerente nos dois lados, sem nenhuma escrita em Ajustes ao abrir', () => {
  const amb = ambienteVazio(DIR_SRC_LEGADO);
  importar(amb, pacoteCurso(BASE_3));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: B262, tipo: EL, periodo: 6 }]));
  pedir(salvarOferta(amb, 'PST1002', []));
  importar(amb, pacoteCurso(SUCESSOR_3));
  const bruto = ajustesBrutos(amb);
  for (const u of [ADMIN, LEITOR]) {
    const a = reabrir(amb, u);
    const e0 = escritasAjustes(a);
    const dados = pedir(a.ctx.obterDadosPainel());
    igual(escritasAjustes(a) - e0, 0, u + ': abrir não escreve em Ajustes manuais');
    const s = servidor(a, 'PST1001'), cl = cliente(dados, 'PST1001');
    const l = { s, c: cl };
    ev('  [' + u + '] servidor ' + JSON.stringify(s) + ' · painel ' + JSON.stringify({ oferecimento: cl.oferecimento, principal: cl.principal, vinculos: cl.vinculos, associada: cl.associada }));
    coerente(l, u + ':');
    igual([s.oferecimento, s.principal, cl.associada], ['2', P271 + ':OBRIGATORIA:4', 2], u);
    const s2 = servidor(a, 'PST1002'), c2 = cliente(dados, 'PST1002');
    coerente({ s: s2, c: c2 }, u + ' PST1002:');
    igual([s2.vinculos, c2.pendencias], [[], 0], u + ': [] legado');
  }
  igual(ajustesBrutos(amb), bruto, 'aba de ajustes intacta');
});

// =====================================================================
console.log('\n== H. Duas trocas seguidas');
teste('H1. 262 → 271 → 272 sem abrir a ficha: associada ao 272 com o período ajustado', () => {
  const amb = cenarioA();
  importar(amb, pacoteCurso(SUCESSOR_A));
  importar(amb, pacoteCurso(troca(SUCESSOR_A, P271, P272)));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.c.associada, l.c.pendencias], ['2', P272 + ':OBRIGATORIA:4', 1, 0]);
});
teste('H2. ajuste refeito no 271 e nova troca para 272: associada ao 272', () => {
  const amb = cenarioA();
  importar(amb, pacoteCurso(SUCESSOR_A));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P271, tipo: EL, periodo: 5 }], { ofertaPendentes: 'descartar' }));
  importar(amb, pacoteCurso(troca(SUCESSOR_A, P271, P272)));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal], ['1', P272 + ':OPTATIVA_ELETIVA:5']);
});

// =====================================================================
console.log('\n== I. Semestre ajustado manualmente continua tendo prioridade');
teste('I1. semestre manual 1º com oferta ajustada (período 4) associada ao sucessor: 1º nos dois lados', () => {
  const amb = cenarioA();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { oferecimento: '1' }, oferta: null }));
  importar(amb, pacoteCurso(SUCESSOR_A));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal], ['1', P271 + ':OBRIGATORIA:4']);
});
teste('I2. semestre manual com a oferta toda a revisar: o manual vale, a grade aceita com tipo/período vazios', () => {
  const amb = cenarioE();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { oferecimento: 'ambos' }, oferta: null }));
  guardarOferta(amb, 'PST1001', JSON.stringify([{ curriculo: '470120900262', tipo: OB, periodo: 4 }]));
  const l = verLados(amb, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.s.principal, l.c.pendencias], ['ambos', null, 1]);
  pedir(l.a.ctx.adicionarAGrade([E('PST1001')]));
  const g = l.a.ctx.linhasDaGrade_(l.a.ctx.contextoPreparacao_(l.a.estrutura()), '1').PST.filter((x) => x.codigo === 'PST1001');
  igual(g.map((x) => [x.tipo, x.semestreIdeal]), [['', null]], 'linha sem tipo/período (vínculo a revisar não entra)');
});

// =====================================================================
console.log('\n== J. Ficha: salvar outros campos, descartar e voltar ao Júpiter');
/** Cenário com um vínculo associado e um a revisar. */
function cenarioJ() {
  const amb = cenarioE();
  guardarOferta(amb, 'PST1001', JSON.stringify([{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: '470120900262', tipo: EL, periodo: 3 }]));
  return amb;
}
teste('J1. salvar SÓ o nome pela ficha (que reenvia a oferta mostrada): nome gravado, lista guardada e pendências intactas', () => {
  const amb = cenarioJ();
  const guardada = ofertaGuardada(amb, 'PST1001');
  const l = verLados(amb, 'PST1001');
  const oferta = ofertaDaFicha(l, 'PST1001');
  ev('  oferta reenviada pela ficha: ' + JSON.stringify(oferta));
  const r = l.a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome novo' }, oferta, observacoes: '' });
  ev('  resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null }));
  pedir(r);
  igual(ofertaGuardada(l.a, 'PST1001'), guardada, 'lista guardada intacta (vínculo a revisar não foi apagado)');
  const d = verLados(l.a, 'PST1001');
  igual([d.c._c.disciplina('PST1001').nome, d.c.pendencias, d.c.associada, d.s.oferecimento], ['Nome novo', 1, 1, '2']);
});
teste('J2. mudar a oferta sem "Descartar os vínculos a revisar": recusado (OFERTA_A_REVISAR), nada gravado', () => {
  const amb = cenarioJ();
  const bruto = ajustesBrutos(amb);
  const r = reabrir(amb).ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Outro' }, oferta: [{ curriculo: P271, tipo: OB, periodo: 6 }] });
  ev('  resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, erro: r.erro || null }));
  igual([r.ok, r.codigo], [false, 'OFERTA_A_REVISAR']);
  igual(ajustesBrutos(amb), bruto, 'aba intacta');
});
teste('J3. mudar a oferta COM descarte: grava a nova lista (só currículos em uso) e as pendências somem', () => {
  const amb = cenarioJ();
  const a = reabrir(amb);
  pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P271, tipo: OB, periodo: 6 }], ofertaPendentes: 'descartar' }));
  igual(JSON.parse(ofertaGuardada(a, 'PST1001')), [{ curriculo: P271, tipo: OB, periodo: 6 }]);
  const l = verLados(a, 'PST1001');
  coerente(l);
  igual([l.c.pendencias, l.c.associada, l.s.oferecimento], [0, 0, '2']);
});
teste('J4. voltar à oferta do Júpiter: sem descarte é recusado; com descarte a coluna fica vazia (oferta do Júpiter)', () => {
  const amb = cenarioJ();
  const a = reabrir(amb);
  const jup = [{ curriculo: P271, tipo: OB, periodo: 1 }];
  igual(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: jup }).codigo, 'OFERTA_A_REVISAR');
  pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: jup, ofertaPendentes: 'descartar' }));
  verdade(['', '(sem linha)'].includes(ofertaGuardada(a, 'PST1001')), 'sem oferta ajustada (coluna vazia ou linha de ajuste sem nada a guardar removida): ' + ofertaGuardada(a, 'PST1001'));
  const l = verLados(a, 'PST1001');
  coerente(l);
  igual([l.s.oferecimento, l.aj && l.aj.oferta, l.c.pendencias], ['1', null, 0]);
});
teste('J5. descarte confirmado sem mudar a tabela: grava a oferta efetiva (associada, sem o vínculo a revisar)', () => {
  const amb = cenarioJ();
  const l0 = verLados(amb, 'PST1001');
  pedir(l0.a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: ofertaDaFicha(l0, 'PST1001'), ofertaPendentes: 'descartar' }));
  igual(JSON.parse(ofertaGuardada(l0.a, 'PST1001')), [{ curriculo: P271, tipo: OB, periodo: 4 }]);
  const l = verLados(l0.a, 'PST1001');
  igual([l.c.pendencias, l.c.associada, l.s.principal], [0, 0, P271 + ':OBRIGATORIA:4']);
});
teste('J6. sem pendências, mudar a oferta continua como antes (sem descarte); "oferta: null" não mexe na lista', () => {
  const amb = cenarioE();   // só associada
  const a = reabrir(amb);
  const guardada = ofertaGuardada(a, 'PST1001');
  pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'X' }, oferta: null }));
  igual(ofertaGuardada(a, 'PST1001'), guardada, 'oferta null: lista intacta');
  pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P271, tipo: EL, periodo: 3 }] }));
  igual(JSON.parse(ofertaGuardada(a, 'PST1001')), [{ curriculo: P271, tipo: EL, periodo: 3 }]);
});

// =====================================================================
console.log('\n== K. Grade: adicionar, salvar e adicionar, prévia × linhas enviadas');
teste('K1. "Salvar e adicionar à grade" pela ficha depois da troca: adicionada; prévia do painel = linhas da grade', () => {
  const amb = ambienteVazio();
  importar(amb, pacoteCurso(BASE_3));
  pedir(salvarOferta(amb, 'PST1001', [{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: B262, tipo: EL, periodo: 5 }]));
  pedir(salvarOferta(amb, 'PST1002', [{ curriculo: B262, tipo: EL, periodo: 6 }]));
  importar(amb, pacoteCurso(SUCESSOR_3));
  const l0 = verLados(amb, 'PST1001');
  const r = l0.a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Com grade' }, oferta: ofertaDaFicha(l0, 'PST1001'), adicionarAGrade: true });
  ev('  salvar e adicionar: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, grade: r.dados && r.dados.grade }));
  pedir(r);
  pedir(l0.a.ctx.adicionarAGrade([E('PST1002'), E('PSE1005')]));
  const a = l0.a;
  const dados = pedir(reabrir(a).ctx.obterDadosPainel());
  const c = carregarCliente(DIR_SRC); c.indexar(dados);
  const ctx = a.ctx.contextoPreparacao_(a.estrutura());
  for (const sem of ['1', '2']) {
    const linhas = a.ctx.linhasDaGrade_(ctx, sem).PST.concat(a.ctx.linhasDaGrade_(ctx, sem).PSE).map((x) => x.codigo + ':' + x.tipo + ':' + x.semestreIdeal).sort();
    const previa = ['PST1001', 'PST1002', 'PSE1005'].filter((k) => c.disciplina(k)._naGrade && c.oferecidaNoSemestre(k, sem)).map((k) => {
      const p = c.ofertasDe(k).filter((o) => o.tipo)[0];
      return k + ':' + ({ OBRIGATORIA: 'Obrigatória', OPTATIVA_ELETIVA: 'Eletiva', OPTATIVA_LIVRE: 'Livre' })[p.tipo] + ':' + p.periodo;
    }).sort();
    ev('  ' + sem + 'º semestre — grade ' + JSON.stringify(linhas) + ' · prévia ' + JSON.stringify(previa));
    igual(previa, linhas, sem + 'º semestre: prévia × grade');
  }
  igual(a.ctx.linhasDaGrade_(ctx, '2').PST.filter((x) => x.codigo === 'Com grade' || x.codigo === 'PST1001').map((x) => [x.tipo, x.semestreIdeal]), [['Obrigatória', 4]], 'PST1001 com o tipo/período ajustados do Psicólogo');
});

// =====================================================================
console.log('\n== L. Importação interrompida antes da ativação');
teste('L1. execução encerrada antes do manifesto: a base anterior continua valendo, coerente; Ajustes nunca escrito; depois a importação completa', () => {
  const amb = cenarioA();
  const bruto = ajustesBrutos(amb);
  let foto = null;
  amb.injetarFalha((e) => { if (!foto && e.tipo === 'metadado' && e.chave === META_ATIVA) foto = amb.fotografia(); return false; }, 1);
  const esc0 = escritasAjustes(amb);
  importar(amb, pacoteCurso(SUCESSOR_A));
  amb.limparFalhas();
  verdade(foto, 'fotografia tirada');
  igual(escritasAjustes(amb) - esc0, 0, 'importação completa sem escrita em Ajustes');
  const r = reabrir(foto);
  const l = verLados(r, 'PST1001');
  ev('  reaberto da fotografia: ' + JSON.stringify(l.dados.base.curriculos.map((c) => c.curriculo + (c.vigente ? '*' : ''))));
  coerente(l);
  igual(ajustesBrutos(l.a), bruto, 'Ajustes igual ao de antes');
  const vig = l.dados.base.curriculos.filter((c) => c.vigente).map((c) => c.curriculo);
  igual([vig, l.s.principal, l.c.associada], [[P262], P262 + ':OBRIGATORIA:4', 0], 'base anterior (vínculo direto)');
  importar(l.a, pacoteCurso(SUCESSOR_A));
  const l2 = verLados(l.a, 'PST1001');
  coerente(l2);
  igual([l2.s.principal, l2.c.associada], [P271 + ':OBRIGATORIA:4', 1], 'depois da importação refeita');
});

// =====================================================================
console.log('\n== M. Preservação (colunas extras, outros cursos, marcas)');
teste('M1. coluna extra em Ajustes, observações, marca de grade e outro curso: intactos depois da troca e de salvar o nome', () => {
  const amb = cenarioA();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: null, observacoes: 'Obs sintética' }));
  pedir(amb.ctx.adicionarAGrade([E('PST1001')]));
  const chaveOutro = pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Outra 2001', oferecimento: '1' } })).chave;
  const aba = amb.estrutura().getSheetByName(AJ);
  const col = aba.getLastColumn() + 1;
  if (aba.getMaxColumns() < col) aba.insertColumnsAfter(aba.getMaxColumns(), col - aba.getMaxColumns());
  aba.getRange(1, col).setValue('Nota da equipe');
  const linha = tabela(aba).findIndex((l) => String(l[0]) === 'PST1001' || l.includes('PST1001')) + 1;
  aba.getRange(linha, col).setValue('nota sintética');
  importar(amb, pacoteCurso(SUCESSOR_A));
  const l = verLados(amb, 'PST1001');
  pedir(l.a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Renomeada' }, oferta: ofertaDaFicha(l, 'PST1001'), observacoes: 'Obs sintética' }));
  const ab2 = l.a.estrutura().getSheetByName(AJ);
  igual(celula(ab2, CHAVE_AJ, 'PST1001', 'Nota da equipe'), 'nota sintética', 'coluna extra');
  igual(celula(ab2, CHAVE_AJ, 'PST1001', 'Adicionada à grade horária'), 'Sim', 'marca de grade');
  igual(JSON.parse(ofertaGuardada(l.a, 'PST1001')), [{ curriculo: P262, tipo: OB, periodo: 4 }], 'lista guardada');
  const d = pedir(reabrir(l.a).ctx.obterDadosPainel());
  const o = d.preparacao.outros.find((x) => x.chave === chaveOutro);
  igual([o && o.codigo, o && o.nome], ['PST2001', 'Outra 2001'], 'outro curso pela mesma chave');
  igual(d.base.disciplinas.find((x) => x.codigo === 'PST1001').observacoes, 'Obs sintética', 'observações');
});

// =====================================================================
console.log('\n== N. (1.8.10) Restauração explícita da oferta ao Júpiter (contrato do servidor; a cadeia do botão está em testar_navegador_etapa6.js 17f–17m)');
/** 262 → 271 com o Júpiter novo IGUAL à oferta ajustada (obrigatória 4); nome ajustado. */
function cenarioN(opcoes) {
  opcoes = opcoes || {};
  const amb = ambienteVazio();
  importar(amb, pacoteCurso([[P262, 'PST1001', OB, 1], [P262, 'PST1002', OB, 2]]));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, oferta: [{ curriculo: P262, tipo: OB, periodo: 4 }] }));
  importar(amb, pacoteCurso([[P271, 'PST1001', OB, 4], [P271, 'PST1002', OB, 2]]));
  if (opcoes.pendente) guardarOferta(amb, 'PST1001', JSON.stringify([{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: '470120900262', tipo: EL, periodo: 2 }]));
  return amb;
}
const JUP4 = [{ curriculo: P271, tipo: OB, periodo: 4 }];
const semAjusteN = (amb) => ['', '(sem linha)'].includes(ofertaGuardada(amb, 'PST1001'));
function reimportar3(amb) {
  importar(amb, pacoteCurso([[P271, 'PST1001', OB, 3], [P271, 'PST1002', OB, 2]]));
  return verLados(amb, 'PST1001');
}
teste('N1. restaurarOferta com a oferta do Júpiter (igual à associada): ajuste removido; contexto novo sem associação; reimportação 4 → 3 vale nos dois lados', () => {
  const amb = cenarioN();
  const a = reabrir(amb);
  const r = pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Sintética PST1001' }, oferta: JUP4, restaurarOferta: true }));
  const ajR = (r.preparacao.ajustes || []).find((x) => x.chave === 'PST1001') || null;
  ev('  resposta: resultado ' + r.resultado + ' · ajuste lido ' + JSON.stringify(ajR) + ' · coluna ' + JSON.stringify(ofertaGuardada(a, 'PST1001')));
  verdade(semAjusteN(a), 'coluna "Oferta ajustada": ' + ofertaGuardada(a, 'PST1001'));
  verdade(!ajR || (!ajR.oferta && !ajR.ofertaAssociada), 'resposta com o lido: sem oferta ajustada');
  const l = verLados(a, 'PST1001');
  igual([l.c.associada, l.aj && l.aj.oferta, l.s.oferecimento], [0, null, '2']);
  const l3 = reimportar3(a);
  coerente(l3);
  igual([l3.s.oferecimento, l3.s.principal, l3.c.associada], ['1', P271 + ':OBRIGATORIA:3', 0], 'Júpiter volta a determinar');
});
teste('N2. controle: o MESMO pedido sem a intenção (salvamento comum) conserva a lista; reimportação 4 → 3 mantém o período ajustado 4', () => {
  const amb = cenarioN();
  const guardada = ofertaGuardada(amb, 'PST1001');
  const a = reabrir(amb);
  pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Sintética PST1001' }, oferta: JUP4 }));
  igual(ofertaGuardada(a, 'PST1001'), guardada, 'lista intacta');
  pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: JUP4, restaurarOferta: 'sim' }));
  igual(ofertaGuardada(a, 'PST1001'), guardada, 'restaurarOferta diferente de true é ignorado');
  const l3 = reimportar3(a);
  coerente(l3);
  igual([l3.s.oferecimento, l3.s.principal, l3.c.associada], ['2', P271 + ':OBRIGATORIA:4', 1]);
});
teste('N3. restaurarOferta com oferta que não é a do Júpiter da base ativa: recusado (DADOS_INVALIDOS), nada gravado', () => {
  const amb = cenarioN();
  const bruto = ajustesBrutos(amb);
  const r = reabrir(amb).ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P271, tipo: OB, periodo: 6 }], restaurarOferta: true });
  ev('  resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo, erro: r.erro }));
  igual([r.ok, r.codigo], [false, 'DADOS_INVALIDOS']);
  igual(ajustesBrutos(amb), bruto, 'aba intacta');
});
teste('N4. com vínculo a revisar e parte efetiva igual ao Júpiter: restaurar sem descarte → OFERTA_A_REVISAR (nada gravado); com descarte → ajuste removido', () => {
  const amb = cenarioN({ pendente: true });
  const bruto = ajustesBrutos(amb);
  const a = reabrir(amb);
  const r = a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: JUP4, restaurarOferta: true });
  ev('  sem descarte: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo, erro: r.erro }));
  igual([r.ok, r.codigo], [false, 'OFERTA_A_REVISAR']);
  igual(ajustesBrutos(a), bruto, 'aba intacta');
  pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: JUP4, restaurarOferta: true, ofertaPendentes: 'descartar' }));
  verdade(semAjusteN(a), ofertaGuardada(a, 'PST1001'));
  const l = verLados(a, 'PST1001');
  igual([l.c.pendencias, l.c.associada, l.aj && l.aj.oferta], [0, 0, null]);
});
teste('N5. execução encerrada no meio da restauração (fotografia depois da escrita de Ajustes, antes da observação): reabertura conclui pelo salvamento retomável; Júpiter vale depois da reimportação', () => {
  const amb = cenarioN();
  let foto = null;
  amb.injetarFalha((e) => { if (!foto && e.tipo === 'setValuesDepois' && e.aba === AJ) foto = amb.fotografia(); return false; }, 1);
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: JUP4, restaurarOferta: true, observacoes: 'Obs N5' }));
  amb.limparFalhas();
  verdade(foto, 'fotografia tirada');
  const r = reabrir(foto);
  const naFoto = { coluna: ofertaGuardada(r, 'PST1001'), registro: !!r.estrutura().meta.find((m) => m.k === 'estruturaCurricular.salvamento') };
  const d = pedir(r.ctx.obterDadosPainel());
  ev('  na fotografia: ' + JSON.stringify(naFoto) + ' · abertura: salvamentoPendente ' + JSON.stringify(d.salvamentoPendente && d.salvamentoPendente.estado) + ' · observação ' + JSON.stringify(d.base.disciplinas.find((x) => x.codigo === 'PST1001').observacoes));
  verdade(naFoto.registro, 'registro do salvamento presente na fotografia');
  igual([d.salvamentoPendente && d.salvamentoPendente.estado, d.base.disciplinas.find((x) => x.codigo === 'PST1001').observacoes], ['concluido', 'Obs N5'], 'concluído na abertura');
  verdade(semAjusteN(r), ofertaGuardada(r, 'PST1001'));
  const l3 = reimportar3(r);
  coerente(l3);
  igual([l3.s.oferecimento, l3.s.principal], ['1', P271 + ':OBRIGATORIA:3']);
});
teste('N6. leitor: não grava a restauração (permissão), lista intacta', () => {
  const amb = cenarioN();
  const bruto = ajustesBrutos(amb);
  const r = reabrir(amb, LEITOR).ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: JUP4, restaurarOferta: true });
  igual(r.ok, false, 'recusado: ' + r.codigo);
  igual(ajustesBrutos(amb), bruto);
});

// ---------------------------------------------------------------- resumo
console.log('\nExecutados: ' + (ok + falhas) + ' · ' + ok + ' ok · ' + falhas + ' falhas · ' + pulados.length + ' pulados');
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
if (pulados.length) console.log('Pulados:\n  - ' + pulados.join('\n  - '));
ev('\n=== Resumo: ' + ok + ' ok, ' + falhas + ' falhas, ' + pulados.length + ' pulados');
fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
process.exit(falhas ? 1 : 0);

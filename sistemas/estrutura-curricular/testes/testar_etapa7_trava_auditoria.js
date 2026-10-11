// Etapa 7 (1.8.11) — trava do envio da grade e das escritas da auditoria.
//
// MODELO DE TRAVA desta suíte (instrumentação isolada; o mockGoogle.js só
// ganhou hasLock por objeto): o LockService do contexto simulado é trocado
// por um script lock com PROPRIETÁRIO. Há uma "execução atual" (A, B, T…)
// e um dono compartilhado:
//  - getScriptLock() devolve um objeto NOVO a cada chamada (sem identidade
//    JavaScript), todos sobre o mesmo dono;
//  - tryLock: livre → dono = execução atual; já é da execução atual → true,
//    SEM contagem de liberações; de outra execução → false IMEDIATAMENTE (o
//    tempo de espera é simulado de forma determinística: nada de esperar);
//  - releaseLock: se a execução atual é a dona, a propriedade TERMINA (como
//    no Apps Script, liberar por qualquer referência da execução libera o
//    script lock); senão, registra "liberar sem propriedade" e não muda nada;
//  - hasLock: este objeto adquiriu e a execução atual ainda é a dona.
// Intercalação A/B: B roda DENTRO de A, num ponto escolhido (por exemplo,
// logo depois de A ler a última linha da aba), com a execução atual
// trocada para B e restaurada depois.
// Cada escrita (setValues, appendRow, setFormulas, flush…) e a conferência
// das fórmulas do Horário de Fim (celulasDoFimComErro_) são registradas com
// o dono da trava NAQUELE instante.
// Estrutura curricular SINTÉTICA (curso 47012, PST1001 obrigatória no 1º);
// planilha das secretarias, índice e pastas FICTÍCIOS do simulador.
// Uso: node testar_etapa7_trava_auditoria.js [--evidencias arq]
//      DIR_SRC=/caminho/fonte/src … para rodar em outra fonte (ex.: 1.8.10, "antes").
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa7_trava_auditoria.txt');
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
    ev('RESULTADO: FALHOU — ' + String(e && e.message || e).split('\n')[0]);
  }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

// ---------------------------------------------------------------- dados sintéticos
const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';
const SECRETARIA = 'secretaria@unidade.example';
const P262 = '470120000262';
function pacoteCurso(vinc) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: String(parseInt(c.slice(5, 9), 10)), habilitacaoNome: 'Psicólogo', ano: 2000 + parseInt(c.slice(9, 11), 10), semestre: +c.slice(11), situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: 'Sintética ' + d, versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 })),
    vinculos: vinc.map((v) => ({ curriculo: v[0], disciplina: v[1], tipo: v[2], periodoIdeal: v[3] })),
    requisitos: [], avisos: [], conferencia: null,
    origem: { formato: 'csv', leitura: 'csv', arquivo: 'sintetico.csv', tamanhoBytes: 1000, codificacao: 'UTF-8', geradoEm: null }
  };
  const por = {};
  curs.forEach((c) => { const vs = p.vinculos.filter((v) => v.curriculo === c); por[c] = { disciplinas: vs.length, OBRIGATORIA: vs.length, OPTATIVA_ELETIVA: 0, OPTATIVA_LIVRE: 0, requisitos: 0 }; });
  p.resumoLeitura = { curriculos: curs.length, disciplinas: discs.length, vinculos: vinc.length, requisitos: 0, porCurriculo: por };
  return p;
}
function importar(amb, pk) {
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  return pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
}
const ESPERADO = { PSA: 0, PSC: 0, PSE: 0, PST: 1, INTER: 0, OUTRAS: 0 };
/** Base com PST1001 na grade e o modelo fictício da planilha das secretarias, do índice e das pastas. */
function ambienteBase(opGrade) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(amb.ctx.obterDadosPainel());
  importar(amb, pacoteCurso([[P262, 'PST1001', 'OBRIGATORIA', 1]]));
  // oferecida nos dois semestres (semestre manual), para enviar 2027/1 e depois 2027/2
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { oferecimento: 'ambos' }, oferta: null }));
  pedir(amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PST1001' }]));
  amb.criarPlanilhaGrade(opGrade);
  return amb;
}
// (1.8.12) O envio exige a identificação da prévia conferida: obtida na preparação do cenário,
// por um contexto de administrador sobre a mesma persistência (sem as falhas injetadas).
function comPrevia(a, semestre, ano, esperado) {
  const falhas = a.estado.falhas; a.estado.falhas = [];
  try {
    const adm = criarAmbiente({ dirSrc: DIR_SRC, reusar: a, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
    const r = typeof adm.ctx.previaEnvioGrade === 'function' ? adm.ctx.previaEnvioGrade({ semestre, ano }) : null;
    return Object.assign({ semestre, ano }, esperado ? { esperado } : {}, r && r.ok ? { assinatura: r.dados.assinatura } : {});
  } finally { a.estado.falhas = falhas; }
}
const enviar = (amb, sem, ano) => amb.ctx.enviarGradeParaPreenchimento(comPrevia(amb, sem || '1', ano || 2027, ESPERADO));
function idAuditoria(amb, semestre) {
  const a = amb.indiceGrades().getSheets()[0];
  const l = a.getRange(1, 1, a.getLastRow(), 3).getValues().filter((x) => x[0] === semestre && x[2])[0];
  return l ? l[2] : null;
}
function edicoes(amb, id) {
  const a = amb.planilhas.get(id).getSheetByName('Edições');
  const v = a.getRange(1, 1, Math.max(a.getLastRow(), 1), 17).getValues();
  return v.slice(1).map((l) => ({ tipo: l[13], origem: l[2], email: l[3], obs: String(l[15]).slice(0, 40), id: l[16] }));
}
const tipos = (amb, id) => edicoes(amb, id).map((x) => x.tipo);
const linhaEvento = (amb, sem, tipo) => amb.ctx.linhaDeEventoDoSistema_(sem, ADMIN, tipo, 'linha sintética ' + tipo);

// ---------------------------------------------------------------- modelo de trava com proprietário
function instalarTrava(amb) {
  const m = { dono: null, exec: 'A', log: [], escritas: [], pilha: [] };
  const onde = () => m.pilha.length ? m.pilha[m.pilha.length - 1] : 'entrada/executor';
  m.getScriptLock = () => {
    let adquirida = false;
    return {
      tryLock(ms) {
        if (m.dono === null || m.dono === m.exec) {
          const tinha = m.dono === m.exec;
          m.dono = m.exec; adquirida = true;
          m.log.push(m.exec + ' adquirir — ' + (tinha ? 'já tinha a trava' : 'não tinha a trava') + ' [' + onde() + ']');
          return true;
        }
        m.log.push(m.exec + ' adquirir FALHOU — ocupada por ' + m.dono + ' (espera de ' + ms + ' ms simulada) [' + onde() + ']');
        return false;
      },
      waitLock(ms) { if (!this.tryLock(ms)) throw new Error('Lock timeout (simulado)'); },
      releaseLock() {
        if (m.dono === m.exec) { m.dono = null; m.log.push(m.exec + ' liberar [' + onde() + ']'); }
        else m.log.push(m.exec + ' liberar SEM propriedade (dono: ' + m.dono + ') [' + onde() + ']');
        adquirida = false;
      },
      hasLock() { return adquirida && m.dono === m.exec; }
    };
  };
  amb.ctx.LockService = { getScriptLock: m.getScriptLock };
  // escritas e flush, com o dono da trava no instante
  amb.injetarFalha((e) => {
    if (['setValues', 'setValue', 'appendRow', 'setFormulas', 'flush', 'insertSheet'].includes(e.tipo)) {
      m.escritas.push({ exec: m.exec, tipo: e.tipo, aba: e.aba || '', dono: m.dono });
      if (['setValues', 'appendRow', 'flush'].includes(e.tipo) && (e.tipo === 'flush' || /Edições|Aberturas/.test(e.aba || ''))) m.log.push(m.exec + ' ' + e.tipo + (e.aba ? ' ' + e.aba : '') + ' — trava: ' + (m.dono || 'NINGUÉM'));
    }
    return false;
  }, 1e9);
  // rótulos de onde a trava é mexida
  ['gravarNaAuditoria_', 'gravarNaAuditoriaSobTrava_'].forEach((nome) => {
    const orig = amb.ctx[nome];
    if (typeof orig !== 'function') return;
    amb.ctx[nome] = function () { m.pilha.push('auditoria'); try { return orig.apply(this, arguments); } finally { m.pilha.pop(); } };
  });
  const conf = amb.ctx.celulasDoFimComErro_;
  amb.ctx.celulasDoFimComErro_ = function () { m.log.push(m.exec + ' verificar fórmulas do Horário de Fim — trava: ' + (m.dono || 'NINGUÉM')); return conf.apply(this, arguments); };
  m.como = (exec, fn) => { const ant = m.exec; m.exec = exec; try { return fn(); } finally { m.exec = ant; } };
  return m;
}
const opsTrava = (m) => m.log.filter((l) => / (adquirir|liberar)/.test(l));
/** Depois de tudo: ninguém com a trava e uma execução nova (Z) consegue adquirir e liberar. */
function posterior(m) {
  igual(m.dono, null, 'trava livre no fim');
  const l = m.como('Z', () => { const t = m.getScriptLock(); const r = t.tryLock(1000); if (r) t.releaseLock(); return r; });
  igual([l, m.dono], [true, null], 'execução posterior adquire e libera');
}
/** Falha na escrita do EVENTO (não no cabeçalho de uma auditoria recém-criada): só depois das fórmulas da grade. */
function falhaNoEvento(amb, vezes) {
  let armado = false;
  return amb.injetarFalha((e) => { if (e.tipo === 'setFormulas') armado = true; return armado && e.tipo === 'setValues' && e.aba === 'Edições'; }, vezes);
}
const escritasAud = (m) => m.escritas.filter((w) => /Edições|Aberturas/.test(w.aba));

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 7 — trava do envio e das escritas da auditoria ===');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* */ }
const temSobTrava = (amb) => typeof amb.ctx.gravarNaAuditoriaSobTrava_ === 'function';

// =====================================================================
console.log('\n== A. Envio com a auditoria anotada sob a trava do envio');
function conferirEnvio(m, rotulo) {
  const ops = opsTrava(m);
  ev('  sequência (' + rotulo + '):\n    ' + m.log.join('\n    '));
  const verif = m.log.filter((l) => /verificar fórmulas/.test(l));
  verdade(verif.length >= 1, 'conferência das fórmulas executada');
  igual(verif.filter((l) => !/trava: A$/.test(l)), [], 'conferência das fórmulas com a trava do envio');
  igual(m.escritas.filter((w) => w.dono !== 'A').map((w) => w.tipo + ' ' + w.aba), [], 'todas as escritas e flush do envio com a trava do envio');
  igual(ops.filter((l) => /liberar/.test(l)).length, 1, 'uma única liberação');
  verdade(/liberar \[entrada\/executor\]$/.test(ops[ops.length - 1]), 'a única liberação é a do executor, na saída: ' + ops[ops.length - 1]);
  igual(ops.filter((l) => /já tinha/.test(l)), [], 'nenhuma nova aquisição dentro do envio');
}
teste('A1. reprodução: envio 2027/1 (auditoria nova) — a trava continua do envio até a conferência das fórmulas e o flush; só o executor libera', () => {
  const amb = ambienteBase();
  const m = instalarTrava(amb);
  const r = pedir(enviar(amb));
  ev('  resposta: total ' + r.total + ' · avisos ' + JSON.stringify(r.avisos.map((a) => a.slice(0, 60))));
  ev('  Edições 2027/1: ' + JSON.stringify(tipos(amb, idAuditoria(amb, '2027/1'))));
  conferirEnvio(m, 'envio 2027/1');
  igual(tipos(amb, idAuditoria(amb, '2027/1')), ['Envio da grade']);
  posterior(m);
});
teste('A2. envio 2027/2 com auditoria do semestre anterior ("Grade encerrada" em 2027/1) e outra tentativa de separador nas fórmulas: tudo sob a trava do envio', () => {
  const amb = ambienteBase({ separadorReal: ',' });   // pt_BR declarado, mas lê "," → 1ª fórmula com erro → regrava com o outro separador
  pedir(enviar(amb, '1', 2027));
  const m = instalarTrava(amb);
  const r = pedir(enviar(amb, '2', 2027));
  conferirEnvio(m, 'envio 2027/2');
  igual(m.log.filter((l) => /verificar fórmulas/.test(l)).length, 2, 'conferência repetida com o outro separador');
  verdade(m.escritas.filter((w) => w.tipo === 'setFormulas').length >= 2, 'fórmulas regravadas');
  igual([tipos(amb, idAuditoria(amb, '2027/1')), tipos(amb, idAuditoria(amb, '2027/2'))], [['Envio da grade', 'Grade encerrada'], ['Envio da grade']]);
  verdade(!r.avisos.some((a) => /Horário de Fim/.test(a)), 'fórmulas corrigidas com o outro separador');
  posterior(m);
});

// =====================================================================
console.log('\n== B. Auditoria independente e proteção herdada');
teste('B1. entrada independente sem trava anterior: adquire, grava um bloco de 3 linhas, flush, libera; outra execução adquire depois', () => {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const m = instalarTrava(amb);
  const linhas = ['Ev 1', 'Ev 2', 'Ev 3'].map((t) => linhaEvento(amb, '2027/1', t));
  amb.ctx.gravarNaAuditoria_(amb.planilhas.get(id), linhas);
  ev('  sequência:\n    ' + m.log.join('\n    '));
  const e = edicoes(amb, id);
  ev('  Edições: ' + JSON.stringify(e.map((x) => x.tipo)));
  igual(e.map((x) => x.tipo), ['Envio da grade', 'Ev 1', 'Ev 2', 'Ev 3'], 'bloco depois da última linha, sem sobrescrever');
  igual(new Set(e.map((x) => x.id)).size, 4, 'IDs distintos');
  igual(escritasAud(m).map((w) => w.tipo + ':' + w.dono), ['setValues:A'], 'uma escrita do bloco, com a trava');
  const ops = opsTrava(m);
  verdade(/A adquirir — não tinha/.test(ops[0]) && /A liberar/.test(ops[ops.length - 1]) && ops.length === 2, ops.join(' | '));
  verdade(m.log.some((l) => /A flush — trava: A/.test(l)), 'flush antes de liberar');
  posterior(m);
});
teste('B2. com a trava do chamador: grava e devolve a trava AINDA adquirida (não libera a proteção herdada)', () => {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const m = instalarTrava(amb);
  const t = m.getScriptLock();
  verdade(t.tryLock(10000), 'chamador adquire');
  const linhas = [linhaEvento(amb, '2027/1', 'Ev herdado')];
  if (temSobTrava(amb)) amb.ctx.gravarNaAuditoriaSobTrava_(amb.planilhas.get(id), linhas, t);
  else amb.ctx.gravarNaAuditoria_(amb.planilhas.get(id), linhas);   // 1.8.10: a única rotina, usada também pelo envio
  ev('  sequência:\n    ' + m.log.join('\n    '));
  igual([m.dono, t.hasLock()], ['A', true], 'a trava continua do chamador');
  igual(tipos(amb, id), ['Envio da grade', 'Ev herdado']);
  t.releaseLock();
  posterior(m);
});
teste('B3. rotina interna com objeto de trava NÃO adquirido (ou nenhum): recusa sem escrever', () => {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const m = instalarTrava(amb);
  verdade(temSobTrava(amb), 'rotina interna gravarNaAuditoriaSobTrava_ existe');
  const nao = m.getScriptLock();
  let e1 = null, e2 = null;
  try { amb.ctx.gravarNaAuditoriaSobTrava_(amb.planilhas.get(id), [linhaEvento(amb, '2027/1', 'X')], nao); } catch (e) { e1 = e.message; }
  try { amb.ctx.gravarNaAuditoriaSobTrava_(amb.planilhas.get(id), [linhaEvento(amb, '2027/1', 'Y')], null); } catch (e) { e2 = e.message; }
  verdade(e1 && e2, 'recusas: ' + e1 + ' | ' + e2);
  igual([tipos(amb, id), escritasAud(m).length], [['Envio da grade'], 0]);
  posterior(m);
});

// =====================================================================
console.log('\n== C. Trava ocupada por outra execução');
function ocupadaPorB(m) { m.como('B', () => verdade(m.getScriptLock().tryLock(1000), 'B adquire')); }
teste('C1. helper: com a trava de B, A não consegue no prazo — zero escritas, zero appendRow de reserva, B continua dono', () => {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const m = instalarTrava(amb);
  ocupadaPorB(m);
  let erro = null;
  try { amb.ctx.gravarNaAuditoria_(amb.planilhas.get(id), [linhaEvento(amb, '2027/1', 'Evento de A')]); } catch (e) { erro = e.message; }
  ev('  sequência:\n    ' + m.log.join('\n    ') + '\n  erro: ' + erro + '\n  Edições: ' + JSON.stringify(tipos(amb, id)));
  igual(escritasAud(m).map((w) => w.exec + ' ' + w.tipo), [], 'nenhuma escrita na auditoria');
  igual([m.dono, tipos(amb, id)], ['B', ['Envio da grade']], 'B continua dono; nada gravado');
  verdade(erro && /ocupada/.test(erro), 'erro informado: ' + erro);
  m.como('B', () => m.getScriptLock().releaseLock());
  posterior(m);
});
teste('C2. acionador real de edição (registrarEdicaoGrade) com a trava ocupada: nada gravado, falha registrada no log, B continua dono; abertura idem', () => {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const ab0 = amb.planilhas.get(id).getSheetByName('Aberturas').getLastRow();
  const m = instalarTrava(amb);
  ocupadaPorB(m);
  const evento = { range: amb.grade().getSheetByName('PST').getRange(4, 11), source: amb.grade(), value: 'Segunda-Feira', oldValue: '', user: { getEmail: () => SECRETARIA } };
  const nErros = amb.estado.erros.length;
  m.como('T', () => amb.ctx.registrarEdicaoGrade(evento));
  m.como('T', () => amb.ctx.registrarAberturaGrade({ source: amb.grade(), user: { getEmail: () => SECRETARIA } }));
  const novosErros = amb.estado.erros.slice(nErros);
  ev('  sequência:\n    ' + m.log.join('\n    ') + '\n  log de erro do acionador: ' + JSON.stringify(novosErros));
  igual(escritasAud(m).map((w) => w.exec + ' ' + w.tipo + ' ' + w.aba), [], 'nenhuma escrita (nem appendRow)');
  igual([m.dono, tipos(amb, id), amb.planilhas.get(id).getSheetByName('Aberturas').getLastRow()], ['B', ['Envio da grade'], ab0]);
  verdade(novosErros.some((l) => /registrarEdicaoGrade falhou/.test(l)) && novosErros.some((l) => /registrarAberturaGrade/.test(l)), 'falhas registradas sem fingir persistência');
  m.como('B', () => m.getScriptLock().releaseLock());
  posterior(m);
});

// =====================================================================
console.log('\n== D. Intercalação: escrita por posição × entrada sem trava');
/** A grava "Evento A"; logo depois de A ler a última linha, B tenta gravar "Evento B" (helper ou acionador). */
function intercalar(amb, m, id, pedidoDeB) {
  const aba = amb.planilhas.get(id).getSheetByName('Edições');
  const orig = aba.getLastRow.bind(aba);
  let armado = true;
  aba.getLastRow = function () {
    const v = orig();
    if (armado && m.exec === 'A' && m.dono === 'A') { armado = false; m.log.push('A leu a última linha = ' + v + ' → B roda agora'); m.como('B', pedidoDeB); }
    return v;
  };
  let erroA = null;
  try { amb.ctx.gravarNaAuditoria_(amb.planilhas.get(id), [linhaEvento(amb, '2027/1', 'Evento A')]); } catch (e) { erroA = e.message; }
  aba.getLastRow = orig;
  return erroA;
}
function casoD(viaAcionador) {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const m = instalarTrava(amb);
  const evento = { range: amb.grade().getSheetByName('PST').getRange(4, 11), source: amb.grade(), value: 'Evento B', oldValue: '', user: { getEmail: () => SECRETARIA } };
  const pedidoDeB = viaAcionador
    ? () => amb.ctx.registrarEdicaoGrade(evento)
    : () => { try { amb.ctx.gravarNaAuditoria_(amb.planilhas.get(id), [linhaEvento(amb, '2027/1', 'Evento B')]); } catch (e) { m.log.push('B recusado: ' + e.message.slice(0, 70)); } };
  const erroA = intercalar(amb, m, id, pedidoDeB);
  const depoisDeA = edicoes(amb, id).map((x) => x.tipo === 'Preencheu' ? 'Evento B (acionador)' : x.tipo);
  // novo pedido de B, conduzido pelo TESTE, com a trava livre
  m.como('B', pedidoDeB);
  const fim = edicoes(amb, id).map((x) => x.tipo === 'Preencheu' ? 'Evento B (acionador)' : x.tipo);
  ev('  sequência:\n    ' + m.log.join('\n    '));
  ev('  escritas na auditoria: ' + JSON.stringify(escritasAud(m).map((w) => w.exec + ' ' + w.tipo + ' (trava: ' + (w.dono || 'ninguém') + ')')));
  ev('  Edições depois da intercalação: ' + JSON.stringify(depoisDeA) + ' · depois do novo pedido de B: ' + JSON.stringify(fim));
  igual(erroA, null, 'A conclui');
  igual(escritasAud(m).filter((w) => w.dono !== w.exec).map((w) => w.exec + ' ' + w.tipo), [], 'nenhuma escrita sem a trava de quem escreve');
  const nomeB = viaAcionador ? 'Evento B (acionador)' : 'Evento B';
  igual(depoisDeA, ['Envio da grade', 'Evento A'], 'durante a trava de A, B não grava');
  igual(fim, ['Envio da grade', 'Evento A', nomeB], 'os dois eventos permanecem, sem sobrescrita');
  posterior(m);
}
teste('D1. reprodução da seção 2.2 com o helper: B (sem trava) não escreve enquanto A grava por posição; o novo pedido de B grava depois', () => casoD(false));
teste('D2. o mesmo com B = acionador real de edição', () => casoD(true));

// =====================================================================
console.log('\n== E. Exceções e liberação');
function casoE(rotulo, preparar, esperaLinhas) {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const m = instalarTrava(amb);
  const desfazer = preparar(amb, amb.planilhas.get(id).getSheetByName('Edições'));
  let erro = null;
  try { amb.ctx.gravarNaAuditoria_(amb.planilhas.get(id), [linhaEvento(amb, '2027/1', 'Ev ' + rotulo)]); } catch (e) { erro = e.message; }
  if (desfazer) desfazer();
  amb.limparFalhas();
  ev('  ' + rotulo + ': erro ' + JSON.stringify(erro) + '\n    ' + m.log.join('\n    ') + '\n  Edições: ' + JSON.stringify(tipos(amb, id)));
  verdade(erro, 'o erro chega a quem chamou');
  igual(tipos(amb, id), esperaLinhas, 'conteúdo efetivo');
  verdade(m.log.some((l) => /A liberar/.test(l)), 'a própria entrada liberou');
  return { amb, m };
}
teste('E1. falha ANTES da escrita (ler a última linha): nada gravado, trava liberada', () => {
  const { m } = casoE('antes', (amb, aba) => { const o = aba.getLastRow; aba.getLastRow = () => { throw new Error('FALHA INJETADA em getLastRow'); }; return () => { aba.getLastRow = o; }; }, ['Envio da grade']);
  posterior(m);
});
teste('E2. falha na AMPLIAÇÃO da aba (insertRowsAfter): nada gravado, trava liberada', () => {
  const { m } = casoE('ampliação', (amb, aba) => { aba.maxRows = aba.getLastRow(); const o = aba.insertRowsAfter; aba.insertRowsAfter = () => { throw new Error('FALHA INJETADA em insertRowsAfter'); }; return () => { aba.insertRowsAfter = o; }; }, ['Envio da grade']);
  posterior(m);
});
teste('E3. falha em setValues: nada gravado, trava liberada', () => {
  const { m } = casoE('setValues', (amb) => { amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Edições', 1); }, ['Envio da grade']);
  posterior(m);
});
teste('E4. falha no FLUSH depois da escrita: a linha FOI aplicada (não se afirma o contrário), o erro chega a quem chamou e a trava é liberada', () => {
  const { m } = casoE('flush', (amb) => { amb.injetarFalha((e) => e.tipo === 'flush', 1); }, ['Envio da grade', 'Ev flush']);
  verdade(m.log.some((l) => /A flush — trava: A/.test(l)), 'flush tentado com a trava');
  posterior(m);
});
teste('E5. caminho do envio com falha na escrita da auditoria: a proteção do envio NÃO é liberada pela auditoria; conferência e flush finais com a trava; só o executor libera', () => {
  const amb = ambienteBase();
  const m = instalarTrava(amb);
  falhaNoEvento(amb, 99);
  const r = enviar(amb);
  amb.limparFalhas();
  conferirEnvio(m, 'envio com falha na auditoria');
  verdade(r.ok && r.dados.avisos.some((a) => /não pôde ser anotada/.test(a)), 'sucesso com aviso');
  posterior(m);
});

// =====================================================================
console.log('\n== F. Feedback do envio quando a anotação falha');
teste('F1. grade enviada e evento não gravado: sucesso com o aviso existente; grade, cópia e índice gravados; auditoria sem evento; nenhuma repetição; nada desfeito', () => {
  const amb = ambienteBase();
  const m = instalarTrava(amb);
  const f = falhaNoEvento(amb, 99);
  const r = pedir(enviar(amb));
  amb.limparFalhas();
  const id = idAuditoria(amb, '2027/1');
  const pst = amb.grade().getSheetByName('PST');
  const fatos = {
    avisos: r.avisos.map((a) => a.slice(0, 80)), nome: amb.grade().getName(), linhaPST: [pst.getRange(4, 3).getValue(), pst.getRange(4, 5).getValue(), pst.getRange(4, 9).getValue()],
    copias: amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length, indice: amb.indiceGrades().getSheets()[0].getRange(1, 1, amb.indiceGrades().getSheets()[0].getLastRow(), 3).getValues().slice(1),
    edicoes: tipos(amb, id), tentativasDeEscrita: f.disparos
  };
  ev('  fatos: ' + JSON.stringify(fatos));
  verdade(fatos.avisos.some((a) => /O envio foi concluído, mas a linha do envio não pôde ser anotada/.test(a)), 'aviso da anotação');
  igual([fatos.nome, fatos.linhaPST, fatos.copias, fatos.edicoes, fatos.tentativasDeEscrita], ['Grade Horária - 1º semestre de 2027', ['PST1001', 'Obrigatória', 1], 1, [], 1]);
  verdade(fatos.indice.some((l) => l[0] === '2027/1' && l[2]), 'auditoria registrada no índice');
  conferirEnvio(m, 'F1');
  posterior(m);
});

// =====================================================================
console.log('\n== G. Entradas e compatibilidade');
teste('G1. acionador de edição com a trava livre: grava (uma célula e colagem 2×2 com o mesmo ID), libera; eventos inválidos ignorados; leitura por contexto novo e pelo painel de auditoria', () => {
  const amb = ambienteBase();
  pedir(enviar(amb));
  pedir(amb.ctx.ativarAuditoriaGrade());
  const id = idAuditoria(amb, '2027/1');
  const m = instalarTrava(amb);
  const pst = amb.grade().getSheetByName('PST');
  m.como('T', () => amb.ctx.registrarEdicaoGrade({ range: pst.getRange(4, 11), source: amb.grade(), value: 'Segunda-Feira', oldValue: '', user: { getEmail: () => SECRETARIA } }));
  m.como('T', () => amb.ctx.registrarEdicaoGrade({ range: pst.getRange(5, 11, 2, 2), source: amb.grade(), user: { getEmail: () => SECRETARIA } }));
  m.como('T', () => amb.ctx.registrarEdicaoGrade(JSON.parse(JSON.stringify({ range: { getSheet: 1 }, value: 'x' }))));
  m.como('T', () => amb.ctx.registrarEdicaoGrade({ range: amb.indiceGrades().getSheets()[0].getRange(5, 1), value: 'x' }));
  ev('  sequência:\n    ' + m.log.join('\n    '));
  const e = edicoes(amb, id);
  ev('  Edições: ' + JSON.stringify(e.map((x) => x.tipo)));
  igual(e.map((x) => x.tipo), ['Envio da grade', 'Auditoria ativada', 'Preencheu', 'Colagem ou preenchimento', 'Colagem ou preenchimento', 'Colagem ou preenchimento', 'Colagem ou preenchimento']);
  igual(new Set(e.slice(3).map((x) => x.id)).size, 1, 'colagem com o mesmo ID do evento');
  igual(e.slice(2).map((x) => x.email), Array(5).fill(SECRETARIA), 'e-mail do evento');
  igual(escritasAud(m).map((w) => w.exec + ' ' + w.tipo + ':' + w.dono), ['T setValues:T', 'T setValues:T'], 'duas escritas, cada uma com a trava');
  posterior(m);
  const a2 = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: ADMIN, dono: ADMIN });
  igual(edicoes(a2, id).length, 7, 'contexto novo lê as mesmas linhas');
  const d = pedir(a2.ctx.obterAuditoriaGrade({ semestre: '2027/1' }));
  ev('  painel de auditoria (contexto novo): ' + JSON.stringify(d).slice(0, 300));
  verdade(JSON.stringify(d).includes(SECRETARIA), 'o painel de auditoria lê as edições gravadas');
});
teste('G2. acionador de abertura com a trava livre: linha em "Aberturas" sob a trava, liberada', () => {
  const amb = ambienteBase();
  pedir(enviar(amb));
  const id = idAuditoria(amb, '2027/1');
  const ab = amb.planilhas.get(id).getSheetByName('Aberturas');
  const n0 = ab.getLastRow();
  const m = instalarTrava(amb);
  m.como('T', () => amb.ctx.registrarAberturaGrade({ source: amb.grade(), user: { getEmail: () => SECRETARIA } }));
  m.como('T', () => amb.ctx.registrarAberturaGrade(JSON.parse(JSON.stringify({ source: { getId: 1 } }))));
  ev('  sequência:\n    ' + m.log.join('\n    '));
  igual([ab.getLastRow() - n0, ab.getRange(ab.getLastRow(), 3).getValue()], [1, SECRETARIA]);
  igual(escritasAud(m).map((w) => w.tipo + ':' + w.dono), ['appendRow:T'], 'appendRow DENTRO da trava');
  posterior(m);
});
teste('G3. ativarAuditoriaGrade: sob a trava própria (índice, auditoria, evento), liberada; repetir não duplica acionadores; leitor recusado; trava ocupada → OCUPADO sem escrever', () => {
  const amb = ambienteBase();
  const m = instalarTrava(amb);
  const r1 = pedir(amb.ctx.ativarAuditoriaGrade());
  const r2 = pedir(amb.ctx.ativarAuditoriaGrade());
  ev('  sequência (duas ativações):\n    ' + m.log.join('\n    '));
  igual([r1.acionador, r2.acionador, amb.estado.acionadores.length], ['instalado agora', 'já estava instalado', 2]);
  const id = idAuditoria(amb, '2026/1');
  igual(tipos(amb, id), ['Auditoria ativada', 'Auditoria ativada']);
  igual(m.escritas.filter((w) => w.dono !== 'A').map((w) => w.tipo + ' ' + w.aba), [], 'escritas da ativação com a trava');
  igual(opsTrava(m).filter((l) => /liberar/.test(l)).length, 2, 'cada ativação libera uma vez');
  const leitor = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: LEITOR, dono: ADMIN });
  igual(leitor.ctx.ativarAuditoriaGrade().codigo, 'SO_ADMIN');
  igual(leitor.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027, esperado: ESPERADO }).codigo, 'SO_ADMIN', 'leitor não envia');
  ocupadaPorB(m);
  const n0 = m.escritas.length;
  const r3 = amb.ctx.ativarAuditoriaGrade();
  ev('  com a trava de B: ' + JSON.stringify({ ok: r3.ok, codigo: r3.codigo }));
  igual([r3.ok, r3.codigo, m.escritas.length - n0, m.dono, tipos(amb, id).length], [false, 'OCUPADO', 0, 'B', 2]);
  m.como('B', () => m.getScriptLock().releaseLock());
  posterior(m);
});

// =====================================================================
console.log('\n== H. Operação posterior');
teste('H1. depois de um envio com erro (ENVIO_INCOMPLETO) e de um com sucesso, novas execuções adquirem e operam (envio e acionador)', () => {
  const amb = ambienteBase();
  const m = instalarTrava(amb);
  amb.injetarFalha((e) => e.tipo === 'setFormulas', 1);
  const r1 = enviar(amb);
  amb.limparFalhas();
  ev('  envio com falha: ' + JSON.stringify({ ok: r1.ok, codigo: r1.codigo }));
  igual([r1.ok, r1.codigo, m.dono], [false, 'ENVIO_INCOMPLETO', null], 'erro e trava liberada');
  const m2 = instalarTrava(amb);
  pedir(enviar(amb));
  igual(m2.dono, null);
  const id = idAuditoria(amb, '2027/1');
  m2.como('T', () => amb.ctx.registrarEdicaoGrade({ range: amb.grade().getSheetByName('PST').getRange(4, 11), source: amb.grade(), value: 'Terça-Feira', oldValue: '', user: { getEmail: () => SECRETARIA } }));
  ev('  Edições: ' + JSON.stringify(tipos(amb, id)));
  igual(tipos(amb, id), ['Envio da grade', 'Preencheu']);
  posterior(m2);
});

// ---------------------------------------------------------------- resumo
console.log('\nExecutados: ' + (ok + falhas) + ' · ' + ok + ' ok · ' + falhas + ' falhas · 0 pulados');
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
ev('\n=== Resumo: ' + ok + ' ok, ' + falhas + ' falhas, 0 pulados');
fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
process.exit(falhas ? 1 : 0);

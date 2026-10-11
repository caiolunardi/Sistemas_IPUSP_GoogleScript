// Testes da auditoria da grade (1.6.0, AuditoriaGrade.gs + envio) e das
// validações da planilha das secretarias (planilha-grade/Validacoes.gs),
// no simulador. A planilha das secretarias é um modelo FICTÍCIO.
// Uso: node testar_auditoria_grade.js <grade_curricular.csv> <disciplinas_unidade.csv> [--evidencias arquivo]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { criarAmbiente } = require('./mockGoogle');
const { carregar } = require('./carregar_leitores');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const ARQ_VALIDACOES = path.join(__dirname, '..', 'planilha-grade', 'Validacoes.gs');
const [csvPath, unidadePath] = process.argv.slice(2);
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_auditoria_grade.txt');
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
const textoUnidade = L.LeitorCsvJupiter._decodificarBytes(new Uint8Array(fs.readFileSync(unidadePath))).texto;
const GRUPOS = ['PSA', 'PSC', 'PSE', 'PST', 'INTER', 'OUTRAS'];
const AGORA = new Date('2026-10-02T19:00:00Z');   // 16:00 em São Paulo
const ADMIN = 'dono@unidade.example';

function pedir(r) { if (!r.ok) throw new Error(r.codigo + ': ' + r.erro); return r.dados; }
function ambiente(opGrade) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, agora: AGORA, usuario: ADMIN, dono: ADMIN });
  amb.ctx.obterDadosPainel();
  const prev = amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(csvBase)));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(csvBase)), prev.dados.assinatura, { operacao: prev.dados.operacao, previa: prev.dados.impressao }));
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'u.csv'));
  pedir(amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'u.csv', p.assinatura, p.novas.map((x) => x.codigo)));
  const d = amb.ctx.obterDadosPainel().dados;
  pedir(amb.ctx.adicionarAGrade(d.base.disciplinas.map((x) => ({ origem: 'estrutura', chave: x.codigo }))));
  amb.criarPlanilhaGrade(opGrade);
  return amb;
}
function contagens(amb, sem) {
  const g = amb.ctx.linhasDaGrade_(amb.ctx.contextoPreparacao_(amb.estrutura()), sem);
  const r = {}; GRUPOS.forEach((k) => { r[k] = g[k].length; }); return r;
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
const enviar = (amb, sem, ano) => amb.ctx.enviarGradeParaPreenchimento(comPrevia(amb, sem, ano, contagens(amb, sem)));
const indice = (amb) => { const a = amb.indiceGrades().getSheets()[0]; return a.getRange(1, 1, a.getLastRow(), 3).getValues(); };
const pastaAud = (amb) => amb.estado.pastas.get('ID_PASTA_AUDITORIA_TESTE').arquivos;
function edicoes(amb, id) {
  const a = amb.planilhas.get(id).getSheetByName('Edições');
  const v = a.getRange(1, 1, Math.max(a.getLastRow(), 1), 17).getValues();
  return v.slice(1).map((l) => { const o = {}; v[0].forEach((t, i) => { o[t] = l[i]; }); return o; });
}
function foto(amb) {
  const g = amb.grade();
  return JSON.stringify({ nome: g.getName(), abas: g.getSheets().map((s) => [s.getName(), [...s.cells.entries()]]), indice: [...amb.indiceGrades().getSheets()[0].cells.entries()], pastas: [...amb.estado.pastas.entries()].map(([k, v]) => [k, v.arquivos.slice()]) });
}

(() => {
  console.log('\n== Auditoria criada pelo envio');
  let amb;
  teste('envio 2027/1: cria "Auditoria - Grade Horária - 1º semestre de 2027" na pasta das auditorias (abas Edições, Aberturas e Sobre), ID na coluna C do índice, evento "Envio da grade" anotado', () => {
    amb = ambiente();
    const r = pedir(enviar(amb, '1', 2027));
    igual(pastaAud(amb), ['ID_NOVA_2'], 'uma planilha na pasta das auditorias');
    verdade(!(amb.estado.raiz || []).includes('ID_NOVA_2'), 'saiu da raiz do Drive (movida para a pasta)');
    const aud = amb.planilhas.get('ID_NOVA_2');
    igual(aud.getName(), 'Auditoria - Grade Horária - 1º semestre de 2027');
    igual(aud.getSheets().map((s) => s.getName()), ['Edições', 'Aberturas', 'Sobre']);
    igual(aud.getSheetByName('Edições').getRange(1, 1, 1, 17).getValues()[0], ['Data e hora', 'Semestre', 'Origem', 'E-mail', 'Aba', 'Célula', 'Linha', 'Coluna', 'Campo', 'Código da disciplina', 'Disciplina (como está na planilha)', 'Valor anterior', 'Valor novo', 'Tipo de edição', 'Células no evento', 'Observação', 'ID do evento']);
    igual(indice(amb).slice(2), [['2026/1', 'ID_COPIA_1', ''], ['2027/1', '', 'ID_NOVA_2']]);
    igual([r.auditoria.nome, r.auditoria.criada, r.auditoria.registroAtivo], ['Auditoria - Grade Horária - 1º semestre de 2027', true, false]);
    verdade(r.avisos.some((a) => /ativarAuditoriaGrade/.test(a)), 'aviso: registro de edições inativo');
    const e = edicoes(amb, 'ID_NOVA_2');
    igual([e.length, e[0].Origem, e[0]['E-mail'], e[0]['Tipo de edição'], e[0].Semestre], [1, 'Sistema', ADMIN, 'Envio da grade', '2027/1']);
    verdade(/disciplinas \(PSA \d+/.test(e[0]['Observação']) && /cópia de 02\/10\/2026 16:00/.test(e[0]['Observação']), e[0]['Observação']);
    ev('[auditoria] envio 2027/1 → planilha "' + aud.getName() + '" na pasta das auditorias (abas Edições/Sobre); índice: 2026/1 | cópia | — e 2027/1 | — | auditoria; evento do sistema: ' + e[0]['Observação'].slice(0, 120) + '…');
  });
  teste('reenvio do mesmo semestre: MESMA auditoria (sem planilha nova), mais um evento; a cópia de 2027/1 entra na linha de 2027/1 (coluna B)', () => {
    pedir(enviar(amb, '1', 2027));
    igual(pastaAud(amb), ['ID_NOVA_2'], 'continua uma só');
    igual(indice(amb).slice(3), [['2027/1', 'ID_COPIA_3', 'ID_NOVA_2']]);
    igual(edicoes(amb, 'ID_NOVA_2').map((x) => x['Tipo de edição']), ['Envio da grade', 'Envio da grade']);
    ev('[auditoria] reenvio 2027/1 → mesma auditoria, 2º evento; índice 2027/1 | cópia | auditoria');
  });
  teste('envio 2027/2: auditoria nova de 2027/2; "Grade encerrada" anotado na auditoria de 2027/1; cópia de 2027/1 em linha nova (a linha de 2027/1 já tinha cópia)', () => {
    pedir(enviar(amb, '2', 2027));
    igual(pastaAud(amb), ['ID_NOVA_2', 'ID_NOVA_5']);
    igual(indice(amb).slice(3), [['2027/1', 'ID_COPIA_3', 'ID_NOVA_2'], ['2027/1', 'ID_COPIA_4', ''], ['2027/2', '', 'ID_NOVA_5']]);
    igual(edicoes(amb, 'ID_NOVA_2').map((x) => x['Tipo de edição']), ['Envio da grade', 'Envio da grade', 'Grade encerrada']);
    igual(edicoes(amb, 'ID_NOVA_5').map((x) => x['Tipo de edição']), ['Envio da grade']);
    ev('[auditoria] envio 2027/2 → auditoria nova; "Grade encerrada" na de 2027/1; cópia final de 2027/1 em linha nova');
  });

  console.log('\n== Recusas antes de mudar algo');
  function recusa(nome, op, prep, codigo, verifica) {
    teste(nome, () => {
      const a = ambiente(op);
      if (prep) prep(a);
      const antes = foto(a);
      const r = enviar(a, '1', 2027);
      igual([r.ok, r.codigo], [false, codigo], r.erro);
      if (!verifica) igual(foto(a), antes, 'nada mudou');
      else verifica(a, r, antes);
      ev('[recusa ' + codigo + '] ' + nome + ' — "' + r.erro + '"');
    });
  }
  recusa('índice sem a coluna C "Auditoria_ID"', { indiceSemAuditoria: true }, null, 'CONFIGURACAO');
  recusa('chave AUDITORIA_GRADES_ANTERIORES ausente no ID_INDEX', { semChaves: ['AUDITORIA_GRADES_ANTERIORES'] }, null, 'CONFIGURACAO');
  recusa('falha ao criar a planilha de auditoria: cópia feita e registrada, grade intacta', null, (a) => a.injetarFalha((e) => e.tipo === 'createSpreadsheet'), 'AUDITORIA_FALHOU', (a, r) => {
    igual(a.grade().getName(), 'Grade Horária - 1º Semestre de 2026', 'grade não renomeada');
    igual(a.grade().getSheetByName('PSA').getRange(4, 3).getValue(), 'ANT0004', 'grade não apagada');
    igual(a.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length, 1, 'cópia feita');
    verdade(/cópia de segurança foi feita/.test(r.erro), r.erro);
  });
  recusa('índice aponta uma auditoria que não abre', null, (a) => { a.indiceGrades().getSheets()[0].getRange(3, 1, 1, 3).setValues([["'2027/1", '', 'ID_INEXISTENTE']]); }, 'CONFIGURACAO');

  console.log('\n== ativarAuditoriaGrade (editor)');
  let b;
  teste('ativar: cria a auditoria do semestre do NOME atual (2026/1), instala os acionadores de edição e (1.8.0) de abertura apontando para a planilha das secretarias, e a aba Aberturas; repetir não duplica', () => {
    b = ambiente();
    const r1 = pedir(b.ctx.ativarAuditoriaGrade());
    igual([r1.semestre, r1.acionador, r1.acionadorAbertura], ['2026/1', 'instalado agora', 'instalado agora']);
    verdade(/criada agora/.test(r1.auditoria) && !/ID_/.test(JSON.stringify(r1)), 'sem IDs: ' + JSON.stringify(r1));
    igual(b.estado.acionadores.map((g) => [g.getHandlerFunction(), g.getTriggerSourceId(), g.getEventType()]), [['registrarEdicaoGrade', 'ID_GRADE_TESTE', 'ON_EDIT'], ['registrarAberturaGrade', 'ID_GRADE_TESTE', 'ON_OPEN']]);
    igual(b.planilhas.get(pastaAud(b)[0]).getSheets().map((x) => x.getName()), ['Edições', 'Aberturas', 'Sobre']);
    const r2 = pedir(b.ctx.ativarAuditoriaGrade());
    igual([r2.acionador, r2.acionadorAbertura, /já existia/.test(r2.auditoria), b.estado.acionadores.length], ['já estava instalado', 'já estava instalado', true, 2]);
    igual(edicoes(b, pastaAud(b)[0]).map((x) => x['Tipo de edição']), ['Auditoria ativada', 'Auditoria ativada']);
    // agora o envio não avisa mais
    const r = pedir(enviar(b, '1', 2027));
    igual([r.auditoria.registroAtivo, r.avisos], [true, []]);
    ev('[ativar] ativarAuditoriaGrade: auditoria de 2026/1 criada (Edições, Aberturas, Sobre), 2 acionadores (edição e abertura → planilha das secretarias); repetir = sem duplicar; envio depois: registro ativo, sem aviso');
  });
  teste('(1.8.0) auditoria criada antes da 1.8.0 (sem aba Aberturas) e só com o acionador de edição: o envio avisa; ativar acrescenta o de abertura e a aba', () => {
    const c = ambiente();
    pedir(c.ctx.ativarAuditoriaGrade());
    const aud = c.planilhas.get(pastaAud(c)[0]);
    aud.deleteSheet(aud.getSheetByName('Aberturas'));
    c.estado.acionadores = c.estado.acionadores.filter((g) => g.getHandlerFunction() === 'registrarEdicaoGrade');
    const r = pedir(enviar(c, '1', 2026));
    verdade(r.avisos.some((a) => /edições e das aberturas/.test(a)) && r.auditoria.registroAtivo === false, JSON.stringify(r.avisos));
    const r2 = pedir(c.ctx.ativarAuditoriaGrade());
    igual([r2.acionador, r2.acionadorAbertura], ['já estava instalado', 'instalado agora']);
    verdade(!!aud.getSheetByName('Aberturas'), 'aba criada');
  });
  teste('ativar recusa leitor; desativar remove os acionadores (as auditorias ficam)', () => {
    const c = ambiente();
    c.permitir('leitor@unidade.example', 'LEITOR'); c.trocarUsuario('leitor@unidade.example');
    igual(c.ctx.ativarAuditoriaGrade().codigo, 'SO_ADMIN');
    c.trocarUsuario(ADMIN);
    pedir(c.ctx.ativarAuditoriaGrade());
    igual(pedir(c.ctx.desativarAuditoriaGrade()).acionadoresRemovidos, 2);
    igual([c.estado.acionadores.length, pastaAud(c).length], [0, 1]);
  });

  console.log('\n== registrarEdicaoGrade (o acionador)');
  // b: grade 2027/1 enviada, auditoria de 2027/1 = a última da pasta
  const idAud = () => b.indiceGrades().getSheets()[0].getRange(1, 1, b.indiceGrades().getSheets()[0].getLastRow(), 3).getValues().filter((l) => l[0] === '2027/1' && l[2])[0][2];
  const evento = (aba, l, c, nl, nc, extra) => Object.assign({ range: b.grade().getSheetByName(aba).getRange(l, c, nl || 1, nc || 1), source: b.grade(), user: { getEmail: () => 'secretaria.psa@usp.example' } }, extra || {});
  const novas = (antes) => edicoes(b, idAud()).slice(antes);
  teste('uma célula: Preencheu / Alterou / Apagou, com campo (título da linha 3), código e disciplina da linha, valor anterior e novo, e-mail', () => {
    const psa = b.grade().getSheetByName('PSA');
    const n0 = edicoes(b, idAud()).length;
    psa.set(6, 11, 'Terça-Feira');
    b.ctx.registrarEdicaoGrade(evento('PSA', 6, 11, 1, 1, { value: 'Terça-Feira' }));
    b.ctx.registrarEdicaoGrade(evento('PSA', 6, 11, 1, 1, { value: 'Quarta-Feira', oldValue: 'Terça-Feira' }));
    psa.set(6, 11, '');
    b.ctx.registrarEdicaoGrade(evento('PSA', 6, 11, 1, 1, { oldValue: 'Quarta-Feira' }));
    const e = novas(n0);
    igual(e.map((x) => x['Tipo de edição']), ['Preencheu', 'Alterou', 'Apagou']);
    const x = e[1];
    igual([x.Semestre, x.Origem, x['E-mail'], x.Aba, x['Célula'], x.Linha, x.Coluna, x.Campo, x['Valor anterior'], x['Valor novo'], x['Células no evento']],
      ['2027/1', 'Secretaria', 'secretaria.psa@usp.example', 'PSA', 'K6', 6, 'K', 'Dia da semana', 'Terça-Feira', 'Quarta-Feira', 1]);
    igual(x['Código da disciplina'], psa.getRange(6, 3).getDisplayValue());
    igual(x['Disciplina (como está na planilha)'], psa.getRange(6, 4).getDisplayValue());
    verdade(e[0]['ID do evento'] !== e[1]['ID do evento'], 'um ID por evento');
    ev('[registro] célula K6 (Dia da semana) da PSA: Preencheu → Alterou (Terça → Quarta) → Apagou, com código ' + x['Código da disciplina'] + ' e e-mail de quem editou');
  });
  teste('horário que chega como fração do dia (com ponto ou, na planilha em português, com vírgula) vira HH:mm; texto que parece fórmula fica como texto; e-mail indisponível = "(não identificado)"', () => {
    const n0 = edicoes(b, idAud()).length;
    b.ctx.registrarEdicaoGrade(evento('PSA', 7, 12, 1, 1, { value: '0.4166666666666667', oldValue: '0.375' }));
    b.ctx.registrarEdicaoGrade(evento('PSA', 7, 8, 1, 1, { value: '=IMPORTRANGE("x")', user: { getEmail: () => '' } }));
    const e = novas(n0);
    igual([e[0].Campo, e[0]['Valor anterior'], e[0]['Valor novo']], ['Horário de Início', '09:00', '10:00']);
    // 1.6.4: na planilha real (pt_BR) a fração chega com vírgula — antes ia para a auditoria como "0,3333333333"
    const n1 = edicoes(b, idAud()).length;
    b.ctx.registrarEdicaoGrade(evento('PSA', 7, 12, 1, 1, { value: '0,3333333333', oldValue: '0,4166666667' }));
    const v = novas(n1);
    igual([v[0]['Valor anterior'], v[0]['Valor novo'], v[0]['Tipo de edição']], ['10:00', '08:00', 'Alterou'], '(1.6.4) fração com vírgula vira HH:mm');
    b.ctx.registrarEdicaoGrade(evento('PSA', 7, 18, 1, 1, { value: '0,5', oldValue: '' }));
    igual(novas(n1).slice(-1)[0]['Valor novo'], '0,5', 'fora das colunas de horário o valor fica como veio');
    igual([e[1]['Valor novo'], e[1]['E-mail']], ['=IMPORTRANGE("x")', '(não identificado)']);
    const bruto = b.planilhas.get(idAud()).getSheetByName('Edições').cells.get((b.planilhas.get(idAud()).getSheetByName('Edições').getLastRow()) + ',13');
    verdade(typeof bruto === 'string', 'gravado como texto, não como fórmula');
  });
  teste('colagem 2×2: 4 linhas com o mesmo ID do evento e "Células no evento" = 4; colagem de 400 células: 1 linha-resumo', () => {
    const psa = b.grade().getSheetByName('PSA');
    psa.set(8, 11, 'Segunda-Feira'); psa.set(8, 12, "'08:00"); psa.set(9, 11, 'Sexta-Feira'); psa.set(9, 12, "'14:00");
    const n0 = edicoes(b, idAud()).length;
    b.ctx.registrarEdicaoGrade(evento('PSA', 8, 11, 2, 2));
    let e = novas(n0);
    igual(e.length, 4);
    igual(new Set(e.map((x) => x['ID do evento'])).size, 1);
    igual(e.map((x) => [x['Célula'], x['Valor novo'], x['Células no evento'], x['Tipo de edição']]), [['K8', 'Segunda-Feira', 4, 'Colagem ou preenchimento'], ['L8', '08:00', 4, 'Colagem ou preenchimento'], ['K9', 'Sexta-Feira', 4, 'Colagem ou preenchimento'], ['L9', '14:00', 4, 'Colagem ou preenchimento']]);
    const n1 = edicoes(b, idAud()).length;
    b.ctx.registrarEdicaoGrade(evento('PSA', 4, 11, 100, 4));
    e = novas(n1);
    igual([e.length, e[0]['Tipo de edição'], e[0]['Células no evento'], e[0]['Célula']], [1, 'Resumo (colagem grande)', 400, 'K4:N103']);
  });
  teste('ignora: chamada da página com dados inventados, edição em outra planilha, semestre sem auditoria (avisa no registro)', () => {
    const n0 = edicoes(b, idAud()).length;
    b.ctx.registrarEdicaoGrade(JSON.parse(JSON.stringify({ range: { getSheet: 1 }, value: 'x' })));
    b.ctx.registrarEdicaoGrade({ range: b.indiceGrades().getSheets()[0].getRange(5, 1), value: 'x' });
    b.grade().rename('Grade Horária - 2º semestre de 2030');
    b.ctx.registrarEdicaoGrade(evento('PSA', 6, 11, 1, 1, { value: 'Terça-Feira' }));
    b.grade().rename('Grade Horária - 1º semestre de 2027');
    igual(edicoes(b, idAud()).length, n0, 'nada gravado');
    verdade(b.estado.logs.some((l) => /não há auditoria para 2030\/2/.test(l)), 'aviso no registro de execução');
    const logs = b.estado.logs.concat(b.estado.erros).join('\n');
    verdade(!/@/.test(logs) && !/ID_[A-Z]/.test(logs), 'registro sem e-mails nem IDs: ' + logs.slice(0, 300));
  });

  console.log('\n== registrarAberturaGrade (1.8.0, acionador de abertura)');
  teste('abertura da planilha das secretarias: data e hora, semestre e e-mail na aba Aberturas; sem e-mail = "(não identificado)"; ignora chamadas inventadas, outra planilha e semestre sem auditoria', () => {
    const aud = b.planilhas.get(idAud());
    const aba = aud.getSheetByName('Aberturas');
    const n0 = aba.getLastRow();
    b.ctx.registrarAberturaGrade({ source: b.grade(), user: { getEmail: () => 'secretaria.psa@usp.example' } });
    b.ctx.registrarAberturaGrade({ source: b.grade(), user: { getEmail: () => '' } });
    b.ctx.registrarAberturaGrade(JSON.parse(JSON.stringify({ source: { getId: 1 } })));
    b.ctx.registrarAberturaGrade({ source: b.indiceGrades() });
    b.grade().rename('Grade Horária - 2º semestre de 2030');
    b.ctx.registrarAberturaGrade({ source: b.grade(), user: { getEmail: () => 'x@usp.example' } });
    b.grade().rename('Grade Horária - 1º semestre de 2027');
    const linhas = aba.getRange(n0 + 1, 1, aba.getLastRow() - n0, 3).getValues();
    igual(linhas.map((l) => [l[1], l[2]]), [['2027/1', 'secretaria.psa@usp.example'], ['2027/1', '(não identificado)']]);
    verdade(Object.prototype.toString.call(linhas[0][0]) === '[object Date]', 'data e hora');
    verdade(!b.estado.logs.concat(b.estado.erros).join('\n').match(/@/), 'registro sem e-mails');
    ev('[aberturas] 2 aberturas registradas (com e sem e-mail); chamadas inventadas, outra planilha e semestre sem auditoria ignorados');
  });

  console.log('\n== Validações da planilha das secretarias (planilha-grade/Validacoes.gs)');
  // A planilha de b, depois do envio 2027/1: tipos "Obrigatória/Eletiva/Livre", J = créditos, M = fórmula.
  const ctxV = { console: { log() {}, error: (m) => { throw new Error('validação lançou: ' + m); }, warn() {} }, String, Number, Math, Object, Array, Date, RegExp };
  vm.createContext(ctxV);
  vm.runInContext(fs.readFileSync(ARQ_VALIDACOES, 'utf8'), ctxV, { filename: 'Validacoes.gs' });
  const g = () => b.grade();
  function acharLinha(aba, cond) {
    const a = g().getSheetByName(aba); const v = a.getRange(4, 3, a.getLastRow() - 3, 8).getValues();
    for (let i = 0; i < v.length; i++) if (cond({ codigo: v[i][0], tipo: v[i][2], sem: v[i][6], cred: v[i][7] })) return 4 + i;
    return null;
  }
  const editar = (aba, l, c, valor) => { const a = g().getSheetByName(aba); a.set(l, c, valor); ctxV.onEdit({ range: a.getRange(l, c), value: valor }); };
  let obrig, opt, sem;
  teste('conflito (corrigido: tipos "Obrigatória"/"Eletiva"/"Livre"): optativa no mesmo dia e semestre ideal, horário sobreposto a uma obrigatória de OUTRA aba → dia e início apagados, nota explicativa no dia', () => {
    // uma obrigatória e uma optativa do MESMO semestre ideal em abas DIFERENTES
    const abasG = ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades'];
    let par = null;
    for (const aO of abasG) {
      for (const aP of abasG) {
        if (aO === aP || par) continue;
        const lO = acharLinha(aO, (x) => x.tipo === 'Obrigatória' && x.cred >= 2 && x.sem);
        if (!lO) continue;
        const s0 = g().getSheetByName(aO).getRange(lO, 9).getValue();
        const lP = acharLinha(aP, (x) => (x.tipo === 'Eletiva' || x.tipo === 'Livre') && x.sem === s0 && x.cred >= 1);
        if (lP) par = { aO, lO, aP, lP, s0 };
      }
    }
    verdade(par, 'achou obrigatória e optativa do mesmo semestre em abas diferentes');
    sem = par.s0;
    obrig = { aba: par.aO, l: par.lO, cod: g().getSheetByName(par.aO).getRange(par.lO, 3).getValue() };
    opt = { aba: par.aP, l: par.lP, cod: g().getSheetByName(par.aP).getRange(par.lP, 3).getValue() };
    editar(obrig.aba, obrig.l, 11, 'Terça-Feira'); editar(obrig.aba, obrig.l, 12, '10:00');
    igual(g().getSheetByName(obrig.aba).getRange(obrig.l, 11).getNote(), '', 'obrigatória não é verificada');
    editar(opt.aba, opt.l, 11, 'Terça-Feira'); editar(opt.aba, opt.l, 12, '11:00');
    const psa = g().getSheetByName(opt.aba); const lOpt = opt.l;
    igual([psa.getRange(lOpt, 11).getValue(), psa.getRange(lOpt, 12).getValue()], ['', ''], 'dia e início apagados');
    const nota = psa.getRange(lOpt, 11).getNote();
    verdade(/Conflito de horário/.test(nota) && nota.indexOf(obrig.cod) >= 0 && nota.indexOf('aba ' + obrig.aba) >= 0 && /10:00–1\d:00/.test(nota), nota);
    ev('[validação] conflito: ' + opt.cod + ' (' + opt.aba + ', optativa, ' + sem + 'º) terça 11:00 × obrigatória ' + obrig.cod + ' (' + obrig.aba + ') terça 10:00 → apagado com nota: "' + nota.replace(/\n+/g, ' ') + '"');
  });
  teste('sem conflito: horário que termina antes da obrigatória começar fica, e a nota antiga sai; outro dia também passa', () => {
    const cred = g().getSheetByName(opt.aba).getRange(opt.l, 10).getValue();
    const ini = 10 * 60 - cred * 60;   // termina exatamente às 10:00
    const hh = ('0' + Math.floor(ini / 60)).slice(-2) + ':00';
    editar(opt.aba, opt.l, 11, 'Terça-Feira'); editar(opt.aba, opt.l, 12, hh);
    const psa = g().getSheetByName(opt.aba);
    igual([psa.getRange(opt.l, 11).getValue(), psa.getRange(opt.l, 12).getValue(), psa.getRange(opt.l, 11).getNote()], ['Terça-Feira', hh, '']);
    editar(opt.aba, opt.l, 11, 'Quarta-Feira'); editar(opt.aba, opt.l, 12, '10:00');
    igual(psa.getRange(opt.l, 12).getValue(), '10:00', 'outro dia: sem conflito');
  });
  teste('modalidade "Prática": dia "Horário Variável" e início "-- : --" (o fim acompanha pela fórmula); fora das 6 abas e no cabeçalho não faz nada', () => {
    editar(opt.aba, opt.l, 6, 'Prática');
    const psa = g().getSheetByName(opt.aba);
    igual([psa.getRange(opt.l, 11).getValue(), psa.getRange(opt.l, 12).getValue()], ['Horário Variável', '-- : --']);
    const r = opt.l, I = 'IF(ISNUMBER(L' + r + ');L' + r + ';TIMEVALUE(L' + r + '))';
    igual(psa.getRange(r, 13).getFormulas()[0][0], '=IF(L' + r + '="";"";IF(ISERROR(' + I + ');L' + r + ';IF(J' + r + '="";"";TEXT(' + I + '+J' + r + '/24;"HH:mm"))))', 'M continua sendo a fórmula (1.6.3: com ";", planilha pt_BR)');
    const db = g().getSheetByName('DataBase'); db.set(5, 6, 'Prática'); ctxV.onEdit({ range: db.getRange(5, 6), value: 'Prática' });
    igual(db.getRange(5, 11).getValue(), '', 'DataBase intocada');
    psa.set(3, 6, 'Modalidade'); ctxV.onEdit({ range: psa.getRange(3, 6) });
    igual(psa.getRange(3, 3).getValue(), 'Código', 'cabeçalho intocado');
  });
  teste('o código novo da planilha não tem menu, backup, registro, grade visual nem acionadores; só onEdit', () => {
    const src = fs.readFileSync(ARQ_VALIDACOES, 'utf8');
    verdade(!/onOpen|createMenu|DriveApp|ScriptApp|doGet|HtmlService|UrlFetchApp|PropertiesService/.test(src), 'só planilha');
    igual(Object.keys(ctxV).filter((k) => typeof ctxV[k] === 'function' && !/_$/.test(k) && !['String', 'Number', 'Math', 'Object', 'Array', 'Date', 'RegExp'].includes(k)), ['onEdit']);
  });

  ev('\n=== RESULTADO ===\nExecutados: ' + (ok + falhas) + ' (' + ok + ' ok, ' + falhas + ' falha(s)); pulados: 0');
  fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
  fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
  console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0  — evidências em ${path.relative(process.cwd(), ARQ_EVIDENCIAS)}`);
  if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }
})();

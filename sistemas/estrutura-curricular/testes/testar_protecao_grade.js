// Testes da proteção de acesso da planilha das secretarias
// (planilha-grade/Protecao.gs) com um simulador mínimo de proteções.
// E-mails fictícios. Uso: node testar_protecao_grade.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let ok = 0, falhas = 0;
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; console.log('  ✗', nome, '\n     ', e && e.message); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }

const DONO = 'dono@exemplo.usp.br';

function criarPlanilha(nomes, quemExecuta) {
  const gatilhos = [];
  function novaProtecao() {
    const p = { desc: '', editores: [DONO], aviso: false, dominio: true };
    return {
      _p: p,
      setDescription(d) { p.desc = d; return this; },
      getDescription() { return p.desc; },
      getEditors() { return p.editores.map((e) => ({ getEmail: () => e })); },
      addEditors(l) { l.forEach((e) => { if (!p.editores.includes(e)) p.editores.push(e); }); return this; },
      removeEditors(l) {
        if (l.includes(DONO)) throw new Error('não pode remover o dono');
        p.editores = p.editores.filter((e) => !l.includes(e)); return this;
      },
      isWarningOnly() { return p.aviso; },
      setWarningOnly(v) { p.aviso = v; return this; },
      canDomainEdit() { return p.dominio; },
      setDomainEdit(v) { p.dominio = v; return this; }
    };
  }
  function novaAba(nome) {
    const celulas = {};
    let protecoes = [];
    return {
      _celulas: celulas, _protecoes: () => protecoes,
      getName: () => nome,
      protect() { const p = novaProtecao(); protecoes.push(p); return p; },
      getProtections() { return protecoes.slice(); },
      getLastRow() { return Object.keys(celulas).reduce((m, k) => Math.max(m, +k.split(',')[0]), 0); },
      getRange(r, c, nr, nc) {
        if (typeof r === 'string') return { setWrap() { return this; } };
        nr = nr || 1; nc = nc || 1;
        return {
          getValues() { const o = []; for (let i = 0; i < nr; i++) { const l = []; for (let j = 0; j < nc; j++) l.push(celulas[(r + i) + ',' + (c + j)] ?? ''); o.push(l); } return o; },
          setValues(v) { v.forEach((l, i) => l.forEach((x, j) => { celulas[(r + i) + ',' + (c + j)] = x; })); return this; },
          setValue(x) { celulas[r + ',' + c] = x; return this; },
          setFontWeight() { return this; }
        };
      },
      setColumnWidth() {}, setFrozenRows() {}
    };
  }
  const abas = nomes.map(novaAba);
  const ss = {
    getSheetByName: (n) => abas.find((a) => a.getName() === n) || null,
    getSheets: () => abas.slice(),
    insertSheet(n) { const a = novaAba(n); abas.push(a); return a; },
    getOwner: () => ({ getEmail: () => DONO }),
    getSpreadsheetTimeZone: () => 'America/Sao_Paulo'
  };
  const ctx = {
    console: { log() {}, error() {} },
    SpreadsheetApp: { getActive: () => ss, ProtectionType: { SHEET: 'SHEET' } },
    Session: { getEffectiveUser: () => ({ getEmail: () => quemExecuta || DONO }) },
    Utilities: { formatDate: () => '16/10/2026 19:30' },
    ScriptApp: {
      getProjectTriggers: () => gatilhos.slice(),
      deleteTrigger: (t) => gatilhos.splice(gatilhos.indexOf(t), 1),
      newTrigger: (f) => ({ timeBased: () => ({ everyHours: () => ({ create: () => gatilhos.push({ getHandlerFunction: () => f }) }) }) })
    }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'planilha-grade', 'Protecao.gs'), 'utf8'), ctx);
  return { ss, ctx, gatilhos, aba: (n) => ss.getSheetByName(n) };
}

const ABAS = ['Informações', 'PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades', 'DataBase'];
const editores = (aba) => aba._protecoes()[0]._p.editores.slice().sort();

console.log('Proteção de acesso da planilha das secretarias');

teste('prepararAbaAcesso cria a aba com as 6 abas da grade e protege só para o dono', () => {
  const t = criarPlanilha(ABAS);
  t.ctx.prepararAbaAcesso();
  const acesso = t.aba('Acesso');
  igual(acesso.getRange(2, 1, 6, 1).getValues().map((l) => l[0]), ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades']);
  igual(editores(acesso), [DONO]);
});

teste('aplicarAcessoGrade deixa cada aba só com os autorizados e as outras só com o dono', () => {
  const t = criarPlanilha(ABAS);
  t.ctx.prepararAbaAcesso();
  const acesso = t.aba('Acesso');
  acesso.getRange(2, 2).setValue('Sec.PSA@exemplo.usp.br; outra.psa@exemplo.usp.br');
  acesso.getRange(3, 2).setValue('sec.psc@exemplo.usp.br\nsec.psc@exemplo.usp.br, nao-e-email');
  t.ctx.aplicarAcessoGrade();
  igual(editores(t.aba('PSA')), [DONO, 'outra.psa@exemplo.usp.br', 'sec.psa@exemplo.usp.br'].sort());
  igual(editores(t.aba('PSC')), [DONO, 'sec.psc@exemplo.usp.br'].sort());
  igual(editores(t.aba('Interdepartamentais')), [DONO]);
  igual(editores(t.aba('DataBase')), [DONO]);
  igual(t.aba('PSA')._protecoes()[0]._p.dominio, false, 'edição pelo domínio inteiro desligada');
  if (!/nao-e-email/.test(acesso.getRange(3, 3).getValues()[0][0])) throw new Error('e-mail inválido não foi apontado');
});

teste('reaplicar remove quem foi incluído direto na proteção e não duplica proteções', () => {
  const t = criarPlanilha(ABAS);
  t.ctx.prepararAbaAcesso();
  t.aba('Acesso').getRange(4, 2).setValue('sec.pse@exemplo.usp.br');
  t.ctx.aplicarAcessoGrade();
  t.aba('PSE')._protecoes()[0].addEditors(['docente@exemplo.usp.br']);
  t.ctx.aplicarAcessoGrade();
  igual(editores(t.aba('PSE')), [DONO, 'sec.pse@exemplo.usp.br'].sort());
  igual(t.aba('PSE')._protecoes().length, 1);
  if (!/docente@exemplo\.usp\.br/.test(t.aba('Acesso').getRange(4, 3).getValues()[0][0])) throw new Error('remoção não foi registrada');
});

teste('proteções que já existiam (ex.: coluna M) ficam intocadas', () => {
  const t = criarPlanilha(ABAS);
  const psa = t.aba('PSA');
  const antiga = psa.protect().setDescription('Horário de Fim');
  t.ctx.prepararAbaAcesso();
  t.aba('Acesso').getRange(2, 2).setValue('sec.psa@exemplo.usp.br');
  t.ctx.aplicarAcessoGrade();
  igual(psa._protecoes().length, 2);
  igual(antiga._p.editores, [DONO]);
});

teste('outra conta que não a dona é recusada sem mexer em nada', () => {
  const t = criarPlanilha(ABAS, 'secretaria@exemplo.usp.br');
  let erro = '';
  try { t.ctx.prepararAbaAcesso(); } catch (e) { erro = e.message; }
  if (!/conta dona/.test(erro)) throw new Error('não recusou');
  igual(t.aba('Acesso'), null);
});

teste('ativarVerificacaoDeAcesso deixa um único gatilho de hora em hora', () => {
  const t = criarPlanilha(ABAS);
  t.ctx.prepararAbaAcesso();
  t.ctx.ativarVerificacaoDeAcesso();
  t.ctx.ativarVerificacaoDeAcesso();
  igual(t.gatilhos.length, 1);
  t.ctx.desativarVerificacaoDeAcesso();
  igual(t.gatilhos.length, 0);
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);

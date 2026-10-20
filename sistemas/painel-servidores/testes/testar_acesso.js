// Testes do controle de acesso do Painel dos servidores (AcessoPainel.gs),
// sem Google: Session, PropertiesService, CacheService, SpreadsheetApp e
// HtmlService simulados com planilhas fictícias (nenhum e-mail real).
// Confere também que toda função pública dos .gs, menos doGet, começa
// com exigirAcessoPainel_() ou exigirAdminPainel_(). Uso: node testar_acesso.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SRC = path.join(__dirname, '..', 'src');

let ok = 0, fail = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; console.log('ok', n, extra); } else { fail++; console.log('FALHA', n, extra); } };
const lanca = fn => { try { fn(); return null; } catch (e) { return e; } };

// --- 1. Toda função pública tem guarda -----------------------------------
const ESCRITA = ['salvarConfigColacao', 'salvarConfigExclusaoDisciplinas', 'desativarFormulario', 'salvarConfigFormulario',
  'salvarDadosGeraisRuleset', 'salvarRequisitoCurricular', 'excluirRequisitoCurricular', 'salvarDisciplinaCurricular',
  'excluirDisciplinaCurricular', 'salvarGrupoCurricular', 'excluirGrupoCurricular', 'ativarRulesetCurricular',
  'inativarRulesetCurricular', 'criarNovaVersaoRuleset', 'criarRulesetParaOutroCurriculo'];
const publicas = {};
for (const arq of fs.readdirSync(SRC).filter(f => f.endsWith('.gs'))) {
  const txt = fs.readFileSync(path.join(SRC, arq), 'utf8');
  const re = /^function\s+([A-Za-z0-9]+)\s*\([^)]*\)\s*\{\s*\n?\s*([^\n]*)/gm;
  let m;
  while ((m = re.exec(txt))) publicas[m[1]] = { arq, primeira: m[2].trim() };
}
for (const [nome, { arq, primeira }] of Object.entries(publicas)) {
  if (nome === 'doGet') continue;
  const guarda = primeira.startsWith('exigirAdminPainel_();') ? 'admin' : primeira.startsWith('exigirAcessoPainel_();') ? 'acesso' : null;
  chk(`guarda em ${nome} (${arq})`, guarda !== null, primeira);
  if (ESCRITA.includes(nome)) chk(`${nome} grava: exige administrador`, guarda === 'admin', primeira);
}
chk('todas as funções que gravam foram encontradas', ESCRITA.every(n => publicas[n]), ESCRITA.filter(n => !publicas[n]).join(', '));
const doGet = fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8').match(/function doGet\(e\) \{([\s\S]*?)\n\}/)[1];
chk('doGet confere o acesso antes de montar o painel', doGet.indexOf('verificarAcessoPainel_()') > -1 && doGet.indexOf('verificarAcessoPainel_()') < doGet.indexOf('createTemplateFromFile("Painel")'));

// --- 2. AcessoPainel.gs com Google simulado --------------------------------
const ID_INDICE = 'INDICE_FICTICIO', ID_PERMISSOES = 'PERMISSOES_FICTICIAS';
function aba(valores) {
  return {
    getDataRange: () => ({ getDisplayValues: () => valores }),
    getLastRow: () => valores.length,
    getRange: (l, c, nl, nc) => ({ getDisplayValues: () => valores.slice(l - 1, l - 1 + nl).map(r => r.slice(c - 1, c - 1 + nc)) })
  };
}
const TITULOS = ['N. USP', 'Nome', 'e-mail', 'Observacao', 'Perfil'];
function cenario({ email = 'admin@usp.br', linhas, propriedade = ID_INDICE, indice, semAba = false, titulos = TITULOS } = {}) {
  const leituras = { planilha: 0 };
  const cache = {};
  const logs = [];
  const planilhas = {
    [ID_INDICE]: { getSheets: () => [aba(indice || [['Chave', 'Descrição', 'ID de Produção'], ['OUTRA', '', 'x'], ['PERMISSOES_DE_ACESSO', '', ID_PERMISSOES]])] },
    [ID_PERMISSOES]: { getSheetByName: n => { leituras.planilha++; return semAba || n !== 'PAINEL_SERVIDORES' ? null : aba([titulos].concat(linhas || [
      ['1', 'Pessoa Fictícia A', 'Admin@USP.br ', '', 'ADMINISTRADOR'],
      ['2', 'Pessoa Fictícia B', '\tleitor@usp.br', '', 'LEITOR'],
      ['3', 'Pessoa Fictícia C', 'semperfil@usp.br', '', ''],
      ['4', 'Pessoa Fictícia D', 'estranho@usp.br', '', 'Editor'],
      ['5', 'Pessoa Fictícia E', 'duplo@usp.br', '', 'ADMINISTRADOR'],
      ['6', 'Pessoa Fictícia E', 'duplo@usp.br', '', 'LEITOR'],
      ['7', 'Sem e-mail', '', '', 'ADMINISTRADOR']
    ])); } }
  };
  const ctx = {
    console: { log: m => logs.push(String(m)), error: m => logs.push(String(m)), warn: m => logs.push(String(m)) },
    JSON,
    Session: { getActiveUser: () => ({ getEmail: () => email }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'ID_INDEX_SPREADSHEET_ID' ? propriedade : null) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    SpreadsheetApp: { openById: id => { if (!planilhas[id]) throw new Error('arquivo inexistente'); return planilhas[id]; } },
    HtmlService: { createTemplateFromFile: nome => { const t = { nome, evaluate: () => ({ setTitle: () => ({ addMetaTag: () => t }) }) }; return t; } }
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8');
  vm.runInContext(code.match(/function normalizarSemAcento_[\s\S]*?\n\}/)[0], ctx);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'AcessoPainel.gs'), 'utf8'), ctx);
  return { ctx, leituras, logs, cache };
}

{
  const { ctx } = cenario({ email: 'admin@usp.br' });
  chk('ADMINISTRADOR: papel admin (e-mail com maiúscula e espaço na aba)', ctx.verificarAcessoPainel_().papel === 'admin');
  chk('ADMINISTRADOR: pode gravar', lanca(() => ctx.exigirAdminPainel_()) === null);
  chk('papelParaPagina_ devolve JSON', ctx.papelParaPagina_() === '"admin"');
}
{
  const { ctx } = cenario({ email: 'Leitor@usp.br' });
  const acesso = ctx.verificarAcessoPainel_();
  chk('LEITOR: abre o painel (tab antes do e-mail na aba)', acesso.ok && acesso.papel === 'leitor');
  chk('LEITOR: lê', lanca(() => ctx.exigirAcessoPainel_()) === null);
  const e = lanca(() => ctx.exigirAdminPainel_());
  chk('LEITOR: gravação recusada com a mensagem', e && e.codigo === 'SO_LEITURA' && e.message.includes('não tem permissão'), e && e.message);
  chk('LEITOR: papelParaPagina_', ctx.papelParaPagina_() === '"leitor"');
}
for (const email of ['semperfil@usp.br', 'estranho@usp.br', 'duplo@usp.br']) {
  const { ctx } = cenario({ email });
  chk(`${email}: vira leitor (perfil vazio, desconhecido ou repetido)`, ctx.verificarAcessoPainel_().papel === 'leitor' && lanca(() => ctx.exigirAdminPainel_()) !== null);
}
{
  const { ctx } = cenario({ email: 'fora@usp.br' });
  const acesso = ctx.verificarAcessoPainel_();
  chk('fora da aba: não abre', !acesso.ok && acesso.codigo === 'SEM_ACESSO', JSON.stringify(acesso));
  const e = lanca(() => ctx.exigirAcessoPainel_());
  chk('fora da aba: leitura recusada', e && e.codigo === 'SEM_ACESSO');
  const pagina = ctx.paginaSemAcessoPainel_(acesso);
  chk('fora da aba: página PainelSemAcesso com título', pagina.nome === 'PainelSemAcesso' && pagina.titulo === 'Sem acesso a este painel' && pagina.mensagem === acesso.mensagem);
}
{
  const { ctx } = cenario({ email: '' });
  const acesso = ctx.verificarAcessoPainel_();
  chk('conta não identificada: SEM_CONTA', !acesso.ok && acesso.codigo === 'SEM_CONTA');
  chk('conta não identificada: título próprio', ctx.paginaSemAcessoPainel_(acesso).titulo === 'Conta não identificada');
}
for (const [rotulo, opcoes] of [
  ['sem a Script Property', { propriedade: null }],
  ['ID_INDEX sem a chave', { indice: [['Chave', 'ID de Produção'], ['OUTRA', 'x']] }],
  ['ID_INDEX sem as colunas', { indice: [['Nome', 'Valor']] }],
  ['sem a aba PAINEL_SERVIDORES', { semAba: true }],
  ['colunas fora de ordem', { titulos: ['e-mail', 'Nome', 'N. USP', 'Perfil', 'Observacao'] }]
]) {
  const { ctx, logs } = cenario(opcoes);
  const acesso = ctx.verificarAcessoPainel_();
  chk(`${rotulo}: painel fechado (CONFIGURACAO)`, !acesso.ok && acesso.codigo === 'CONFIGURACAO', JSON.stringify(acesso));
  chk(`${rotulo}: motivo no log, sem e-mail`, logs.length === 1 && !/@/.test(logs[0]), logs.join(' | '));
}
{
  const { ctx, leituras } = cenario({ email: 'admin@usp.br' });
  ctx.exigirAcessoPainel_(); ctx.exigirAcessoPainel_(); ctx.exigirAdminPainel_();
  chk('lista em cache: a aba é lida uma vez', leituras.planilha === 1, String(leituras.planilha));
}
{
  const { ctx, logs } = cenario({ email: 'admin@usp.br' });
  const c = ctx.diagnosticarAcessoPainel();
  chk('diagnóstico conta por perfil', c.ADMINISTRADOR === 1 && c.LEITOR === 2 && c['vazio ou desconhecido (= LEITOR)'] === 2, JSON.stringify(c));
  chk('diagnóstico não registra e-mails', logs.every(l => !/@/.test(l)), logs.join(' | '));
  const leitor = cenario({ email: 'leitor@usp.br' }).ctx;
  chk('diagnóstico só para administrador', lanca(() => leitor.diagnosticarAcessoPainel()) !== null);
}

console.log(`\n${ok} ok, ${fail} falha(s).`);
process.exit(fail ? 1 : 0);

// Testes do controle de acesso do Painel dos servidores (AcessoPainel.gs),
// sem Google: Session, PropertiesService, CacheService, SpreadsheetApp e
// HtmlService simulados com planilhas fictícias (nenhum e-mail real).
// Confere também que toda função pública dos .gs, menos doGet, começa
// com exigirAcessoPainel_() ou exigirAdminPainel_() (o gatilho diário da
// auditoria: exigirGatilhoOuAdminPainel_(e)), e que toda função que grava
// passa pela auditoria (1.3). Uso: node testar_acesso.js
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
  'inativarRulesetCurricular', 'criarNovaVersaoRuleset', 'criarRulesetParaOutroCurriculo',
  'migrarRegrasCurricularesMultiCurriculoERevisaoV1'];
const publicas = {};
for (const arq of fs.readdirSync(SRC).filter(f => f.endsWith('.gs'))) {
  const txt = fs.readFileSync(path.join(SRC, arq), 'utf8');
  const re = /^function\s+([A-Za-z0-9]+)\s*\([^)]*\)\s*\{\s*\n?\s*([^\n]*)([\s\S]*?)\n\}/gm;
  let m;
  while ((m = re.exec(txt))) publicas[m[1]] = { arq, primeira: m[2].trim(), corpo: m[3] };
}
for (const [nome, { arq, primeira, corpo }] of Object.entries(publicas)) {
  if (nome === 'doGet') continue;
  const guarda = primeira.startsWith('exigirAdminPainel_();') ? 'admin' : primeira.startsWith('exigirAcessoPainel_();') ? 'acesso'
    : nome === 'consolidarAuditoriaPainel' && primeira === 'exigirGatilhoOuAdminPainel_(e);' ? 'gatilho' : null;
  chk(`guarda em ${nome} (${arq})`, guarda !== null, primeira);
  if (ESCRITA.includes(nome)) {
    chk(`${nome} grava: exige administrador`, guarda === 'admin', primeira);
    chk(`${nome} grava: passa pela auditoria`, /\b(alteracaoPainel_|auditarAlteracao_)\(/.test(corpo) && corpo.includes(nome + 'SemAuditoria_('), arq);
  }
}
{
  const gatilho = fs.readFileSync(path.join(SRC, 'AuditoriaPainel.gs'), 'utf8').match(/function exigirGatilhoOuAdminPainel_\(e\) \{([\s\S]*?)\n\}/)[1];
  chk('gatilho diário: confere o triggerUid nos gatilhos do projeto, senão exige administrador',
    /getProjectTriggers\(\)[\s\S]*getUniqueId\(\)/.test(gatilho) && /exigirAdminPainel_\(\);\s*$/.test(gatilho.trim()));
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
function cenario({ email = 'admin@exemplo.usp.br', linhas, propriedade = ID_INDICE, indice, semAba = false, titulos = TITULOS, extras = {} } = {}) {
  const leituras = { planilha: 0, indice: 0 };
  const cache = {};
  const logs = [];
  const planilhas = Object.assign({}, extras, {
    [ID_INDICE]: { getSheets: () => { leituras.indice++; return [aba(indice || [['Chave', 'Descrição', 'ID de Produção'], ['OUTRA', '', 'x'], ['PERMISSOES_DE_ACESSO', '', ID_PERMISSOES]])]; } },
    [ID_PERMISSOES]: { getName: () => 'Permissões', getSheetByName: n => { leituras.planilha++; return semAba || n !== 'PAINEL_SERVIDORES' ? null : aba([titulos].concat(linhas || [
      ['1', 'Pessoa Fictícia A', 'Admin@Exemplo.USP.br ', '', 'ADMINISTRADOR'],
      ['2', 'Pessoa Fictícia B', '\tleitor@exemplo.usp.br', '', 'LEITOR'],
      ['3', 'Pessoa Fictícia C', 'semperfil@exemplo.usp.br', '', ''],
      ['4', 'Pessoa Fictícia D', 'estranho@exemplo.usp.br', '', 'Editor'],
      ['5', 'Pessoa Fictícia E', 'duplo@exemplo.usp.br', '', 'ADMINISTRADOR'],
      ['6', 'Pessoa Fictícia E', 'duplo@exemplo.usp.br', '', 'LEITOR'],
      ['7', 'Sem e-mail', '', '', 'ADMINISTRADOR']
    ])); } }
  });
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
  const { ctx } = cenario({ email: 'admin@exemplo.usp.br' });
  chk('ADMINISTRADOR: papel admin (e-mail com maiúscula e espaço na aba)', ctx.verificarAcessoPainel_().papel === 'admin');
  chk('ADMINISTRADOR: pode gravar', lanca(() => ctx.exigirAdminPainel_()) === null);
  chk('papelParaPagina_ devolve JSON', ctx.papelParaPagina_() === '"admin"');
}
{
  const { ctx } = cenario({ email: 'Leitor@exemplo.usp.br' });
  const acesso = ctx.verificarAcessoPainel_();
  chk('LEITOR: abre o painel (tab antes do e-mail na aba)', acesso.ok && acesso.papel === 'leitor');
  chk('LEITOR: lê', lanca(() => ctx.exigirAcessoPainel_()) === null);
  const e = lanca(() => ctx.exigirAdminPainel_());
  chk('LEITOR: gravação recusada com a mensagem', e && e.codigo === 'SO_LEITURA' && e.message.includes('não tem permissão'), e && e.message);
  chk('LEITOR: papelParaPagina_', ctx.papelParaPagina_() === '"leitor"');
}
for (const email of ['semperfil@exemplo.usp.br', 'estranho@exemplo.usp.br', 'duplo@exemplo.usp.br']) {
  const { ctx } = cenario({ email });
  chk(`${email}: vira leitor (perfil vazio, desconhecido ou repetido)`, ctx.verificarAcessoPainel_().papel === 'leitor' && lanca(() => ctx.exigirAdminPainel_()) !== null);
}
{
  const { ctx } = cenario({ email: 'fora@exemplo.usp.br' });
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
  const { ctx, leituras } = cenario({ email: 'admin@exemplo.usp.br' });
  ctx.exigirAcessoPainel_(); ctx.exigirAcessoPainel_(); ctx.exigirAdminPainel_();
  chk('lista em cache: a aba é lida uma vez', leituras.planilha === 1, String(leituras.planilha));
}
{
  const { ctx, logs } = cenario({ email: 'admin@exemplo.usp.br' });
  const c = ctx.diagnosticarAcessoPainel();
  chk('diagnóstico conta por perfil', c.ADMINISTRADOR === 1 && c.LEITOR === 2 && c['vazio ou desconhecido (= LEITOR)'] === 2, JSON.stringify(c));
  chk('diagnóstico não registra e-mails', logs.every(l => !/@/.test(l)), logs.join(' | '));
  const leitor = cenario({ email: 'leitor@exemplo.usp.br' }).ctx;
  chk('diagnóstico só para administrador', lanca(() => leitor.diagnosticarAcessoPainel()) !== null);
}

// --- 3. Planilhas pelo ID_INDEX (1.4) ---------------------------------------
{
  const fontes = ['Code.gs', 'ConfigFormulariosCore.gs', 'ConfigRegrasCurricularesRepository.gs'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  const todos = fs.readdirSync(SRC).filter(f => f.endsWith('.gs')).map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  chk('nenhum ID nem marcador CONFIGURAR_ no código', !/CONFIGURAR_ID|ID_PLANILHA_/.test(todos) && !/openById\(\s*["']/.test(todos));
  const chaves = [...fontes.matchAll(/const (CHAVE_PLANILHA_[A-Z_]+) = "([A-Z_]+)"/g)];
  chk('9 planilhas de dados por chave do ID_INDEX', chaves.length === 9, chaves.map(c => c[2]).join(', '));
  chk('cada chave é aberta por idNoIndicePainel_', chaves.every(c => fontes.includes('openById(idNoIndicePainel_(' + c[1] + '))')));
}
{
  const indice = [['Chave', 'ID de Produção'], ['PERMISSOES_DE_ACESSO', ID_PERMISSOES], ['PERIODOS', 'PER'], ['DIPLOMAS_X', 'DIP']];
  const { ctx, leituras, cache } = cenario({ indice });
  ctx.idNoIndicePainel_('PERIODOS'); ctx.idNoIndicePainel_('DIPLOMAS_X'); ctx.exigirAcessoPainel_();
  chk('ID_INDEX lido uma vez para várias chaves', leituras.indice === 1, String(leituras.indice));
  vm.runInContext('indicePainelLido_ = null', ctx);
  chk('outra execução usa o cache do script', ctx.idNoIndicePainel_('PERIODOS') === 'PER' && leituras.indice === 1, String(leituras.indice));
  indice.push(['NOVA', 'NOV']);
  chk('chave recém-criada: lê o ID_INDEX de novo', ctx.idNoIndicePainel_('NOVA') === 'NOV' && leituras.indice === 2, String(leituras.indice));
  chk('chave ausente: erro com o nome da chave', (lanca(() => ctx.idNoIndicePainel_('NAO_EXISTE')) || {}).message === 'Chave NAO_EXISTE ausente ou sem ID de Produção no ID_INDEX.');
  chk('o cache guarda só o mapa chave → ID', Object.keys(JSON.parse(cache.indicePainelServidores)).join() === 'PERMISSOES_DE_ACESSO,PERIODOS,DIPLOMAS_X,NOVA');
}
{
  const nomes = ['EMISSAO_DIPLOMAS', 'ABERTURA_HABILITACOES', 'TRANCAMENTO_TOTAL_MATRICULA', 'TRANCAMENTO_PARCIAL_MATRICULA', 'SEGUNDA_VIA_BUSP', 'MATRICULA_INTERCAMBISTAS', 'EXCLUSAO_DISCIPLINAS', 'PERIODOS', 'REGRAS_CURRICULARES', 'AUDITORIA_PAINEL_SERVIDORES', 'SERVIDORES', 'PLANILHA_DOCENTES'];
  const indice = [['Chave', 'ID de Produção'], ['PERMISSOES_DE_ACESSO', ID_PERMISSOES]].concat(nomes.filter(n => n !== 'SEGUNDA_VIA_BUSP').map(n => [n, 'IDREAL_' + n]));
  const extras = {}; nomes.forEach(n => { extras['IDREAL_' + n] = { getName: () => 'Planilha ' + n }; });
  const { ctx, logs } = cenario({ indice, extras });
  vm.runInContext(fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8').match(/const CHAVE_PLANILHA_[\s\S]*?;/g).join('\n') + '\n' +
    fs.readFileSync(path.join(SRC, 'ConfigFormulariosCore.gs'), 'utf8').match(/const CHAVE_PLANILHA_[^\n]*/)[0] + '\n' +
    fs.readFileSync(path.join(SRC, 'ConfigRegrasCurricularesRepository.gs'), 'utf8').match(/const CHAVE_PLANILHA_[^\n]*/)[0] +
    '\nconst AUDITORIA_PAINEL = { CHAVE: "AUDITORIA_PAINEL_SERVIDORES" }; var manutencao = []; function registrarManutencaoPainel_(f, r) { manutencao.push([f, r]); }', ctx);
  const r = ctx.diagnosticarPlanilhasPainel();
  chk('diagnóstico das planilhas: 13 chaves', Object.keys(r).length === 13, Object.keys(r).join(', '));
  chk('diagnóstico mostra o nome, nunca o ID', r.EMISSAO_DIPLOMAS === 'ok: Planilha EMISSAO_DIPLOMAS' && Object.values(r).every(v => !/IDREAL_/.test(v)) && logs.every(l => !/IDREAL_/.test(l)), JSON.stringify(r));
  chk('diagnóstico aponta a chave que falta', /^FALHA: Chave SEGUNDA_VIA_BUSP ausente/.test(r.SEGUNDA_VIA_BUSP), r.SEGUNDA_VIA_BUSP);
  chk('diagnóstico registrado na auditoria', vm.runInContext('manutencao', ctx)[0][1].falhas.join() === 'SEGUNDA_VIA_BUSP');
  const leitor = cenario({ email: 'leitor@exemplo.usp.br' }).ctx;
  chk('diagnóstico das planilhas só para administrador', lanca(() => leitor.diagnosticarPlanilhasPainel()) !== null);
}

console.log(`\n${ok} ok, ${fail} falha(s).`);
process.exit(fail ? 1 : 0);

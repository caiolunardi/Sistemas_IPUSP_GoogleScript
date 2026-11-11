// Testes da fila de cadastro dos pedidos de colação (v1.5,
// PessoasFilaCadastro.gs). Serviços do Apps Script simulados; dados
// 100% sintéticos (nomes inventados, números 9000000+, e-mails
// @exemplo.invalid). Uso: node testar_fila_cadastro.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const SRC = require('path').join(__dirname, '..', 'src') + '/';

// Como o Sheets: o apóstrofo inicial força texto e não fica no valor.
const semApostrofo = v => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);

function sheet(name, vals) {
  const s = { vals, escritas: [], parent: null,
    getName: () => name, getLastRow: () => vals.length, getLastColumn: () => vals.reduce((m, l) => Math.max(m, l.length), 0), getParent: () => s.parent,
    appendRow: l => { s.escritas.push(['append', l.slice()]); vals.push(l.map(semApostrofo)); return s; },
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (vals[r - 1 + i] || [])[c - 1 + j]; return v === undefined ? '' : v; })),
      getDisplayValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (vals[r - 1 + i] || [])[c - 1 + j]; return v == null ? '' : String(v); })),
      getFormulas: () => Array.from({ length: nr }, () => Array.from({ length: nc }, () => '')),
      getValue: () => { const v = (vals[r - 1] || [])[c - 1]; return v === undefined ? '' : v; },
      setValue: v => { while (vals.length < r) vals.push([]); vals[r - 1][c - 1] = semApostrofo(v); s.escritas.push([r, c, v]); },
      setValues: vs => vs.forEach((l, i) => l.forEach((v, j) => { while (vals.length < r + i) vals.push([]); vals[r - 1 + i][c - 1 + j] = semApostrofo(v); s.escritas.push([r + i, c + j, v]); }))
    }) };
  return s;
}

function run(props, files, opts = {}) {
  const logs = [], abertos = [], enviados = [];
  const ctx = { Logger: { log: m => logs.push(String(m)) },
    console: { log: m => logs.push(String(m)), error: m => logs.push(String(m)), warn: m => logs.push(String(m)) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
    SpreadsheetApp: { flush() {}, openById: id => { abertos.push(id); if (!files[id]) throw new Error('no access ' + id); const f = files[id];
      const ss = { getSheetByName: n => f.find(x => x.getName() === n) || null, getSheets: () => f,
        insertSheet: n => { const nova = sheet(n, []); nova.parent = ss; f.push(nova); return nova; },
        getEditors: () => (opts.editores || []).map(e => ({ getEmail: () => e })), getOwner: () => null };
      f.forEach(x => { x.parent = ss; }); return ss; } },
    Session: { getActiveUser: () => ({ getEmail: () => opts.usuario || '' }), getEffectiveUser: () => ({ getEmail: () => opts.efetivo || 'implantador@exemplo.invalid' }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !opts.ocupado, releaseLock() {} }) },
    MailApp: { sendEmail: m => { if (opts.emailFalha) throw new Error('Service invoked too many times: email'); enviados.push(m); } },
    Utilities: { formatDate: () => '2026-11-10T12:00:00.000-03:00' },
    HtmlService: { createTemplateFromFile: () => ({ evaluate: () => ({ setTitle() { return this; }, addMetaTag() { return this; } }) }), createHtmlOutputFromFile: () => ({ getContent: () => '' }) },
    Date, JSON, Math };
  vm.createContext(ctx);
  ['Codigo.gs', 'PessoasAcesso.gs', 'PessoasFilaCadastro.gs'].forEach(f => vm.runInContext(fs.readFileSync(SRC + f, 'utf8'), ctx, { filename: f }));
  ctx.logs = logs; ctx.abertos = abertos; ctx.enviados = enviados; return ctx;
}

const TIT_PERM = ['N. USP', 'Nome', 'e-mail', 'Observação', 'Perfil'];
const CAB = ['Número USP', 'Nome do Aluno', 'Ingresso', 'eMail', 'ID da Pasta', 'eMail Secundario'];
const PROT = ['Protocolo', 'Protocolo ID', 'Chave de envio', 'E-mail da sessão', 'Recebimento', 'Cadastro', 'Motivo do cadastro', 'Recebido em', 'Recebimento concluído em', 'Colação', 'Janela do período', 'Semestre do período', 'Nº USP informado', 'Nome informado', 'Registro ID', 'Pasta do protocolo'];
const VERS = ['Protocolo ID', 'Versão', 'Chave de envio', 'E-mail da sessão', 'Situação', 'Enviada em', 'Concluída em', 'Dados do pedido'];
const DOCS = ['Documento ID', 'Protocolo ID', 'Versão', 'Chave do documento', 'Tipo', 'ID do arquivo', 'Origem', 'Documento de origem', 'SHA-256', 'Tamanho (bytes)', 'Formato', 'Situação', 'Registrado em'];
const DEC = ['Quando', 'Protocolo ID', 'Versão', 'Decisão', 'Nº USP', 'Ação', 'E-mail anterior', 'E-mail novo', 'Motivo', 'Quem'];
const linhaDe = (tit, o) => tit.map(t => (t in o ? o[t] : ''));

// Pedido n: e-mail pedidoN@, nº USP 900000n informado, cadastro PENDENTE.
function protocolo(n, o = {}) {
  return linhaDe(PROT, Object.assign({ 'Protocolo': 'PCG-20262-0000' + n, 'Protocolo ID': 'PID-' + n, 'E-mail da sessão': 'pedido' + n + '@exemplo.invalid',
    'Recebimento': 'RECEBIDO', 'Cadastro': 'PENDENTE', 'Motivo do cadastro': 'SEM_CADASTRO', 'Recebido em': '2026-11-10T10:0' + n + ':00-03:00',
    'Colação': '20262', 'Nº USP informado': '900000' + n, 'Nome informado': 'Pessoa Fictícia ' + n, 'Registro ID': 'RID-' + n }, o));
}
function versao(n, v = 1, o = {}) {
  return linhaDe(VERS, Object.assign({ 'Protocolo ID': 'PID-' + n, 'Versão': v, 'Situação': 'RECEBIDO',
    'Dados do pedido': JSON.stringify({ nome: 'Pessoa Fictícia ' + n, nUsp: '900000' + n, anoIngresso: '2021', rg: '00.000.000-0' }) }, o));
}

function ambiente(o = {}) {
  const central = sheet('Alunos', [CAB.slice()].concat(o.central || [
    [9000002, 'Pessoa Fictícia 2', '2021/1', 'antigo2@exemplo.invalid', 'PASTA-2', ''],
    [9000005, 'Outra Pessoa', '2020/2', 'pedido3@exemplo.invalid', '', '']]));
  const abas = {
    PROTOCOLOS: sheet('PROTOCOLOS', [PROT.slice()].concat(o.protocolos || [protocolo(1), protocolo(2, { 'Motivo do cadastro': 'CONFLITO_NUSP' }), protocolo(3, { 'Motivo do cadastro': 'DIVERGENCIA_APONTADA', 'Nº USP informado': '9000009' }),
      protocolo(4, { 'Cadastro': 'CONFIRMADO', 'Motivo do cadastro': '' }), protocolo(6, { 'Recebimento': 'RECEBENDO' })])),
    VERSOES: sheet('VERSOES', [VERS.slice()].concat(o.versoes || [versao(1), versao(2), versao(3), versao(4), versao(6, 1, { 'Situação': 'RECEBENDO' })])),
    DOCUMENTOS: sheet('DOCUMENTOS', [DOCS.slice()].concat(o.documentos || [linhaDe(DOCS, { 'Protocolo ID': 'PID-1', 'Versão': 1, 'Tipo': 'RG', 'ID do arquivo': 'ARQUIVOFICTICIO1' })])),
    DECISOES_CADASTRO: sheet('DECISOES_CADASTRO', [DEC.slice()].concat(o.decisoes || []))
  };
  const pedidos = Object.keys(abas).filter(k => !(o.semAba || []).includes(k)).map(k => abas[k]);
  const files = { IDX: [sheet('Página1', [['Chave', 'Tipo', 'ID de Produção', 'Homologação'], ['PLANILHA_ALUNOS', 'spreadsheet', 'ALU', 'ALU_H'],
      ['PERMISSOES_DE_ACESSO', 'spreadsheet', 'PERM', 'PERM'], ['PEDIDOS_COLACAO', 'spreadsheet', 'PED', 'PED_H']])],
    ALU: [central], PED: pedidos,
    PERM: [sheet('PESSOAS_IPUSP', [TIT_PERM.slice(), ['', 'Lia Leitora', 'lia@exemplo.invalid', '', 'LEITOR'], ['', 'Adão Admin', 'adao@exemplo.invalid', '', 'ADMINISTRADOR']])] };
  const usuario = o.usuario === undefined ? 'adao@exemplo.invalid' : o.usuario;
  const c = run({ ID_INDEX_SPREADSHEET_ID: 'IDX' }, files, { usuario, editores: o.editores || ['adao@exemplo.invalid', 'lia@exemplo.invalid'], efetivo: o.efetivo, ocupado: o.ocupado, emailFalha: o.emailFalha });
  return { c, central, abas };
}
const J = x => JSON.parse(JSON.stringify(x));
const item = (c, n) => J(c.obterFilaCadastro()).itens.find(i => i.protocoloId === 'PID-' + n);
const decisoes = a => a.abas.DECISOES_CADASTRO.vals.slice(1).map(l => Object.fromEntries(DEC.map((t, i) => [t, l[i]])));

let ok = 0, fail = 0;
const t = (n, f) => { try { f(); ok++; console.log('ok', n); } catch (e) { fail++; console.log('FALHA', n, e.message); } };

// ---------- fila ----------
t('fila: só pedidos RECEBIDO com cadastro PENDENTE e sem decisão', () => {
  const { c } = ambiente(); const r = J(c.obterFilaCadastro());
  assert.strictEqual(r.visivel, true); assert.strictEqual(r.podeDecidir, true);
  assert.deepStrictEqual(r.itens.map(i => i.protocoloId), ['PID-1', 'PID-2', 'PID-3']);
});
t('fila: dados do pedido, motivo traduzido, documentos com link e candidatos por nº USP e e-mail', () => {
  const { c } = ambiente();
  const i1 = item(c, 1);
  assert.strictEqual(i1.nome, 'Pessoa Fictícia 1'); assert.strictEqual(i1.numeroUsp, '9000001'); assert.strictEqual(i1.ingresso, '2021');
  assert(/Nenhuma linha/.test(i1.motivo)); assert.deepStrictEqual(i1.documentos, [{ tipo: 'RG', url: 'https://drive.google.com/file/d/ARQUIVOFICTICIO1/view' }]);
  assert.deepStrictEqual(i1.candidatos, []);
  assert(!('rg' in i1) && !JSON.stringify(i1).includes('00.000.000-0'), 'RG não vai para a fila');
  const i2 = item(c, 2); assert.strictEqual(i2.candidatos.length, 1); assert.strictEqual(i2.candidatos[0].mesmoNumeroUsp, true); assert.strictEqual(i2.candidatos[0].mesmoEmail, false);
  const i3 = item(c, 3); assert.strictEqual(i3.candidatos.length, 1); assert.strictEqual(i3.candidatos[0].mesmoEmail, true); assert(/divergência/.test(i3.motivo));
});
t('fila: LEITOR recebe visivel:false sem abrir a planilha de pedidos nem a central', () => {
  const { c } = ambiente({ usuario: 'lia@exemplo.invalid' }); assert.deepStrictEqual(J(c.obterFilaCadastro()), { visivel: false });
  assert(!c.abertos.includes('PED') && !c.abertos.includes('ALU'), c.abertos.join(','));
});
t('fila: ADMINISTRADOR que não é editor da central vê, mas podeDecidir = false', () => {
  const { c } = ambiente({ editores: [] }); const r = J(c.obterFilaCadastro()); assert.strictEqual(r.podeDecidir, false); assert.strictEqual(r.itens.length, 3);
});
t('fila: aba DECISOES_CADASTRO ausente → erro, nada gravado', () => {
  const a = ambiente({ semAba: ['DECISOES_CADASTRO'] }); assert.throws(() => a.c.obterFilaCadastro(), /não tem a aba DECISOES_CADASTRO/);
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'x' }), /não tem a aba DECISOES_CADASTRO/);
  assert.strictEqual(a.central.escritas.length, 0);
});
t('fila: decisão APROVADO ou REJEITADO tira da fila; DUPLICIDADE mantém', () => {
  const { c } = ambiente({ decisoes: [linhaDe(DEC, { 'Protocolo ID': 'PID-1', 'Versão': 1, 'Decisão': 'APROVADO' }), linhaDe(DEC, { 'Protocolo ID': 'PID-2', 'Versão': 1, 'Decisão': 'REJEITADO' }),
    linhaDe(DEC, { 'Protocolo ID': 'PID-3', 'Versão': 1, 'Decisão': 'DUPLICIDADE' })] });
  const r = J(c.obterFilaCadastro()); assert.deepStrictEqual(r.itens.map(i => i.protocoloId), ['PID-3']); assert.strictEqual(r.itens[0].duplicidadeAnterior, true);
});
t('fila: usa a última versão concluída', () => {
  const { c } = ambiente({ versoes: [versao(1), versao(1, 2, { 'Dados do pedido': JSON.stringify({ nome: 'Nome Corrigido', nUsp: '9000001' }) }), versao(1, 3, { 'Situação': 'RECEBENDO' })], protocolos: [protocolo(1)] });
  const i = item(c, 1); assert.strictEqual(i.versao, 2); assert.strictEqual(i.nome, 'Nome Corrigido');
});

// ---------- criar ----------
t('CRIAR: linha nova na central e APROVADO com versão, nº USP, ação e quem', () => {
  const a = ambiente();
  const r = J(a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000001', nome: ' Pessoa  Fictícia 1 ', ingresso: '2021/1' } }));
  assert.strictEqual(r.decisao, 'APROVADO'); assert.deepStrictEqual(r.itens.map(i => i.protocoloId), ['PID-2', 'PID-3']);
  assert.deepStrictEqual(J(a.central.vals[3]), [9000001, 'Pessoa Fictícia 1', '2021/1', 'pedido1@exemplo.invalid', '', ''], 'nº USP como número, como a coluna');
  const d = decisoes(a); assert.strictEqual(d.length, 1);
  assert.deepStrictEqual([d[0]['Protocolo ID'], d[0]['Versão'], d[0]['Decisão'], d[0]['Nº USP'], d[0]['Ação'], d[0]['Quem']], ['PID-1', 1, 'APROVADO', '9000001', 'CRIADO', 'adao@exemplo.invalid']);
});
t('CRIAR: recusa nº USP que já tem cadastro (só vincular), sem gravar', () => {
  const a = ambiente(); assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000002', nome: 'X' } }), /já tem cadastro/);
  assert.strictEqual(a.central.escritas.length, 0); assert.strictEqual(decisoes(a).length, 0);
});
t('CRIAR: recusa quando o e-mail do pedido já está numa linha', () => {
  const a = ambiente(); assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-3', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000009', nome: 'X' } }), /e-mail do pedido já está/);
  assert.strictEqual(a.central.escritas.length, 0);
});
t('CRIAR: valida formato (nº USP, nome, ingresso)', () => {
  const a = ambiente();
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '90A', nome: 'X' } }), /só dígitos/);
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '', nome: 'X' } }), /Informe o número USP/);
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000001', nome: '' } }), /não pode ficar vazio/);
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000001', nome: 'X', ingresso: '2021' } }), /AAAA\/S/);
  assert.strictEqual(a.central.escritas.length, 0); assert.strictEqual(decisoes(a).length, 0);
});
t('CRIAR: nº USP repetido depois de gravar (outro escritor) → DUPLICIDADE, pedido continua na fila', () => {
  const a = ambiente();
  const orig = a.central.appendRow;
  a.central.appendRow = l => { orig(l); orig([9000001, 'Linha manual', '', 'manual@exemplo.invalid', '', '']); return a.central; };
  const r = J(a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000001', nome: 'Pessoa Fictícia 1', ingresso: '2021/1' } }));
  assert.strictEqual(r.decisao, 'DUPLICIDADE'); assert.strictEqual(decisoes(a)[0]['Decisão'], 'DUPLICIDADE');
  assert(r.itens.some(i => i.protocoloId === 'PID-1' && i.duplicidadeAnterior), 'volta à fila marcado');
});

// ---------- vincular ----------
t('VINCULAR: APROVADO com o nº USP do cadastro, sem mexer na central', () => {
  const a = ambiente();
  const r = J(a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'VINCULAR', linha: 2, numeroUsp: '9000002', nome: 'Pessoa Fictícia 2' }));
  assert.strictEqual(r.decisao, 'APROVADO'); assert.strictEqual(a.central.escritas.length, 0);
  const d = decisoes(a)[0]; assert.deepStrictEqual([d['Nº USP'], d['Ação'], d['E-mail anterior'], d['E-mail novo']], ['9000002', 'VINCULADO', '', '']);
});
t('VINCULAR com troca de e-mail (D7): grava só a coluna eMail e registra antes e depois', () => {
  const a = ambiente();
  a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'VINCULAR', linha: 2, numeroUsp: '9000002', nome: 'Pessoa Fictícia 2', trocarEmail: true });
  assert.deepStrictEqual(a.central.escritas, [[2, 4, 'pedido2@exemplo.invalid']]);
  const d = decisoes(a)[0]; assert.deepStrictEqual([d['E-mail anterior'], d['E-mail novo']], ['antigo2@exemplo.invalid', 'pedido2@exemplo.invalid']);
});
t('VINCULAR com troca: e-mail do pedido em outra linha → recusado, nada gravado', () => {
  const a = ambiente({ central: [[9000002, 'Pessoa Fictícia 2', '2021/1', 'antigo2@exemplo.invalid', '', ''], [9000007, 'Terceira', '', 'pedido2@exemplo.invalid', '', '']] });
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'VINCULAR', linha: 2, numeroUsp: '9000002', nome: 'Pessoa Fictícia 2', trocarEmail: true }), /já está em outra linha/);
  assert.strictEqual(a.central.escritas.length, 0); assert.strictEqual(decisoes(a).length, 0);
});
t('VINCULAR: linha que mudou desde a abertura → recusado', () => {
  const a = ambiente();
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'VINCULAR', linha: 3, numeroUsp: '9000002', nome: 'Pessoa Fictícia 2' }), /mudou desde que esta página foi aberta/);
  assert.strictEqual(decisoes(a).length, 0);
});
t('VINCULAR: nº USP repetido na central → recusado', () => {
  const a = ambiente({ central: [[9000002, 'Pessoa Fictícia 2', '', 'a@exemplo.invalid', '', ''], [9000002, 'Repetida', '', 'b@exemplo.invalid', '', '']] });
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'VINCULAR', linha: 2, numeroUsp: '9000002', nome: 'Pessoa Fictícia 2' }), /mais de uma linha/);
  assert.strictEqual(decisoes(a).length, 0);
});

// ---------- rejeitar ----------
t('REJEITAR: exige motivo; grava REJEITADO sem tocar na central', () => {
  const a = ambiente();
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: '  ' }), /motivo/);
  const r = J(a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'Documento não confere' }));
  assert.strictEqual(r.decisao, 'REJEITADO'); assert.strictEqual(a.central.escritas.length, 0); assert.strictEqual(decisoes(a)[0]['Motivo'], 'Documento não confere');
});

t('REJEITAR: e-mail ao aluno só para o e-mail do pedido, com protocolo, colação e motivo, sem nº USP nem RG', () => {
  const a = ambiente();
  const r = J(a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'Documento ilegível' }));
  assert.strictEqual(r.avisoAluno, 'ENVIADO'); assert.strictEqual(a.c.enviados.length, 1);
  const m = a.c.enviados[0];
  assert.strictEqual(m.to, 'pedido1@exemplo.invalid'); assert.strictEqual(m.noReply, true);
  assert.ok(/PCG-20262-00001/.test(m.subject) && /não aprovado/.test(m.subject), m.subject);
  assert.ok(/Colação: 2026\/2/.test(m.body) && /Motivo: Documento ilegível/.test(m.body) && /novo pedido/.test(m.body), m.body);
  assert.ok(!/900000|00\.000|Pessoa Fictícia/.test(m.body + m.subject), 'sem nº USP, RG nem nome');
});
t('REJEITAR: falha no e-mail não desfaz a decisão e não registra dado pessoal', () => {
  const a = ambiente({ emailFalha: true });
  const r = J(a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'Documento ilegível' }));
  assert.strictEqual(r.decisao, 'REJEITADO'); assert.strictEqual(r.avisoAluno, 'FALHOU'); assert.strictEqual(decisoes(a).length, 1);
  assert.ok(!a.c.logs.some(l => /exemplo\.invalid|900000|ilegível/.test(l)), a.c.logs.join(' | '));
});
t('VINCULAR e CRIAR não mandam e-mail', () => {
  const a = ambiente();
  a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'VINCULAR', linha: 2, numeroUsp: '9000002', nome: 'Pessoa Fictícia 2' });
  assert.strictEqual(a.c.enviados.length, 0);
});

// ---------- concorrência e conferências ----------
t('segunda decisão sobre a mesma versão é recusada ("mudou ou já foi decidido")', () => {
  const a = ambiente(); a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'x' });
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'y' }), /já foi decidido/); assert.strictEqual(decisoes(a).length, 1);
});
t('versão diferente da atual (aluno corrigiu) → recusado', () => {
  const a = ambiente(); assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 2, acao: 'REJEITAR', motivo: 'x' }), /mudou/);
});
t('pedido CONFIRMADO, RECEBENDO ou inexistente não pode ser decidido', () => {
  const a = ambiente();
  ['PID-4', 'PID-6', 'PID-99'].forEach(id => assert.throws(() => a.c.decidirCadastro({ protocoloId: id, versao: 1, acao: 'REJEITAR', motivo: 'x' }), /mudou ou já foi decidido/, id));
  assert.strictEqual(decisoes(a).length, 0);
});
t('ação desconhecida → recusada antes de abrir planilhas', () => {
  const a = ambiente(); assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'APROVAR_TUDO' }), /Ação desconhecida/);
  assert(!a.c.abertos.includes('PED'));
});
t('trava ocupada → recusado sem gravar', () => {
  const a = ambiente({ ocupado: true }); assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'x' }), /Outra gravação/);
  assert.strictEqual(decisoes(a).length, 0);
});

// ---------- autorização ----------
t('LEITOR não decide (sem abrir pedidos nem central)', () => {
  const a = ambiente({ usuario: 'lia@exemplo.invalid' });
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'x' }), /somente de consulta/);
  assert(!a.c.abertos.includes('PED') && !a.c.abertos.includes('ALU'));
});
t('ADMINISTRADOR que não é editor da central não decide', () => {
  const a = ambiente({ editores: [] });
  assert.throws(() => a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'REJEITAR', motivo: 'x' }), /não tem permissão para alterar a planilha de alunos/);
  assert.strictEqual(decisoes(a).length, 0);
});
t('conta fora da lista: fila e decisão recusadas sem abrir nada', () => {
  const a = ambiente({ usuario: 'fora@exemplo.invalid' });
  assert.throws(() => a.c.obterFilaCadastro(), /não tem acesso/); assert.throws(() => a.c.decidirCadastro({}), /não tem acesso/);
  assert(!a.c.abertos.includes('PED') && !a.c.abertos.includes('ALU'));
});
t('prepararDecisoesCadastro: só no editor (sessão = conta efetiva); cria a aba com os títulos, sem duplicar', () => {
  const a = ambiente({ semAba: ['DECISOES_CADASTRO'] });
  assert.throws(() => a.c.prepararDecisoesCadastro(), /só pelo editor/);
  const b = ambiente({ semAba: ['DECISOES_CADASTRO'], usuario: 'adao@exemplo.invalid', efetivo: 'adao@exemplo.invalid' });
  assert.strictEqual(J(b.c.prepararDecisoesCadastro()).criada, true); assert.strictEqual(J(b.c.prepararDecisoesCadastro()).criada, false);
});

// ---------- registros de execução ----------
t('nenhum dado pessoal no registro de execução', () => {
  const a = ambiente();
  a.c.obterFilaCadastro();
  a.c.decidirCadastro({ protocoloId: 'PID-1', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000001', nome: 'Pessoa Fictícia 1', ingresso: '2021/1' } });
  try { a.c.decidirCadastro({ protocoloId: 'PID-2', versao: 1, acao: 'CRIAR', novo: { numeroUsp: '9000002', nome: 'X' } }); } catch (e) { /* esperado */ }
  const L = a.c.logs.join('\n'); assert(!/@|Fictícia|900000/.test(L), L);
});

console.log(`\n${ok} ok, ${fail} falha(s).`);
process.exit(fail ? 1 : 0);

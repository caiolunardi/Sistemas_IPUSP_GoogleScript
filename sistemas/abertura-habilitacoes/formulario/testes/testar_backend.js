// Testes do backend do formulário de Pedido de Abertura de Habilitação
// (Codigo.gs) com SpreadsheetApp, PropertiesService, CacheService,
// LockService, Session, MailApp e Utilities simulados. Dados 100% fictícios.
// Inclui os testes de compatibilidade com o contrato da planilha que o
// Gerenciador 2.1 e o Painel dos servidores leem. Uso: node testar_backend.js
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const SRC = path.join(__dirname, '..', 'src') + '/';
const RAIZ = path.join(__dirname, '..', '..', '..', '..');

// ---------- simulações ----------
function sheet(name, vals, opts = {}) {
  const s = {
    vals, escritas: 0,
    getName: () => name,
    getLastRow: () => vals.length,
    getLastColumn: () => vals.reduce((m, l) => Math.max(m, l.length), 0),
    getDataRange: () => s.getRange(1, 1, vals.length, s.getLastColumn()),
    appendRow: l => { if (opts.somenteLeitura) throw new Error('ESCRITA NA ABA ' + name); s.escritas++; vals.push(l.slice()); },
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => vals.slice(r - 1, r - 1 + nr).map(l => { const x = l.slice(c - 1, c - 1 + nc); while (x.length < nc) x.push(''); return x; }),
      getDisplayValues: () => vals.slice(r - 1, r - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc).map(v => v == null ? '' : String(v))),
      setValue: () => { throw new Error('setValue não deveria ser usado (aba ' + name + ')'); },
      setValues: () => { throw new Error('setValues não deveria ser usado (aba ' + name + ')'); }
    })
  };
  return s;
}
function pad(n) { return String(n).padStart(2, '0'); }
// formatDate no fuso de Brasília (UTC−3, sem horário de verão).
function formatDate(d, tz, f) {
  const b = new Date(d.getTime() - 3 * 3600 * 1000);
  const map = { yyyy: b.getUTCFullYear(), MM: pad(b.getUTCMonth() + 1), dd: pad(b.getUTCDate()), HH: pad(b.getUTCHours()), mm: pad(b.getUTCMinutes()) };
  return f.replace(/'([^']*)'|yyyy|MM|dd|HH|mm/g, (t, lit) => lit !== undefined ? lit : map[t]);
}
let uuidSeq = 0;
function run(props, files, opts = {}) {
  const logs = [], cache = {}, mails = [];
  const ctx = {
    console, Date,
    Logger: { log: m => logs.push(String(m)) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, removeAll: ks => ks.forEach(k => delete cache[k]) }) },
    SpreadsheetApp: { openById: id => { opts.aberturas && opts.aberturas.push(id); if (!files[id]) throw new Error('sem acesso ' + id); const f = files[id]; return { getSheetByName: n => f.find(s => s.getName() === n) || null, getSheets: () => f }; } },
    Session: { getActiveUser: () => ({ getEmail: () => opts.usuario === undefined ? 'ana@usp.br' : opts.usuario }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !opts.travaOcupada, releaseLock() {} }) },
    MailApp: { sendEmail: (to, assunto, corpo, o) => { if (opts.falhaEmail) throw new Error('cota'); mails.push({ to, assunto, corpo, o }); } },
    Utilities: { formatDate, getUuid: () => opts.uuids ? opts.uuids.shift() : `aaaaaaaa-0000-4000-8000-${String(++uuidSeq).padStart(12, '0')}` },
    HtmlService: { createTemplateFromFile: () => { const t = { evaluate: () => ({ setTitle(x) { t.titulo = x; return this; }, addMetaTag() { return this; } }) }; ctx.pagina = t; return t; } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC + 'Codigo.gs', 'utf8'), ctx);
  ctx.logs = logs; ctx.mails = mails;
  return ctx;
}

// ---------- dados fictícios ----------
const DECL = 'Declaro ter lido as informações da página inicial do formulário, e estar ciente das normas e prazos para fazer a solicitação e atendimento do pedido.';
const CAB_AK = ['Carimbo de data/hora', 'Endereço de e-mail', DECL, 'Nº USP', 'Nome', 'E-mail USP', 'Ano de ingresso',
  'Realizou trancamento total de matrícula em algum semestre?', 'Deseja solicitar a abertura de qual programa?',
  'Comentários, sugestões, elogios ou críticas.', 'Situação'];
// Ordem real das colunas do Gerenciador conferida em 21/10/2026 (L–O).
const CAB = CAB_AK.concat(['Registro ID', 'Versão', 'E-mail Enviado', 'Data de Conclusão']);
const ID1 = '11111111-1111-4111-8111-111111111111';
const linhaAntigaForms = () => [new Date('2025-03-01T13:00:00Z'), 'ana@usp.br', 'Sim', 9000001, 'Ana Teste', 'ana@usp.br', '2023', 'Não', 'Licenciatura em Psicologia', 'obs da equipe', 'Concluído', ID1, 3, new Date('2025-03-05T13:00:00Z'), new Date('2025-03-05T13:00:00Z')];
const respostas = (cab = CAB) => sheet('Respostas ao formulário 2', [cab.slice(),
  linhaAntigaForms(),
  [new Date('2025-09-01T13:00:00Z'), 'outro@usp.br', 'Sim', 9000009, 'Outro Ficticio', 'outro@usp.br', '2022', 'Sim', 'Bacharelado em Psicologia', '', '', '', '', '', '']]);
const historica = () => sheet('2021 - 2022', [['Carimbo de data/hora', 'Endereço de e-mail', 'Nome', 'E-mail USP', 'Deseja solicitar a abertura de qual programa?', 'Situação do pedido'],
  ['10/03/2021 10:00:00', 'ana@usp.br', 'Ana Teste', 'ana@usp.br', 'Bacharelado em Psicologia', 'pendente']], { somenteLeitura: true });
const alunos = () => sheet('Alunos', [['Número USP', 'Nome do Aluno', 'Ingresso', 'eMail', 'ID da Pasta', 'eMail Secundario'],
  [9000001, 'Ana Teste', '2023/1', 'ana@exemplo.invalid', 'pasta', 'ana@usp.br'], [9000002, 'Bruno Ficticio', '2024/2', 'bruno@usp.br', '', '']]);
const periodos = (tipo = 'Contínuo', j = []) => sheet('Períodos', [['Formulário', 'Link', 'Tipo', 'Início 1', 'Hora', 'Fim 1', 'Hora', 'Início 2', 'Hora', 'Fim 2', 'Hora'],
  ['Outro Formulário', '', 'Sazonal', '', '', '', '', '', '', '', ''],
  ['Pedido de Abertura de Habilitação', 'https://exemplo.invalid', tipo].concat(j)]);
const indice = () => sheet('Página1', [['Chave', 'Tipo', 'ID de Produção'], ['PLANILHA_ALUNOS', 'spreadsheet', 'ALU'], ['ABERTURA_HABILITACOES', 'spreadsheet', 'RESP'], ['PERIODOS', 'spreadsheet', 'PER']]);
function amb(opts = {}, extra = {}) {
  const r = extra.RESP || respostas(), h = historica();
  const files = Object.assign({ IDX: [indice()], ALU: [alunos()], RESP: [r, h], PER: [extra.PER || periodos()] }, extra.files || {});
  Object.keys(files).forEach(k => files[k] === undefined && delete files[k]);
  return { r, h, c: run({ ID_INDEX_SPREADSHEET_ID: 'IDX' }, files, opts) };
}
const pedido = (o = {}) => Object.assign({ declaracao: true, nome: 'Ana Teste', nUsp: '9000001', anoIngresso: '2023', trancamento: 'Não', programas: ['bach'], observacoes: '' }, o);
const J = x => JSON.parse(JSON.stringify(x));
const fmt = d => formatDate(d, '', 'dd/MM/yyyy');

let ok = 0, fail = 0;
const t = (n, f) => { try { f(); ok++; console.log('ok', n); } catch (e) { fail++; console.log('FALHA', n, e.stack.split('\n').slice(0, 2).join(' ')); } };

// ---------- carga ----------
t('carga: aluno pelo eMail Secundario; histórico das duas abas só do próprio e-mail', () => {
  const { c } = amb(); const d = J(c.obterDadosIniciais());
  assert.strictEqual(d.autenticado, true); assert.strictEqual(d.periodoOk, true); assert.strictEqual(d.encontrado, true);
  assert.strictEqual(d.nome, 'Ana Teste'); assert.strictEqual(d.nUsp, '9000001'); assert.strictEqual(d.anoIngresso, '2023');
  assert.strictEqual(d.historico.length, 2);
  assert.deepStrictEqual(d.historico[0], { carimbo: '01/03/2025 10:00', programa: 'Licenciatura em Psicologia', programas: ['lic'], situacao: 'Concluído', pendente: false });
  assert.strictEqual(d.historico[1].programa, 'Bacharelado em Psicologia'); assert.strictEqual(d.historico[1].pendente, false, 'aba antiga conta como concluída');
});
t('carga: fora do domínio bloqueia', () => {
  for (const u of ['', 'x@gmail.com', 'x@usp.br.evil.com', 'x@fakeusp.br']) { const { c } = amb({ usuario: u }); assert.strictEqual(c.obterDadosIniciais().autenticado, false, u); }
});
t('carga: planilha de alunos fora do ar não bloqueia', () => {
  const { c } = amb({}, { files: { ALU: undefined } }); const d = c.obterDadosIniciais();
  assert.strictEqual(d.periodoOk, true); assert.strictEqual(d.encontrado, false); assert.strictEqual(d.historico.length, 2);
});
t('carga: período Sazonal fechado devolve as janelas', () => {
  const { c } = amb({}, { PER: periodos('Sazonal', ['01/02/2020', '08:00', '10/02/2020', '18:00', '', '', '', '']) });
  assert.deepStrictEqual(J(c.obterDadosIniciais()), { autenticado: true, periodoOk: false, janelas: [{ inicioTexto: '01/02/2020 às 08:00', fimTexto: '10/02/2020 às 18:00' }] });
});
t('carga: período Sazonal aberto (2º semestre, datas como Date)', () => {
  const agora = Date.now();
  const { c } = amb({}, { PER: periodos('Sazonal', ['', '', '', '', new Date(agora - 864e5), new Date(agora - 864e5), new Date(agora + 864e5), new Date(agora + 864e5)]) });
  assert.strictEqual(c.obterDadosIniciais().periodoOk, true);
});
t('carga: linha de período ausente ou planilha sem acesso bloqueia sem detalhe técnico', () => {
  const p = periodos(); p.vals[2][0] = 'Outro nome';
  for (const extra of [{ PER: p }, { files: { PER: undefined } }]) {
    const { c } = amb({}, extra); const d = J(c.obterDadosIniciais());
    assert.deepStrictEqual(d, { autenticado: true, periodoOk: false, periodoErro: true });
  }
});

// ---------- gravação e compatibilidade ----------
t('envio grava A–K no contrato do Gerenciador, com identidade da sessão', () => {
  const { c, r } = amb(); const res = c.registrarSolicitacao(pedido({ nUsp: '90.000-01', programas: ['lic', 'bach'], email: 'outro@usp.br', observacoes: 'Comentário' }));
  const l = r.vals[3];
  assert.strictEqual(l.length, CAB.length, 'linha com a largura da aba');
  assert(l[0] instanceof Date); assert.strictEqual(l[1], 'ana@usp.br'); assert.strictEqual(l[2], 'Sim'); assert.strictEqual(l[3], '9000001');
  assert.strictEqual(l[4], 'Ana Teste'); assert.strictEqual(l[5], 'ana@usp.br'); assert.strictEqual(l[6], '2023'); assert.strictEqual(l[7], 'Não');
  assert.strictEqual(l[8], 'Bacharelado em Psicologia, Licenciatura em Psicologia', 'ordem fixa e separador do Forms');
  assert.strictEqual(l[9], 'Comentário', 'J = observações'); assert.strictEqual(l[10], 'pendente', 'K = pendente em minúsculas');
  assert.strictEqual(l[12], 1, 'Versão 1'); assert(/^[0-9a-f-]{36}$/.test(l[11]), 'Registro ID');
  assert.strictEqual(l[13], ''); assert.strictEqual(l[14], '', 'E-mail Enviado e Data de Conclusão em branco');
  assert.strictEqual(res.programas, 'Bacharelado em Psicologia, Licenciatura em Psicologia');
});
t('compatibilidade: registros antigos ficam intactos e a aba antiga nunca é escrita', () => {
  const { c, r, h } = amb(); const antes = JSON.stringify(r.vals.slice(0, 3)); const antesH = JSON.stringify(h.vals);
  c.registrarSolicitacao(pedido()); c.registrarSolicitacao(pedido({ programas: ['lic'], confirmarNovoPedido: true }));
  assert.strictEqual(JSON.stringify(r.vals.slice(0, 3)), antes); assert.strictEqual(JSON.stringify(h.vals), antesH); assert.strictEqual(h.escritas, 0);
  assert.strictEqual(r.vals.length, 5);
});
t('compatibilidade: linha nova é lida pelo critério do Painel (K == "pendente") e do Gerenciador (sem "conclu")', () => {
  const { c, r } = amb(); c.registrarSolicitacao(pedido());
  const k = r.vals[3][10]; assert.strictEqual(String(k).trim().toLowerCase(), 'pendente');
  assert.strictEqual(c.estaConcluido_(k), false);
});
t('compatibilidade: Registro ID novo nunca repete um existente', () => {
  const { c, r } = amb({ uuids: [ID1, '22222222-2222-4222-8222-222222222222'] }); c.registrarSolicitacao(pedido());
  assert.strictEqual(r.vals[3][11], '22222222-2222-4222-8222-222222222222');
});
t('compatibilidade: sem as colunas do Gerenciador, grava só A–K e não cria coluna', () => {
  const r = respostas(CAB_AK); r.vals.forEach((l, i) => { if (i) l.length = 11; });
  const { c } = amb({}, { RESP: r }); c.registrarSolicitacao(pedido());
  assert.strictEqual(r.vals[0].length, 11); assert.strictEqual(r.vals[3].length, 11); assert.strictEqual(r.vals[3][10], 'pendente');
});
t('compatibilidade: só Registro ID sem Versão não grava nenhum dos dois', () => {
  const cab = CAB_AK.concat(['Registro ID']); const r = respostas(cab); r.vals.forEach((l, i) => { if (i) l.length = 12; });
  const { c } = amb({}, { RESP: r }); c.registrarSolicitacao(pedido()); assert.strictEqual(r.vals[3][11], '');
});
t('compatibilidade: colunas do Gerenciador em outra ordem são achadas pelo título', () => {
  const cab = CAB_AK.concat(['Data de Conclusão', 'Versão', 'E-mail Enviado', 'Registro ID']);
  const r = respostas(cab); const { c } = amb({}, { RESP: r }); c.registrarSolicitacao(pedido());
  assert.strictEqual(r.vals[3][12], 1); assert(/^[0-9a-f-]{36}$/.test(r.vals[3][14])); assert.strictEqual(r.vals[3][11], '');
});
t('esquema: cada desvio em A–K recusa sem gravar, sem detalhe técnico para o aluno', () => {
  const casos = [
    cab => { cab[10] = 'Status'; },                       // K com outro título
    cab => { cab[10] = ''; },                             // K vazia
    cab => { cab[9] = 'Observações'; },                   // J com outro título
    cab => { cab.splice(9, 0, 'Pergunta nova'); },        // coluna nova empurra J/K
    cab => { cab[4] = 'Nome completo'; },                 // título renomeado
    cab => { cab[2] = 'Declaro ter lido'; },              // C diferente
    cab => { cab.push('Situação'); },                     // título repetido
    cab => { cab.push('Registro ID'); }                   // título do Gerenciador repetido
  ];
  casos.forEach((mudar, i) => {
    const cab = CAB.slice(); mudar(cab); const r = respostas(cab); const { c } = amb({}, { RESP: r });
    assert.throws(() => c.registrarSolicitacao(pedido()), e => /problema de configuração/.test(e.message) && !/coluna|Situação/.test(e.message), 'caso ' + i);
    assert.strictEqual(r.vals.length, 3, 'caso ' + i + ' gravou'); assert.strictEqual(r.vals[0].join('|'), cab.join('|'), 'caso ' + i + ' mexeu no cabeçalho');
    assert(c.logs.some(l => /ESQUEMA/.test(l)), 'caso ' + i + ' sem log');
  });
});
t('esquema: aba atual ausente recusa (não cria aba)', () => {
  const r = respostas(); r.getName = () => 'Respostas ao formulário 1'; const { c } = amb({}, { RESP: r });
  assert.throws(() => c.registrarSolicitacao(pedido()), /problema de configuração/); assert.strictEqual(r.vals.length, 3);
});
t('fórmula neutralizada e caracteres de controle removidos', () => {
  const { c, r } = amb(); c.registrarSolicitacao(pedido({ nome: '=HYPERLINK("x")', observacoes: '+1\u0007' }));
  assert.strictEqual(r.vals[3][4], "'=HYPERLINK(\"x\")"); assert.strictEqual(r.vals[3][9], "'+1");
});
t('validações', () => {
  const { c, r } = amb();
  assert.throws(() => c.registrarSolicitacao(pedido({ declaracao: 'true' })), /declarar ciência/);
  assert.throws(() => c.registrarSolicitacao(pedido({ nome: '  ' })), /nome não pode/);
  assert.throws(() => c.registrarSolicitacao(pedido({ nUsp: 'abc' })), /inválido/);
  assert.throws(() => c.registrarSolicitacao(pedido({ anoIngresso: '1999' })), /inválido/);
  assert.throws(() => c.registrarSolicitacao(pedido({ anoIngresso: String(new Date().getFullYear() + 1) })), /inválido/);
  assert.throws(() => c.registrarSolicitacao(pedido({ trancamento: 'Talvez' })), /trancamento/);
  assert.throws(() => c.registrarSolicitacao(pedido({ programas: [] })), /ao menos um/);
  assert.throws(() => c.registrarSolicitacao(pedido({ programas: ['bach', 'doutorado'] })), /inválido/);
  assert.throws(() => c.registrarSolicitacao(pedido({ programas: 'bach' })), /ao menos um/);
  assert.throws(() => c.registrarSolicitacao(pedido({ observacoes: 'a'.repeat(2001) })), /passaram de 2000/);
  assert.strictEqual(r.vals.length, 3);
  c.registrarSolicitacao(pedido({ observacoes: 'a'.repeat(2000), programas: ['bach', 'bach'] }));
  assert.strictEqual(r.vals[3][9].length, 2000); assert.strictEqual(r.vals[3][8], 'Bacharelado em Psicologia');
});
t('fora do período no envio: recusa sem gravar', () => {
  const { c, r } = amb({}, { PER: periodos('Sazonal', ['01/02/2020', '08:00', '10/02/2020', '18:00']) });
  assert.throws(() => c.registrarSolicitacao(pedido()), /FORA_DO_PERIODO/); assert.strictEqual(r.vals.length, 3);
});
t('sem login não grava', () => { const { c, r } = amb({ usuario: '' }); assert.throws(() => c.registrarSolicitacao(pedido()), /NAO_AUTENTICADO/); assert.strictEqual(r.vals.length, 3); });
t('trava ocupada: mensagem clara, nada gravado', () => { const { c, r } = amb({ travaOcupada: true }); assert.throws(() => c.registrarSolicitacao(pedido()), /Aguarde alguns segundos/); assert.strictEqual(r.vals.length, 3); });
t('planilha de respostas sem acesso: mensagem genérica, detalhe só no log', () => {
  const { c } = amb({}, { files: { RESP: undefined } });
  assert.throws(() => c.registrarSolicitacao(pedido()), e => /problema de configuração/.test(e.message) && !/RESP/.test(e.message)); assert(c.logs.some(l => /RESP/.test(l)));
});
t('sem propriedade do ID_INDEX: não grava', () => { const c = run({}, {}); assert.throws(() => c.registrarSolicitacao(pedido())); });

// ---------- pedido repetido ----------
t('pendente do mesmo programa exige confirmação; outro programa não', () => {
  const { c, r } = amb({ usuario: 'outro@usp.br' });
  const d = c.obterDadosIniciais(); assert.strictEqual(d.historico[0].pendente, true, 'K vazia = pendente'); assert.deepStrictEqual(J(d.historico[0].programas), ['bach']);
  assert.throws(() => c.registrarSolicitacao(pedido({ programas: ['bach'] })), /PEDIDO_PENDENTE: .*Bacharelado.*01\/09\/2025/); assert.strictEqual(r.vals.length, 3);
  assert.throws(() => c.registrarSolicitacao(pedido({ programas: ['lic', 'bach'] })), /PEDIDO_PENDENTE/);
  c.registrarSolicitacao(pedido({ programas: ['lic'] })); assert.strictEqual(r.vals.length, 4);
  c.registrarSolicitacao(pedido({ programas: ['bach'], confirmarNovoPedido: true })); assert.strictEqual(r.vals.length, 5);
});
t('pedido concluído não exige confirmação; o novo passa a exigir; confirmação só vale com true', () => {
  const { c } = amb(); c.registrarSolicitacao(pedido({ programas: ['lic'] }));
  assert.throws(() => c.registrarSolicitacao(pedido({ programas: ['lic'], confirmarNovoPedido: 'sim' })), /PEDIDO_PENDENTE/);
});
t('situação "Em análise" conta como pendente (critério do Gerenciador)', () => {
  const r = respostas(); r.vals[2][10] = 'Em análise'; const { c } = amb({ usuario: 'outro@usp.br' }, { RESP: r });
  assert.throws(() => c.registrarSolicitacao(pedido()), /PEDIDO_PENDENTE/);
});

// ---------- recibo ----------
t('recibo: login, noReply, texto simples, sem apóstrofo', () => {
  const { c } = amb(); const res = c.registrarSolicitacao(pedido({ nome: '=Ana Teste', programas: ['bach', 'lic'] }));
  assert.strictEqual(res.reciboEnviado, true); const m = c.mails[0];
  assert.strictEqual(m.to, 'ana@usp.br'); assert.strictEqual(m.o.noReply, true); assert.strictEqual(m.o.cc, undefined);
  assert(/^Recibo — Pedido de Abertura de Habilitação$/.test(m.assunto)); assert(/Nome: =Ana Teste/.test(m.corpo));
  assert(/Programa\(s\): Bacharelado em Psicologia, Licenciatura em Psicologia/.test(m.corpo)); assert(/Observações: \(nenhuma\)/.test(m.corpo)); assert(!/<[a-z]/i.test(m.corpo));
});
t('recibo falhou: pedido gravado mesmo assim', () => { const { c, r } = amb({ falhaEmail: true }); const res = c.registrarSolicitacao(pedido()); assert.strictEqual(res.reciboEnviado, false); assert.strictEqual(r.vals.length, 4); });

// ---------- privacidade e configuração ----------
t('log sem dados pessoais', () => { const { c } = amb(); c.obterDadosIniciais(); c.registrarSolicitacao(pedido()); assert(!c.logs.join().match(/Ana|usp\.br|9000001/), c.logs.join()); });
t('sem ID literal de planilha nem de script no código', () => {
  for (const f of fs.readdirSync(SRC)) { const s = fs.readFileSync(SRC + f, 'utf8'); assert(!/[A-Za-z0-9_-]{40,}/.test(s.replace(/[=─-]{40,}/g, '')), f); assert(!/openById\(\s*["']/.test(s), f); }
});
t('manifesto: executa como a conta que implanta, acesso do domínio', () => {
  const m = JSON.parse(fs.readFileSync(SRC + 'appsscript.json', 'utf8')); assert.strictEqual(m.webapp.executeAs, 'USER_DEPLOYING'); assert.strictEqual(m.webapp.access, 'DOMAIN');
});
t('esquema igual ao que o Gerenciador 2.1 procura (títulos A–I e J/K na posição 10/11)', () => {
  const ger = fs.readFileSync(path.join(RAIZ, 'sistemas/abertura-habilitacoes/gerenciador/src/Planilha.gs'), 'utf8');
  const c = run({}, {});
  const esquema = J(vm.runInContext('ESQUEMA_RESPOSTAS', c));
  ['carimbo', 'nUsp', 'nome', 'emailUsp', 'anoIngresso', 'trancamento', 'programa', 'email'].forEach(k => {
    const titulo = esquema.find(x => x.chave === k).titulo; assert(ger.indexOf(`"${titulo}"`) !== -1, titulo);
  });
  assert(/COL_OBSERVACOES_FIXA = 10/.test(ger)); assert(/COL_SITUACAO_FIXA = 11/.test(ger));
  assert.strictEqual(esquema.find(x => x.chave === 'observacoes').coluna, 10); assert.strictEqual(esquema.find(x => x.chave === 'situacao').coluna, 11);
  ['Registro ID', 'Versão', 'E-mail Enviado', 'Data de Conclusão'].forEach(x => assert(ger.indexOf(`"${x}"`) !== -1, x));
});
t('Painel dos servidores conta a K (coluna 11) da mesma aba', () => {
  const painel = fs.readFileSync(path.join(RAIZ, 'sistemas/painel-servidores/src/Code.gs'), 'utf8');
  assert(/ABA_HABILITACOES_ATUAL\s*=\s*"Respostas ao formulário 2"/.test(painel)); assert(/COLUNA_SITUACAO_ATUAL\s*=\s*11/.test(painel));
});
t('diagnóstico não grava e mostra o esquema', () => {
  const { c, r } = amb(); const s = c.diagnosticarConfiguracao(); assert.strictEqual(r.vals.length, 3);
  assert(/OK    Esquema da aba "Respostas ao formulário 2" — A–K conferidas; Registro ID=L, Versão=M, E-mail Enviado=N, Data de Conclusão=O; pedidos novos recebem Registro ID e Versão 1/.test(s), s);
  assert(!/ERRO/.test(s), s);
  const cab = CAB.slice(); cab[10] = 'Status'; const r2 = respostas(cab); const { c: c2 } = amb({}, { RESP: r2 });
  assert(/ERRO  Esquema.*coluna K deveria ser "Situação" e é "Status"/.test(c2.diagnosticarConfiguracao()));
});

// ---------- homologação ----------
const idxHomolog = (vazio = false) => sheet('Página1', indice().vals.map((l, i) => i ? [...l, vazio ? '' : 'H_' + l[2]] : [...l, 'Homologação (cópias de teste)']));
const ambHomolog = (props, idx) => { const r = respostas(); const ab = []; const c = run(Object.assign({ ID_INDEX_SPREADSHEET_ID: 'IDX' }, props), { IDX: [idx], H_ALU: [alunos()], H_RESP: [r, historica()], H_PER: [periodos()] }, { aberturas: ab }); return { c, r, ab }; };
const soHomolog = ab => ab.every(id => id === 'IDX' || id.startsWith('H_'));
t('homologação: lê a coluna Homologação, nunca abre a produção, avisa no assunto e na página', () => {
  const { c, r, ab } = ambHomolog({ AMBIENTE: ' Homologacao ' }, idxHomolog());
  c.obterDadosIniciais(); c.registrarSolicitacao(pedido()); assert.strictEqual(r.vals.length, 4); assert(ab.length > 1 && soHomolog(ab), ab.join());
  assert(/^\[HOMOLOGAÇÃO\] Recibo/.test(c.mails[0].assunto)); c.doGet(); assert.strictEqual(c.pagina.homologacao, true); assert(/^\[HOMOLOGAÇÃO\] /.test(c.pagina.titulo));
});
t('homologação: célula vazia é erro, sem cair na produção', () => {
  const { c, r, ab } = ambHomolog({ AMBIENTE: 'homologacao' }, idxHomolog(true));
  assert.throws(() => c.registrarSolicitacao(pedido())); assert.strictEqual(r.vals.length, 3); assert(soHomolog(ab), ab.join());
});
t('AMBIENTE desconhecido é erro e não abre planilha de dados', () => {
  const { c, ab } = ambHomolog({ AMBIENTE: 'homolog' }, idxHomolog());
  assert.throws(() => c.registrarSolicitacao(pedido())); assert(ab.every(id => id === 'IDX'), ab.join());
  c.doGet(); assert(/CONFIGURAÇÃO INVÁLIDA/.test(c.pagina.titulo));
});
t('produção: sem AMBIENTE, nada muda no título e no assunto', () => {
  const { c } = amb(); c.registrarSolicitacao(pedido()); assert(/^Recibo/.test(c.mails[0].assunto)); c.doGet(); assert.strictEqual(c.pagina.homologacao, false); assert(!/\[/.test(c.pagina.titulo));
});

// ---------- dados fictícios de homologação ----------
const USP = 'usp.br'; // montado em partes: e-mail de teste fora da lista do verificador
function lerCsv(nome) {
  const texto = fs.readFileSync(path.join(RAIZ, 'docs/sistemas/abertura-habilitacoes/dados-ficticios', nome), 'utf8').replace(/\r/g, '');
  const linhas = []; let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) { if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch; }
    else if (ch === '"') aspas = true; else if (ch === ',') { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; } else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}
t('CSV fictício: títulos A–O idênticos ao esquema e casos esperados', () => {
  const resp = lerCsv('formulario-respostas-ao-formulario-2.csv'); const alu = lerCsv('formulario-alunos.csv'); const per = lerCsv('formulario-periodos.csv');
  assert.deepStrictEqual(resp[0], CAB); assert(resp.slice(1).every(l => l.length === CAB.length));
  const r = sheet('Respostas ao formulário 2', resp);
  const files = { IDX: [indice()], ALU: [sheet('Alunos', alu)], RESP: [r], PER: [sheet('Períodos', per)] };
  const com = u => run({ ID_INDEX_SPREADSHEET_ID: 'IDX' }, files, { usuario: u });
  // linha 2: concluído → sem confirmação; linha 3: pendente (Bacharelado);
  // linha 4: K vazia (as duas habilitações) → pendente pelo Gerenciador;
  // linha 5: "Em análise" → pendente.
  const d13 = com('aluno.teste13@exemplo.invalid');
  assert.strictEqual(d13.obterDadosIniciais().autenticado, false, 'domínio fictício não passa no login');
  // Para os casos de pedido, o teste troca o domínio (como a homologação troca o e-mail da linha usada).
  resp.forEach((l, i) => { if (i) { l[1] = l[1].replace('@exemplo.invalid', '@usp.br'); l[5] = l[5].replace('@exemplo.invalid', '@usp.br'); } });
  alu.forEach((l, i) => { if (i) { l[3] = l[3].replace('@exemplo.invalid', '@usp.br'); l[4] = l[4].replace('@exemplo.invalid', '@usp.br'); } });
  const c11 = com(`aluno.teste11@${USP}`); const d = c11.obterDadosIniciais();
  assert.strictEqual(d.periodoOk, true); assert.strictEqual(d.nome, 'Aluno Teste 11'); assert.strictEqual(d.anoIngresso, '2021'); assert.strictEqual(d.historico[0].pendente, false);
  c11.registrarSolicitacao(pedido({ nome: 'Aluno Teste 11', nUsp: '9900011', programas: ['lic'] }));
  const c12 = com(`aluno.teste12@${USP}`); assert.throws(() => c12.registrarSolicitacao(pedido({ programas: ['bach'] })), /PEDIDO_PENDENTE/);
  c12.registrarSolicitacao(pedido({ programas: ['lic'] }));
  const c13 = com(`aluno.teste13@${USP}`); assert.strictEqual(c13.obterDadosIniciais().nome, 'Aluna Teste Conceição 13', 'pelo eMail Secundario');
  assert.throws(() => c13.registrarSolicitacao(pedido({ programas: ['lic'] })), /PEDIDO_PENDENTE/);
  const c14 = com(`aluno.teste14@${USP}`); assert.throws(() => c14.registrarSolicitacao(pedido({ programas: ['lic'] })), /PEDIDO_PENDENTE/);
  const c15 = com(`aluno.teste15@${USP}`); assert.strictEqual(c15.obterDadosIniciais().historico.length, 0);
  assert.strictEqual(r.vals.length, 7, '2 pedidos gravados');
  assert.strictEqual(r.vals[5][12], 1); assert.strictEqual(r.vals[6][10], 'pendente');
});

console.log(`\n${ok} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);

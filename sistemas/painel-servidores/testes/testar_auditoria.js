// Testes da auditoria do Painel dos servidores (Auditoria.gs e
// AuditoriaPainel.gs), sem Google: planilhas em memória, relógio
// controlado e pessoas fictícias (nenhum nome ou e-mail real).
// Confere selo encadeado (e que edição, exclusão ou inserção à mão é
// apontada), antes/depois, recusa da alteração quando a auditoria não
// abre, lotes da página, recusas de acesso, virada do ano, consolidação
// diária e a preparação da planilha. Uso: node testar_auditoria.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const SRC = path.join(__dirname, '..', 'src');

let ok = 0, fail = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; console.log('ok', n, extra); } else { fail++; console.log('FALHA', n, extra); } };
const lanca = fn => { try { fn(); return null; } catch (e) { return e; } };

// --- planilhas em memória ---------------------------------------------------
function novaAba(nome, valores) {
  const dados = (valores || []).map(l => l.map(String));
  let maxRows = Math.max(1000, dados.length);
  const aba = {
    nome, dados, protegida: false,
    getName: () => nome,
    getLastRow: () => { for (let i = dados.length - 1; i >= 0; i--) if (dados[i].some(v => v !== '')) return i + 1; return 0; },
    getMaxRows: () => maxRows,
    insertRowsAfter: (_, n) => { maxRows += n; },
    setFrozenRows: () => aba,
    protect: () => { aba.protegida = true; const p = { setDescription: () => p, addEditor: () => p, getEditors: () => [], removeEditors: () => p, canDomainEdit: () => false, setDomainEdit: () => p }; return p; },
    getDataRange: () => aba.getRange(1, 1, Math.max(dados.length, 1), Math.max(1, ...dados.map(l => l.length))),
    getRange: (r, c, nr = 1, nc = 1) => {
      if (r + nr - 1 > maxRows) throw new Error('fora da aba');
      const rg = {
        setNumberFormat: () => rg, setFontWeight: () => rg,
        setValues: vals => {
          vals.forEach((l, i) => { while (dados.length < r + i) dados.push([]); const linha = dados[r + i - 1]; l.forEach((v, j) => { while (linha.length < c + j) linha.push(''); linha[c + j - 1] = String(v); }); });
          return rg;
        },
        setValue: v => rg.setValues([[v]]),
        getDisplayValues: () => { const out = []; for (let i = 0; i < nr; i++) { const linha = dados[r + i - 1] || []; const o = []; for (let j = 0; j < nc; j++) o.push(linha[c + j - 1] === undefined ? '' : linha[c + j - 1]); out.push(o); } return out; },
        getValues: () => rg.getDisplayValues(),
        getValue: () => rg.getDisplayValues()[0][0],
        clearContent: () => { for (let i = 0; i < nr; i++) { const linha = dados[r + i - 1]; if (!linha) continue; for (let j = 0; j < nc; j++) if (c + j - 1 < linha.length) linha[c + j - 1] = ''; } return rg; }
      };
      return rg;
    }
  };
  return aba;
}
function novaPlanilha(abas) {
  const lista = abas.slice();
  return {
    lista,
    getSheets: () => lista.slice(),
    getSheetByName: n => lista.find(a => a.nome === n) || null,
    insertSheet: n => { if (lista.some(a => a.nome === n)) throw new Error('já existe'); const a = novaAba(n); lista.push(a); return a; },
    deleteSheet: a => { lista.splice(lista.indexOf(a), 1); }
  };
}

// --- cenário ----------------------------------------------------------------
const PERMISSOES = [['N. USP', 'Nome', 'e-mail', 'Observacao', 'Perfil'],
  ['1', 'Pessoa Fictícia A', 'admin@exemplo.usp.br', '', 'ADMINISTRADOR'],
  ['2', 'Pessoa Fictícia B', 'leitor@exemplo.usp.br', '', 'LEITOR']];
const SERVIDORES = [['E-MAIL', 'NOME', 'Setor', 'N.USP', 'TIPO', 'ID da Pasta', 'eMail Secundario'],
  ['admin@exemplo.usp.br', 'MARIA FICTÍCIA DA SILVA', 'Serviço Fictício', '1', 'SERVIDOR', '', ''],
  ['leitor@exemplo.usp.br', '', 'Seção Fictícia', '', 'SETOR', '', '']];

function cenario({ semAuditoria = false } = {}) {
  const relogio = { agora: Date.parse('2026-10-20T14:00:00-03:00') };
  const props = {}, cache = {}, logs = [], gatilhos = [];
  const usuario = { email: 'admin@exemplo.usp.br' };
  const auditoria = novaPlanilha([novaAba('Página1')]);
  const planilhas = {
    INDICE: novaPlanilha([novaAba('Página1', [['Chave', 'ID de Produção'], ['PERMISSOES_DE_ACESSO', 'PERM'], ['SERVIDORES', 'SERV'], ['AUDITORIA_PAINEL_SERVIDORES', semAuditoria ? '' : 'AUD']])]),
    PERM: novaPlanilha([novaAba('PAINEL_SERVIDORES', PERMISSOES)]),
    SERV: novaPlanilha([novaAba('Página1', SERVIDORES)]),
    AUD: auditoria
  };
  class DataFalsa extends Date { constructor(...a) { if (a.length) super(...a); else super(relogio.agora); } static now() { return relogio.agora; } }
  const formatar = (d, tz, padrao) => {
    const p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).forEach(x => { p[x.type] = x.value; });
    const ms = String(d.getTime() % 1000).padStart(3, '0');
    return padrao.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second).replace('SSS', ms);
  };
  let uuid = 0;
  const ctx = {
    console: { log: m => logs.push(String(m)), warn: m => logs.push(String(m)), error: m => logs.push(String(m)) },
    JSON, Date: DataFalsa, Math, Intl,
    Session: { getActiveUser: () => ({ getEmail: () => usuario.email }), getEffectiveUser: () => ({ getEmail: () => 'dona@exemplo.usp.br' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'ID_INDEX_SPREADSHEET_ID' ? 'INDICE' : props[k] || null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    SpreadsheetApp: { openById: id => { if (!planilhas[id]) throw new Error('arquivo indisponível'); return planilhas[id]; } },
    Utilities: {
      getUuid: () => '00000000-0000-4000-8000-' + String(++uuid).padStart(12, '0'),
      formatDate: formatar,
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, texto) => Array.from(crypto.createHash(alg).update(texto, 'utf8').digest()).map(b => (b > 127 ? b - 256 : b))
    },
    ScriptApp: {
      getProjectTriggers: () => gatilhos,
      newTrigger: nome => { const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, inTimezone: () => b, create: () => { gatilhos.push({ getHandlerFunction: () => nome, getUniqueId: () => 'gatilho-1' }); } }; return b; }
    },
    HtmlService: { createTemplateFromFile: nome => { const t = { nome, evaluate: () => ({ setTitle: () => ({ addMetaTag: () => t }) }) }; return t; } }
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8');
  vm.runInContext(code.match(/const TIMEZONE = .*;/)[0] + '\n' + code.match(/function normalizarSemAcento_[\s\S]*?\n\}/)[0], ctx);
  ['AcessoPainel.gs', 'SaudacaoPainel.gs', 'Auditoria.gs', 'AuditoriaPainel.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f }));
  // Funções de Regras/Formulários que as alterações chamam, simuladas.
  vm.runInContext('function despojarSnapshotToken_(o){if(!o)return o;const c=Object.assign({},o);delete c.snapshotToken;return c}', ctx);
  const aba = n => auditoria.getSheetByName(n);
  const linhas = n => { const a = aba(n); return a ? a.dados.slice(1).filter(l => l.some(v => v !== '')) : []; };
  const col = nome => vm.runInContext('AUDITORIA_COLUNAS_EVENTOS', ctx).indexOf(nome);
  return { ctx, relogio, props, cache, logs, usuario, auditoria, planilhas, aba, linhas, col, gatilhos };
}

const ANO = 'EVENTOS_2026';
const lote = (eventos, extra = {}) => Object.assign({ sessao_id: '11111111-2222-4333-8444-555555555555', contexto: { navegador: 'Chrome 129 · Windows', largura_tela: 1280, tema: 'dark', modo_navegacao: 'sidebar' }, eventos }, extra);

// --- 1. lote da página ------------------------------------------------------
{
  const s = cenario();
  const r = s.ctx.registrarEventosPainel(lote([
    { evento: 'ACESSO.ABRIR', tela: 'Sistemas', duracao_ms: 812.4, alvo_tipo: 'pagina', alvo_id: 'Painel', email: 'outra@exemplo.usp.br' },
    { evento: 'CARD.ABRIR', tela: 'Sistemas', alvo_tipo: 'sistema', alvo_id: 'Pessoas do IPUSP' },
    { evento: 'AJUDA.BUSCAR', mensagem: '=IMPORTXML("http://x")', detalhes: { resultado: '2 resultados' } }
  ]));
  const L = s.linhas(ANO), c = s.col;
  chk('lote gravado: 3 eventos', r.gravados === 3 && L.length === 3, String(L.length));
  chk('cabeçalho com as 31 colunas', s.aba(ANO).dados[0].length === 31 && s.aba(ANO).dados[0][0] === 'evento_id');
  chk('e-mail vem da sessão, não da página', L.every(l => l[c('email')] === 'admin@exemplo.usp.br'));
  chk('nome completo e tipo do cadastro', L[0][c('nome')] === 'Maria Fictícia da Silva' && L[0][c('tipo_conta')] === 'SERVIDOR', L[0][c('nome')]);
  chk('perfil ADMINISTRADOR', L[0][c('perfil')] === 'ADMINISTRADOR');
  chk('categoria e criticidade do dicionário', L[1][c('categoria')] === 'Sistemas' && L[1][c('criticidade')] === 'média');
  chk('origem navegador e contexto', L[0][c('origem')] === 'navegador' && L[0][c('tema')] === 'dark' && L[0][c('largura_tela')] === '1280' && L[0][c('navegador')] === 'Chrome 129 · Windows');
  chk('seq 1, 2, 3 e corrente', L.map(l => l[c('seq')]).join() === '1,2,3' && L[0][c('hash_anterior')] === '' && L[1][c('hash_anterior')] === L[0][c('hash')]);
  chk('duração arredondada', L[0][c('duracao_ms')] === '812');
  chk('texto que viraria fórmula ganha um espaço', L[2][c('mensagem')] === ' =IMPORTXML("http://x")', L[2][c('mensagem')]);
  chk('data_hora no fuso de São Paulo', L[0][c('data_hora')].startsWith('2026-10-20 14:00:00'), L[0][c('data_hora')]);
  chk('aba protegida e Página1 ainda lá (só sai na preparação)', s.aba(ANO).protegida && !!s.aba('Página1'));
  chk('integridade ok', s.ctx.verificarIntegridadeAuditoria().ok);
  chk('sessão guardada para as alterações', JSON.parse(s.cache['auditoriaContexto:admin@exemplo.usp.br']).sessao_id === lote([]).sessao_id);

  const antes = s.linhas(ANO).length;
  chk('página não pode mandar evento de alteração', /não aceito/.test(lanca(() => s.ctx.registrarEventosPainel(lote([{ evento: 'FORMULARIO.SALVAR' }]))).message));
  chk('nem código desconhecido', lanca(() => s.ctx.registrarEventosPainel(lote([{ evento: 'QUALQUER.COISA' }]))) !== null);
  chk('lote acima de 50 recusado', lanca(() => s.ctx.registrarEventosPainel(lote(Array(51).fill({ evento: 'TELA.ABRIR' })))) !== null);
  chk('lote recusado não grava nada', s.linhas(ANO).length === antes);
  s.ctx.registrarEventosPainel(lote([{ evento: 'TELA.ABRIR' }], { sessao_id: '"><script>', contexto: { tema: 'roxo', largura_tela: 'abc', modo_navegacao: 'x' } }));
  const u = s.linhas(ANO).pop();
  chk('sessão e contexto inválidos viram vazio', u[c('sessao_id')] === '' && u[c('tema')] === '' && u[c('largura_tela')] === '' && u[c('modo_navegacao')] === '');

  s.usuario.email = 'fora@exemplo.usp.br';
  const e = lanca(() => s.ctx.registrarEventosPainel(lote([{ evento: 'TELA.ABRIR' }])));
  const neg = s.linhas(ANO).pop();
  chk('fora da aba: lote recusado e ACESSO.NEGAR gravado', e && e.codigo === 'SEM_ACESSO' && neg[c('evento')] === 'ACESSO.NEGAR' && neg[c('alvo_id')] === 'registrarEventosPainel' && neg[c('perfil')] === 'SEM_ACESSO', neg[c('alvo_id')]);
}

// --- 2. selo encadeado: edição, exclusão e inserção à mão --------------------
{
  const s = cenario();
  s.ctx.registrarEventosPainel(lote(['ACESSO.ABRIR', 'TELA.ABRIR', 'CARD.ABRIR', 'TELA.ABRIR'].map(evento => ({ evento }))));
  const a = s.aba(ANO), c = s.col;
  a.dados[2][c('alvo_id')] = 'editado à mão';
  let v = s.ctx.verificarIntegridadeAuditoria();
  chk('célula editada: apontada na linha 3', !v.ok && v.problemas[0].problema === 'linha alterada' && v.problemas[0].linha === 3, JSON.stringify(v.problemas[0]));
  const s2 = cenario();
  s2.ctx.registrarEventosPainel(lote(['ACESSO.ABRIR', 'TELA.ABRIR', 'CARD.ABRIR', 'TELA.ABRIR'].map(evento => ({ evento }))));
  s2.aba(ANO).dados.splice(2, 1);
  v = s2.ctx.verificarIntegridadeAuditoria();
  chk('linha apagada: corrente quebrada', !v.ok && v.problemas.some(p => /corrente/.test(p.problema)), JSON.stringify(v.problemas));
  const s3 = cenario();
  s3.ctx.registrarEventosPainel(lote(['ACESSO.ABRIR', 'TELA.ABRIR'].map(evento => ({ evento }))));
  s3.aba(ANO).dados.splice(2, 0, s3.aba(ANO).dados[1].slice());
  v = s3.ctx.verificarIntegridadeAuditoria();
  chk('linha copiada e inserida: apontada', !v.ok, JSON.stringify(v.problemas));
}

// --- 3. alteração com antes/depois --------------------------------------------
{
  const s = cenario();
  s.ctx.registrarEventosPainel(lote([{ evento: 'ACESSO.ABRIR', tela: 'Configurações › Formulários' }]));
  let estado = { 'D Abertura': '01/02/2026', 'E Hora': '08:00', 'F Fim': '' };
  let durante = '';
  const r = s.ctx.alteracaoPainel_({
    evento: 'FORMULARIO.SALVAR', alvo_tipo: 'formulario', alvo_id: 'Formulário Fictício', planilha: 'PERIODOS',
    estado: () => Object.assign({}, estado)
  }, () => { durante = s.ctx.eventoAuditoriaAtual_(); estado = { 'D Abertura': '02/03/2026', 'E Hora': '08:00', 'F Fim': '20/03/2026' }; return { sucesso: true }; });
  const ev = s.linhas(ANO).pop(), c = s.col, alt = s.linhas('ALTERACOES_2026');
  chk('devolve o resultado da função', r.sucesso === true);
  chk('evento OK com 2 alterações', ev[c('evento')] === 'FORMULARIO.SALVAR' && ev[c('resultado')] === 'OK' && ev[c('n_alteracoes')] === '2' && ev[c('categoria')] === 'Alteração');
  chk('ALTERACOES: campo, antes e depois', alt.length === 2 && alt[0][7] === 'D Abertura' && alt[0][8] === '01/02/2026' && alt[0][9] === '02/03/2026' && alt[1][8] === '' && alt[1][9] === '20/03/2026', JSON.stringify(alt));
  chk('ALTERACOES ligadas pelo evento_id', alt.every(l => l[0] === ev[0]) && alt[0][6] === 'PERIODOS');
  chk('eventoAuditoriaAtual_ durante a gravação = evento_id (liga a aba das Regras)', durante === ev[0] && s.ctx.eventoAuditoriaAtual_() === '');
  chk('mesma sessão e tela da página', ev[c('sessao_id')] === lote([]).sessao_id && ev[c('tela')] === 'Configurações › Formulários' && ev[c('origem')] === 'servidor');
  chk('integridade ok com alterações', s.ctx.verificarIntegridadeAuditoria().ok);
  s.aba('ALTERACOES_2026').dados[1][9] = '03/03/2026';
  const v = s.ctx.verificarIntegridadeAuditoria();
  chk('valor em ALTERACOES editado à mão: apontado', !v.ok && v.problemas[0].problema === 'alterações do evento mudaram', JSON.stringify(v.problemas));

  const erro = lanca(() => s.ctx.alteracaoPainel_({ evento: 'FORMULARIO.SALVAR', alvo_tipo: 'formulario', alvo_id: 'X', estado: () => ({}) },
    () => { throw new Error('Esse formulário mudou de posição na planilha de Períodos desde que você abriu essa tela.'); }));
  const falhou = s.linhas(ANO).pop();
  chk('erro da função volta igual para a página', erro && /mudou de posição/.test(erro.message));
  chk('tentativa gravada como CONFLITO, com a mensagem', falhou[c('resultado')] === 'CONFLITO' && /mudou de posição/.test(falhou[c('mensagem')]));
  lanca(() => s.ctx.alteracaoPainel_({ evento: 'FORMULARIO.SALVAR', alvo_tipo: 'formulario', alvo_id: 'X' }, () => { throw new Error('Preencha data e horário.'); }));
  chk('validação recusada: RECUSADO', s.linhas(ANO).pop()[c('resultado')] === 'RECUSADO');

  // ativação: inativação automática vira evento filho
  let status = { 'RS-A': 'ATIVO', 'RS-B': 'RASCUNHO', 'RS-C': 'INATIVO' };
  s.ctx.alteracaoPainel_({
    evento: 'RULESET.ATIVAR', alvo_tipo: 'ruleset', alvo_id: 'RS-B',
    estado: () => ({ status_rulesets: Object.assign({}, status) }),
    mapearAlteracao: s.ctx.alteracaoRegrasAuditoria_('RS-B'),
    efeitos: (alts, id) => alts.filter(a => a.campo === 'status' && a.alvo_id !== 'RS-B' && a.depois === 'INATIVO')
      .map(a => ({ evento: 'RULESET.INATIVAR_AUTOMATICO', evento_pai_id: id, alvo_tipo: 'ruleset', alvo_id: a.alvo_id }))
  }, () => { status = { 'RS-A': 'INATIVO', 'RS-B': 'ATIVO', 'RS-C': 'INATIVO' }; });
  const [pai, filho] = s.linhas(ANO).slice(-2);
  chk('ativação + inativação automática ligada ao pai', pai[c('evento')] === 'RULESET.ATIVAR' && filho[c('evento')] === 'RULESET.INATIVAR_AUTOMATICO' && filho[c('evento_pai_id')] === pai[0] && filho[c('alvo_id')] === 'RS-A');
  const altStatus = s.linhas('ALTERACOES_2026').filter(l => l[0] === pai[0]);
  chk('alteração de status por ruleset', altStatus.length === 2 && altStatus.every(l => l[4] === 'ruleset' && l[7] === 'status'), JSON.stringify(altStatus));
  const m = s.ctx.alteracaoRegrasAuditoria_('RS-B')({ campo: 'requisitos.REQ-1.minimo', antes: '10', depois: '12' });
  chk('requisitos.REQ-1.minimo vira alvo requisito REQ-1, campo minimo', m.alvo_tipo === 'requisito' && m.alvo_id === 'REQ-1' && m.campo === 'minimo');
}

// --- 4. auditoria fora do ar: alteração recusada, navegação segue ------------
{
  const s = cenario({ semAuditoria: true });
  let executou = false;
  const e = lanca(() => s.ctx.alteracaoPainel_({ evento: 'FORMULARIO.SALVAR', alvo_tipo: 'formulario', alvo_id: 'X' }, () => { executou = true; }));
  chk('auditoria indisponível: nada é alterado', e && e.codigo === 'AUDITORIA_INDISPONIVEL' && !executou && /nada foi alterado/.test(e.message));
  chk('motivo no log, sem e-mail', s.logs.some(l => /Auditoria indisponível/.test(l)) && s.logs.every(l => !/@/.test(l)), s.logs.join(' | '));
  chk('leitura continua (exigirAcessoPainel_)', lanca(() => s.ctx.exigirAcessoPainel_()) === null);
  chk('lote da página falha (a página guarda e tenta de novo)', lanca(() => s.ctx.registrarEventosPainel(lote([{ evento: 'TELA.ABRIR' }]))) !== null);
  s.usuario.email = 'leitor@exemplo.usp.br';
  const r = lanca(() => s.ctx.exigirAdminPainel_());
  chk('recusa do LEITOR continua igual sem auditoria', r && r.codigo === 'SO_LEITURA');
}

// --- 5. recusas de acesso ----------------------------------------------------
{
  const s = cenario(), c = s.col;
  s.usuario.email = 'leitor@exemplo.usp.br';
  const e = lanca(() => s.ctx.salvarConfigFormulario({ linha: 2, indicador: 'X' }));
  const l = s.linhas(ANO).pop();
  chk('LEITOR: gravação recusada com a mensagem de sempre', e && e.codigo === 'SO_LEITURA');
  chk('PERMISSAO.RECUSAR com a função chamada', l[c('evento')] === 'PERMISSAO.RECUSAR' && l[c('resultado')] === 'NEGADO' && l[c('alvo_id')] === 'salvarConfigFormulario' && l[c('perfil')] === 'LEITOR', l[c('alvo_id')]);
  chk('setor: nome do setor e tipo SETOR', l[c('nome')] === 'Seção Fictícia' && l[c('tipo_conta')] === 'SETOR');
  s.usuario.email = 'fora@exemplo.usp.br';
  const acesso = s.ctx.verificarAcessoPainel_();
  s.ctx.paginaSemAcessoPainel_(acesso);
  const n = s.linhas(ANO).pop();
  chk('página sem acesso: ACESSO.NEGAR', n[c('evento')] === 'ACESSO.NEGAR' && n[c('alvo_tipo')] === 'pagina' && n[c('mensagem')] === 'SEM_ACESSO' && n[c('email')] === 'fora@exemplo.usp.br');
  s.usuario.email = '';
  s.ctx.paginaSemAcessoPainel_(s.ctx.verificarAcessoPainel_());
  chk('conta não identificada: ACESSO.NEGAR sem e-mail', s.linhas(ANO).pop()[c('mensagem')] === 'SEM_CONTA');
  s.usuario.email = 'admin@exemplo.usp.br';
  s.usuario.email = 'leitor@exemplo.usp.br';
  chk('consolidarAuditoriaPainel com triggerUid inventado: recusado ao LEITOR', lanca(() => s.ctx.consolidarAuditoriaPainel({ triggerUid: 'inventado' })) !== null);
  s.usuario.email = 'admin@exemplo.usp.br';
  chk('integridade ok depois das recusas', s.ctx.verificarIntegridadeAuditoria().ok);
}

// --- 6. virada do ano --------------------------------------------------------
{
  const s = cenario(), c = s.col;
  s.relogio.agora = Date.parse('2026-12-31T23:59:58-03:00');
  s.ctx.registrarEventosPainel(lote([{ evento: 'ACESSO.ABRIR' }, { evento: 'TELA.ABRIR' }]));
  s.relogio.agora = Date.parse('2027-01-01T00:00:05-03:00');
  s.ctx.registrarEventosPainel(lote([{ evento: 'TELA.ABRIR' }]));
  const novo = s.linhas('EVENTOS_2027');
  chk('ano novo: aba EVENTOS_2027', novo.length === 1 && s.linhas(ANO).length === 2);
  chk('seq e corrente continuam de uma aba para a outra', novo[0][c('seq')] === '3' && novo[0][c('hash_anterior')] === s.linhas(ANO)[1][c('hash')]);
  const v = s.ctx.verificarIntegridadeAuditoria();
  chk('integridade confere as duas abas', v.ok && v.eventos === 3, JSON.stringify(v));
}

// --- 7. consolidação, pendências e preparação -------------------------------
{
  const s = cenario();
  s.relogio.agora = Date.parse('2026-10-19T09:00:00-03:00');
  s.ctx.registrarEventosPainel(lote([{ evento: 'ACESSO.ABRIR', duracao_ms: 1000 }, { evento: 'CARD.ABRIR', alvo_id: 'Pessoas do IPUSP' }]));
  s.relogio.agora = Date.parse('2026-10-19T09:25:00-03:00');
  s.ctx.registrarEventosPainel(lote([{ evento: 'CARD.ABRIR', alvo_id: 'Pessoas do IPUSP' }, { evento: 'ACESSO.ABRIR', duracao_ms: 3000 }]));
  s.relogio.agora = Date.parse('2026-10-20T08:00:00-03:00');
  s.ctx.registrarEventosPainel(lote([{ evento: 'ACESSO.ABRIR' }])); // hoje: fica para amanhã
  const r = s.ctx.consolidarAuditoriaPainel();
  const sess = s.linhas('SESSOES'), res = s.linhas('RESUMO_DIARIO');
  chk('consolida só os dias fechados', r.dias === 1 && res.length === 1 && res[0][0] === '2026-10-19', JSON.stringify(r));
  chk('sessão: início, fim e 25 min', sess.length === 1 && sess[0][7] === '25' && sess[0][8] === '4', JSON.stringify(sess[0]));
  chk('resumo: acessos, pessoas, cards e tempo médio', res[0][1] === '2' && res[0][2] === '1' && res[0][4] === '2' && res[0][8] === '2000' && JSON.parse(res[0][9])['Pessoas do IPUSP'] === 2, JSON.stringify(res[0]));
  chk('rodar de novo não duplica', s.ctx.consolidarAuditoriaPainel().dias === 0 && s.linhas('RESUMO_DIARIO').length === 1);

  s.ctx.registrarPendenciasPainel_({ diplomas: 3, busp: 1 });
  s.ctx.registrarPendenciasPainel_({ diplomas: 4 });
  const p = s.linhas('PENDENCIAS');
  chk('PENDENCIAS: uma linha por hora', p.length === 1 && p[0][2] === '3' && p[0][7] === '0', JSON.stringify(p));

  const prep = s.ctx.prepararAuditoriaPainel();
  const dic = s.linhas('DICIONARIO');
  const codigos = Object.keys(vm.runInContext('AUDITORIA_EVENTOS_PAINEL', s.ctx));
  chk('preparação: Página1 vazia removida e abas criadas', !s.aba('Página1') && ['ALTERACOES_2026', 'SESSOES', 'RESUMO_DIARIO', 'PENDENCIAS', 'DICIONARIO', 'LEIA-ME'].every(n => s.aba(n)), prep.abas.join());
  chk('DICIONARIO com todos os códigos', dic.length === codigos.length && dic.every(l => l[1] && l[2] && l[3] && l[4]), String(dic.length));
  chk('LEIA-ME marca a retenção para validar', s.linhas('LEIA-ME').some(l => /A VALIDAR INSTITUCIONALMENTE/.test(l[1])));
  chk('gatilho diário criado uma vez', s.gatilhos.length === 1 && s.ctx.prepararAuditoriaPainel().gatilho === 'já existia' && s.gatilhos.length === 1);
  chk('gatilho verdadeiro passa pela guarda', lanca(() => { s.usuario.email = 'leitor@exemplo.usp.br'; s.ctx.consolidarAuditoriaPainel({ triggerUid: 'gatilho-1' }); }) === null);
  s.aba('DICIONARIO').dados.push(['sobra', '', '', '', '', '']);
  s.usuario.email = 'admin@exemplo.usp.br';
  s.ctx.prepararAuditoriaPainel();
  chk('preparar de novo reescreve o DICIONARIO sem sobras', s.linhas('DICIONARIO').length === codigos.length);
  chk('manutenção registrada (MANUTENCAO.EXECUTAR)', s.linhas(ANO).some(l => l[s.col('evento')] === 'MANUTENCAO.EXECUTAR' && l[s.col('alvo_id')] === 'prepararAuditoriaPainel'));
  chk('integridade ok no fim', s.ctx.verificarIntegridadeAuditoria().ok);
  chk('nada de e-mail no log', s.logs.every(l => !/@exemplo/.test(l) || /^\{/.test(l)), s.logs.filter(l => /@/.test(l)).join(' | '));
}

// --- 8. dicionário x página --------------------------------------------------
{
  const ui = fs.readFileSync(path.join(SRC, 'AuditoriaPainelUI.html'), 'utf8');
  const s = cenario();
  const dic = vm.runInContext('AUDITORIA_EVENTOS_PAINEL', s.ctx);
  const usados = [...new Set([...ui.matchAll(/registrar\('([A-Z_.]+)'/g)].map(m => m[1]))];
  chk('página só usa códigos de origem navegador', usados.length > 10 && usados.every(u => dic[u] && dic[u][2] === 'navegador'), usados.filter(u => !dic[u] || dic[u][2] !== 'navegador').join());
  const daPagina = Object.keys(dic).filter(k => dic[k][2] === 'navegador');
  chk('todo código de navegador é usado pela página', daPagina.every(k => usados.includes(k)), daPagina.filter(k => !usados.includes(k)).join());
  chk('página não envia a URL do card', !/alvo_id:\s*url/.test(ui));
}

console.log(`\n${ok} ok, ${fail} falha(s).`);
process.exit(fail ? 1 : 0);

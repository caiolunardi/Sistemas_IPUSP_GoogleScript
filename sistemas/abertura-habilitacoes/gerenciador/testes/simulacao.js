// Simulação dos serviços do Apps Script usados pelo gerenciador (1.0 e 2.0),
// para os testes de servidor e de equivalência. Dados 100% sintéticos:
// nomes, e-mails (domínio .invalid), números USP e IDs de planilha são
// inventados. Nenhum serviço real do Google é chamado.
//
// Cada chamada a uma função pública roda num contexto novo, como uma
// execução nova do Apps Script (variáveis globais zeradas), sobre os
// mesmos dados simulados (planilhas, propriedades, cache, e-mails).
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const TZ = 'America/Sao_Paulo';

const formatadores = {};
function formatarData(data, fuso, formato) {
  const partes = {};
  const tz = fuso || TZ;
  formatadores[tz] = formatadores[tz] || new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  formatadores[tz].formatToParts(data).forEach(p => { partes[p.type] = p.value; });
  return formato.replace(/yyyy|MM|dd|HH|H|mm|ss/g, t => ({
    yyyy: partes.year, MM: partes.month, dd: partes.day, HH: partes.hour,
    H: String(Number(partes.hour)), mm: partes.minute, ss: partes.second
  })[t]);
}

/**
 * Aba simulada. opcoes.somenteLeitura: qualquer escrita lança erro (aba histórica).
 * Fórmulas: aba.formulas["linha,coluna"] = "=…" marca a célula como fórmula;
 * getValues devolve o valor calculado (o que está em valores) e qualquer
 * escrita na célula troca a fórmula pelo valor, como no Sheets.
 */
function criarAba(nome, valores, opcoes = {}) {
  const contadores = { getValues: 0, getValue: 0, setValue: 0, setValues: 0, getDisplayValues: 0, getFormulas: 0 };
  const aba = {
    valores,
    contadores,
    formulas: {},
    escritas: [],
    falharEscrita: null, // function(linha, coluna, valor) → true para lançar erro
    getName: () => nome,
    getLastRow: () => valores.length,
    getLastColumn: () => valores.reduce((m, l) => Math.max(m, l.length), 0),
    getDataRange: () => aba.getRange(1, 1, Math.max(valores.length, 1), Math.max(aba.getLastColumn(), 1)),
    getRange(r, c, nr = 1, nc = 1) {
      const ler = () => {
        const saida = [];
        for (let i = 0; i < nr; i++) {
          const linha = valores[r - 1 + i] || [];
          const l = [];
          for (let j = 0; j < nc; j++) {
            const v = linha[c - 1 + j];
            l.push(v === undefined || v === null ? '' : v);
          }
          saida.push(l);
        }
        return saida;
      };
      const escrever = (i, j, v) => {
        if (opcoes.somenteLeitura) throw new Error('ESCRITA PROIBIDA na aba ' + nome);
        if (aba.falharEscrita && aba.falharEscrita(r + i, c + j, v)) throw new Error('Falha simulada de gravação');
        while (valores.length < r + i) valores.push([]);
        const linha = valores[r - 1 + i];
        while (linha.length < c + j) linha.push('');
        linha[c - 1 + j] = v;
        delete aba.formulas[(r + i) + ',' + (c + j)];
        aba.escritas.push({ linha: r + i, coluna: c + j, valor: v, travado: estadoGlobal.travado });
      };
      return {
        getValues: () => { contadores.getValues++; return ler(); },
        getValue: () => { contadores.getValue++; return ler()[0][0]; },
        getFormulas: () => {
          contadores.getFormulas++;
          return ler().map((l, i) => l.map((_, j) => aba.formulas[(r + i) + ',' + (c + j)] || ''));
        },
        getDisplayValues: () => {
          contadores.getDisplayValues++;
          return ler().map(l => l.map(v => v instanceof Date ? formatarData(v, TZ, 'dd/MM/yyyy HH:mm:ss') : String(v)));
        },
        setValue: v => { contadores.setValue++; escrever(0, 0, v); },
        setValues: m => { contadores.setValues++; m.forEach((l, i) => l.forEach((v, j) => escrever(i, j, v))); }
      };
    }
  };
  return aba;
}

/**
 * Planilha da auditoria (Auditoria.gs), em memória: tudo é texto, como no
 * formato "@" que o núcleo usa. aba.dados guarda as linhas; insertSheet,
 * proteção e linhas extras como no Sheets. planilha.falhar = true faz
 * qualquer abertura falhar (auditoria fora do ar).
 */
function criarAbaAuditoria(nome, valores) {
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
    getRange: (r, c, nr = 1, nc = 1) => {
      if (r + nr - 1 > maxRows) throw new Error('fora da aba');
      const rg = {
        setNumberFormat: () => rg, setFontWeight: () => rg,
        setValues: vals => {
          vals.forEach((l, i) => { while (dados.length < r + i) dados.push([]); const linha = dados[r + i - 1]; l.forEach((v, j) => { while (linha.length < c + j) linha.push(''); linha[c + j - 1] = String(v); }); });
          return rg;
        },
        getDisplayValues: () => { const out = []; for (let i = 0; i < nr; i++) { const linha = dados[r + i - 1] || []; const o = []; for (let j = 0; j < nc; j++) o.push(linha[c + j - 1] === undefined ? '' : linha[c + j - 1]); out.push(o); } return out; },
        clearContent: () => { for (let i = 0; i < nr; i++) { const linha = dados[r + i - 1]; if (!linha) continue; for (let j = 0; j < nc; j++) if (c + j - 1 < linha.length) linha[c + j - 1] = ''; } return rg; }
      };
      return rg;
    }
  };
  return aba;
}

function criarPlanilhaAuditoria(nome) {
  const lista = [criarAbaAuditoria('Página1')];
  const planilha = {
    lista,
    falhar: false,
    getName: () => nome || 'Auditoria sintética',
    getSheets: () => lista.slice(),
    getSheetByName: n => lista.find(a => a.nome === n) || null,
    insertSheet: n => { if (lista.some(a => a.nome === n)) throw new Error('já existe'); const a = criarAbaAuditoria(n); lista.push(a); return a; },
    deleteSheet: a => { lista.splice(lista.indexOf(a), 1); },
    // Linhas gravadas numa aba, sem o título.
    linhas: n => { const a = lista.find(x => x.nome === n); return a ? a.dados.slice(1).filter(l => l.some(v => v !== '')) : []; }
  };
  return planilha;
}

// Estado global da simulação de trava (compartilhado pelas execuções).
const estadoGlobal = { travado: false };

/**
 * Ambiente simulado.
 * opcoes: {
 *   arquivos: { [id]: { nome, abas: [aba] } },
 *   propriedades: {}, usuario: 'email', dono: 'email',
 *   travaOcupada: bool, falhaEnvio: bool, antesDoEnvio: fn
 * }
 */
function criarAmbiente(opcoes = {}) {
  const amb = {
    arquivos: opcoes.arquivos || {},
    propriedades: Object.assign({}, opcoes.propriedades || {}),
    cache: {},
    emails: [],
    logs: [],
    aberturas: {},
    flushes: [],
    usuario: opcoes.usuario === undefined ? 'admin@exemplo.invalid' : opcoes.usuario,
    dono: opcoes.dono || 'dono@exemplo.invalid',
    travaOcupada: !!opcoes.travaOcupada,
    falhaEnvio: !!opcoes.falhaEnvio,
    antesDoEnvio: opcoes.antesDoEnvio || null,
    paginas: [],
    gatilhos: []
  };
  const registrar = tipo => (...args) => amb.logs.push(tipo + ': ' + args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  amb.servicos = function () {
    return {
      Date,
      console: { log: registrar('log'), error: registrar('error'), warn: registrar('warn'), info: registrar('info') },
      Logger: { log: registrar('Logger') },
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: k => (k in amb.propriedades ? amb.propriedades[k] : null),
          setProperty: (k, v) => { amb.propriedades[k] = String(v); },
          deleteProperty: k => { delete amb.propriedades[k]; }
        })
      },
      CacheService: {
        getScriptCache: () => ({
          get: k => (k in amb.cache ? amb.cache[k] : null),
          put: (k, v) => { amb.cache[k] = v; },
          remove: k => { delete amb.cache[k]; }
        })
      },
      SpreadsheetApp: {
        openById: id => {
          amb.aberturas[id] = (amb.aberturas[id] || 0) + 1;
          const arq = amb.arquivos[id];
          if (!arq || (arq.planilha && arq.planilha.falhar)) throw new Error('Exception: You do not have access to the document with id ' + id + '.');
          if (arq.planilha) return arq.planilha;
          return {
            getName: () => arq.nome,
            getSheetByName: n => arq.abas.find(a => a.getName() === n) || null,
            getSheets: () => arq.abas
          };
        },
        flush: () => { amb.flushes.push({ travado: estadoGlobal.travado }); }
      },
      LockService: {
        getScriptLock: () => {
          let meu = false;
          return {
            tryLock: () => { if (amb.travaOcupada || estadoGlobal.travado) return false; estadoGlobal.travado = true; meu = true; return true; },
            waitLock: () => { if (amb.travaOcupada || estadoGlobal.travado) throw new Error('Lock timeout'); estadoGlobal.travado = true; meu = true; },
            releaseLock: () => { if (meu) { estadoGlobal.travado = false; meu = false; } },
            hasLock: () => meu
          };
        }
      },
      MailApp: {
        sendEmail: (para, assunto, corpo, op) => {
          if (amb.antesDoEnvio) { const f = amb.antesDoEnvio; amb.antesDoEnvio = null; f(); }
          if (amb.falhaEnvio) throw new Error('Falha simulada de envio para ' + para);
          amb.emails.push({ para, assunto, corpo, opcoes: op, travado: estadoGlobal.travado });
        }
      },
      Session: {
        getActiveUser: () => ({ getEmail: () => amb.usuario }),
        getEffectiveUser: () => ({ getEmail: () => amb.dono })
      },
      Utilities: {
        formatDate: formatarData,
        getUuid: () => crypto.randomUUID(),
        // Como no Apps Script: bytes com sinal (-128 a 127).
        computeDigest: (algoritmo, texto, charset) => {
          if (algoritmo !== 'SHA_256' || charset !== 'UTF_8') throw new Error('computeDigest: parâmetros inesperados');
          return Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest()).map(b => (b > 127 ? b - 256 : b));
        },
        DigestAlgorithm: { SHA_256: 'SHA_256' },
        Charset: { UTF_8: 'UTF_8' }
      },
      ScriptApp: {
        getProjectTriggers: () => amb.gatilhos.slice(),
        newTrigger: nome => {
          const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, inTimezone: () => b,
            create: () => { const uid = 'gatilho-' + (amb.gatilhos.length + 1); amb.gatilhos.push({ getHandlerFunction: () => nome, getUniqueId: () => uid }); } };
          return b;
        }
      },
      HtmlService: {
        createTemplateFromFile: nome => {
          const t = { nome, titulo: '' };
          t.evaluate = () => {
            const saida = { setTitle(x) { t.titulo = x; return saida; }, addMetaTag() { return saida; }, setXFrameOptionsMode() { return saida; } };
            amb.paginas.push(t);
            return saida;
          };
          return t;
        },
        createHtmlOutputFromFile: () => ({ getContent: () => '' }),
        XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
      }
    };
  };
  return amb;
}

/** Carrega um conjunto de arquivos .gs num contexto novo (uma "execução"). */
function carregar(amb, arquivos) {
  const ctx = vm.createContext(Object.assign({ JSON, Math, Object, Array, String, Number, Error, RegExp, Set, Map, isNaN, parseInt }, amb.servicos()));
  const codigo = arquivos.map(a => fs.readFileSync(a, 'utf8')).join('\n;\n');
  vm.runInContext(codigo, ctx, { filename: path.basename(arquivos[0]) });
  return ctx;
}

function arquivosDoGerenciador() {
  const src = path.join(__dirname, '..', 'src');
  return fs.readdirSync(src).filter(f => f.endsWith('.gs')).sort().map(f => path.join(src, f));
}

const BASELINE = path.join(__dirname, 'baseline', 'Codigo_v1.0_sanitizado.gs');

/** Executa uma função global num contexto novo e devolve o resultado (cópia JSON). */
function executar(amb, arquivos, nome, args = []) {
  estadoGlobal.travado = false;
  const ctx = carregar(amb, arquivos);
  if (typeof ctx[nome] !== 'function') throw new Error('Função inexistente: ' + nome);
  amb.ultimoRetornoTinhaData = false;
  let r;
  try {
    r = ctx[nome].apply(null, args);
  } finally {
    if (estadoGlobal.travado) { estadoGlobal.travado = false; throw new Error('A trava ficou presa depois de ' + nome); }
  }
  amb.ultimoRetornoTinhaData = contemData(r);
  return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
}

// Date ou valor não serializável em qualquer nível (google.script.run
// entrega null à página quando a resposta tem um Date).
function contemData(v) {
  if (v === null || v === undefined) return false;
  if (Object.prototype.toString.call(v) === '[object Date]') return true;
  if (typeof v === 'function') return true;
  if (typeof v === 'object') return Object.keys(v).some(k => contemData(v[k]));
  return false;
}

module.exports = { contemData, criarAba, criarAbaAuditoria, criarPlanilhaAuditoria, criarAmbiente, carregar, executar, arquivosDoGerenciador, formatarData, BASELINE, estadoGlobal, TZ };

// Simulação dos serviços do Apps Script para os testes do Formulário de
// Pedido de Colação de Grau 2.0. Dados 100% fictícios (nº USP 9000000+,
// e-mails @usp.br inventados e @exemplo.invalid): nenhuma planilha,
// pasta, e-mail ou ID real.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'src');

// O apóstrofo inicial do Sheets marca "texto" e não fica no valor.
const semApostrofo = v => (typeof v === 'string' && v[0] === "'" ? v.slice(1) : v);

class Aba {
  constructor(amb, idPlanilha, nome, valores) {
    this.amb = amb; this.idPlanilha = idPlanilha; this.nome = nome;
    this.valores = (valores || []).map(l => l.slice());
    this.gravacoes = [];
  }
  getName() { return this.nome; }
  getLastRow() { return this.valores.length; }
  getLastColumn() { return this.valores.reduce((m, l) => Math.max(m, l.length), 0); }
  getDataRange() { return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  falha(evento) { if (this.amb.falhar && this.amb.falhar(evento)) throw new Error('Falha simulada: ' + evento); }
  appendRow(linha) {
    this.falha('appendRow:' + this.nome);
    this.gravacoes.push(['appendRow', linha.slice()]);
    this.valores.push(linha.map(semApostrofo));
    this.amb.escritas.push(this.idPlanilha + '/' + this.nome);
  }
  setFrozenRows() {}
  getRange(l, c, nl = 1, nc = 1) {
    const aba = this;
    const ler = () => Array.from({ length: nl }, (_, i) => Array.from({ length: nc }, (_, j) => {
      const linha = aba.valores[l - 1 + i] || [];
      const v = linha[c - 1 + j];
      return v === undefined ? '' : v;
    }));
    const gravar = (i, j, v) => {
      while (aba.valores.length < l + i) aba.valores.push([]);
      aba.valores[l - 1 + i][c - 1 + j] = semApostrofo(v);
    };
    return {
      getValues: ler,
      getDisplayValues: () => ler().map(x => x.map(v => String(v))),
      getValue: () => ler()[0][0],
      setValue: v => {
        aba.falha('setValue:' + aba.nome);
        if (aba.amb.ignorarSetValue && aba.amb.ignorarSetValue(aba.nome, l, c, v)) return;
        aba.gravacoes.push(['setValue', l, c, v]); aba.amb.escritas.push(aba.idPlanilha + '/' + aba.nome); gravar(0, 0, v);
      },
      setValues: vs => {
        aba.gravacoes.push(['setValues', l, c, vs]); aba.amb.escritas.push(aba.idPlanilha + '/' + aba.nome);
        vs.forEach((linha, i) => linha.forEach((v, j) => gravar(i, j, v)));
      }
    };
  }
}

function planilha(amb, id, abas) {
  const mapa = {};
  const ordem = [];
  Object.keys(abas).forEach(n => { mapa[n] = new Aba(amb, id, n, abas[n]); ordem.push(n); });
  return {
    abas: mapa,
    getSheetByName: n => mapa[n] || null,
    getSheets: () => ordem.map(n => mapa[n]),
    insertSheet: n => { mapa[n] = new Aba(amb, id, n, []); ordem.push(n); amb.escritas.push(id + '/' + n); return mapa[n]; }
  };
}

class Pasta {
  constructor(amb, id, nome) { this.amb = amb; this.id = id; this.nome = nome; this.pastas = []; this.arquivos = []; }
  getId() { return this.id; }
  getName() { return this.nome; }
  getFoldersByName(nome) { const lista = this.pastas.filter(p => p.nome === nome); let i = 0; return { hasNext: () => i < lista.length, next: () => lista[i++] }; }
  createFolder(nome) {
    if (this.amb.falhar && this.amb.falhar('createFolder')) throw new Error('Falha simulada: createFolder');
    const p = new Pasta(this.amb, 'PASTA_' + (++this.amb.contador), nome); this.pastas.push(p); this.amb.pastas[p.id] = p; return p;
  }
  createFile(blob) {
    if (this.amb.falhar && this.amb.falhar('createFile')) throw new Error('Falha simulada: createFile');
    const arq = { id: 'ARQ_' + (++this.amb.contador), nome: blob.getName(), mime: blob.getContentType(), bytes: blob.getBytes(), lixeira: false, pasta: this.id };
    const obj = { getId: () => arq.id, getName: () => arq.nome, setTrashed: () => { arq.lixeira = true; this.amb.lixeira.push(arq.id); } };
    this.arquivos.push(arq); this.amb.arquivos.push(arq);
    return obj;
  }
}

/**
 * opcoes: { usuario, efetivo, propriedades, planilhas: {id: {aba: valores}}, pastas: [id], agora, passoMs }
 */
function ambiente(opcoes) {
  const amb = {
    usuario: opcoes.usuario === undefined ? '' : opcoes.usuario,
    efetivo: opcoes.efetivo || 'gradip@usp.br',
    propriedades: Object.assign({}, opcoes.propriedades || {}),
    planilhas: {}, pastas: {}, arquivos: [], lixeira: [], aberturas: [], escritas: [], logs: [],
    emails: [], cache: {}, contador: 0, agora: opcoes.agora || Date.parse('2026-11-20T12:00:00-03:00'),
    passoMs: opcoes.passoMs || 0, travaLivre: true, falhar: null, falharEmail: false, ignorarSetValue: null, flushes: 0
  };
  Object.keys(opcoes.planilhas || {}).forEach(id => { amb.planilhas[id] = planilha(amb, id, opcoes.planilhas[id]); });
  (opcoes.pastas || []).forEach(id => { amb.pastas[id] = new Pasta(amb, id, id); });
  return amb;
}

// Fuso de São Paulo: -03:00 o ano todo (sem horário de verão desde 2019).
function formatar(d, padrao) {
  const t = new Date(d.getTime() - 3 * 3600000);
  const p = (n, k = 2) => String(n).padStart(k, '0');
  const mapa = {
    yyyy: t.getUTCFullYear(), MM: p(t.getUTCMonth() + 1), dd: p(t.getUTCDate()),
    HH: p(t.getUTCHours()), mm: p(t.getUTCMinutes()), ss: p(t.getUTCSeconds()), SSS: p(t.getUTCMilliseconds(), 3), XXX: '-03:00'
  };
  return padrao.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss|SSS|XXX/g, (m, lit) => (lit !== undefined ? lit : mapa[m]));
}

function contexto(amb) {
  const DataSim = class extends Date {
    constructor(...a) {
      if (a.length) { super(...a); return; }
      super(amb.agora); amb.agora += amb.passoMs;
    }
    static now() { return amb.agora; }
  };
  const ctx = {
    console: { log: (...a) => amb.logs.push(a.join(' ')), error: (...a) => amb.logs.push(a.join(' ')), warn: (...a) => amb.logs.push(a.join(' ')) },
    Logger: { log: (...a) => amb.logs.push(a.join(' ')) },
    Session: {
      getActiveUser: () => ({ getEmail: () => amb.usuario }),
      getEffectiveUser: () => ({ getEmail: () => amb.efetivo })
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in amb.propriedades ? amb.propriedades[k] : null) }) },
    CacheService: { getScriptCache: () => ({ get: k => amb.cache[k] || null, put: (k, v) => { amb.cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { if (!amb.travaLivre) throw new Error('trava'); }, tryLock: () => amb.travaLivre, releaseLock: () => {} }) },
    SpreadsheetApp: {
      openById: id => { amb.aberturas.push(id); if (!amb.planilhas[id]) throw new Error('Planilha não encontrada: ' + id); return amb.planilhas[id]; },
      flush: () => { amb.flushes++; },
      getActiveSpreadsheet: () => { throw new Error('projeto autônomo'); }
    },
    DriveApp: {
      getFolderById: id => { amb.aberturas.push(id); if (!amb.pastas[id]) throw new Error('Pasta não encontrada: ' + id); return amb.pastas[id]; }
    },
    MailApp: {
      sendEmail: msg => { if (amb.falharEmail) throw new Error('cota de e-mail'); amb.emails.push(msg); }
    },
    HtmlService: {
      createTemplateFromFile: nome => ({ nome: nome, evaluate: () => { const s = { nome: nome, titulo: '', setTitle(x) { s.titulo = x; return s; }, addMetaTag() { return s; } }; return s; } }),
      createHtmlOutput: html => { const s = { html: html, titulo: '', setTitle(x) { s.titulo = x; return s; }, addMetaTag() { return s; } }; return s; }
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64Decode: b64 => { if (!/^[A-Za-z0-9+/=]*$/.test(b64)) throw new Error('base64 inválido'); return Array.from(Buffer.from(b64, 'base64')).map(b => (b > 127 ? b - 256 : b)); },
      computeDigest: (alg, bytes) => Array.from(crypto.createHash('sha256').update(Buffer.from(bytes.map(b => b & 0xFF))).digest()).map(b => (b > 127 ? b - 256 : b)),
      newBlob: (bytes, tipo, nome) => ({ getName: () => nome, getBytes: () => bytes, getContentType: () => tipo }),
      formatDate: (d, fuso, padrao) => formatar(d, padrao),
      DigestAlgorithm: { SHA_256: 'SHA_256' }
    },
    Date: DataSim, JSON: JSON, Math: Math
  };
  vm.createContext(ctx);
  fs.readdirSync(SRC).filter(f => f.endsWith('.gs')).sort()
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

// Cada chamada é uma execução nova do Apps Script (variáveis globais zeradas).
function executar(amb, nome, args) {
  const ctx = contexto(amb);
  return ctx[nome].apply(null, args || []);
}

module.exports = { ambiente, contexto, executar, formatar, SRC };

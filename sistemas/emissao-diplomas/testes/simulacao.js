// Simulação mínima dos serviços do Apps Script para os testes do
// Gerenciador de Colação de Grau e Diplomas. Dados 100% fictícios:
// nenhuma planilha, e-mail ou ID real.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');
const arquivosGs = () => fs.readdirSync(SRC).filter(f => f.endsWith('.gs')).sort();

// Como o Sheets: o apóstrofo inicial força texto e não fica no valor.
const semApostrofo = v => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);

class Aba {
  constructor(nome, valores) { this.nome = nome; this.valores = valores.map(l => l.slice()); }
  getLastRow() { return this.valores.length; }
  getLastColumn() { return this.valores.reduce((m, l) => Math.max(m, l.length), 0); }
  getDataRange() { return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  getRange(l, c, nl = 1, nc = 1) {
    const aba = this;
    const ler = () => Array.from({ length: nl }, (_, i) => Array.from({ length: nc }, (_, j) => {
      const linha = aba.valores[l - 1 + i] || [];
      const v = linha[c - 1 + j];
      return v === undefined ? '' : v;
    }));
    return {
      getValues: ler,
      getDisplayValues: () => ler().map(x => x.map(v => String(v))),
      getValue: () => ler()[0][0],
      clearContent: () => { aba.gravacoes.push([l, c, 'clearContent']); for (let i = 0; i < nl; i++) for (let j = 0; j < nc; j++) { if (aba.valores[l - 1 + i] && aba.valores[l - 1 + i][c - 1 + j] !== undefined) aba.valores[l - 1 + i][c - 1 + j] = ''; } },
      setValue: v => { aba.gravacoes.push([l, c, v]); while (aba.valores.length < l) aba.valores.push([]); aba.valores[l - 1][c - 1] = semApostrofo(v); },
      setValues: vs => { aba.gravacoes.push([l, c, vs]); vs.forEach((linha, i) => linha.forEach((v, j) => { while (aba.valores.length < l + i) aba.valores.push([]); aba.valores[l - 1 + i][c - 1 + j] = semApostrofo(v); })); }
    };
  }
  // appendRow: uma gravação só, numa linha nova depois da última (4.0.1).
  appendRow(linha) { this.gravacoes.push([this.valores.length + 1, 1, [linha.slice()]]); this.valores.push(linha.map(semApostrofo)); return this; }
  deleteRow(l) { this.gravacoes.push([l, 0, 'deleteRow']); this.valores.splice(l - 1, 1); return this; }
}
Aba.prototype.gravacoes = null;

function planilha(abas) {
  const mapa = {};
  Object.keys(abas).forEach(n => { mapa[n] = new Aba(n, abas[n]); mapa[n].gravacoes = []; });
  return { abas: mapa, getSheetByName: n => mapa[n] || null, getSheets: () => Object.values(mapa) };
}

/**
 * Monta um ambiente. opcoes: { usuario, propriedades, planilhas: {id: {aba: valores}} }
 */
function ambiente(opcoes) {
  const amb = {
    usuario: opcoes.usuario === undefined ? '' : opcoes.usuario,
    propriedades: Object.assign({}, opcoes.propriedades || {}),
    planilhas: {},
    aberturas: [],
    logs: [],
    cache: {},
    templates: []
  };
  Object.keys(opcoes.planilhas || {}).forEach(id => { amb.planilhas[id] = planilha(opcoes.planilhas[id]); });
  return amb;
}

function contexto(amb) {
  const ctx = {
    console: { log: (...a) => amb.logs.push(a.join(' ')), error: (...a) => amb.logs.push(a.join(' ')), warn: (...a) => amb.logs.push(a.join(' ')) },
    Logger: { log: (...a) => amb.logs.push(a.join(' ')) },
    Session: { getActiveUser: () => ({ getEmail: () => amb.usuario }), getEffectiveUser: () => ({ getEmail: () => 'dono@exemplo.invalid' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in amb.propriedades ? amb.propriedades[k] : null), setProperty: (k, v) => { amb.propriedades[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => amb.cache[k] || null, put: (k, v) => { amb.cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    SpreadsheetApp: {
      openById: id => { amb.aberturas.push(id); if (!amb.planilhas[id]) throw new Error('Planilha não encontrada: ' + id); return amb.planilhas[id]; },
      getActiveSpreadsheet: () => { throw new Error('getActiveSpreadsheet não existe num projeto autônomo'); }
    },
    HtmlService: {
      createTemplateFromFile: nome => {
        const t = { nome: nome, evaluate: () => {
          amb.templates.push(Object.assign({}, t));
          const saida = { titulo: '', setTitle(x) { saida.titulo = x; return saida; }, addMetaTag() { return saida; }, template: t };
          return saida;
        } };
        return t;
      },
      createHtmlOutputFromFile: nome => ({ getContent: () => fs.readFileSync(path.join(SRC, nome + '.html'), 'utf8') })
    },
    Utilities: {
      getUuid: (() => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'); })(),
      computeDigest: () => [], computeHmacSha256Signature: () => [], base64Encode: () => '', base64Decode: () => [], newBlob: (bytes, tipo, nome) => ({ getName: () => nome, getBytes: () => bytes || [], getContentType: () => tipo, setName(n) { nome = n; return this; } }),
      formatDate: d => String(d), DigestAlgorithm: {}, Charset: {}
    },
    DriveApp: amb.drive || {}, MailApp: {}, GmailApp: {}, MimeType: { PDF: 'application/pdf' }, ScriptApp: {},
    DocumentApp: { HorizontalAlignment: { CENTER: 'CENTER', LEFT: 'LEFT', RIGHT: 'RIGHT', JUSTIFY: 'JUSTIFY' }, VerticalAlignment: { TOP: 'TOP', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM' }, Attribute: new Proxy({}, { get: (_, k) => String(k) }), ParagraphHeading: new Proxy({}, { get: (_, k) => String(k) }), GlyphType: new Proxy({}, { get: (_, k) => String(k) }), TextAlignment: new Proxy({}, { get: (_, k) => String(k) }) },
    Date: Date, JSON: JSON, Math: Math
  };
  vm.createContext(ctx);
  arquivosGs().forEach(f => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

// Cada chamada é uma execução nova do Apps Script (variáveis globais zeradas).
function executar(amb, nome, args) {
  const ctx = contexto(amb);
  return ctx[nome].apply(null, args || []);
}

module.exports = { ambiente, contexto, executar, arquivosGs, SRC };

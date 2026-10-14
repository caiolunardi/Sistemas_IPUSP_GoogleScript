// Simulador mínimo dos serviços do Google Apps Script usados pelo sistema
// Estrutura Curricular. Não é completo: cobre só o que o código chama.
// Comportamentos importantes reproduzidos:
//  - setValue/setValues com semântica de "digitado pelo usuário": texto
//    que parece número vira número, "dd/mm/aaaa" vira data, e o apóstrofo
//    inicial força texto (e não fica no valor);
//  - fórmula ("=...") é guardada como fórmula (para testarmos a proteção);
//  - getRange fora das dimensões da aba lança erro, como no Sheets.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const pad = (n) => String(n).padStart(2, '0');
const isDate = (v) => Object.prototype.toString.call(v) === '[object Date]';

function comoDigitado(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (v.startsWith('=')) return { formula: v };
  const s = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (d) return new Date(+d[3], +d[2] - 1, +d[1]);
  if (/^(TRUE|FALSE)$/i.test(s)) return s.toUpperCase() === 'TRUE';
  return v;
}
function exibir(v, fmt) {
  if (v === '' || v === null || v === undefined) return '';
  if (v && v.formula) return '#FORMULA';
  if (isDate(v)) return `${pad(v.getDate())}/${pad(v.getMonth() + 1)}/${v.getFullYear()}`;
  if (typeof v === 'number' && fmt === '0') return String(Math.round(v));
  return String(v);
}

class User { constructor(e) { this.e = e; } getEmail() { return this.e; } }

// Falhas injetadas nos testes: cada operação de escrita chama pontoDeFalha(),
// que lança um erro se alguma regra registrada casar com o evento.
function pontoDeFalha(estado, evento) {
  estado.eventos.push(evento);
  for (const f of estado.falhas) {
    if (f.vezes > 0 && f.quando(evento)) { f.vezes--; f.disparos = (f.disparos || 0) + 1; throw new Error('FALHA INJETADA em ' + evento.tipo + (evento.aba ? ' (' + evento.aba + ')' : '') + (evento.chave ? ' (' + evento.chave + ')' : '')); }
  }
}

// (1.8.6) Falhas de LEITURA (getValues), separadas das de escrita: não
// entram em estado.eventos nem disparam as regras de injetarFalha, para não
// mudar o que os testes antigos contam. injetarFalhaLeitura(quando, vezes).
function falhaDeLeitura(estado, evento) {
  for (const f of (estado.falhasLeitura || [])) {
    if (f.vezes > 0 && f.quando(evento)) { f.vezes--; f.disparos = (f.disparos || 0) + 1; throw new Error('FALHA DE LEITURA INJETADA em ' + evento.tipo + ' (' + evento.aba + ')'); }
  }
}

class Protection {
  constructor(sheet) { this.sheet = sheet; this.desc = ''; this.aviso = false; this.livres = []; }
  setDescription(d) { this.desc = d; return this; }
  setWarningOnly(b) { this.aviso = b; return this; }
  isWarningOnly() { return this.aviso; }
  setUnprotectedRanges(r) { this.livres = r; return this; }
  getUnprotectedRanges() { return this.livres; }
}

class Sheet {
  constructor(ss, name) {
    this.ss = ss; this.name = name; this.maxRows = 1000; this.maxCols = 26;
    this.cells = new Map(); this.fmts = new Map(); this.notes = new Map();
    this.protections = []; this.frozenRows = 0; this.frozenCols = 0; this.widths = {};
    this.id = ++ss.estado.proximoIdAba; this.oculta = false; this.listas = new Map();
    this.tipadas = new Set();   // 1.6.2: colunas de Tabela com tipo (o Sheets recusa setNumberFormat nelas)
  }
  getSheetId() { return this.id; }
  isSheetHidden() { return this.oculta; }
  hideSheet() { pontoDeFalha(this.ss.estado, { tipo: 'hideSheet', aba: this.name }); this.oculta = true; return this; }
  showSheet() { pontoDeFalha(this.ss.estado, { tipo: 'showSheet', aba: this.name }); this.oculta = false; return this; }
  copyTo(destino) {
    pontoDeFalha(this.ss.estado, { tipo: 'copyTo', aba: this.name });
    let nome = 'Cópia de ' + this.name, i = 2;
    while (destino.getSheetByName(nome)) nome = 'Cópia de ' + this.name + ' ' + (i++);
    const s = new Sheet(destino, nome);
    s.maxRows = this.maxRows; s.maxCols = this.maxCols;
    for (const [k, v] of this.cells) s.cells.set(k, v && v.formula ? { formula: v.formula } : (isDate(v) ? new Date(v.getTime()) : v));
    for (const [k, v] of this.fmts) s.fmts.set(k, v);
    for (const [k, v] of this.notes) s.notes.set(k, v);
    s.frozenRows = this.frozenRows; s.frozenCols = this.frozenCols; s.widths = Object.assign({}, this.widths);
    destino.sheets.push(s);
    return s;
  }
  deleteRows(inicio, qtd) {
    pontoDeFalha(this.ss.estado, { tipo: 'deleteRows', aba: this.name });
    const novas = new Map();
    for (const [k, v] of this.cells) {
      const [r, c] = k.split(',').map(Number);
      if (r >= inicio && r < inicio + qtd) continue;
      novas.set((r >= inicio + qtd ? r - qtd : r) + ',' + c, v);
    }
    this.cells = novas; this.maxRows -= qtd;
    return this;
  }
  deleteRow(r) { return this.deleteRows(r, 1); }
  getName() { return this.name; }
  setName(n) {
    pontoDeFalha(this.ss.estado, { tipo: 'setName', aba: this.name, novo: n });
    if (this.ss.sheets.some((s) => s !== this && s.name === n)) throw new Error('Já existe uma aba com o nome ' + n);
    this.name = n; return this;
  }
  getParent() { return this.ss; }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  getLastRow() { let l = 0; for (const [k, v] of this.cells) { if (v === '' || v == null) continue; const r = +k.split(',')[0]; if (r > l) l = r; } return l; }
  getLastColumn() { let l = 0; for (const [k, v] of this.cells) { if (v === '' || v == null) continue; const c = +k.split(',')[1]; if (c > l) l = c; } return l; }
  getRange(a, b, c, d) {
    if (typeof a === 'string') throw new Error('A1 não suportado no simulador');
    const nr = c || 1, nc = d || 1;
    if (a < 1 || b < 1 || nr < 1 || nc < 1 || a + nr - 1 > this.maxRows || b + nc - 1 > this.maxCols) {
      throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    }
    return new Range(this, a, b, nr, nc);
  }
  insertRowsAfter(pos, qtd) { this.maxRows += qtd; return this; }
  insertColumnsAfter(pos, qtd) { this.maxCols += qtd; return this; }
  setColumnWidth(c, w) { this.widths[c] = w; return this; }
  setRowHeight() { return this; }
  setFrozenRows(n) { this.frozenRows = n; return this; }
  setFrozenColumns(n) { this.frozenCols = n; return this; }
  protect() { pontoDeFalha(this.ss.estado, { tipo: 'protect', aba: this.name }); const p = new Protection(this); this.protections.push(p); return p; }
  getProtections() { return this.protections; }
  clearContents() { pontoDeFalha(this.ss.estado, { tipo: 'clearContents', aba: this.name }); this.cells.clear(); return this; }
  get(r, c) { const v = this.cells.get(`${r},${c}`); return v === undefined ? '' : v; }
  appendRow(l) { pontoDeFalha(this.ss.estado, { tipo: 'appendRow', aba: this.name }); const r = this.getLastRow() + 1; if (r > this.maxRows) this.maxRows = r; l.forEach((v, j) => this.set(r, j + 1, v)); return this; }
  set(r, c, v) { if (v === '' || v === null || v === undefined) this.cells.delete(`${r},${c}`); else this.cells.set(`${r},${c}`, comoDigitado(v)); }
}

const ENCADEAVEIS = ['setFontWeight', 'setBackground', 'setFontColor', 'setVerticalAlignment', 'setWrap', 'setFontSize', 'setHorizontalAlignment'];
class Range {
  constructor(sheet, row, col, nr, nc) {
    this.sheet = sheet; this.row = row; this.col = col; this.nr = nr; this.nc = nc;
    ENCADEAVEIS.forEach((m) => { this[m] = () => this; });
  }
  cada(fn) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) fn(this.row + i, this.col + j, i, j); }
  getRow() { return this.row; } getColumn() { return this.col; } getNumRows() { return this.nr; } getNumColumns() { return this.nc; }
  getValues() { falhaDeLeitura(this.sheet.ss.estado, { tipo: 'getValues', aba: this.sheet.name, linha: this.row, linhas: this.nr }); const o = []; for (let i = 0; i < this.nr; i++) { const r = []; for (let j = 0; j < this.nc; j++) { const v = this.sheet.get(this.row + i, this.col + j); r.push(v && v.formula ? '#FORMULA' : (isDate(v) ? new Date(v.getTime()) : v)); } o.push(r); } return o; }
  getDisplayValues() {
    // 1.6.2: estado.formulaComErro = true → toda fórmula aparece como #ERROR! (como na planilha real que falhou)
    const comErro = this.sheet.ss.estado.formulaComErro;
    const o = []; for (let i = 0; i < this.nr; i++) { const r = []; for (let j = 0; j < this.nc; j++) { const v = this.sheet.get(this.row + i, this.col + j); r.push(v && v.formula && (comErro || v.erroDeAnalise) ? '#ERROR!' : exibir(v, this.sheet.fmts.get(`${this.row + i},${this.col + j}`))); } o.push(r); } return o;
  }
  getValue() { return this.getValues()[0][0]; }
  // (1.8.5) setValue passa a ter ponto de falha ANTES (como setValues) e,
  // como todas as escritas abaixo, um ponto DEPOIS de aplicar ("…Depois"):
  // a falha "depois" simula escrita feita seguida de exceção.
  setValue(v) {
    pontoDeFalha(this.sheet.ss.estado, { tipo: 'setValue', aba: this.sheet.name, linha: this.row, coluna: this.col });
    this.sheet.set(this.row, this.col, v);
    pontoDeFalha(this.sheet.ss.estado, { tipo: 'setValueDepois', aba: this.sheet.name, linha: this.row, coluna: this.col });
    return this;
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some((l) => l.length !== this.nc)) throw new Error(`setValues: ${vals.length}x${vals[0] && vals[0].length} != ${this.nr}x${this.nc}`);
    pontoDeFalha(this.sheet.ss.estado, { tipo: 'setValues', aba: this.sheet.name, linha: this.row, linhas: this.nr });
    vals.forEach((l, i) => l.forEach((v, j) => this.sheet.set(this.row + i, this.col + j, v)));
    this.sheet.ss.estado.escritas++;
    pontoDeFalha(this.sheet.ss.estado, { tipo: 'setValuesDepois', aba: this.sheet.name, linha: this.row, linhas: this.nr });
    return this;
  }
  setNumberFormat(f) {
    this.cada((r, c) => { if (this.sheet.tipadas.has(c)) throw new Error('Não é possível definir o formato de número das células em uma coluna com tipo.'); });
    this.cada((r, c) => this.sheet.fmts.set(`${r},${c}`, f)); return this;
  }
  setNote(n) { this.cada((r, c) => this.sheet.notes.set(`${r},${c}`, n)); return this; }
  getNote() { return this.sheet.notes.get(`${this.row},${this.col}`) || ''; }
  clearContent() { pontoDeFalha(this.sheet.ss.estado, { tipo: 'clearContent', aba: this.sheet.name }); this.cada((r, c) => this.sheet.cells.delete(`${r},${c}`)); return this; }
  // 1.6.0
  getSheet() { return this.sheet; }
  getA1Notation() {
    const l = (n) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
    const a = l(this.col) + this.row, b = l(this.col + this.nc - 1) + (this.row + this.nr - 1);
    return a === b ? a : a + ':' + b;
  }
  getDisplayValue() { return this.getDisplayValues()[0][0]; }
  // 1.6.1: listas suspensas que recusam o que não está na lista (como no Sheets, também para scripts)
  clearDataValidations() { this.cada((r, c) => this.sheet.listas.delete(`${r},${c}`)); return this; }
  setFormulas(fs) {
    if (fs.length !== this.nr || fs.some((l) => l.length !== this.nc)) throw new Error('setFormulas: tamanho');
    this.cada((r, c) => { if (this.sheet.listas.has(`${r},${c}`)) throw new Error('Os dados que você inseriu na célula ' + String.fromCharCode(64 + c) + r + ' violam as regras de validação de dados definidas nesta célula.'); });
    pontoDeFalha(this.sheet.ss.estado, { tipo: 'setFormulas', aba: this.sheet.name });
    // 1.6.3: como no Sheets, a fórmula é lida com o separador da localidade da planilha;
    // separador errado fora das aspas = "Erro de análise de fórmula" (#ERROR!)
    const sepCerto = this.sheet.ss.separadorReal || (/^pt/.test(this.sheet.ss.locale || 'en_US') ? ';' : ',');
    const semAspas = (f) => f.replace(/"[^"]*"/g, '');
    fs.forEach((l, i) => l.forEach((f, j) => this.sheet.cells.set(`${this.row + i},${this.col + j}`, { formula: f, erroDeAnalise: semAspas(f).indexOf(sepCerto === ';' ? ',' : ';') >= 0 })));
    this.sheet.ss.estado.escritas++;
    return this;
  }
  getFormulas() { const o = []; for (let i = 0; i < this.nr; i++) { const r = []; for (let j = 0; j < this.nc; j++) { const v = this.sheet.get(this.row + i, this.col + j); r.push(v && v.formula ? v.formula : ''); } o.push(r); } return o; }
  clearNote() { this.cada((r, c) => this.sheet.notes.delete(`${r},${c}`)); return this; }
}

class Metadado {
  constructor(ss, k, v) { this.ss = ss; this.k = k; this.v = v; }
  getKey() { return this.k; } getValue() { return this.v; }
  setValue(v) { pontoDeFalha(this.ss.estado, { tipo: 'metadado', chave: this.k }); this.v = String(v); pontoDeFalha(this.ss.estado, { tipo: 'metadadoDepois', chave: this.k }); return this; }
  remove() { pontoDeFalha(this.ss.estado, { tipo: 'metadadoRemover', chave: this.k }); this.ss.meta = this.ss.meta.filter((m) => m !== this); pontoDeFalha(this.ss.estado, { tipo: 'metadadoRemoverDepois', chave: this.k }); }
}

class Spreadsheet {
  constructor(estado, id, dono, nome) { this.estado = estado; this.id = id; this.dono = dono; this.sheets = []; this.meta = []; this.nome = nome || 'Planilha sem título'; }
  getId() { return this.id; }
  getName() { return this.nome; }
  rename(n) { pontoDeFalha(this.estado, { tipo: 'rename', planilha: this.id, novo: n }); this.nome = String(n); return this; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.id + '/edit'; }
  // 1.6.3: localidade (pt_BR lê fórmulas com ";"); estado.semLocalidade simula falha na leitura
  getSpreadsheetLocale() { if (this.estado.semLocalidade) throw new Error('sem localidade'); return this.locale || 'en_US'; }
  getOwner() { return this.dono ? new User(this.dono) : null; }
  getSheets() { return [...this.sheets]; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  insertSheet(nome, indice) {
    pontoDeFalha(this.estado, { tipo: 'insertSheet', aba: nome });
    if (this.getSheetByName(nome)) throw new Error('Já existe uma aba ' + nome);
    const s = new Sheet(this, nome);
    if (indice === undefined) this.sheets.push(s); else this.sheets.splice(indice, 0, s);
    return s;
  }
  getDeveloperMetadata() { pontoDeFalha(this.estado, { tipo: 'lerMetadados' }); return [...this.meta]; }
  addDeveloperMetadata(k, v) { pontoDeFalha(this.estado, { tipo: 'metadado', chave: k }); this.meta.push(new Metadado(this, k, String(v))); pontoDeFalha(this.estado, { tipo: 'metadadoDepois', chave: k }); return this; }
  deleteSheet(s) { pontoDeFalha(this.estado, { tipo: 'deleteSheet', aba: s.name }); this.sheets = this.sheets.filter((x) => x !== s); }
  setActiveSheet(s) { this.ativa = s; return s; }
  moveActiveSheet(pos) {
    pontoDeFalha(this.estado, { tipo: 'moveActiveSheet', aba: this.ativa && this.ativa.name });
    const s = this.ativa; this.sheets = this.sheets.filter((x) => x !== s); this.sheets.splice(Math.max(0, pos - 1), 0, s);
  }
}

function formatDate(d, tz, fmt) {
  const partes = new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const p = {}; partes.forEach((x) => { p[x.type] = x.value; });
  if (p.hour === '24') p.hour = '00';
  return fmt.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second);
}

function lerHtmlDoProjeto(dir, nome) {
  return fs.readFileSync(path.join(dir, nome + '.html'), 'utf8');
}

/**
 * Cria um ambiente com o código .gs carregado.
 * opcoes: { dirSrc, usuario, dono, propriedades, travaOcupada, permissoes: [[email, perfil]], semPermissaoDoDono, semChavePermissoes, abaPermissoes }
 */
function criarAmbiente(opcoes) {
  const o = Object.assign({ usuario: 'dono@unidade.example', dono: 'dono@unidade.example' }, opcoes || {});
  // opcoes.reusar = ambiente anterior: simula o reinício do Apps Script
  // (novo contexto, cache vazio) sobre as MESMAS planilhas e Propriedades.
  if (o.reusar) return montarContexto(o, o.reusar.estado, o.reusar.planilhas, o.reusar.props);
  const estado = { escritas: 0, logs: [], erros: [], falhas: [], falhasLeitura: [], eventos: [], proximoIdAba: 1000, proximaCopia: 0, pastas: new Map(), acionadores: [] };
  const planilhas = new Map();

  // ID_INDEX
  const index = new Spreadsheet(estado, 'ID_INDEX_TESTE', o.dono);
  const abaIndex = index.insertSheet('Tabela_1');
  abaIndex.getRange(1, 1, 3, 5).setValues([
    ['Chave', 'Tipo', 'ID de Produção', 'Homologação', 'Descrição'],
    ['PERIODOS', 'spreadsheet', 'ID_PERIODOS_TESTE', '', ''],
    ['ESTRUTURA_CURRICULAR', 'spreadsheet', 'ID_ESTRUTURA_TESTE', '', '']
  ]);
  planilhas.set(index.id, index);
  // (1.7.0) PERMISSOES_DE_ACESSO: aba ESTRUTURA_CURRICULAR (A N. USP, B Nome, C e-mail, D Observação, E Perfil).
  // O dono das planilhas de teste entra como ADMINISTRADOR (a não ser com semPermissaoDoDono);
  // opcoes.permissoes = [[email, perfil], ...] acrescenta outras linhas.
  if (!o.semChavePermissoes) abaIndex.appendRow(['PERMISSOES_DE_ACESSO', 'spreadsheet', 'ID_PERMISSOES_TESTE', '', 'Define quem tem acesso aos apps']);
  const perm = new Spreadsheet(estado, 'ID_PERMISSOES_TESTE', o.dono, 'Permissões');
  const abaPerm = perm.insertSheet(o.abaPermissoes || 'ESTRUTURA_CURRICULAR');
  abaPerm.getRange(1, 1, 1, 5).setValues([['N. USP', 'Nome', 'e-mail', 'Observacao', 'Perfil']]);
  const linhasPerm = (o.semPermissaoDoDono || !o.dono ? [] : [[o.dono, 'ADMINISTRADOR']]).concat(o.permissoes || []);
  linhasPerm.forEach(([email, perfil], i) => abaPerm.appendRow([String(1000 + i), 'Pessoa fictícia ' + (i + 1), email, '', perfil]));
  perm.insertSheet('OUTRO_APP').getRange(1, 1, 2, 5).setValues([['N. USP', 'Nome', 'e-mail', 'Observacao', 'Perfil'], ['1', 'Outra pessoa', 'outro.app@unidade.example', '', 'ADMINISTRADOR']]);
  planilhas.set(perm.id, perm);
  // ESTRUTURA_CURRICULAR (nova, com a aba padrão vazia)
  const estrutura = new Spreadsheet(estado, 'ID_ESTRUTURA_TESTE', o.donoEstrutura === undefined ? o.dono : o.donoEstrutura);
  estrutura.insertSheet('Página1');
  planilhas.set(estrutura.id, estrutura);

  const props = Object.assign({ ID_INDEX_SPREADSHEET_ID: 'ID_INDEX_TESTE' }, o.propriedades || {});
  return montarContexto(o, estado, planilhas, props);
}

/**
 * (1.8.5) FOTOGRAFIA da persistência: cópia profunda de todas as planilhas
 * (abas, células, metadados) e das Propriedades, num estado novo e sem
 * falhas. Com criarAmbiente({ reusar: fotografia }), simula uma execução
 * ENCERRADA no instante da foto (nada do que veio depois — catch,
 * compensação, resposta — aconteceu) e a reabertura sobre o que ficou.
 */
function fotografarPersistencia(estado, planilhas, props) {
  const est = Object.assign({}, estado, { falhas: [], falhasLeitura: [], eventos: [], logs: [], erros: [], pastas: new Map(estado.pastas), acionadores: estado.acionadores.slice() });
  const copiaValor = (v) => (v && v.formula ? Object.assign({}, v) : (isDate(v) ? new Date(v.getTime()) : v));
  const mapa = new Map();
  for (const [id, ss] of planilhas) {
    const n = new Spreadsheet(est, ss.id, ss.dono, ss.nome);
    Object.keys(ss).forEach((k) => { if (!['estado', 'sheets', 'meta', 'ativa'].includes(k)) n[k] = ss[k]; });
    n.sheets = ss.sheets.map((s) => {
      const c = Object.create(Sheet.prototype);
      Object.keys(s).forEach((k) => { c[k] = s[k]; });
      c.ss = n;
      c.cells = new Map(Array.from(s.cells, ([k, v]) => [k, copiaValor(v)]));
      c.fmts = new Map(s.fmts); c.notes = new Map(s.notes); c.listas = new Map(s.listas); c.tipadas = new Set(s.tipadas);
      c.widths = Object.assign({}, s.widths); c.protections = s.protections.slice();
      return c;
    });
    n.meta = ss.meta.map((m) => new Metadado(n, m.k, m.v));
    if (ss.ativa) n.ativa = n.sheets.find((x) => x.id === ss.ativa.id) || null;
    mapa.set(id, n);
  }
  return { estado: est, planilhas: mapa, props: Object.assign({}, props) };
}

const LIMITE_VALOR_PROPRIEDADE = 9 * 1024;
const LIMITE_TOTAL_PROPRIEDADES = 500 * 1024;
function propriedadesDoScript(estado, props) {
  const bytes = (t) => Buffer.byteLength(String(t), 'utf8');
  const conferir = (novas) => {
    Object.keys(novas).forEach((k) => { if (bytes(novas[k]) > LIMITE_VALOR_PROPRIEDADE) throw new Error('Argumento grande demais: valor da propriedade ' + k); });
    const total = Object.keys(Object.assign({}, props, novas)).reduce((n, k) => n + bytes(k) + bytes(k in novas ? novas[k] : props[k]), 0);
    if (total > LIMITE_TOTAL_PROPRIEDADES) throw new Error('Cota do armazenamento de propriedades excedida');
  };
  return {
    getProperty: (k) => (k in props ? props[k] : null),   // (sem ponto de falha: lida a cada chamada, para a configuração)
    getProperties: () => { pontoDeFalha(estado, { tipo: 'lerPropriedade', chave: '*' }); return Object.assign({}, props); },
    getKeys: () => { pontoDeFalha(estado, { tipo: 'lerPropriedade', chave: '*' }); return Object.keys(props); },
    setProperty: (k, v) => {
      conferir({ [k]: String(v) });
      pontoDeFalha(estado, { tipo: 'propriedade', chave: k });
      props[k] = String(v);
      pontoDeFalha(estado, { tipo: 'propriedadeDepois', chave: k });
    },
    setProperties: (o) => {
      const novas = {}; Object.keys(o).forEach((k) => { novas[k] = String(o[k]); });
      conferir(novas);
      pontoDeFalha(estado, { tipo: 'propriedades', chaves: Object.keys(novas) });
      Object.assign(props, novas);
      pontoDeFalha(estado, { tipo: 'propriedadesDepois', chaves: Object.keys(novas) });
    },
    deleteProperty: (k) => {
      pontoDeFalha(estado, { tipo: 'propriedadeRemover', chave: k });
      delete props[k];
      pontoDeFalha(estado, { tipo: 'propriedadeRemoverDepois', chave: k });
    }
  };
}

function montarContexto(o, estado, planilhas, props) {
  const cache = new Map();
  estado.falhas = [];
  estado.falhasLeitura = [];
  // Relógio: o.agora (Date) congela "new Date()" e Date.now().
  const DataCtx = class extends Date {
    constructor(...a) { if (a.length) super(...a); else super(o.agora ? o.agora.getTime() : Date.now()); }
    static now() { return o.agora ? o.agora.getTime() : Date.now(); }
  };
  let seqUuid = 0;

  const ctx = {
    console: {
      log: (...a) => estado.logs.push(a.join(' ')),
      error: (...a) => estado.erros.push(a.join(' ')),
      warn: (...a) => estado.logs.push(a.join(' '))
    },
    SpreadsheetApp: {
      openById: (id) => { if (!planilhas.has(id)) throw new Error('Arquivo não encontrado'); return planilhas.get(id); },
      flush: () => { pontoDeFalha(estado, { tipo: 'flush' }); },
      create: (nome) => {
        pontoDeFalha(estado, { tipo: 'createSpreadsheet', nome });
        const novo = new Spreadsheet(estado, 'ID_NOVA_' + (++estado.proximaCopia), o.dono, nome);
        const s1 = new Sheet(novo, 'Página1'); novo.sheets.push(s1);
        planilhas.set(novo.id, novo);
        estado.raiz = (estado.raiz || []).concat([novo.id]);
        return novo;
      },
      ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' }
    },
    // DriveApp (1.5.0): só o que o envio da grade usa — cópia de uma planilha para uma pasta.
    DriveApp: {
      getFolderById: (id) => {
        // estado.semAutorizacaoDrive (1.5.1): projeto sem o escopo do Drive, como no Apps Script real antes de autorizar.
        if (estado.semAutorizacaoDrive) throw new Error('Exceção: Você não tem permissão para chamar DriveApp.getFolderById. Permissões necessárias: https://www.googleapis.com/auth/drive');
        if (!estado.pastas || !estado.pastas.has(id)) throw new Error('Exceção: Nenhum item com o código fornecido foi encontrado. Possivelmente porque você não tem permissão para acessá-lo.'); return { getId: () => id, getName: () => estado.pastas.get(id).nome }; },
      getFileById: (id) => {
        if (!planilhas.has(id)) throw new Error('Arquivo não encontrado');
        const orig = planilhas.get(id);
        return {
          getId: () => id, getName: () => orig.nome,
          moveTo: (pasta) => {
            pontoDeFalha(estado, { tipo: 'moveTo', planilha: id });
            const pid = pasta && pasta.getId ? pasta.getId() : null;
            if (!pid || !estado.pastas.has(pid)) throw new Error('Pasta não encontrada');
            estado.raiz = (estado.raiz || []).filter((x) => x !== id);
            estado.pastas.get(pid).arquivos.push(id);
          },
          makeCopy: (nome, pasta) => {
            pontoDeFalha(estado, { tipo: 'makeCopy', planilha: id });
            const novoId = 'ID_COPIA_' + (++estado.proximaCopia);
            const c = new Spreadsheet(estado, novoId, orig.dono, nome);
            orig.sheets.forEach((s) => { const n = s.copyTo(c); n.name = s.name; n.oculta = s.oculta; });
            planilhas.set(novoId, c);
            const pid = pasta && pasta.getId ? pasta.getId() : null;
            if (pid && estado.pastas.has(pid)) estado.pastas.get(pid).arquivos.push(novoId);
            return { getId: () => novoId, getName: () => c.nome, getUrl: () => c.getUrl() };
          }
        };
      }
    },
    // ScriptApp (1.6.0): acionadores instaláveis de edição de planilha.
    ScriptApp: {
      getProjectTriggers: () => estado.acionadores.slice(),
      deleteTrigger: (g) => { estado.acionadores = estado.acionadores.filter((x) => x !== g); },
      newTrigger: (handler) => ({
        forSpreadsheet: (alvo) => ({
          onEdit: () => ({
            create: () => {
              pontoDeFalha(estado, { tipo: 'newTrigger', handler });
              const fonte = typeof alvo === 'string' ? alvo : alvo.getId();
              const g = { getHandlerFunction: () => handler, getTriggerSourceId: () => fonte, getEventType: () => 'ON_EDIT', getUniqueId: () => 'G' + (estado.acionadores.length + 1) };
              estado.acionadores.push(g);
              return g;
            }
          }),
          // 1.8.0: acionador de abertura
          onOpen: () => ({
            create: () => {
              pontoDeFalha(estado, { tipo: 'newTrigger', handler });
              const fonte = typeof alvo === 'string' ? alvo : alvo.getId();
              const g = { getHandlerFunction: () => handler, getTriggerSourceId: () => fonte, getEventType: () => 'ON_OPEN', getUniqueId: () => 'G' + (estado.acionadores.length + 1) };
              estado.acionadores.push(g);
              return g;
            }
          })
        })
      })
    },
    // (1.8.7) Propriedades com pontos de falha (antes/depois de cada escrita e
    // na leitura de todas: getProperties/getKeys) e os limites do Google: 9 KB por valor e 500 KB
    // no total (chaves + valores).
    PropertiesService: { getScriptProperties: () => propriedadesDoScript(estado, props) },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => { cache.set(k, String(v)); }, remove: (k) => cache.delete(k),
      // (1.11.0) getAll/putAll, como no Apps Script (nome da pessoa na auditoria)
      getAll: (ks) => { const r = {}; ks.forEach((k) => { if (cache.has(k)) r[k] = cache.get(k); }); return r; },
      putAll: (m) => { Object.keys(m).forEach((k) => cache.set(k, String(m[k]))); } }) },
    // (1.8.11) hasLock por objeto (como Lock.hasLock: true depois de um tryLock bem-sucedido nesse
    // objeto, até o releaseLock). O modelo de PROPRIEDADE entre execuções (A/B, liberação antecipada,
    // ocupação) fica na suíte da etapa 7 (testar_etapa7_trava_auditoria.js), que troca o LockService.
    LockService: { getScriptLock: () => { let adquirida = false; return { tryLock: () => (adquirida = !o.travaOcupada), releaseLock: () => { adquirida = false; }, hasLock: () => adquirida }; } },
    Session: { getActiveUser: () => new User(o.usuario || ''), getEffectiveUser: () => new User(o.dono) },
    Utilities: {
      formatDate,
      getUuid: () => (o.uuids && o.uuids.length ? o.uuids.shift() : crypto.randomUUID ? crypto.randomUUID() : ('00000000-0000-4000-8000-' + String(++seqUuid).padStart(12, '0'))),
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, txt) => Array.from(crypto.createHash(alg).update(String(txt), 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b))
    },
    HtmlService: {
      createHtmlOutputFromFile: (nome) => ({ getContent: () => lerHtmlDoProjeto(o.dirSrc, nome) }),
      createTemplateFromFile: (nome) => ({ evaluate: () => avaliarModelo(ctx, lerHtmlDoProjeto(o.dirSrc, nome)) })
    },
    Date: DataCtx, JSON, Math, Object, Array, String, Number, RegExp, Error, isFinite, parseInt, parseFloat, isNaN
  };
  vm.createContext(ctx);
  fs.readdirSync(o.dirSrc).filter((f) => f.endsWith('.gs')).sort().forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(o.dirSrc, f), 'utf8'), ctx, { filename: f });
  });
  return {
    ctx, estado, planilhas, props, cache, opcoes: o,
    estrutura: () => planilhas.get('ID_ESTRUTURA_TESTE'),
    trocarUsuario: (u) => { o.usuario = u; },
    /** (1.7.0) Acrescenta (ou troca o perfil de) uma pessoa na aba de permissões e limpa o cache. */
    permitir: (email, perfil) => {
      const aba = planilhas.get('ID_PERMISSOES_TESTE').getSheetByName('ESTRUTURA_CURRICULAR');
      let achou = false;
      for (let r = 2; r <= aba.getLastRow(); r++) if (String(aba.get(r, 3)).toLowerCase() === String(email).toLowerCase()) { aba.set(r, 5, perfil); achou = true; }
      if (!achou) aba.appendRow(['', 'Pessoa fictícia', email, '', perfil]);
      cache.delete('permissoesEstrutura');
    },
    /** (1.7.0) Tira a pessoa da aba de permissões e limpa o cache. */
    retirarPermissao: (email) => {
      const aba = planilhas.get('ID_PERMISSOES_TESTE').getSheetByName('ESTRUTURA_CURRICULAR');
      for (let r = 2; r <= aba.getLastRow(); r++) if (String(aba.get(r, 3)).toLowerCase() === String(email).toLowerCase()) for (let c = 1; c <= 5; c++) aba.set(r, c, '');
      cache.delete('permissoesEstrutura');
    },
    permissoes: () => planilhas.get('ID_PERMISSOES_TESTE'),
    /** Registra uma falha: quando(evento) → true dispara; vezes = quantas vezes. */
    /**
     * (1.5.0) Planilha das secretarias (modelo com dados de exemplo e
     * colunas de práticas), planilha-índice das cópias e pasta de backup,
     * com as três chaves no ID_INDEX. opcoes: { nome, semAba, cabecalhoErrado, semChaves: [] }.
     */
    criarPlanilhaGrade: (op) => criarPlanilhaGrade(estado, planilhas, op || {}),
    /**
     * (1.11.0) Cadastros de pessoas (nome na auditoria), com as chaves no ID_INDEX:
     * SERVIDORES (A e-mail, B nome, C setor), PLANILHA_DOCENTES e PLANILHA_ALUNOS
     * (B nome, D e-mail; alunos: E e-mail secundário). Dados fictícios.
     * op: { servidores: [[email, nome, setor]], docentes: [[email, nome]], alunos: [[email, nome, email2]], semChaves: [] }
     */
    criarCadastrosPessoas: (op) => {
      op = op || {};
      const idx = planilhas.get('ID_INDEX_TESTE').getSheets()[0];
      const fontes = [
        ['SERVIDORES', 'ID_SERVIDORES_TESTE', ['E-MAIL', 'NOME', 'SETOR'], (op.servidores || []).map(([e, n, st]) => [e, n, st || ''])],
        ['PLANILHA_DOCENTES', 'ID_DOCENTES_TESTE', ['N. USP', 'Nome', 'Departamento', 'E-mail'], (op.docentes || []).map(([e, n], i) => [String(9000 + i), n, 'Depto Fictício', e])],
        ['PLANILHA_ALUNOS', 'ID_ALUNOS_TESTE', ['Número USP', 'Nome do Aluno', 'Ingresso', 'eMail', 'eMail Secundario'], (op.alunos || []).map(([e, n, e2], i) => [String(8000 + i), n, '2026/1', e, e2 || ''])]
      ];
      fontes.forEach(([chave, id, cab, linhas]) => {
        const ss = new Spreadsheet(estado, id, o.dono, 'Cadastro ' + chave);
        const aba = ss.insertSheet('Página1');
        aba.getRange(1, 1, 1, cab.length).setValues([cab]);
        linhas.forEach((l) => aba.appendRow(l));
        planilhas.set(id, ss);
        if (!(op.semChaves || []).includes(chave)) idx.appendRow([chave, 'spreadsheet', id, '', '']);
      });
    },
    grade: () => planilhas.get('ID_GRADE_TESTE'),
    indiceGrades: () => planilhas.get('ID_INDICE_GRADES_TESTE'),
    fotografia: () => fotografarPersistencia(estado, planilhas, props),
    injetarFalha: (quando, vezes) => { const f = { quando, vezes: vezes || 1 }; estado.falhas.push(f); return f; },
    injetarFalhaLeitura: (quando, vezes) => { const f = { quando, vezes: vezes || 1 }; (estado.falhasLeitura = estado.falhasLeitura || []).push(f); return f; },
    limparFalhas: () => { estado.falhas = []; estado.falhasLeitura = []; },
    congelarRelogio: (d) => { o.agora = d; }
  };
}

const ABAS_GRADE = ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades'];
const CABECALHO_GRADE = ['', 'Cadastro', 'Código', 'Nome', 'Tipo', 'Modalidade', 'Será oferecida', 'Docente(s) ministrante(s)', 'Semestre Ideal', 'Créditos Aula', 'Dia da semana', 'Horário de Início', 'Horário de Fim', 'Vagas\n(alunos do IP)', 'Vagas\n(livres USP - outras unidades)', 'Vagas\n(Intercambistas)', 'Vagas\n(60+)', 'Observações', 'Sala', '', 'Docente Ministrante', 'Turma', 'XXX0000 (ELETIVA)\nPrática fictícia\n(VAGAS)'];
function criarPlanilhaGrade(estado, planilhas, op) {
  const dono = 'dono@unidade.example';
  const g = new Spreadsheet(estado, 'ID_GRADE_TESTE', dono, op.nome === undefined ? 'Grade Horária - 1º Semestre de 2026' : op.nome);
  g.locale = op.locale || 'pt_BR';   // 1.6.3: a planilha real é pt_BR
  if (op.separadorReal) g.separadorReal = op.separadorReal;   // localidade declarada ≠ regra de leitura (teste do 2º separador)
  const abas = ['Informações'].concat(ABAS_GRADE.filter((a) => a !== op.semAba), ['Disciplinas', 'DataBase']);
  abas.forEach((nome) => {
    const s = new Sheet(g, nome); s.maxRows = 1006; s.maxCols = 27; g.sheets.push(s);
    if (!ABAS_GRADE.includes(nome)) { s.set(1, 1, 'Aba ' + nome + ' (não deve mudar)'); if (nome === 'Disciplinas') s.oculta = true; return; }
    s.set(2, 16, 'Cadastrar como Especial no jupiterweb');
    CABECALHO_GRADE.forEach((t, i) => { if (t) s.set(3, i + 1, t); });
    if (op.cabecalhoErrado && nome === 'PSC') s.set(3, 9, 'Semestre');
    // dados antigos (fictícios) de B a S nas linhas 4–30, e as colunas das práticas (U–W)
    for (let r = 4; r <= 30; r++) {
      s.set(r, 2, true); s.set(r, 3, 'ANT' + String(r).padStart(4, '0')); s.set(r, 4, 'Disciplina antiga ' + r); s.set(r, 5, 'Livre');
      s.set(r, 6, 'Teórica'); s.set(r, 7, 'SIM'); s.set(r, 8, 'Docente Fictício'); s.set(r, 9, 2); s.set(r, 10, 2); s.set(r, 11, 'Terça-Feira');
      s.set(r, 12, "'10:00"); s.set(r, 13, "'12:00"); s.set(r, 14, 30); s.set(r, 18, 'obs antiga'); s.set(r, 19, 'Bloco X - Sala 0');
      s.set(r, 21, 'Docente da prática ' + r); s.set(r, 22, "'0" + (r % 3 + 1)); s.set(r, 23, 5);
    }
    s.set(999, 19, 'última linha (apagar)'); s.set(1000, 3, 'linha 1000 (não apagar)');
    // lista suspensa de horários na coluna M (linhas 4–91), que recusa outros valores — como na planilha real
    if (!op.semListaEmM) for (let r = 4; r <= 91; r++) s.listas.set(r + ',13', 'horarios');
    // 1.6.2: as abas são Tabelas do Sheets, com colunas tipadas (B a S)
    if (!op.semTabela) for (let c = 2; c <= 19; c++) s.tipadas.add(c);
  });
  planilhas.set(g.id, g);
  const indice = new Spreadsheet(estado, 'ID_INDICE_GRADES_TESTE', dono, 'Índice das grades anteriores');
  const pi = indice.insertSheet('Página1');
  if (op.indiceSemAuditoria) pi.getRange(1, 1, 2, 2).setValues([['Semestre', 'ID'], ["'2025/2", 'ID_COPIA_ANTIGA']]);
  else pi.getRange(1, 1, 2, 3).setValues([['Semestre', 'ID', 'Auditoria_ID'], ["'2025/2", 'ID_COPIA_ANTIGA', '']]);
  planilhas.set(indice.id, indice);
  estado.pastas.set('ID_PASTA_BACKUP_TESTE', { nome: 'Grades anteriores', arquivos: [] });
  estado.pastas.set('ID_PASTA_AUDITORIA_TESTE', { nome: 'Auditorias', arquivos: [] });
  const idx = planilhas.get('ID_INDEX_TESTE').getSheets()[0];
  const chaves = [['GRADE_HORARIA_PREENCHIMENTO', 'spreadsheet', g.id], ['INDEX_GRADE_HORARIA_VERSOES_ANTERIORES', 'spreadsheet', indice.id], ['BACKUP_GRADES_ANTERIORES', 'folder', 'ID_PASTA_BACKUP_TESTE'], ['AUDITORIA_GRADES_ANTERIORES', 'folder', 'ID_PASTA_AUDITORIA_TESTE']]
    .filter((c) => !(op.semChaves || []).includes(c[0]));
  if (chaves.length) idx.getRange(idx.getLastRow() + 1, 1, chaves.length, 3).setValues(chaves);
  return g;
}

/** Avalia <?!= expr ?> e <?= expr ?> (suficiente para Painel.html). */
function avaliarModelo(ctx, html) {
  let saida = html;
  for (let i = 0; i < 5 && /<\?!?=/.test(saida); i++) {
    saida = saida.replace(/<\?(!?)=\s*([\s\S]*?)\s*\?>/g, (m, bruto, expr) => {
      const v = vm.runInContext(expr, ctx);
      return bruto ? String(v) : String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    });
  }
  const r = { conteudo: saida, titulo: '', metas: [] };
  r.getContent = () => r.conteudo;
  r.setTitle = (t) => { r.titulo = t; return r; };
  r.addMetaTag = (n, c) => { r.metas.push([n, c]); return r; };
  r.setXFrameOptionsMode = () => r;
  return r;
}

module.exports = { criarAmbiente, formatDate };

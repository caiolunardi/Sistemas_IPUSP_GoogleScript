// Monta o Painel de Solicitações como o HtmlService montaria, para os testes
// locais: resolve os include_ e os scriptlets de dados executando o próprio
// Codigo.gs num contexto isolado do Node (sem Apps Script, sem planilhas).
// Também entrega um google.script.run simulado com dados sintéticos.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src') + '/';

// Codigo.gs carregado com os serviços do Apps Script substituídos por
// simulações. "planilhas" é um mapa id -> { nomeAba: [[linha1], [linha2]...] }.
function carregarCodigo(opcoes = {}) {
  const planilhas = opcoes.planilhas || {};
  const propriedades = opcoes.propriedades || {};
  const logs = [];
  const cache = {};
  function aba(nome, linhas) {
    return {
      getName: () => nome,
      getLastRow: () => linhas.length,
      getLastColumn: () => linhas.reduce((m, l) => Math.max(m, l.length), 0),
      getRange: (r, c, nr, nc) => {
        nr = nr || 1; nc = nc || 1;
        const bloco = [];
        for (let i = 0; i < nr; i++) {
          const linha = linhas[r - 1 + i] || [];
          const saida = [];
          for (let j = 0; j < nc; j++) saida.push(linha[c - 1 + j] === undefined ? '' : linha[c - 1 + j]);
          bloco.push(saida);
        }
        return { getValues: () => bloco, getDisplayValues: () => bloco.map(l => l.map(v => String(v))) };
      }
    };
  }
  const contexto = {
    console,
    Logger: { log: m => logs.push(String(m)) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => propriedades[k] || null }) },
    SpreadsheetApp: {
      openById: id => {
        if (!planilhas[id]) throw new Error('Planilha simulada inexistente: ' + id);
        const abas = Object.keys(planilhas[id]).map(n => aba(n, planilhas[id][n]));
        return { getSheets: () => abas, getSheetByName: n => abas.find(a => a.getName() === n) || null };
      }
    },
    Utilities: {
      formatDate: (d, tz, fmt) => {
        const p = n => String(n).padStart(2, '0');
        return fmt.replace('yyyy', d.getFullYear()).replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate()))
          .replace('HH', p(d.getHours())).replace('mm', p(d.getMinutes()));
      }
    },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    HtmlService: {}
  };
  vm.createContext(contexto);
  const arquivos = fs.readdirSync(SRC).filter(n => n.endsWith('.gs'));
  for (const n of arquivos) vm.runInContext(fs.readFileSync(SRC + n, 'utf8'), contexto, { filename: n });
  contexto.__logs = logs;
  return contexto;
}

function montarHtml(codigo) {
  let h = fs.readFileSync(SRC + 'Painel.html', 'utf8');
  for (let k = 0; k < 4; k++) h = h.replace(/<\?!= include_\('(\w+)'\);? \?>/g, (_, n) => fs.readFileSync(SRC + n + '.html', 'utf8'));
  h = h.replace(/<\?!= (JSON\.stringify\(\w+\(\)\)) \?>/g, (_, expr) => vm.runInContext(expr, codigo));
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando: ' + h.match(/<\?[^>]*\?>/)[0]);
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' + h + '</body></html>';
}

// google.script.run simulado: cada função do objeto "api" responde depois
// de 30 ms, como uma chamada assíncrona de verdade.
function stubScript(api) {
  const corpo = Object.keys(api).map(n => JSON.stringify(n) + ':' + api[n].toString()).join(',');
  return `(function(){window.__chamadas=[];var API={${corpo}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(){var a=arguments;window.__chamadas.push(n);setTimeout(function(){try{s(API[n].apply(null,a))}catch(e){f(e)}},30)}});return o}
window.google={script:{get run(){return runner()}}};})();`;
}

module.exports = { carregarCodigo, montarHtml, stubScript, SRC };

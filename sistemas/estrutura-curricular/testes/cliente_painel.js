// (1.8.9) Apoio aos testes: carrega o SCRIPT REAL do painel (PainelApp.html)
// no Node, sem navegador, para chamar indexar / ofertasDe / oferecimentoDe
// exatamente como a interface faz. Única instrumentação: uma linha, antes
// do "return" final do módulo Painel, que expõe essas funções internas
// (o código delas não é alterado). DOM mínimo: só o que o carregamento do
// script toca (nada é desenhado).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function elementoFalso() {
  return new Proxy(function () {}, {
    get(alvo, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'style' || k === 'dataset' || k === 'classList') return elementoFalso();
      return elementoFalso();
    },
    set() { return true; },
    apply() { return elementoFalso(); }
  });
}

function carregarCliente(dirSrc) {
  const html = fs.readFileSync(path.join(dirSrc, 'PainelApp.html'), 'utf8');
  const m = /<script>([\s\S]*)<\/script>/.exec(html);
  if (!m) throw new Error('script do PainelApp.html não encontrado');
  let js = m[1];
  const marca = '  return {\n    carregar: carregar,';
  const i = js.lastIndexOf(marca);
  if (i < 0) throw new Error('ponto de exposição do PainelApp.html não encontrado');
  js = js.slice(0, i) + '  globalThis.__painelTeste = { indexar: indexar, ofertasDe: ofertasDe, oferecimentoDe: oferecimentoDe, oferecidaNoSemestre: oferecidaNoSemestre, estado: estado };\n' + js.slice(i);
  const documento = {
    addEventListener() {}, removeEventListener() {},
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return elementoFalso(); }, body: elementoFalso(), documentElement: elementoFalso()
  };
  const caixa = {
    console, document: documento, setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { userAgent: 'node' }, location: { reload() {} },
    google: { script: { run: {} } }, matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Intl, Date, JSON, Math, Object, Array, String, Number, RegExp, Promise, Error
  };
  caixa.window = caixa;
  caixa.addEventListener = function () {};
  caixa.globalThis = caixa;
  vm.createContext(caixa);
  vm.runInContext(js, caixa, { filename: 'PainelApp.html' });
  const T = caixa.__painelTeste;
  if (!T) throw new Error('funções do painel não expostas');
  return {
    /** Indexa a resposta de obterDadosPainel como o painel (estado.dados/estado.idx). */
    indexar(dados) {
      const copia = JSON.parse(JSON.stringify(dados));
      T.estado.dados = copia;
      T.estado.idx = T.indexar(copia);
      return T.estado.idx;
    },
    ofertasDe(codigo) { return T.ofertasDe(T.estado.idx.disciplinas[codigo]); },
    oferecimentoDe(codigo) { return T.oferecimentoDe(T.estado.idx.disciplinas[codigo]); },
    oferecidaNoSemestre(codigo, s) { return T.oferecidaNoSemestre(T.estado.idx.disciplinas[codigo], s); },
    disciplina(codigo) { return T.estado.idx.disciplinas[codigo]; }
  };
}

module.exports = { carregarCliente };

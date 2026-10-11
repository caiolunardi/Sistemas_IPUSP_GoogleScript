// Ambiente de teste no navegador: página real (Painel.html avaliado como o
// HtmlService faria), backend real rodando no simulador (mockGoogle.js) e
// bibliotecas do CDN servidas a partir de node_modules.
'use strict';
const fs = require('fs');
const path = require('path');
// Playwright: o do projeto (npm i -D playwright) ou o indicado em PLAYWRIGHT_MODULO.
const { chromium } = require(process.env.PLAYWRIGHT_MODULO || 'playwright');
const { criarAmbiente } = require('./mockGoogle');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const MODULOS = path.join(__dirname, 'node_modules');
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function tipoConteudo(arq) {
  if (arq.endsWith('.js')) return 'application/javascript';
  if (arq.endsWith('.wasm')) return 'application/wasm';
  if (arq.endsWith('.gz')) return 'application/gzip';
  if (arq.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

/** https://cdn.jsdelivr.net/npm/<pacote>@<versão>/<caminho> → node_modules/<pacote>/<caminho> */
function arquivoDoCdn(url) {
  const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/(.+)$/.exec(url.split('?')[0]);
  if (!m) return null;
  let resto = m[1];
  let pacote;
  if (resto.startsWith('@')) {
    const partes = resto.split('/');
    pacote = partes[0] + '/' + partes[1].replace(/@[^/]+$/, '');
    resto = partes.slice(2).join('/');
  } else {
    const partes = resto.split('/');
    pacote = partes[0].replace(/@[^/]+$/, '');
    resto = partes.slice(1).join('/');
  }
  return path.join(MODULOS, pacote, resto);
}

async function abrirNavegador() {
  return chromium.launch({ args: ['--no-sandbox'] });
}

/**
 * Cria contexto + página com o painel carregado.
 * opcoes: { amb, largura, altura, esquema: 'light'|'dark', latencia }
 */
async function abrirPainel(navegador, opcoes) {
  const amb = opcoes.amb;
  const contexto = await navegador.newContext({
    viewport: { width: opcoes.largura || 1280, height: opcoes.altura || 900 },
    colorScheme: opcoes.esquema || 'light',
    acceptDownloads: true,
    locale: 'pt-BR'
  });
  const pedidosCdn = [];
  await contexto.route('https://cdn.jsdelivr.net/**', async (rota) => {
    const url = rota.request().url();
    if (url.startsWith('https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@4.1.0/')) {
      pedidosCdn.push(url);
      if (opcoes.modeloIndisponivel || opcoes.jsdelivrGhFora) return rota.fulfill({ status: 404, body: '' });
      return rota.fulfill({ status: 200, body: fs.readFileSync(path.join(__dirname, 'modelos', 'por.traineddata')), headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' } });
    }
    const arq = arquivoDoCdn(url);
    pedidosCdn.push(url);
    if (!arq || !fs.existsSync(arq)) return rota.fulfill({ status: 404, body: 'não encontrado: ' + url });
    return rota.fulfill({ status: 200, body: fs.readFileSync(arq), headers: { 'content-type': tipoConteudo(arq), 'access-control-allow-origin': '*' } });
  });
  await contexto.route('https://datagrad.sistemas.ip.usp.br/**', (rota) => rota.fulfill({ status: 200, body: PNG_1PX, headers: { 'content-type': 'image/png' } }));
  // Modelo tessdata_fast 4.1.0 (cópia local idêntica, conferida por SHA-256 no próprio código).
  const MODELO = path.join(__dirname, 'modelos', 'por.traineddata');
  const servirModelo = (rota) => {
    pedidosCdn.push(rota.request().url());
    if (opcoes.modeloIndisponivel) return rota.fulfill({ status: 404, body: '' });
    return rota.fulfill({ status: 200, body: fs.readFileSync(MODELO), headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' } });
  };
  await contexto.route('https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/por.traineddata', servirModelo);

  const pagina = await contexto.newPage();
  const errosPagina = [];
  pagina.on('pageerror', (e) => errosPagina.push(String(e)));
  pagina.on('console', (m) => { if (m.type() === 'error') errosPagina.push('console: ' + m.text()); });

  const chamadas = [];
  await pagina.exposeFunction('__gasChamar', async (nome, argsJson) => {
    chamadas.push(nome);
    await new Promise((r) => setTimeout(r, opcoes.latencia == null ? 30 : opcoes.latencia));
    // (1.8.4) opcoes.portao(nome, args): devolve null (segue normal) ou uma
    // Promise que o TESTE resolve quando quiser — com null (executa e
    // responde), { resposta } (responde isso sem executar) ou { falhar }
    // (falha de rede). Serve para controlar a ORDEM das respostas.
    if (opcoes.portao) {
      const segura = opcoes.portao(nome, JSON.parse(argsJson));
      if (segura) {
        const decisao = await segura;
        if (decisao && decisao.resposta) return JSON.stringify({ valor: decisao.resposta });
        if (decisao && decisao.falhar) return JSON.stringify({ erroExecucao: decisao.falhar });
      }
    }
    const fn = amb.ctx[nome];
    if (typeof fn !== 'function' || /_$/.test(nome)) return JSON.stringify({ erroExecucao: 'Script function not found: ' + nome });
    try {
      const valor = fn.apply(null, JSON.parse(argsJson));
      const temData = JSON.stringify(valor, function (k, v) { return Object.prototype.toString.call(this[k]) === '[object Date]' ? '__DATA__' : v; }).includes('__DATA__');
      if (temData) return JSON.stringify({ erroExecucao: 'retorno com Date (google.script.run não serializa)' });
      return JSON.stringify({ valor });
    } catch (e) {
      return JSON.stringify({ erroExecucao: String(e && e.message) });
    }
  });
  await pagina.addInitScript(() => {
    function novoRunner(ok, falha) {
      return new Proxy({}, {
        get(_, nome) {
          if (nome === 'withSuccessHandler') return (f) => novoRunner(f, falha);
          if (nome === 'withFailureHandler') return (f) => novoRunner(ok, f);
          if (nome === 'withUserObject') return () => novoRunner(ok, falha);
          return (...args) => {
            window.__gasChamar(String(nome), JSON.stringify(args)).then((res) => {
              const r = JSON.parse(res);
              try {
                if (r.erroExecucao) { if (falha) falha(new Error(r.erroExecucao)); }
                else if (ok) ok(r.valor);
              } finally { window.__gasRespondidas = (window.__gasRespondidas || 0) + 1; }   // (1.8.4) respostas já entregues à página
            });
          };
        }
      });
    }
    window.google = { script: { run: novoRunner(null, null) } };
  });

  const saida = amb.ctx.doGet({});
  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + saida.titulo + '</title></head><body>' + saida.getContent() + '</body></html>';
  await contexto.route('https://painel.teste/**', (rota) => rota.fulfill({ status: 200, body: html, headers: { 'content-type': 'text/html; charset=utf-8' } }));
  await pagina.goto('https://painel.teste/');
  return { contexto, pagina, errosPagina, chamadas, pedidosCdn };
}

async function esperarCarregado(pagina) {
  await pagina.waitForFunction(() => document.getElementById('carregando').hidden === true, null, { timeout: 30000 });
}

module.exports = { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC };

#!/usr/bin/env node
// Testes de ferramentas/conferir_implantacao.js com pastas temporárias e
// arquivos fictícios. Uso: node ferramentas/testes/testar_conferir_implantacao.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { comparar, lerPasta, chaveDoArquivo, main } = require('../conferir_implantacao.js');

let ok = 0, falhas = 0;
const chk = (nome, cond) => { if (cond) ok++; else { falhas++; console.log('FALHA', nome); } };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'conferir-'));
const escrever = (pasta, arqs) => { for (const [n, t] of Object.entries(arqs)) fs.writeFileSync(path.join(pasta, n), t); return pasta; };

const repo = escrever(tmp(), { 'Code.gs': 'function doGet(){\n  return 1;\n}\n', 'Pagina.html': '<p>oi</p>\n',
  'appsscript.json': '{"timeZone":"America/Sao_Paulo"}\n', 'README.md': 'não vai ao Google\n' });

chk('.gs e .js são o mesmo arquivo', chaveDoArquivo('Code.gs') === chaveDoArquivo('Code.js'));
chk('.md não conta', chaveDoArquivo('README.md') === null);

let g = escrever(tmp(), { 'Code.js': 'function doGet(){\r\n  return 1;\r\n}', 'Pagina.html': '<p>oi</p>', 'appsscript.json': '{"timeZone":"America/Sao_Paulo"}' });
let r = comparar(lerPasta(g), lerPasta(repo));
chk('idêntico apesar de .js, CRLF e quebra final', r.iguais.length === 3 && !r.diferentes.length && !r.soNoGoogle.length && !r.soNoRepo.length);

g = escrever(tmp(), { 'Code.js': 'function doGet(){\n  return 2;\n}\n', 'Pagina.html': '<p>oi</p>\n', 'Extra.gs': 'x\n' });
r = comparar(lerPasta(g), lerPasta(repo));
chk('acusa arquivo diferente', r.diferentes.length === 1 && r.diferentes[0].linhas === 2);
chk('acusa arquivo só no Google', r.soNoGoogle.join() === 'Extra.gs');
chk('acusa manifesto só no repositório', r.soNoRepo.join() === 'appsscript.json');
chk('não expõe conteúdo no resultado', !JSON.stringify(r).includes('return 2'));

const log = console.log, erro = console.error; const saida = [];
console.log = console.error = m => saida.push(String(m));
const cod1 = main([g, repo]);
const cod2 = main([path.join(__dirname, '..'), repo]);
const cod3 = main([]);
console.log = log; console.error = erro;
chk('código 1 quando difere', cod1 === 1);
chk('recusa pasta do Google dentro do repositório', cod2 === 2);
chk('código 2 sem argumentos', cod3 === 2);
chk('saída sem conteúdo dos arquivos', !saida.join('\n').includes('return 2'));

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exitCode = falhas ? 1 : 0;

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


// --- Segunda rodada: casos que podiam dar falso "idêntico"
const { execFileSync } = require('child_process');
const silencio = f => { const l = console.log, e = console.error, out = []; console.log = console.error = m => out.push(String(m)); try { return [f(), out.join('\n')]; } finally { console.log = l; console.error = e; } };

// Subpastas: o clasp envia "sub/arquivo"; antes eram ignoradas dos dois lados.
const comSub = escrever(tmp(), { 'Code.gs': 'a\n' }); fs.mkdirSync(path.join(comSub, 'lib')); fs.writeFileSync(path.join(comSub, 'lib', 'Util.gs'), 'u\n');
const semSub = escrever(tmp(), { 'Code.gs': 'a\n' });
r = comparar(lerPasta(comSub), lerPasta(semSub));
chk('arquivo em subpasta só de um lado é acusado', r.soNoGoogle.join() === 'lib/Util.gs');

// Mesmo nome com .gs e .js na mesma pasta: viram um só no Apps Script.
const dup = escrever(tmp(), { 'Code.gs': 'a\n', 'Code.js': 'b\n' });
let erroDup = null; try { lerPasta(dup); } catch (e) { erroDup = e.message; }
chk('Code.gs e Code.js juntos: erro, não escolha silenciosa', /mesmo no Apps Script/.test(erroDup || ''));
const [codDup] = silencio(() => main([dup, repo]));
chk('… e a ferramenta sai com código 2', codDup === 2);

// Exclusões do .claspignore: testes/, node_modules/, ocultos; links não são seguidos.
const comLixo = escrever(tmp(), { 'Code.gs': 'a\n', '.oculto.gs': 'x\n' });
for (const d of ['testes', 'node_modules']) { fs.mkdirSync(path.join(comLixo, d)); fs.writeFileSync(path.join(comLixo, d, 'T.js'), 't\n'); }
fs.symlinkSync(path.join(repo, 'Pagina.html'), path.join(comLixo, 'Link.html'));
chk('ignora testes/, node_modules/, ocultos e links', [...lerPasta(comLixo).keys()].join() === 'script:Code');

// Manifesto só no Google: não pode sair "ok".
const gManif = escrever(tmp(), { 'Code.gs': 'a\n', 'appsscript.json': '{}\n' });
const [codManif, outManif] = silencio(() => main([gManif, semSub]));
chk('manifesto só no Google: código 1 e aviso de não versionado', codManif === 1 && outManif.includes('manifesto não versionado'));
r = comparar(lerPasta(gManif), lerPasta(semSub), { semManifestoNoRepo: true });
chk('busca no histórico marca o manifesto como não comparado', r.manifestoNaoComparado && r.iguais.length === 1);

// Pastas vazias ou inexistentes não viram "idêntico".
const [codVazia] = silencio(() => main([gManif, tmp()]));
chk('pasta do repositório sem código: código 2', codVazia === 2);
const [codInex] = silencio(() => main([gManif, path.join(tmp(), 'nao-existe')]));
chk('pasta do repositório inexistente: código 2', codInex === 2);

// "ok" sempre vem com o aviso de que não prova o /exec nem a configuração.
const gIgual = escrever(tmp(), { 'Code.gs': 'a\n' });
const [codIgual, outIgual] = silencio(() => main([gIgual, semSub]));
chk('idêntico: código 0 e aviso sobre /exec e configuração', codIgual === 0 && outIgual.includes('/exec') && outIgual.includes('Script Properties'));

// --commit com valor que parece opção do git: recusado, sem executar nada.
const [codOpc] = silencio(() => main([gIgual, 'sistemas/busca-alunos/src', '--commit', '--output=/tmp/x']));
chk('--commit que parece opção do git: código 2', codOpc === 2 && !fs.existsSync('/tmp/x'));
const [codOpc2] = silencio(() => main([gIgual, 'sistemas/busca-alunos/src', '--qualquer']));
chk('opção desconhecida: código 2', codOpc2 === 2);

// --commit e --procurar no histórico real do repositório (só leitura).
const RAIZ = path.join(__dirname, '..', '..');
const srcRel = 'sistemas/busca-alunos/src';
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
const copia = tmp();
for (const f of execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', srcRel + '/'], { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(Boolean)) {
  const dentro = f.slice(srcRel.length + 1); if (dentro.split('/').some(n => n.startsWith('.') || n === 'testes')) continue;
  fs.mkdirSync(path.join(copia, path.dirname(dentro)), { recursive: true });
  fs.writeFileSync(path.join(copia, dentro), execFileSync('git', ['show', `HEAD:${f}`], { cwd: RAIZ, encoding: 'utf8' }));
}
const [codC] = silencio(() => main([copia, srcRel, '--commit', head]));
chk('--commit HEAD com cópia exata: código 0', codC === 0);
const [codP, outP] = silencio(() => main([copia, srcRel, '--procurar']));
chk('--procurar acha um commit idêntico', codP === 0 && outP.startsWith('Código idêntico ao commit'));
fs.appendFileSync(path.join(copia, fs.readdirSync(copia).find(n => n.endsWith('.gs'))), '// mudança só no editor\n');
const [codP2, outP2] = silencio(() => main([copia, srcRel, '--procurar']));
chk('--procurar com mudança só no editor: nenhum commit', codP2 === 1 && outP2.includes('Nenhum dos'));
chk('saída do --procurar não mostra conteúdo', !outP2.includes('mudança só no editor'));

// A ferramenta só lê: nenhum módulo de rede e nenhum processo além do git.
const fonte = fs.readFileSync(path.join(__dirname, '..', 'conferir_implantacao.js'), 'utf8');
chk('sem http/https/net', !/require\(['"](https?|net|dgram|tls)['"]\)/.test(fonte));
chk('só executa git', (fonte.match(/execFileSync\(/g) || []).length === 1 && /execFileSync\('git'/.test(fonte) && !/(?<![.\w])(spawn|spawnSync|exec|execSync|fork)\(/.test(fonte));
chk('não chama clasp', !/['"]clasp['"]/.test(fonte));
chk('não escreve arquivos', !/fs\.(write|append|rm|unlink|mkdir|copy|rename)/.test(fonte));

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exitCode = falhas ? 1 : 0;

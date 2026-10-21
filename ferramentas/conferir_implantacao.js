#!/usr/bin/env node
// Compara o código que está no Apps Script (uma pasta trazida com `clasp pull`,
// FORA do repositório) com uma pasta src/ do repositório, sem mostrar conteúdo:
// só nomes de arquivo, impressões digitais (SHA-256) e quantas linhas diferem.
// Não envia nada ao Google e não muda nenhum arquivo.
//
// Uso:
//   node ferramentas/conferir_implantacao.js <pasta-do-clasp-pull> <sistemas/.../src>
//   node ferramentas/conferir_implantacao.js <pasta-do-clasp-pull> <sistemas/.../src> --commit <sha>
//   node ferramentas/conferir_implantacao.js <pasta-do-clasp-pull> <sistemas/.../src> --procurar
//
// --commit   compara com a pasta como estava naquele commit (em vez da cópia de trabalho)
// --procurar percorre o histórico da pasta e diz qual commit é idêntico ao que está no Google
// Código de saída: 0 idêntico; 1 há diferença; 2 erro de uso.
// Documentação: docs/IMPLANTACAO.md
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');

// Os mesmos tipos que o .claspignore padrão deixa ir ao Google.
function chaveDoArquivo(nome) {
  if (nome === 'appsscript.json') return 'manifesto:appsscript';
  if (nome.endsWith('/appsscript.json')) return null;   // só o da raiz é o manifesto
  const m = /^(.*)\.(gs|js|html)$/.exec(nome);
  if (!m) return null;
  return (m[2] === 'html' ? 'html:' : 'script:') + m[1];   // .gs e .js são o mesmo arquivo no Apps Script
}

// O Apps Script guarda o texto sem diferença de fim de linha nem de quebra final.
function normalizar(texto) {
  return texto.replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n';
}
const impressao = t => crypto.createHash('sha256').update(t).digest('hex');

// Mesmas exclusões do .claspignore padrão: arquivos e pastas ocultos,
// node_modules e testes. Subpastas contam (o clasp envia "sub/arquivo").
const excluido = nome => nome.startsWith('.') || nome === 'node_modules' || nome === 'testes';

function guardar(mapa, rel, texto) {
  const chave = chaveDoArquivo(rel);
  if (!chave) return;
  if (mapa.has(chave)) throw new Error(`Dois arquivos viram o mesmo no Apps Script: ${mapa.get(chave).nome} e ${rel}`);
  mapa.set(chave, { nome: rel, texto: normalizar(texto) });
}

function lerPasta(pasta, mapa = new Map(), prefixo = '') {
  for (const nome of fs.readdirSync(pasta).sort()) {
    if (excluido(nome)) continue;
    const completo = path.join(pasta, nome);
    const info = fs.lstatSync(completo);
    if (info.isSymbolicLink()) continue;   // não segue links para fora da pasta
    if (info.isDirectory()) lerPasta(completo, mapa, prefixo + nome + '/');
    else if (info.isFile()) guardar(mapa, prefixo + nome, fs.readFileSync(completo, 'utf8'));
  }
  return mapa;
}

function git(args) {
  return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function resolverCommit(commit) {
  try { return git(['rev-parse', '--verify', '--quiet', '--end-of-options', `${commit}^{commit}`]).trim(); }
  catch (e) { throw new Error(`Commit não encontrado: ${commit}`); }
}

function relativoAoRepo(pastaRepo) {
  const rel = path.relative(RAIZ, path.resolve(pastaRepo)).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) throw new Error('A pasta do repositório precisa ser uma pasta src/ dentro do clone.');
  return rel;
}

function lerCommit(commit, pastaRepo) {
  const rel = relativoAoRepo(pastaRepo);
  const mapa = new Map();
  const lista = git(['ls-tree', '-r', '--name-only', commit, '--', rel + '/']).split('\n').filter(Boolean);
  for (const caminho of lista) {
    const dentro = caminho.slice(rel.length + 1);
    if (dentro.split('/').some(excluido)) continue;
    guardar(mapa, dentro, git(['show', `${commit}:${caminho}`]));
  }
  return mapa;
}

function linhasDiferentes(a, b) {
  const la = a.split('\n'), lb = b.split('\n');
  const contar = l => l.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = contar(la), cb = contar(lb);
  let so = 0;
  for (const [l, n] of ca) so += Math.max(0, n - (cb.get(l) || 0));
  for (const [l, n] of cb) so += Math.max(0, n - (ca.get(l) || 0));
  return so;
}

// semManifestoNoRepo: quando o repositório não versiona o appsscript.json,
// compara só o código e marca que o manifesto não foi comparado.
function comparar(google, repo, { semManifestoNoRepo = false } = {}) {
  const r = { iguais: [], diferentes: [], soNoGoogle: [], soNoRepo: [], manifestoNaoComparado: false };
  const M = 'manifesto:appsscript';
  if (semManifestoNoRepo && !repo.has(M) && google.has(M)) r.manifestoNaoComparado = true;
  for (const [chave, g] of google) {
    if (chave === M && r.manifestoNaoComparado) continue;
    const p = repo.get(chave);
    if (!p) r.soNoGoogle.push(g.nome);
    else if (g.texto === p.texto) r.iguais.push(g.nome);
    else r.diferentes.push({ google: g.nome, repo: p.nome, linhas: linhasDiferentes(g.texto, p.texto),
      hg: impressao(g.texto).slice(0, 12), hr: impressao(p.texto).slice(0, 12) });
  }
  for (const [chave, p] of repo) if (!google.has(chave)) r.soNoRepo.push(p.nome);
  return r;
}

const codigoIgual = r => !r.diferentes.length && !r.soNoGoogle.length && !r.soNoRepo.length;
const idêntico = r => codigoIgual(r) && !r.manifestoNaoComparado;

const AVISO = 'Isto compara arquivos do EDITOR do Apps Script. Não prova o que o /exec executa (ele usa uma versão numerada) nem a configuração do projeto (Script Properties, gatilhos, implantação, permissões). Ver docs/IMPLANTACAO.md, seção 4.';

function main(argv) {
  try { return executar(argv); }
  catch (e) { console.error(`Erro: ${e.message}`); return 2; }
}

function executar(argv) {
  const [pastaGoogle, pastaRepo, ...resto] = argv;
  if (!pastaGoogle || !pastaRepo) {
    console.error('Uso: node ferramentas/conferir_implantacao.js <pasta-do-clasp-pull> <sistemas/.../src> [--commit <sha> | --procurar]');
    return 2;
  }
  const dentroDoRepo = !path.relative(RAIZ, path.resolve(pastaGoogle)).startsWith('..');
  if (dentroDoRepo) {
    console.error('A pasta do clasp pull precisa ficar FORA do repositório (o código do Google pode ter IDs reais).');
    return 2;
  }
  const google = lerPasta(pastaGoogle);
  if (!google.size) { console.error('Nenhum .gs, .js, .html ou appsscript.json na pasta do clasp pull.'); return 2; }

  if (resto[0] === '--procurar') {
    const rel = relativoAoRepo(pastaRepo);
    const commits = git(['log', '--format=%H %h %ad %s', '--date=short', '-n', '300', '--', rel]).split('\n').filter(Boolean);
    for (const linha of commits) {
      const [sha, curto, data, ...assunto] = linha.split(' ');
      const r = comparar(google, lerCommit(sha, pastaRepo), { semManifestoNoRepo: true });
      if (codigoIgual(r)) {
        console.log(`Código idêntico ao commit ${curto} (${data}) ${assunto.join(' ')}`);
        console.log('(o mais recente com exatamente este código; commits anteriores que não mudaram a pasta também são idênticos)');
        if (r.manifestoNaoComparado) console.log('O appsscript.json do Google NÃO foi comparado: o repositório não o versiona nesse commit.');
        console.log(AVISO);
        return r.manifestoNaoComparado ? 1 : 0;
      }
    }
    console.log(`Nenhum dos ${commits.length} commits da pasta ${rel} tem exatamente o código do Google.`);
    console.log('Se a pasta mudou de lugar no histórico, os commits de antes da mudança não entram na busca.');
    console.log('Rode sem --procurar para ver os arquivos que diferem da versão atual.');
    return 1;
  }

  if (resto[0] === '--commit' && !resto[1]) { console.error('Informe o commit depois de --commit.'); return 2; }
  if (resto.length && resto[0] !== '--commit') { console.error(`Opção desconhecida: ${resto[0]}`); return 2; }
  const commit = resto[0] === '--commit' ? resolverCommit(resto[1]) : null;
  if (!commit && !fs.existsSync(pastaRepo)) { console.error(`Pasta não encontrada: ${pastaRepo}`); return 2; }
  const repo = commit ? lerCommit(commit, pastaRepo) : lerPasta(pastaRepo);
  if (!repo.size) { console.error(`Nenhum arquivo de código em ${pastaRepo}${commit ? ' nesse commit' : ''}.`); return 2; }
  const r = comparar(google, repo);
  const alvo = commit ? `${pastaRepo} no commit ${commit.slice(0, 7)}` : pastaRepo;

  console.log(`Editor do Apps Script × ${alvo}`);
  console.log(`  idênticos: ${r.iguais.length}`);
  for (const d of r.diferentes) console.log(`  DIFERENTE  ${d.google} × ${d.repo}: ${d.linhas} linha(s) (google ${d.hg}…, repo ${d.hr}…)`);
  for (const n of r.soNoGoogle) console.log(`  SÓ NO GOOGLE  ${n}${n === 'appsscript.json' ? ' (manifesto não versionado)' : ''}`);
  for (const n of r.soNoRepo) console.log(`  SÓ NO REPOSITÓRIO  ${n}`);
  if (idêntico(r)) { console.log('ok: os arquivos do editor são idênticos aos do repositório.'); console.log(AVISO); return 0; }
  console.log('Há diferença. Veja o conteúdo só no seu computador (diff entre as pastas); não cole o código do Google em issue, PR ou conversa.');
  return 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main, comparar, lerPasta, normalizar, chaveDoArquivo };

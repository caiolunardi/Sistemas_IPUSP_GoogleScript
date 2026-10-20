#!/usr/bin/env node
// Testes de ferramentas/release/publicar_release.sh com repositórios git
// temporários (origem "bare" + clone) e um GitHub CLI falso (gh_falso.sh) que
// devolve respostas no formato da API real. Nada sai da máquina: nenhuma tag
// nem Release é criada no GitHub. Uso: node ferramentas/testes/testar_publicar_release.js
//
// As respostas de "commits/{sha}/pulls" seguem o que a API devolveu para
// este repositório em 20/10/2026 (docs/VERSOES.md, seção 6): o commit de merge
// e também os commits do ramo do PR trazem o PR, com merge_commit_sha = commit
// de merge; num squash, merge_commit_sha = o commit único; commit sem PR: [].
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'release', 'publicar_release.sh');
const GH = path.join(__dirname, 'gh_falso.sh');
const REPO = 'dono/repo';
let ok = 0, falhas = 0;
const chk = (nome, cond, extra) => { if (cond) ok++; else { falhas++; console.log('FALHA', nome, extra ? '\n' + extra : ''); } };

const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
const origem = path.join(raiz, 'origem.git'), clone = path.join(raiz, 'clone'), falso = path.join(raiz, 'falso');
// Identidade fixa: o runner da CI não tem user.name/user.email globais.
const IDENT = { GIT_AUTHOR_NAME: 'Teste', GIT_AUTHOR_EMAIL: 'teste@example.invalid', GIT_COMMITTER_NAME: 'Teste', GIT_COMMITTER_EMAIL: 'teste@example.invalid',
  GIT_AUTHOR_DATE: '2026-10-20T12:00:00', GIT_COMMITTER_DATE: '2026-10-20T12:00:00' };
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...IDENT } }).trim();
git(raiz, 'init', '-q', '--bare', '-b', 'main', origem);
git(raiz, 'init', '-q', '-b', 'main', clone); git(clone, 'remote', 'add', 'origin', origem);

const escrever = (rel, txt) => { const f = path.join(clone, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };
const commit = (msg) => { git(clone, 'add', '-A'); git(clone, 'commit', '-q', '--allow-empty', '-m', msg); return git(clone, 'rev-parse', 'HEAD'); };

// Histórico fictício do main.
escrever('sistemas/alfa/src/Codigo.gs', 'function v(){return 1}\n');
escrever('sistemas/alfa/gerenciador/src/Codigo.gs', 'function g(){}\n');
escrever('notas-de-versao/alfa-v1.0.md', 'Alfa 1.0\n');
const B0 = commit('base, enviada direto');
const C = {};
// PR por merge commit (o método da política): dois commits no ramo e o merge.
const mergePR = (nome, notas) => {
  git(clone, 'checkout', '-q', '-b', nome);
  escrever(`sistemas/alfa/src/${nome}.gs`, `// ${nome}\n`);
  const a = commit(`${nome}: primeiro`);
  for (const n of notas) escrever(`notas-de-versao/${n}.md`, `Notas de ${n}\n`);
  const b = commit(`${nome}: segundo`);
  git(clone, 'checkout', '-q', 'main');
  git(clone, 'merge', '-q', '--no-ff', '-m', `Merge do ${nome}`, nome);
  return { a, b, m: git(clone, 'rev-parse', 'HEAD') };
};
C.pr1 = mergePR('pr1', ['alfa-v1.1', 'alfa-v1.2', 'alfa-v1.3', 'alfa-v1.4', 'alfa-v1.5', 'alfa-gerenciador-v1.0', 'beta-v1.0']);
// Squash: um commit só no main.
escrever('sistemas/alfa/src/squash.gs', '// squash\n'); C.s2 = commit('PR 2 (squash)');
// Rebase: dois commits no main; o PR aponta o último.
escrever('sistemas/alfa/src/r1.gs', '1\n'); C.r3a = commit('PR 3 (rebase) 1/2');
escrever('sistemas/alfa/src/r2.gs', '2\n'); C.r3b = commit('PR 3 (rebase) 2/2');
escrever('sistemas/alfa/src/direto.gs', 'x\n'); C.d4 = commit('push direto no main');
for (const n of [6, 7, 8, 9, 10, 11, 12]) C['m' + n] = mergePR('pr' + n, []).m;
git(clone, '-c', 'push.negotiate=false', 'push', '-q', 'origin', 'main');
// Ramo de PR aberto, fora do main.
git(clone, 'checkout', '-q', '-b', 'pr5'); escrever('x.gs', 'x\n'); C.o5 = commit('PR 5 aberto'); git(clone, 'checkout', '-q', 'main');

// Respostas da API.
fs.mkdirSync(path.join(falso, 'api'), { recursive: true });
const chave = c => c.replace(/[/?&=]/g, '_');
const api = (caminho, obj) => fs.writeFileSync(path.join(falso, 'api', chave(caminho) + '.json'), JSON.stringify(obj));
const pr = (number, mcs, head, extra = {}) => ({ number, state: 'closed', merged_at: '2026-10-20T15:14:25Z', merge_commit_sha: mcs, base: { ref: 'main' }, head: { sha: head }, ...extra });
const pulls = (sha, lista) => api(`repos/${REPO}/commits/${sha}/pulls`, lista);
const run = (sha, id, extra = {}) => ({ id, head_sha: sha, event: 'push', head_branch: 'main', path: '.github/workflows/ci.yml', status: 'completed', conclusion: 'success', run_attempt: 1, ...extra });
const runs = (sha, lista) => api(`repos/${REPO}/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&branch=main&per_page=100`, { total_count: lista.length, workflow_runs: lista });
const ETAPAS_OK = ['Dados sensíveis', 'Cópias de shared/', 'Servidor — x', 'Tela — y', 'Estrutura Curricular (suítes sintéticas)', 'CI concluída'];
const jobs = (id, nomes = ETAPAS_OK, conclusao = 'success') => api(`repos/${REPO}/actions/runs/${id}/jobs?per_page=100`, { total_count: nomes.length, jobs: nomes.map(name => ({ name, status: 'completed', conclusion: name === 'CI concluída' ? conclusao : 'success' })) });
const verde = (sha, id) => { runs(sha, [run(sha, id)]); jobs(id); };

const PR1 = pr(1, C.pr1.m, C.pr1.b);
pulls(C.pr1.m, [PR1]); pulls(C.pr1.a, [PR1]); pulls(C.pr1.b, [PR1]);
verde(C.pr1.m, 101);
verde(C.pr1.b, 102);   // mesmo com CI verde, a ponta do ramo não é estado do main
pulls(C.s2, [pr(2, C.s2, 'f'.repeat(40))]); verde(C.s2, 103);
const PR3 = pr(3, C.r3b, 'e'.repeat(40)); pulls(C.r3a, [PR3]); pulls(C.r3b, [PR3]); verde(C.r3a, 104); verde(C.r3b, 105);
pulls(C.d4, []); verde(C.d4, 106);
pulls(C.o5, [pr(5, 'a'.repeat(40), C.o5, { state: 'open', merged_at: null })]); verde(C.o5, 107);
pulls(C.m6, [pr(6, C.m6, 'b'.repeat(40), { base: { ref: 'outro' } })]); verde(C.m6, 108);
for (const n of [7, 8, 9, 10, 11, 12]) pulls(C['m' + n], [pr(n, C['m' + n], 'c'.repeat(40))]);
runs(C.m7, [run(C.m7, 201, { event: 'pull_request', head_branch: 'pr7' })]); jobs(201);
runs(C.m8, [run(C.m8, 202, { status: 'in_progress', conclusion: null })]); jobs(202);
runs(C.m9, [run(C.m9, 203)]); jobs(203, ETAPAS_OK.slice(0, -1));                       // CI de antes da etapa agregada
// API que ignorasse os filtros: devolve rodada verde de outro commit e a deste vermelha.
runs(C.m10, [run(C.pr1.m, 101), run(C.m10, 204, { conclusion: 'failure' })]); jobs(204);
runs(C.m11, [run(C.m11, 205, { conclusion: 'failure', run_attempt: 2 })]); jobs(205);  // reexecução que falhou
runs(C.m12, [run(C.m12, 206, { path: '.github/workflows/outro.yml' })]); jobs(206);

// Fase 0 (trava): a rodada 900 do workflow Release está em andamento no main
// e tem aprovação humana no environment "release". Formato da resposta de
// actions/runs/{id}/approvals conforme a documentação da API (uma lista de
// revisões, com environments, state e user); num repositório sem environment
// configurado, a API real devolveu [] (docs/VERSOES.md, seção 6).
const RODADA = 900;
const rodadaRelease = (id, extra = {}) => api(`repos/${REPO}/actions/runs/${id}`, { id, path: '.github/workflows/release.yml', head_branch: 'main', event: 'workflow_dispatch', status: 'in_progress', ...extra });
const aprovacao = (extra = {}) => ({ state: 'approved', comment: '', environments: [{ id: 1, name: 'release' }], user: { login: 'responsavel', type: 'User' }, ...extra });
const aprovacoes = (id, lista) => api(`repos/${REPO}/actions/runs/${id}/approvals`, lista);
rodadaRelease(RODADA); aprovacoes(RODADA, [aprovacao()]);

function rodar(commitPedido, tags, ambiente = {}) {
  fs.rmSync(path.join(falso, 'chamadas.log'), { force: true });
  const env = { ...process.env, REPO, TAGS: tags, COMMIT_PEDIDO: commitPedido, GH, GH_FALSO: falso, GH_ORIGEM: origem, GH_REPO: REPO, RUNNER_TEMP: raiz,
    GITHUB_RUN_ID: String(RODADA), ...ambiente };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const r = spawnSync('bash', [SCRIPT], { cwd: clone, encoding: 'utf8', env });
  const chamadas = fs.existsSync(path.join(falso, 'chamadas.log')) ? fs.readFileSync(path.join(falso, 'chamadas.log'), 'utf8') : '';
  return { cod: r.status, saida: r.stdout + r.stderr, criou: (chamadas.match(/^release create/mg) || []).length };
}
const tagEm = t => { try { return git(origem, 'rev-parse', `refs/tags/${t}^{commit}`); } catch { return null; } };
const recusa = (nome, r, trecho) => chk(nome, r.cod !== 0 && r.criou === 0 && r.saida.includes(trecho), r.saida);
const releasesCriadas = () => fs.readdirSync(falso).filter(f => f.startsWith('notas_')).length;
const tagsNaOrigem = () => git(origem, 'tag', '--list');

// --- 0. Trava: sem aprovação humana desta rodada no environment "release", nada é conferido nem escrito.
{
  const antes = { tags: tagsNaOrigem(), rel: releasesCriadas() };
  // Toda recusa da trava: código de saída ≠ 0, nenhuma Release criada, nenhuma
  // chamada além das leituras da trava (nem a conferência do commit começa),
  // nenhuma tag nova na origem e o motivo na saída.
  const trava = (nome, r, trecho) => {
    const chamadas = fs.existsSync(path.join(falso, 'chamadas.log')) ? fs.readFileSync(path.join(falso, 'chamadas.log'), 'utf8') : '';
    const soLeituras = chamadas.split('\n').filter(Boolean).every(l => /^api repos\/dono\/repo\/actions\/runs\/\d+(\/approvals)?$/.test(l));
    chk(nome, r.cod !== 0 && r.criou === 0 && soLeituras && r.saida.includes(trecho) && !r.saida.includes('Commit ') &&
      tagsNaOrigem() === antes.tags && releasesCriadas() === antes.rel, r.saida + '\n' + chamadas);
  };
  trava('trava: sem GITHUB_RUN_ID (fora do workflow, p. ex. num terminal)', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: undefined }), 'Sem GITHUB_RUN_ID');
  trava('trava: GITHUB_RUN_ID inválido', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '900; x' }), 'Sem GITHUB_RUN_ID');
  rodadaRelease(901); aprovacoes(901, []);
  trava('trava: environment ausente, vazio ou sem revisor (nenhuma aprovação registrada)', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '901' }), 'não tem aprovação humana');
  trava('trava: marcador por variável (RELEASE_GOVERNANCE_READY=true) sem aprovação não basta',
    rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '901', RELEASE_GOVERNANCE_READY: 'true', RELEASE_ENVIRONMENT_READY: 'true' }), 'não tem aprovação humana');
  rodadaRelease(902); aprovacoes(902, [aprovacao({ state: 'rejected' })]);
  trava('trava: revisão rejeitada (valor errado)', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '902' }), 'não tem aprovação humana');
  rodadaRelease(903); aprovacoes(903, [aprovacao({ environments: [{ id: 2, name: 'producao' }] })]);
  trava('trava: aprovação de outro environment (configuração incompleta)', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '903' }), 'não tem aprovação humana');
  rodadaRelease(904); aprovacoes(904, [aprovacao({ user: { login: 'algum-app[bot]', type: 'Bot' } })]);
  trava('trava: aprovação feita por bot', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '904' }), 'não tem aprovação humana');
  rodadaRelease(905); aprovacoes(905, [{ state: 'approved' }]);
  trava('trava: resposta incompleta da API (sem environments nem user)', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '905' }), 'não tem aprovação humana');
  rodadaRelease(906); fs.writeFileSync(path.join(falso, 'api', chave(`repos/${REPO}/actions/runs/906/approvals`) + '.erro'), '');
  trava('trava: erro ao ler as aprovações', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '906' }), 'Não consegui consultar as aprovações');
  rodadaRelease(907);
  trava('trava: aprovações inacessíveis (404, p. ex. sem permissão actions: read)', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '907' }), 'Não consegui consultar as aprovações');
  trava('trava: rodada inexistente', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '999' }), 'Não consegui consultar a rodada');
  rodadaRelease(908, { status: 'completed' }); aprovacoes(908, [aprovacao()]);
  trava('trava: rodada antiga já concluída, reaproveitada fora dela', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '908' }), 'não é uma rodada em andamento');
  rodadaRelease(909, { path: '.github/workflows/ci.yml', event: 'push' }); aprovacoes(909, [aprovacao()]);
  trava('trava: rodada aprovada de outro workflow', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '909' }), 'não é uma rodada em andamento');
  rodadaRelease(910, { head_branch: 'claude/x' }); aprovacoes(910, [aprovacao()]);
  trava('trava: rodada do Release disparada de outro ramo', rodar(C.pr1.m, 'alfa-v1.1', { GITHUB_RUN_ID: '910' }), 'não é uma rodada em andamento');
  // Trava liberada não basta: a conferência do commit continua valendo (mais casos em 2.1 e 2.2).
  recusa('aprovação válida, CI vermelha', rodar(C.m11, 'alfa-v1.3'), 'Não há rodada concluída e verde');
  recusa('aprovação válida, commit não aprovado (push direto, sem PR)', rodar(C.d4, 'alfa-v1.3'), 'não é o commit de merge');
  chk('… e nada foi escrito', tagsNaOrigem() === antes.tags && releasesCriadas() === antes.rel);
}

// --- 2.1 Origem do commit
let r = rodar(C.pr1.m, 'alfa-v1.1');
chk('merge commit de PR aceito: cria a Release', r.cod === 0 && r.criou === 1 && tagEm('alfa-v1.1') === C.pr1.m, r.saida);
chk('notas trazem commit, PR, rodada da CI e quem aprovou', fs.readFileSync(path.join(falso, 'notas_alfa-v1.1'), 'utf8').includes(`\`${C.pr1.m}\` · merge do PR #1 · CI verde na rodada 101 · publicação aprovada por responsavel na rodada 900`));
chk('saída diz quem aprovou a rodada', r.saida.includes('Rodada 900 aprovada no environment release por responsavel'), r.saida);
recusa('ponta do ramo do PR (2º pai do merge, CI verde, PR associado)', rodar(C.pr1.b, 'alfa-v1.2'), 'não é um estado do main');
recusa('commit intermediário do ramo do PR', rodar(C.pr1.a, 'alfa-v1.2'), 'não é um estado do main');
r = rodar(C.s2, 'alfa-v1.2');
chk('squash: o commit único é aceito', r.cod === 0 && tagEm('alfa-v1.2') === C.s2, r.saida);
recusa('rebase: commit intermediário recusado', rodar(C.r3a, 'alfa-v1.3'), 'não é o commit de merge');
recusa('push direto no main, sem PR', rodar(C.d4, 'alfa-v1.3'), 'não é o commit de merge');
recusa('commit de PR aberto, fora do main', rodar(C.o5, 'alfa-v1.3'), 'não é um estado do main');
recusa('PR aceito em outro ramo base', rodar(C.m6, 'alfa-v1.3'), 'não é o commit de merge');
recusa('SHA curto', rodar(C.pr1.m.slice(0, 7), 'alfa-v1.3'), 'SHA completo');
recusa('SHA inexistente', rodar('0'.repeat(40), 'alfa-v1.3'), 'não encontrado');

// --- 2.2 CI do SHA exato
recusa('CI só de pull_request', rodar(C.m7, 'alfa-v1.3'), 'Não há rodada concluída e verde');
recusa('CI ainda rodando', rodar(C.m8, 'alfa-v1.3'), 'Não há rodada concluída e verde');
recusa('CI sem a etapa "CI concluída"', rodar(C.m9, 'alfa-v1.3'), 'CI concluída');
recusa('API ignorando filtros (rodada verde de outro commit)', rodar(C.m10, 'alfa-v1.3'), 'Não há rodada concluída e verde');
recusa('reexecução que terminou vermelha', rodar(C.m11, 'alfa-v1.3'), 'Não há rodada concluída e verde');
recusa('rodada verde de outro workflow', rodar(C.m12, 'alfa-v1.3'), 'Não há rodada concluída e verde');
fs.writeFileSync(path.join(falso, 'api', chave(`repos/${REPO}/commits/${C.r3b}/pulls`) + '.erro'), '');
recusa('erro da API ao consultar PRs', rodar(C.r3b, 'alfa-v1.3'), 'Não consegui consultar os pull requests');
fs.rmSync(path.join(falso, 'api', chave(`repos/${REPO}/commits/${C.r3b}/pulls`) + '.erro'));

// --- 2.3 Tags
r = rodar(C.pr1.m, 'alfa-v1.1');
chk('rodar de novo: nada muda', r.cod === 0 && r.criou === 0 && r.saida.includes('nada a fazer'), r.saida);
git(origem, 'tag', 'alfa-v1.0', B0);
recusa('tag existente em outro commit', rodar(C.pr1.m, 'alfa-v1.0'), 'já existe em outro commit');
chk('a tag existente não foi movida', tagEm('alfa-v1.0') === B0);
recusa('mesma tag existente em outro commit (squash)', rodar(C.s2, 'alfa-v1.1'), 'já existe em outro commit');
git(origem, 'tag', '-a', '-m', 'anotada', 'alfa-v1.3', C.pr1.m);
const objAnotada = git(origem, 'rev-parse', 'refs/tags/alfa-v1.3');
r = rodar(C.pr1.m, 'alfa-v1.3');
chk('tag anotada já no commit, sem Release: cria só a Release', r.cod === 0 && r.criou === 1 && git(origem, 'rev-parse', 'refs/tags/alfa-v1.3') === objAnotada, r.saida);
recusa('sem notas da versão no commit', rodar(C.pr1.m, 'alfa-v9.9'), 'Faltam as notas');
recusa('formato inválido', rodar(C.pr1.m, 'Alfa_v1'), 'fora do formato');
recusa('curinga não é expandido', rodar(C.pr1.m, '*'), '<versão>: *');
recusa('tag repetida', rodar(C.pr1.m, 'alfa-v1.4 alfa-v1.4'), 'Tag repetida');
r = rodar(C.pr1.m, 'alfa-gerenciador-v1.0');
chk('gerenciador: pasta sistemas/alfa/gerenciador', r.cod === 0 && tagEm('alfa-gerenciador-v1.0') === C.pr1.m, r.saida);
api(`repos/${REPO}/releases/tags/alfa-v1.5`, { tag_name: 'alfa-v1.5' });
recusa('Release existente sem tag', rodar(C.pr1.m, 'alfa-v1.5'), 'Release alfa-v1.5 sem tag');
fs.rmSync(path.join(falso, 'api', chave(`repos/${REPO}/releases/tags/alfa-v1.5`) + '.json'));
git(clone, 'remote', 'set-url', 'origin', path.join(raiz, 'nao-existe.git'));
r = rodar(C.pr1.m, 'alfa-v1.4');
chk('GitHub inacessível: para antes de escrever', r.cod !== 0 && r.criou === 0, r.saida);
git(clone, 'remote', 'set-url', 'origin', origem);

// --- 2.4 Várias tags
recusa('segunda tag inválida: a primeira não é criada', rodar(C.pr1.m, 'alfa-v1.4 beta-v1.0'), 'Pasta sistemas/beta não existe');
chk('… e a primeira continua sem tag', tagEm('alfa-v1.4') === null);
fs.writeFileSync(path.join(falso, 'falhar_release_alfa-v1.5'), '');
r = rodar(C.pr1.m, 'alfa-v1.4 alfa-v1.5');
chk('falha da API na 2ª Release: erro diz o que foi criado', r.cod !== 0 && r.criou === 2 && r.saida.includes('Criadas nesta rodada: alfa-v1.4') && tagEm('alfa-v1.4') === C.pr1.m && tagEm('alfa-v1.5') === null, r.saida);
fs.rmSync(path.join(falso, 'falhar_release_alfa-v1.5'));
r = rodar(C.pr1.m, 'alfa-v1.4 alfa-v1.5');
chk('rodar de novo completa só o que faltou', r.cod === 0 && r.criou === 1 && tagEm('alfa-v1.5') === C.pr1.m && r.saida.includes('alfa-v1.4: tag e Release já existem'), r.saida);

if (!process.env.MANTER) fs.rmSync(raiz, { recursive: true, force: true }); else console.log(raiz);
console.log(`publicar_release: ${ok} ok, ${falhas} falha(s)`);
process.exitCode = falhas ? 1 : 0;

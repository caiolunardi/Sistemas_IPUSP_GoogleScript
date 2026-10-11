// (1.8.14) Etapa 9 / A8 — testa o rodar_suites.sh REAL (o arquivo do pacote,
// copiado para uma pasta temporária) com PROCESSOS FILHOS CONTROLADOS: um "node"
// falso, primeiro no PATH, que responde a cada suíte segundo um cenário (código
// de saída, texto impresso, evidência gravada ou não). Não roda OCR, Chromium,
// simulador do Google nem as suítes do produto: os resultados daqui provam o
// comportamento do EXECUTOR (agregação, continuidade, expectativas, logs), não
// aprovam as suítes reais. Sem recursão: dentro da cópia, "node testar_executor.js"
// também é atendido pelo node falso.
// (1.8.15) Correção complementar: (a) ERRO DE INFRAESTRUTURA ≠ asserção reprovada. Se o
// executor selecionado não existe/não é legível, se a montagem da cópia falha, ou se o processo
// do executor não inicia, termina por sinal/tempo ou não devolve um código válido, isso NÃO é
// contado como teste reprovado: o caso é marcado "!" e a suíte termina com o código 3 (contrato
// de rodar_suites.sh: código 3 = erro de infraestrutura declarado pela suíte), que nunca vale
// como aprovação nem como defeito demonstrado. Só termina com 1 quando o executor foi de fato
// executado em todos os casos e alguma asserção reprovou. (b) Casos C1–C9: executor histórico
// ausente (C1, com o testar_executor.js REAL), falhas de preparação depois da validação (C2,
// com falha de E/S INJETADA por --require, identificada), controle com o executor REAL da 1.8.13
// (C3, pulado sem EXECUTOR_1813), interpretação final só depois da evidência (C4–C8) e log que
// não pôde ser completado (C9).
// Uso: node testar_executor.js            (testa ./rodar_suites.sh)
//      RODAR_SUITES_TESTADO=/caminho/rodar_suites.sh node testar_executor.js   (outra versão, ex.: 1.8.13)
//      EXECUTOR_1813=/caminho/fonte-1.8.13/testes/rodar_suites.sh …   (habilita o controle C3)
// Código de saída: 0 tudo aprovado; 1 alguma asserção reprovada (executor executado em todos os
// casos); 3 erro de infraestrutura (o resultado não vale como verificação).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RUNNER = path.resolve(process.env.RODAR_SUITES_TESTADO || path.join(__dirname, 'rodar_suites.sh'));
// testar_executor.js da MESMA versão do executor testado (o "real" que o executor chamaria).
const TESTAR_EXECUTOR_DA_VERSAO = path.join(path.dirname(RUNNER), 'testar_executor.js');
const ANINHADO = !!process.env.EXECUTOR_ANINHADO;
let ok = 0, falhas = 0, pulados = 0, infra = 0, execucoesValidas = 0;
const falhou = [];
/** Erro de preparação/execução: impede ou compromete a verificação (não é asserção reprovada). */
class ErroInfra extends Error {}
function infraestrutura(operacao, e) { return new ErroInfra(operacao + ': ' + (e && (e.code ? e.code + ' — ' : '') + (e.message || e))); }
function teste(nome, fn) {
  try { const r = fn(); if (r === 'PULADO') return; ok++; console.log('  ✓', nome); }
  catch (e) {
    if (e instanceof ErroInfra) { infra++; falhou.push(nome + ' [infraestrutura]'); console.log('  !', nome, '\n      ERRO DE INFRAESTRUTURA — ' + e.message.split('\n')[0]); return; }
    falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.message || e).split('\n').slice(0, 4).join('\n      '));
  }
}
function pular(nome, motivo) { pulados++; console.log('  – PULADO:', nome, '(' + motivo + ')'); return 'PULADO'; }
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

// Evidência padrão que cada suíte real grava (quando não recebe --evidencias).
const EVIDENCIA_PADRAO = {
  'testar_gravacao.js': 'evidencias_gravacao.txt', 'testar_preparacao.js': 'evidencias_preparacao.txt',
  'testar_envio_grade.js': 'evidencias_envio_grade.txt', 'testar_auditoria_grade.js': 'evidencias_auditoria_grade.txt',
  'testar_painel_auditoria.js': 'evidencias_painel_auditoria.txt', 'testar_etapa1_identidade_outros.js': 'evidencias_etapa1_identidade_outros.txt',
  'testar_etapa2_csv_unidade.js': 'evidencias_etapa2_csv_unidade.txt', 'testar_navegador_etapa3.js': 'evidencias_etapa3_ficha.txt',
  'testar_etapa4_salvamento.js': 'evidencias_etapa4_salvamento.txt', 'testar_etapa5_lotes.js': 'evidencias_etapa5_lotes.txt',
  'testar_etapa6_oferta.js': 'evidencias_etapa6_oferta.txt', 'testar_etapa7_trava_auditoria.js': 'evidencias_etapa7_trava_auditoria.txt',
  'testar_etapa8_previa_envio.js': 'evidencias_etapa8_previa_envio.txt', 'testar_etapa9_auditoria_envio.js': 'evidencias_etapa9_auditoria_envio.txt'
};
// O "node" falso. Chave do cenário: "<script>@<versão da fonte>" ("atual" sem DIR_SRC).
const NODE_FALSO = `#!${process.execPath}
'use strict';
const fs = require('fs'), path = require('path');
const cen = JSON.parse(fs.readFileSync(process.env.FALSO_CENARIO, 'utf8'));
const EVID = ${JSON.stringify(EVIDENCIA_PADRAO)};
const script = path.basename(process.argv[2] || '');
let fonte = 'atual';
// (1.8.15) a reprodução do executor não leva DIR_SRC: a versão é a da pasta src irmã do executor testado.
if (process.env.RODAR_SUITES_TESTADO) { try { fonte = (fs.readFileSync(path.join(path.dirname(process.env.RODAR_SUITES_TESTADO), '..', 'src', 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1] || '?'; } catch (e) { fonte = '?'; } }
else if (process.env.DIR_SRC) { try { fonte = (fs.readFileSync(path.join(process.env.DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1] || '?'; } catch (e) { fonte = '?'; } }
const chave = script + '@' + fonte;
fs.appendFileSync(process.env.FALSO_REGISTRO, chave + '\\n');
const c = cen[chave] || { codigo: 0, saida: 'Executados: 3 · 3 ok · 0 falhas · 0 pulados' };
// (1.8.15) real: executa o script REAL indicado (ex.: testar_executor.js), com os mesmos argumentos e ambiente.
if (c.real) {
  const r = require('child_process').spawnSync(process.execPath, [c.real].concat(process.argv.slice(3)), { stdio: 'inherit', env: process.env });
  process.exit(typeof r.status === 'number' ? r.status : 99);
}
const iEv = process.argv.indexOf('--evidencias');
const evid = iEv > 0 ? process.argv[iEv + 1] : (EVID[script] ? path.join('saida', EVID[script]) : null);
if (evid && !c.semEvidencia) { fs.mkdirSync(path.dirname(evid), { recursive: true }); fs.writeFileSync(evid, 'evidência da rodada atual: ' + chave + '\\n'); }
if (script === 'gerar_paginas_ocr.js' && !c.semEvidencia) { fs.mkdirSync('saida', { recursive: true }); fs.writeFileSync('saida/paginas_ocr_navegador.json', '[]'); }
if (script === 'testar_pdf_texto.js' && !c.semEvidencia) { fs.mkdirSync('saida', { recursive: true }); fs.writeFileSync('saida/grade_curricular_com_texto_sintetico.pdf', '%PDF'); }
// (1.8.15) falhas LOCALIZADAS, injetadas pelo processo controlado (identificadas no teste):
//   quebrarCopia: o destino da cópia da evidência vira um link para pasta inexistente (o cp do executor falha);
//   logVirandoPasta: o log desta suíte vira uma pasta (o executor não consegue completar o log).
if (c.quebrarCopia) { const d = path.join('saida', 'logs', path.basename(c.quebrarCopia)); try { fs.unlinkSync(d); } catch (e) { /* */ } fs.symlinkSync('/pasta-inexistente-do-teste/' + path.basename(c.quebrarCopia), d); }
if (c.logVirandoPasta) { const d = path.join('saida', 'logs', c.logVirandoPasta); fs.unlinkSync(d); fs.mkdirSync(d); }
if (c.saida) console.log(c.saida);
process.exit(c.codigo);
`;

/** Pasta temporária com a estrutura que o executor espera (src/, planilha-grade/, testes/) e o node falso. */
function montar(cenario, opcoes) {
  try { return montarSemProtecao(cenario, opcoes); }
  catch (e) { if (e instanceof ErroInfra) throw e; throw infraestrutura('preparação da cópia do executor (montar)', e); }
}
function montarSemProtecao(cenario, opcoes) {
  opcoes = opcoes || {};
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'executor-'));
  for (const d of ['src', 'planilha-grade', 'testes', 'bin', 'entrada']) fs.mkdirSync(path.join(raiz, d));
  fs.writeFileSync(path.join(raiz, 'src', 'Codigo.gs'), "var VERSAO_SISTEMA = 'teste';\n");
  fs.writeFileSync(path.join(raiz, 'planilha-grade', 'Validacoes.gs'), '// sintético\n');
  fs.writeFileSync(path.join(raiz, 'testes', 'testar_sintetico.js'), '// sintético\n');
  fs.copyFileSync(opcoes.executor || RUNNER, path.join(raiz, 'testes', 'rodar_suites.sh'));
  fs.chmodSync(path.join(raiz, 'testes', 'rodar_suites.sh'), 0o755);
  fs.writeFileSync(path.join(raiz, 'bin', 'node'), NODE_FALSO);
  fs.chmodSync(path.join(raiz, 'bin', 'node'), 0o755);
  for (const f of ['grade.csv', 'grade.pdf', 'unidade.csv']) fs.writeFileSync(path.join(raiz, 'entrada', f), 'sintético');
  fs.writeFileSync(path.join(raiz, 'cenario.json'), JSON.stringify(cenario || {}));
  fs.writeFileSync(path.join(raiz, 'registro.txt'), '');
  if (opcoes.antes) opcoes.antes(raiz);
  return raiz;
}
/** Pasta src sintética de uma versão antiga (só Codigo.gs com a VERSAO_SISTEMA). */
function fonteAntiga(raiz, versao, conteudo) {
  const d = path.join(raiz, 'fontes', versao, 'src');
  fs.mkdirSync(d, { recursive: true });
  if (conteudo !== null) fs.writeFileSync(path.join(d, 'Codigo.gs'), conteudo || "var VERSAO_SISTEMA = '" + versao + "';\n");
  return d;
}
/** Roda o executor copiado com o PATH do node falso. env extra: entradas e fontes. */
function rodar(raiz, env) {
  const base = { PATH: path.join(raiz, 'bin') + ':' + process.env.PATH, HOME: process.env.HOME || '/tmp', LANG: 'C.UTF-8',
    FALSO_CENARIO: path.join(raiz, 'cenario.json'), FALSO_REGISTRO: path.join(raiz, 'registro.txt'),
    CSV: path.join(raiz, 'entrada', 'grade.csv'), PDF: path.join(raiz, 'entrada', 'grade.pdf'), UNIDADE: path.join(raiz, 'entrada', 'unidade.csv') };
  const e = Object.assign(base, env || {});
  Object.keys(e).forEach((k) => { if (e[k] === null) delete e[k]; });
  const r = spawnSync('bash', [path.join(raiz, 'testes', 'rodar_suites.sh')], { env: e, encoding: 'utf8', timeout: e.TEMPO_LIMITE_EXECUTOR ? Number(e.TEMPO_LIMITE_EXECUTOR) : 600000, maxBuffer: 64 * 1024 * 1024 });
  // (1.8.15) o executor tem de ter rodado de fato: processo iniciado, terminado sozinho, com código.
  if (r.error) throw infraestrutura('início/execução do processo do executor (spawnSync)', r.error);
  if (r.signal) throw infraestrutura('processo do executor', new Error('terminado pelo sinal ' + r.signal));
  if (typeof r.status !== 'number') throw infraestrutura('processo do executor', new Error('sem código de saída válido'));
  execucoesValidas++;
  const logs = path.join(raiz, 'testes', 'saida', 'logs');
  const ler = (f) => { try { return fs.readFileSync(path.join(logs, f), 'utf8'); } catch (x) { return null; } };
  let registro;
  try { registro = fs.readFileSync(path.join(raiz, 'registro.txt'), 'utf8').split('\n').filter(Boolean); }
  catch (x) { throw infraestrutura('leitura do registro dos processos controlados', x); }
  return { codigo: r.status, saida: (r.stdout || '') + (r.stderr || ''), stdout: r.stdout || '', stderr: r.stderr || '', registro, ler, logs, resumo: ler('resumo.txt') };
}
/** Roda um testar_executor.js REAL num processo próprio (com --require de injeção, se pedido). */
function rodarTestarExecutor(script, env, injecao) {
  const args = (injecao ? ['--require', injecao] : []).concat([script]);
  const r = spawnSync(process.execPath, args, { env: Object.assign({ PATH: process.env.PATH, HOME: process.env.HOME || '/tmp', LANG: 'C.UTF-8', EXECUTOR_ANINHADO: '1' }, env), encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw infraestrutura('início do testar_executor.js real', r.error);
  if (typeof r.status !== 'number') throw infraestrutura('testar_executor.js real', new Error('sem código de saída válido' + (r.signal ? ' (sinal ' + r.signal + ')' : '')));
  return { codigo: r.status, saida: (r.stdout || '') + (r.stderr || '') };
}
function mostrar(rot, r) {
  console.log('     [' + rot + '] código final: ' + r.codigo + ' · filhos executados: ' + r.registro.length + ' · último: ' + r.registro[r.registro.length - 1]);
  // seções do resumo: título (N) e itens; os itens das listas longas (aprovadas, não executadas) só pela contagem
  const out = [];
  let secao = '';
  (r.resumo || '(sem resumo.txt)').split('\n').forEach((l) => {
    if (/^\S.*\(\d+\):$/.test(l)) { secao = l; out.push(l.replace(/ \(.*\) \(/, ' (').replace(/:$/, '')); }
    else if (/^  - /.test(l) && !/^(Suítes atuais aprovadas|Não executadas)/.test(secao)) out.push(l.trim());
    else if (/^Resultado geral/.test(l)) out.push(l);
  });
  console.log('     [' + rot + '] resumo: ' + out.join(' | '));
}
const FALHA1 = { codigo: 1, saida: 'Executados: 2 (1 ok, 1 falha(s)); pulados: 0' };
const REPRO_1812 = { codigo: 1, saida: '  ✗ 18e …\nExecutados: 27 · 16 ok · 11 falhas' };

console.log('Executor testado: ' + (process.env.RODAR_SUITES_TESTADO ? 'RODAR_SUITES_TESTADO (outra versão)' : './rodar_suites.sh (deste pacote)'));
// (1.8.15) Validação inicial do executor selecionado: existe, é arquivo comum, é legível e é um script bash.
let shaExecutor;
try {
  const st = fs.statSync(RUNNER);
  if (!st.isFile()) throw new Error('não é um arquivo comum');
  const bytes = fs.readFileSync(RUNNER);
  if (!/^#!.*bash/.test(bytes.slice(0, 64).toString('utf8'))) throw new Error('não começa com #! … bash');
  shaExecutor = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
} catch (e) {
  console.log('ERRO DE INFRAESTRUTURA — executor selecionado inexistente, ilegível ou inválido (' + (e.code || e.message) + '): nenhum caso foi executado; o resultado não vale como verificação.');
  process.exit(3);
}
console.log('Executor validado: arquivo comum e legível, sha256 ' + shaExecutor + '.');
console.log('Ambiente: cópia temporária do executor real + "node" falso (processos filhos controlados); nenhuma suíte real roda aqui.');

teste('R1. todas as suítes atuais terminam com 0: código final 0, resumo "APROVADO", todas executadas, fontes opcionais ausentes listadas como não executadas', () => {
  const raiz = montar({});
  const r = rodar(raiz);
  mostrar('R1', r);
  igual(r.codigo, 0, 'código final');
  verdade(r.resumo && /Resultado geral: APROVADO/.test(r.resumo), 'resumo aprovado');
  verdade(r.registro.includes('reproduzir_auditoria.js@atual') && r.registro.includes('testar_backend.js@atual'), 'executou do começo ao fim');
  verdade(/Não executadas[^\n]*\((1[0-9]|[2-9][0-9])\)/.test(r.resumo) && /DIR_SRC_V1812 não definido/.test(r.resumo) && /DIR_SRC_V100 não definido/.test(r.resumo), 'opcionais ausentes listadas');
  verdade(/código de saída: 0/.test(r.ler('testar_backend.txt')), 'log com o código individual');
});

teste('R2. testar_backend (uma das primeiras) termina com 1 e as seguintes com 0: código final ≠ 0, as seguintes executaram e têm log, a falha está no resumo', () => {
  const raiz = montar({ 'testar_backend.js@atual': FALHA1 });
  const r = rodar(raiz);
  mostrar('R2', r);
  verdade(r.codigo !== 0, 'código final não zero (foi ' + r.codigo + ')');
  verdade(/código de saída: 1/.test(r.ler('testar_backend.txt') || ''), 'código individual no log');
  const iB = r.registro.indexOf('testar_backend.js@atual');
  verdade(iB >= 0 && r.registro.length > iB + 10 && r.registro[r.registro.length - 1] === 'reproduzir_auditoria.js@atual', 'as seguintes executaram até a última');
  verdade(/código de saída: 0/.test(r.ler('reproduzir_auditoria_depois.txt') || ''), 'log da última suíte');
  verdade(r.resumo && /FALHAS inesperadas[^\n]*\(1\):\n  - testar_backend: FALHA — código 1/.test(r.resumo), 'falha no resumo');
});

teste('R3. a ÚLTIMA suíte (reproduzir_auditoria_depois) falha: código final ≠ 0', () => {
  const raiz = montar({ 'reproduzir_auditoria.js@atual': { codigo: 1, saida: 'Error: falha simulada' } });
  const r = rodar(raiz);
  mostrar('R3', r);
  verdade(r.codigo !== 0, 'código final não zero (foi ' + r.codigo + ')');
  verdade(r.resumo && /reproduzir_auditoria_depois: FALHA — código 1/.test(r.resumo), 'resumo');
});

teste('R4. duas suítes atuais falham (testar_gravacao com 1 e testar_visual com 2): as duas identificadas, código final ≠ 0', () => {
  const raiz = montar({ 'testar_gravacao.js@atual': FALHA1, 'testar_visual.js@atual': { codigo: 2, saida: 'Executados: 24 (23 ok, 1 falha(s)); pulados: 0' } });
  const r = rodar(raiz);
  mostrar('R4', r);
  verdade(r.codigo !== 0, 'código final não zero (foi ' + r.codigo + ')');
  verdade(r.resumo && /FALHAS inesperadas[^\n]*\(2\)/.test(r.resumo) && /testar_gravacao: FALHA — código 1/.test(r.resumo) && /testar_visual: FALHA — código 2/.test(r.resumo), 'as duas no resumo');
});

teste('R5. reprodução histórica declarada (navegador_etapa8 na 1.8.12, esperado 16/27) mostra a falha prevista e as suítes atuais passam: expectativa atendida, código final 0', () => {
  const raiz = montar({ 'testar_navegador_etapa8.js@1.8.12': REPRO_1812 });
  const r = rodar(raiz, { DIR_SRC_V1812: fonteAntiga(raiz, '1.8.12') });
  mostrar('R5', r);
  igual(r.codigo, 0, 'código final');
  verdade(r.registro.includes('testar_navegador_etapa8.js@1.8.12'), 'a reprodução executou');
  verdade(r.resumo && /navegador_etapa8_fonte_1\.8\.12_antes: defeito demonstrado como previsto \(16\/27\)/.test(r.resumo), 'confirmada no resumo');
  verdade(/código de saída: 1/.test(r.ler('navegador_etapa8_fonte_1.8.12_antes.txt')) && /esperado: reprodução de defeito/.test(r.ler('navegador_etapa8_fonte_1.8.12_antes.txt')), 'log com código real e expectativa');
});

teste('R6. a mesma reprodução com resultado inesperado — termina com 0, ou falha com outra contagem (20/27): DIVERGENTE e código final ≠ 0', () => {
  const casos = [['código 0', { codigo: 0, saida: 'Executados: 27 · 27 ok · 0 falhas' }], ['outra contagem', { codigo: 1, saida: 'Executados: 27 · 20 ok · 7 falhas' }]];
  for (const [rot, c] of casos) {
    const raiz = montar({ 'testar_navegador_etapa8.js@1.8.12': c });
    const r = rodar(raiz, { DIR_SRC_V1812: fonteAntiga(raiz, '1.8.12') });
    mostrar('R6 ' + rot, r);
    verdade(r.codigo !== 0, rot + ': código final não zero (foi ' + r.codigo + ')');
    verdade(r.resumo && /Reproduções DIVERGENTES[^\n]*\(1\)/.test(r.resumo) && !/defeito demonstrado como previsto/.test(r.resumo), rot + ': divergência no resumo');
  }
});

teste('R7. reprodução que falha por infraestrutura antes de demonstrar o defeito — código 1 SEM resumo (módulo ausente, entrada ausente), comando inexistente (127): ERRO, nunca "confirmada"; código final ≠ 0', () => {
  const casos = [
    ['código 1, módulo ausente', { codigo: 1, saida: "Error: Cannot find module 'playwright'\n    at Module._resolveFilename" }],
    ['código 1, entrada ausente', { codigo: 1, saida: "Error: ENOENT: no such file or directory, open '/caminho/grade.csv'" }],
    ['comando inexistente (127)', { codigo: 127, saida: 'env: comando não encontrado' }]
  ];
  for (const [rot, c] of casos) {
    const raiz = montar({ 'testar_navegador_etapa8.js@1.8.12': c });
    const r = rodar(raiz, { DIR_SRC_V1812: fonteAntiga(raiz, '1.8.12') });
    mostrar('R7 ' + rot, r);
    verdade(r.codigo !== 0, rot + ': código final não zero (foi ' + r.codigo + ')');
    verdade(r.resumo && /navegador_etapa8_fonte_1\.8\.12_antes: ERRO de infraestrutura/.test(r.resumo) && !/defeito demonstrado como previsto/.test(r.resumo), rot + ': erro de infraestrutura no resumo');
  }
});

teste('R8. fonte opcional ausente → não executada (sem contar como aprovada); fornecida e inválida (pasta sem Codigo.gs; outra versão) → ERRO identificado e código final ≠ 0', () => {
  const casos = [['pasta sem Codigo.gs', (raiz) => fonteAntiga(raiz, '1.8.12', null)], ['outra versão (1.8.11 no lugar da 1.8.12)', (raiz) => fonteAntiga(raiz, '1.8.11')], ['pasta inexistente', (raiz) => path.join(raiz, 'nao-existe')]];
  for (const [rot, f] of casos) {
    const raiz = montar({});
    const r = rodar(raiz, { DIR_SRC_V1812: f(raiz) });
    mostrar('R8 ' + rot, r);
    verdade(r.codigo !== 0, rot + ': código final não zero (foi ' + r.codigo + ')');
    verdade(r.resumo && /DIR_SRC_V1812: fonte fornecida inválida/.test(r.resumo), rot + ': erro identificado');
    verdade(!r.registro.some((x) => /@1\.8\.1[12]$/.test(x)), rot + ': a reprodução não rodou com a fonte inválida');
  }
  const raiz = montar({});
  const r = rodar(raiz, { DIR_SRC_V100: path.join(raiz, 'nao-existe') });   // fonte interna (migração dentro de testar_gravacao)
  mostrar('R8 interna inválida', r);
  verdade(r.codigo !== 0 && /DIR_SRC_V100: fonte fornecida inválida/.test(r.resumo || ''), 'fonte interna inválida não some');
});

teste('R9. entrada obrigatória ausente ou ilegível (CSV não definido; PDF inexistente): código final 2 e mensagem identificável, nada executado', () => {
  for (const [rot, env, re] of [['CSV não definido', { CSV: null }, /CSV não definido/], ['PDF inexistente', { PDF: '/caminho/que/nao/existe.pdf' }, /PDF=\/caminho\/que\/nao\/existe\.pdf não é um arquivo legível/]]) {
    const raiz = montar({});
    const r = rodar(raiz, env);
    console.log('     [R9 ' + rot + '] código final: ' + r.codigo + ' · mensagem: ' + r.stderr.trim());
    igual(r.codigo, 2, rot);
    verdade(re.test(r.stderr), rot + ': mensagem');
    igual(r.registro.length, 0, rot + ': nada executado');
  }
});

teste('R10. preparação e evidências: evidência ausente com arquivo ANTIGO presente → ERRO (a sobra não vira evidência atual); log de suíte não executada nesta rodada não sobra; saída impossível ou manifesto impossível → código 3', () => {
  // a) testar_gravacao "passa" mas não grava a evidência; existe uma de rodada anterior.
  let raiz = montar({ 'testar_gravacao.js@atual': { codigo: 0, saida: 'Executados: 57 (57 ok, 0 falha(s)); pulados: 0', semEvidencia: true } }, { antes: (rz) => {
    fs.mkdirSync(path.join(rz, 'testes', 'saida', 'logs'), { recursive: true });
    fs.writeFileSync(path.join(rz, 'testes', 'saida', 'evidencias_gravacao.txt'), 'EVIDÊNCIA ANTIGA');
    fs.writeFileSync(path.join(rz, 'testes', 'saida', 'logs', 'navegador_etapa8_fonte_1.8.12_antes.txt'), 'LOG ANTIGO de outra rodada');
  } });
  let r = rodar(raiz);
  mostrar('R10 evidência ausente', r);
  verdade(r.codigo !== 0, 'código final não zero (foi ' + r.codigo + ')');
  verdade(r.resumo && /testar_gravacao: [^\n]*evidência saida\/evidencias_gravacao\.txt não foi gravada nesta rodada/.test(r.resumo), 'erro de evidência no resumo');
  verdade(r.ler('evidencias_gravacao.txt') === null, 'a evidência antiga não foi copiada como atual');
  verdade(r.ler('navegador_etapa8_fonte_1.8.12_antes.txt') === null, 'log antigo de suíte não executada não sobrou');
  // b) gerar_paginas_ocr não gera as páginas (com as da rodada anterior presentes).
  raiz = montar({ 'gerar_paginas_ocr.js@atual': { codigo: 0, saida: '', semEvidencia: true } }, { antes: (rz) => { fs.mkdirSync(path.join(rz, 'testes', 'saida'), { recursive: true }); fs.writeFileSync(path.join(rz, 'testes', 'saida', 'paginas_ocr_navegador.json'), '[] antigo'); } });
  r = rodar(raiz);
  mostrar('R10 páginas não geradas', r);
  verdade(r.codigo !== 0 && /gerar_paginas_ocr: não gerou saida\/paginas_ocr_navegador\.json/.test(r.resumo || ''), 'páginas antigas não valem');
  // c) pasta de saída impossível (saida é um arquivo).
  raiz = montar({}, { antes: (rz) => fs.writeFileSync(path.join(rz, 'testes', 'saida'), 'não é pasta') });
  r = rodar(raiz);
  console.log('     [R10 saída impossível] código final: ' + r.codigo + ' · mensagem: ' + r.stderr.trim().split('\n').pop());
  igual(r.codigo, 3, 'saída impossível');
  verdade(/ERRO de preparação/.test(r.stderr) && r.registro.length === 0, 'mensagem e nada executado');
  // d) manifesto impossível (sem planilha-grade/*.gs).
  raiz = montar({}, { antes: (rz) => fs.rmSync(path.join(rz, 'planilha-grade'), { recursive: true }) });
  r = rodar(raiz);
  console.log('     [R10 manifesto impossível] código final: ' + r.codigo + ' · mensagem: ' + r.stderr.trim().split('\n').pop());
  igual(r.codigo, 3, 'manifesto impossível');
  verdade(/fontes\.sha256/.test(r.stderr), 'mensagem identifica o manifesto');
});

teste('R11. código 0 com o resumo da própria suíte dizendo que houve falhas (inconsistente): ERRO, código final ≠ 0', () => {
  const raiz = montar({ 'testar_preparacao.js@atual': { codigo: 0, saida: 'Executados: 34 (33 ok, 1 falha(s)); pulados: 0' } });
  const r = rodar(raiz);
  mostrar('R11', r);
  verdade(r.codigo !== 0 && /testar_preparacao: ERRO — código 0, mas o resumo da suíte diz 1 falha/.test(r.resumo || ''), 'inconsistência detectada');
});

teste('R12. casos pulados dentro de uma suíte atual aparecem no resumo como não aprovados, sem reprovar a rodada', () => {
  const raiz = montar({ 'testar_gravacao.js@atual': { codigo: 0, saida: 'Executados: 56 (56 ok, 0 falha(s)); pulados: 1' } });
  const r = rodar(raiz);
  mostrar('R12', r);
  igual(r.codigo, 0);
  verdade(/Casos pulados dentro de suítes[^\n]*\(1\):\n  - testar_gravacao: 1 caso\(s\) PULADO/.test(r.resumo || ''), 'pulados no resumo');
});


// =====================================================================
// (1.8.15) Correção complementar: infraestrutura × asserção; interpretação final depois da evidência
const REPRO_ETAPA9 = { 'testar_etapa9_auditoria_envio.js@1.8.13': { codigo: 1, saida: 'Executados: 8 · 3 ok · 5 falhas · 0 pulados' }, 'testar_navegador_etapa9.js@1.8.13': { codigo: 1, saida: 'Executados: 5 · 2 ok · 3 falhas' } };
const linhasInterpretacao = (log) => (log || '').split('\n').filter((l) => /^# interpretação:/.test(l));
const linhaConsole = (r, nome) => (r.stdout.split('\n').filter((l) => l.startsWith(nome + ': código')).pop() || '');
const declarado = (nome) => { const m = fs.readFileSync(RUNNER, 'utf8').match(new RegExp('reproducao ' + nome.replace(/\./g, '\\.') + ' (\\d+/\\d+)')); return m ? m[1] : null; };

teste('C1. fonte 1.8.13 com versão válida, mas SEM o executor irmão ../testes/rodar_suites.sh; o testar_executor.js REAL da mesma versão do executor é chamado: a reprodução executor_fonte_1.8.13_antes NÃO é confirmada, vira ERRO de infraestrutura, a rodada termina ≠ 0 e as demais suítes (inclusive as outras reproduções da 1.8.13) continuam produzindo diagnóstico', () => {
  if (ANINHADO) return pular('C1', 'execução aninhada (evita recursão)');
  if (!fs.existsSync(TESTAR_EXECUTOR_DA_VERSAO)) { /* executor sem testar_executor.js irmão (ex.: 1.8.13): a reprodução C1 não se aplica — conta como reprovado */ throw new Error('o executor testado não tem testar_executor.js irmão: ' + TESTAR_EXECUTOR_DA_VERSAO); }
  const raiz = montar(Object.assign({ 'testar_executor.js@1.8.13': { real: TESTAR_EXECUTOR_DA_VERSAO } }, REPRO_ETAPA9));
  const src1813 = fonteAntiga(raiz, '1.8.13');   // só src/Codigo.gs — o irmão testes/rodar_suites.sh NÃO existe
  const r = rodar(raiz, { DIR_SRC_V1813: src1813 });
  mostrar('C1', r);
  const log = r.ler('executor_fonte_1.8.13_antes.txt') || '';
  const trecho = log.split('\n').filter((l) => /ERRO DE INFRAESTRUTURA|ENOENT|^Executados|^# (código de saída|interpretação)/.test(l)).slice(0, 6);
  console.log('     [C1] log executor_fonte_1.8.13_antes: ' + JSON.stringify(trecho));
  verdade(r.registro.includes('testar_executor.js@1.8.13'), 'o testar_executor.js real foi chamado para a fonte 1.8.13');
  verdade(!/executor_fonte_1\.8\.13_antes: defeito demonstrado/.test(r.resumo || ''), 'NÃO confirmada como defeito demonstrado');
  verdade(/executor_fonte_1\.8\.13_antes: ERRO de infraestrutura/.test(r.resumo || ''), 'ERRO de infraestrutura no resumo');
  verdade(r.codigo !== 0, 'código final não zero (foi ' + r.codigo + ')');
  verdade(/etapa9_fonte_1\.8\.13_antes: defeito demonstrado como previsto \(3\/8\)/.test(r.resumo || '') && /navegador_etapa9_fonte_1\.8\.13_antes: defeito demonstrado como previsto \(2\/5\)/.test(r.resumo || ''), 'as outras reproduções da 1.8.13 continuam');
  verdade(r.registro[r.registro.length - 1] === 'reproduzir_auditoria.js@atual', 'as suítes seguintes executaram até a última');
});

teste('C2. testar_executor.js REAL com o executor selecionado inexistente; com uma pasta no lugar do arquivo; e com falha de E/S INJETADA na cópia DEPOIS da validação inicial; e com falha INJETADA no início do processo (spawnSync): código 3 e nenhum caso contado como asserção reprovada', () => {
  if (ANINHADO) return pular('C2', 'execução aninhada (evita recursão)');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'executor-c2-'));
  const inj = path.join(tmp, 'injetar.js');
  fs.writeFileSync(inj, [
    "// Injeção IDENTIFICADA de falha de E/S para o teste C2 (não é uma recusa real do sistema de arquivos).",
    "const fs = require('fs'), cp = require('child_process');",
    "const alvo = process.env.INJETAR_FALHA;",
    "if (alvo === 'copia') { const o = fs.copyFileSync; fs.copyFileSync = function (a, b) { if (/rodar_suites\\.sh$/.test(String(a))) { const e = new Error('EIO injetado: falha de E/S ao copiar ' + a); e.code = 'EIO'; throw e; } return o.apply(this, arguments); }; }",
    "if (alvo === 'spawn') { const o = cp.spawnSync; cp.spawnSync = function (cmd, args) { if (cmd === 'bash') return { error: Object.assign(new Error('spawnSync bash EAGAIN (injetado)'), { code: 'EAGAIN' }), status: null, signal: null, stdout: '', stderr: '' }; return o.apply(this, arguments); }; }"
  ].join('\n'));
  fs.mkdirSync(path.join(tmp, 'pasta.sh'));
  const casos = [
    ['executor inexistente', { RODAR_SUITES_TESTADO: path.join(tmp, 'nao-existe', 'rodar_suites.sh') }, null],
    ['pasta no lugar do executor', { RODAR_SUITES_TESTADO: path.join(tmp, 'pasta.sh') }, null],
    ['falha de E/S injetada na cópia, depois da validação', { RODAR_SUITES_TESTADO: RUNNER, INJETAR_FALHA: 'copia' }, inj],
    ['falha injetada no início do processo do executor', { RODAR_SUITES_TESTADO: RUNNER, INJETAR_FALHA: 'spawn' }, inj]
  ];
  for (const [rot, env, injecao] of casos) {
    const r = rodarTestarExecutor(TESTAR_EXECUTOR_DA_VERSAO, env, injecao);
    const resumo = r.saida.split('\n').filter((l) => /^Executados|ERRO DE INFRAESTRUTURA —|^Condições/.test(l));
    console.log('     [C2 ' + rot + '] código: ' + r.codigo + ' · ' + JSON.stringify(resumo.slice(0, 3)));
    igual(r.codigo, 3, rot + ': código 3 (erro de infraestrutura)');
    verdade(/ERRO DE INFRAESTRUTURA/.test(r.saida), rot + ': erro identificado');
    const m = r.saida.match(/(\d+) ok · (\d+) falhas/);
    verdade(!m || Number(m[2]) === 0, rot + ': nenhuma asserção reprovada contada (' + (m ? m[0] : 'sem contagem') + ')');
  }
});

teste('C3. controle POSITIVO com o executor REAL da 1.8.13: (a) direto — testar_backend termina com 1, as seguintes com 0, e o executor antigo devolve 0 (o defeito A8); (b) integrado — fonte 1.8.13 COMPLETA (src + executor real), o testar_executor.js real é executado e a reprodução executor_fonte_1.8.13_antes é confirmada com a contagem declarada', () => {
  if (ANINHADO) return pular('C3', 'execução aninhada (evita recursão)');
  const historico = process.env.EXECUTOR_1813;
  if (!historico) return pular('C3', 'EXECUTOR_1813 não definido (o executor real da 1.8.13 não foi fornecido)');
  let antigo;
  try { antigo = fs.readFileSync(historico); } catch (e) { throw infraestrutura('leitura do executor real da 1.8.13 (EXECUTOR_1813)', e); }
  // (a) direto
  const raizA = montar({ 'testar_backend.js@atual': FALHA1 }, { executor: historico });
  const a = rodar(raizA);
  console.log('     [C3a] executor 1.8.13 (sha256 ' + crypto.createHash('sha256').update(antigo).digest('hex').slice(0, 16) + '): código final ' + a.codigo + ' · log testar_backend: ' + ((a.ler('testar_backend.txt') || '').match(/# código de saída: \d+/) || ['?'])[0] + ' · filhos: ' + a.registro.length + ' · último: ' + a.registro[a.registro.length - 1]);
  igual(a.codigo, 0, 'o executor da 1.8.13 devolve 0 apesar da falha (defeito A8 demonstrado)');
  verdade(/# código de saída: 1/.test(a.ler('testar_backend.txt') || '') && a.registro[a.registro.length - 1] === 'reproduzir_auditoria.js@atual', 'falha registrada e as seguintes executadas');
  // (b) integrado
  const raizB = montar(Object.assign({ 'testar_executor.js@1.8.13': { real: TESTAR_EXECUTOR_DA_VERSAO } }, REPRO_ETAPA9));
  const src = fonteAntiga(raizB, '1.8.13');
  fs.mkdirSync(path.join(raizB, 'fontes', '1.8.13', 'testes'));
  fs.writeFileSync(path.join(raizB, 'fontes', '1.8.13', 'testes', 'rodar_suites.sh'), antigo);
  const b = rodar(raizB, { DIR_SRC_V1813: src });
  mostrar('C3b', b);
  const log = b.ler('executor_fonte_1.8.13_antes.txt') || '';
  const falharam = (log.match(/^  ✗ (R\d+|C\d+)\./gm) || []).map((x) => x.replace(/^  ✗ /, '').replace('.', ''));
  console.log('     [C3b] esperado ' + declarado('executor_fonte_1.8.13_antes') + ' · casos reprovados contra o executor 1.8.13: ' + JSON.stringify(falharam) + ' · condições: ' + JSON.stringify((log.match(/^Condições de execução:.*$/m) || [''])[0]));
  verdade(/executor_fonte_1\.8\.13_antes: defeito demonstrado como previsto/.test(b.resumo || ''), 'reprodução confirmada');
  verdade(/0 erro\(s\) de infraestrutura/.test(log), 'o executor histórico foi executado em todos os casos');
  verdade(falharam.includes('R2') && falharam.includes('R3') && falharam.includes('R4'), 'R2–R4 (o defeito A8) reprovaram');
  igual(b.codigo, 0, 'rodada aprovada');
});

teste('C4. suíte atual com o filho terminando com 0 e a evidência obrigatória ausente: código final ≠ 0; no log, código de saída 0 (real), resultado do processo "aprovada", evidência AUSENTE e UMA interpretação final "ERRO de evidência"; console e resumo com o mesmo ERRO', () => {
  const raiz = montar({ 'testar_gravacao.js@atual': { codigo: 0, saida: 'Executados: 57 (57 ok, 0 falha(s)); pulados: 0', semEvidencia: true } });
  const r = rodar(raiz);
  const log = r.ler('testar_gravacao.txt') || '';
  console.log('     [C4] código final ' + r.codigo + ' · log: ' + JSON.stringify(log.split('\n').filter((l) => /^# (código|resultado|evidência|interpretação)/.test(l))) + ' · console: ' + linhaConsole(r, 'testar_gravacao').slice(0, 160));
  verdade(r.codigo !== 0, 'código final não zero');
  verdade(/# código de saída: 0 /.test(log), 'código real do filho preservado (0)');
  const interp = linhasInterpretacao(log);
  igual(interp.length, 1, 'uma única interpretação no log');
  verdade(/^# interpretação: ERRO de evidência/.test(interp[0]) && /saida\/evidencias_gravacao\.txt não foi gravada nesta rodada/.test(interp[0]), 'interpretação final: ' + interp[0]);
  verdade(/código 0/.test(interp[0]), 'a interpretação diz que o processo terminou com 0');
  verdade(/ERRO de evidência/.test(linhaConsole(r, 'testar_gravacao')) && /testar_gravacao: ERRO de evidência/.test(r.resumo || ''), 'console e resumo coerentes');
});

teste('C5. o mesmo caso com uma evidência ANTIGA presente: a sobra é apagada antes da chamada e não é copiada; log, console e resumo dizem ERRO de evidência', () => {
  const raiz = montar({ 'testar_gravacao.js@atual': { codigo: 0, saida: 'Executados: 57 (57 ok, 0 falha(s)); pulados: 0', semEvidencia: true } }, { antes: (rz) => { fs.mkdirSync(path.join(rz, 'testes', 'saida'), { recursive: true }); fs.writeFileSync(path.join(rz, 'testes', 'saida', 'evidencias_gravacao.txt'), 'EVIDÊNCIA ANTIGA'); } });
  const r = rodar(raiz);
  const log = r.ler('testar_gravacao.txt') || '';
  console.log('     [C5] código final ' + r.codigo + ' · sobra existe depois? ' + fs.existsSync(path.join(raiz, 'testes', 'saida', 'evidencias_gravacao.txt')) + ' · copiada? ' + (r.ler('evidencias_gravacao.txt') !== null) + ' · interpretação: ' + linhasInterpretacao(log).join(' | '));
  verdade(r.codigo !== 0, 'código final não zero');
  verdade(!fs.existsSync(path.join(raiz, 'testes', 'saida', 'evidencias_gravacao.txt')) && r.ler('evidencias_gravacao.txt') === null, 'sobra apagada e não copiada');
  igual(linhasInterpretacao(log).length, 1);
  verdade(/^# interpretação: ERRO de evidência/.test(linhasInterpretacao(log)[0]), 'log');
  verdade(/ERRO de evidência/.test(linhaConsole(r, 'testar_gravacao')) && /testar_gravacao: ERRO de evidência/.test(r.resumo || ''), 'console e resumo');
});

teste('C6. evidência gravada, mas a CÓPIA falha (falha localizada: o processo controlado transforma o destino em link para pasta inexistente): interpretação final ERRO com a operação identificada, código real do filho (0) preservado, rodada reprovada', () => {
  const raiz = montar({ 'testar_gravacao.js@atual': { codigo: 0, saida: 'Executados: 57 (57 ok, 0 falha(s)); pulados: 0', quebrarCopia: 'evidencias_gravacao.txt' } });
  const r = rodar(raiz);
  const log = r.ler('testar_gravacao.txt') || '';
  console.log('     [C6] código final ' + r.codigo + ' · log: ' + JSON.stringify(log.split('\n').filter((l) => /^# (código|evidência|interpretação)/.test(l))));
  verdade(fs.existsSync(path.join(raiz, 'testes', 'saida', 'evidencias_gravacao.txt')), 'a evidência foi gravada pelo filho');
  verdade(r.codigo !== 0, 'código final não zero');
  verdade(/# código de saída: 0 /.test(log), 'código real 0 preservado');
  igual(linhasInterpretacao(log).length, 1);
  verdade(/^# interpretação: ERRO de evidência — não foi possível copiar a evidência saida\/evidencias_gravacao\.txt para saida\/logs\/evidencias_gravacao\.txt/.test(linhasInterpretacao(log)[0]), 'operação identificada: ' + linhasInterpretacao(log)[0]);
  verdade(/testar_gravacao: ERRO de evidência/.test(r.resumo || ''), 'resumo');
});

teste('C7. reprodução histórica com a falha prevista LEGÍTIMA (etapa8 na 1.8.11: código 1, 8/26), mas a evidência ausente — ou a cópia dela falhando: ERRO, não "confirmada", rodada reprovada', () => {
  const base = { codigo: 1, saida: 'Executados: 26 · 8 ok · 18 falhas · 0 pulados' };
  const variantes = [['evidência ausente', Object.assign({ semEvidencia: true }, base)], ['cópia falhando', Object.assign({ quebrarCopia: 'evidencias_etapa8_fonte_1.8.11_antes.txt' }, base)]];
  for (const [rot, c] of variantes) {
    const raiz = montar({ 'testar_etapa8_previa_envio.js@1.8.11': c, 'testar_navegador_etapa8.js@1.8.11': { codigo: 1, saida: 'Executados: 27 · 1 ok · 26 falhas' } });
    const r = rodar(raiz, { DIR_SRC_V1811: fonteAntiga(raiz, '1.8.11') });
    const log = r.ler('etapa8_fonte_1.8.11_antes.txt') || '';
    console.log('     [C7 ' + rot + '] código final ' + r.codigo + ' · log: ' + JSON.stringify(log.split('\n').filter((l) => /^# (código|resultado|interpretação)/.test(l))));
    verdade(r.codigo !== 0, rot + ': código final não zero');
    verdade(/# código de saída: 1 /.test(log) && /# resultado do processo: defeito demonstrado como previsto \(8\/26\)/.test(log), rot + ': resultado do processo registrado');
    igual(linhasInterpretacao(log).length, 1, rot);
    verdade(/^# interpretação: ERRO de evidência/.test(linhasInterpretacao(log)[0]), rot + ': interpretação final ERRO');
    verdade(!/^  - etapa8_fonte_1\.8\.11_antes: defeito demonstrado/m.test(r.resumo || '') && /^  - etapa8_fonte_1\.8\.11_antes: ERRO de evidência/m.test(r.resumo || ''), rot + ': não confirmada no resumo');
    verdade(/navegador_etapa8_fonte_1\.8\.11_antes: defeito demonstrado como previsto \(1\/27\)/.test(r.resumo || ''), rot + ': a outra reprodução continua confirmada');
  }
});

teste('C8. controle completo sem problemas (suítes atuais aprovadas; reproduções 1.8.11 e 1.8.12 confirmadas, uma delas com evidência): código final 0; em cada log uma interpretação, igual à do console; fontes ausentes listadas à parte', () => {
  const raiz = montar({ 'testar_etapa8_previa_envio.js@1.8.11': { codigo: 1, saida: 'Executados: 26 · 8 ok · 18 falhas · 0 pulados' }, 'testar_navegador_etapa8.js@1.8.11': { codigo: 1, saida: 'Executados: 27 · 1 ok · 26 falhas' }, 'testar_navegador_etapa8.js@1.8.12': REPRO_1812 });
  const r = rodar(raiz, { DIR_SRC_V1811: fonteAntiga(raiz, '1.8.11'), DIR_SRC_V1812: fonteAntiga(raiz, '1.8.12') });
  mostrar('C8', r);
  igual(r.codigo, 0, 'código final');
  const nomes = fs.readdirSync(r.logs).filter((f) => f.endsWith('.txt') && !/^evidencias_|^resumo/.test(f)).map((f) => f.replace(/\.txt$/, ''));
  const incoerentes = nomes.filter((n) => { const i = linhasInterpretacao(r.ler(n + '.txt')); const c = linhaConsole(r, n); return i.length !== 1 || !c.endsWith(i[0].replace('# interpretação: ', '')); });
  console.log('     [C8] ' + nomes.length + ' logs conferidos · incoerentes: ' + JSON.stringify(incoerentes) + ' · evidência da reprodução: ' + JSON.stringify((r.ler('etapa8_fonte_1.8.11_antes.txt') || '').match(/^# evidência: .*$/m)));
  igual(incoerentes, [], 'log e console coerentes, uma interpretação por log');
  verdade(/etapa8_fonte_1\.8\.11_antes: defeito demonstrado como previsto \(8\/26\)/.test(r.resumo) && /navegador_etapa8_fonte_1\.8\.12_antes: defeito demonstrado como previsto \(16\/27\)/.test(r.resumo), 'reproduções confirmadas');
  verdade(r.ler('evidencias_etapa8_fonte_1.8.11_antes.txt') !== null, 'evidência da reprodução copiada');   // controle neutro quanto ao formato do log (vale nas duas versões)
  verdade(/Não executadas[^\n]*\((1[0-9])\)/.test(r.resumo) && /DIR_SRC_V1813 não definido/.test(r.resumo), 'fontes ausentes listadas à parte');
});

teste('C9. o log de uma suíte não pode ser completado (o processo controlado troca o arquivo do log por uma pasta): ERRO de log no console (stderr) e no resumo, sem afirmar que o log foi concluído; rodada reprovada e as seguintes continuam', () => {
  const raiz = montar({ 'testar_backend.js@atual': { codigo: 0, saida: 'Executados: 42 (42 ok, 0 falha(s)); pulados: 0', logVirandoPasta: 'testar_backend.txt' } });
  const r = rodar(raiz);
  console.log('     [C9] código final ' + r.codigo + ' · stderr: ' + (r.stderr.split('\n').find((l) => /testar_backend/.test(l)) || '').slice(0, 170));
  verdade(r.codigo !== 0, 'código final não zero');
  verdade(/rodar_suites: testar_backend: ERRO de log — não foi possível completar o log/.test(r.stderr), 'erro no stderr');
  verdade(/testar_backend: ERRO de log/.test(r.resumo || '') && /testar_backend: código 0 — .*ERRO de log/.test(r.stdout), 'resumo e console');
  verdade(r.registro[r.registro.length - 1] === 'reproduzir_auditoria.js@atual', 'as seguintes executaram');
});

console.log('\nCondições de execução: executor sha256 ' + shaExecutor + '; ' + execucoesValidas + ' execução(ões) do executor iniciadas e terminadas com código de saída válido; ' + infra + ' erro(s) de infraestrutura.');
console.log('Executados: ' + (ok + falhas + infra) + ' · ' + ok + ' ok · ' + falhas + ' falhas · ' + pulados + ' pulados' + (infra ? ' · ' + infra + ' erro(s) de infraestrutura' : ''));
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
if (infra) { console.log('ERRO DE INFRAESTRUTURA: ' + infra + ' caso(s) não chegaram a verificar o executor; código 3 (não vale como aprovação nem como defeito demonstrado).'); process.exit(3); }
process.exit(falhas ? 1 : 0);

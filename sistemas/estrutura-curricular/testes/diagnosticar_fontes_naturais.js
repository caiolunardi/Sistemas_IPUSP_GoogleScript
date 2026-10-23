// DIAGNÓSTICO (não é a suíte determinística): o PDF misto sintético lido com as
// fontes e o hinting NATURAIS da máquina (LEITURA_NATURAL=1), sem o ambiente
// fixado de testar_pdf_misto_sintetico.js (ETAPA4_TESTES_MISTOS.md, seção 6.2).
// Roda a mesma suíte, com as mesmas asserções e o mesmo esperado, lê
// saida/misto_sintetico_diagnostico.json e classifica a execução:
//
//   EQUIVALENTE             as duas versões do PDF.js, nos dois cenários de fontes,
//                           dão o resultado acadêmico esperado, e a suíte passou inteira;
//   DIVERGÊNCIA ACADÊMICA   alguma leitura difere do esperado ou as versões diferem entre si
//                           (disciplinas, códigos, créditos, vínculos, requisitos, grupos,
//                           avisos ou conferência), ou outra asserção da suíte reprovou;
//   ERRO DE INFRAESTRUTURA  o diagnóstico não se completou (modelo ou fonte ausente, erro do
//                           navegador, leitura que não terminou, cenário B não preparado,
//                           registro ausente ou incompleto).
//
// Relatório em Markdown: saida/diagnostico_fontes_naturais.md (e no resumo do
// GitHub Actions, se GITHUB_STEP_SUMMARY existir); saída da suíte em
// saida/diagnostico_fontes_naturais.log.
// Uso: node diagnosticar_fontes_naturais.js   (HINTING_LEITURA=full força um hinting no Chromium)
// Código de saída: 0 = EQUIVALENTE; 1 = DIVERGÊNCIA ACADÊMICA; 3 = ERRO DE INFRAESTRUTURA.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SAIDA = path.join(__dirname, 'saida');
const JSON_DIAG = path.join(SAIDA, 'misto_sintetico_diagnostico.json');
const RELATORIO = path.join(SAIDA, 'diagnostico_fontes_naturais.md');
const LOG = path.join(SAIDA, 'diagnostico_fontes_naturais.log');
const VERSOES = ['3.11.174', '6.4.299'];
const CODIGOS = { EQUIVALENTE: 0, 'DIVERGÊNCIA ACADÊMICA': 1, 'ERRO DE INFRAESTRUTURA': 3 };

// ---------------------------------------------------------------------------
//  Diferenças legíveis entre dois resultados acadêmicos (formato de academico())
// ---------------------------------------------------------------------------

const CAMPOS_DISCIPLINA = ['código', 'nome', 'versão', 'créditos-aula', 'créditos-trabalho', 'CH', 'CE', 'CP', 'EXT', 'ATPA'];
const fmtReq = (q) => q[1] + ' v' + q[2] + ' (' + q[3] + ', grupo ' + q[4] + ')';
const json = (v) => JSON.stringify(v);

/**
 * Diferenças de "obtido" em relação a "base", agrupadas por assunto.
 * Devolve [[assunto, [linhas]]], só com os assuntos que têm diferença.
 */
function explicar(base, obtido) {
  const grupos = new Map([['Disciplinas e códigos', []], ['Créditos e cargas', []], ['Vínculos (tipo e período)', []],
    ['Requisitos e grupos', []], ['Avisos', []], ['Conferência', []], ['Curso, currículo e outros', []]]);
  const add = (g, l) => grupos.get(g).push(l);

  // Disciplinas, pelo código.
  const dBase = new Map(base.disciplinas.map((d) => [d[0], d]));
  const dObt = new Map(obtido.disciplinas.map((d) => [d[0], d]));
  for (const [c, d] of dBase) if (!dObt.has(c)) add('Disciplinas e códigos', 'faltou ' + c + ' (' + d[1] + ')');
  for (const [c, d] of dObt) if (!dBase.has(c)) add('Disciplinas e códigos', 'a mais: ' + c + ' (' + d[1] + ')');
  for (const [c, d] of dBase) {
    const o = dObt.get(c);
    if (!o) continue;
    for (let i = 1; i < CAMPOS_DISCIPLINA.length; i++) {
      if (json(d[i]) === json(o[i])) continue;
      add(i <= 2 ? 'Disciplinas e códigos' : 'Créditos e cargas', c + ': ' + CAMPOS_DISCIPLINA[i] + ' ' + json(d[i]) + ' → ' + json(o[i]));
    }
  }
  const ordemBase = base.disciplinas.map((d) => d[0]).filter((c) => dObt.has(c));
  const ordemObt = obtido.disciplinas.map((d) => d[0]).filter((c) => dBase.has(c));
  if (json(ordemBase) !== json(ordemObt)) add('Disciplinas e códigos', 'ordem diferente: ' + ordemBase.join(' ') + ' → ' + ordemObt.join(' '));
  if (json(base.naoConfirmados) !== json(obtido.naoConfirmados)) add('Créditos e cargas', 'campos não confirmados: ' + json(base.naoConfirmados) + ' → ' + json(obtido.naoConfirmados));

  // Vínculos, pela disciplina.
  const vBase = new Map(base.vinculos.map((v) => [v[0], v]));
  const vObt = new Map(obtido.vinculos.map((v) => [v[0], v]));
  for (const [c, v] of vBase) {
    const o = vObt.get(c);
    if (!o) add('Vínculos (tipo e período)', 'faltou o vínculo de ' + c + ' (' + v[1] + ', período ' + v[2] + ')');
    else if (json(v) !== json(o)) add('Vínculos (tipo e período)', c + ': ' + v[1] + ', período ' + v[2] + ' → ' + o[1] + ', período ' + o[2]);
  }
  for (const [c, o] of vObt) if (!vBase.has(c)) add('Vínculos (tipo e período)', 'vínculo a mais: ' + c + ' (' + o[1] + ', período ' + o[2] + ')');
  if (json(base.vinculosNaoConfirmados) !== json(obtido.vinculosNaoConfirmados)) add('Vínculos (tipo e período)', 'vínculos não confirmados ou de outro currículo: ' + json(base.vinculosNaoConfirmados) + ' → ' + json(obtido.vinculosNaoConfirmados));

  // Requisitos: iguais saem; depois, mesmo requisito em outra disciplina, outro grupo ou outro tipo.
  const restoBase = base.requisitos.slice();
  const restoObt = obtido.requisitos.slice();
  for (let i = restoBase.length - 1; i >= 0; i--) {
    const j = restoObt.findIndex((o) => json(o) === json(restoBase[i]));
    if (j >= 0) { restoBase.splice(i, 1); restoObt.splice(j, 1); }
  }
  const parear = (criterio, descrever) => {
    for (let i = restoBase.length - 1; i >= 0; i--) {
      const j = restoObt.findIndex((o) => criterio(restoBase[i], o));
      if (j < 0) continue;
      add('Requisitos e grupos', descrever(restoBase[i], restoObt[j]));
      restoBase.splice(i, 1); restoObt.splice(j, 1);
    }
  };
  parear((b, o) => b[0] === o[0] && b[1] === o[1], (b, o) => 'requisito ' + b[1] + ' de ' + b[0] + ': ' + fmtReq(b) + ' → ' + fmtReq(o));
  parear((b, o) => b[1] === o[1] && b[2] === o[2] && b[3] === o[3] && b[0] !== o[0], (b, o) => 'requisito ' + fmtReq(b) + ' ligado a ' + o[0] + ' em vez de ' + b[0]);
  for (const b of restoBase) add('Requisitos e grupos', 'faltou o requisito de ' + b[0] + ': ' + fmtReq(b));
  for (const o of restoObt) add('Requisitos e grupos', 'requisito a mais em ' + o[0] + ': ' + fmtReq(o));
  if (base.requisitosDeOutroCurriculo !== obtido.requisitosDeOutroCurriculo) add('Requisitos e grupos', 'requisitos de outro currículo: ' + base.requisitosDeOutroCurriculo + ' → ' + obtido.requisitosDeOutroCurriculo);

  // Avisos, como multiconjunto.
  const resto = obtido.avisos.slice();
  for (const a of base.avisos) { const j = resto.indexOf(a); if (j >= 0) resto.splice(j, 1); else add('Avisos', 'aviso que não apareceu: ' + a); }
  for (const a of resto) add('Avisos', 'aviso a mais: ' + a);

  for (const k of new Set([...Object.keys(base.conferencia), ...Object.keys(obtido.conferencia)])) {
    if (json(base.conferencia[k]) !== json(obtido.conferencia[k])) add('Conferência', k + ': ' + json(base.conferencia[k]) + ' → ' + json(obtido.conferencia[k]));
  }
  for (const k of ['curso', 'curriculos', 'geradoEm']) if (json(base[k]) !== json(obtido[k])) add('Curso, currículo e outros', k + ': ' + json(base[k]) + ' → ' + json(obtido[k]));
  return [...grupos].filter(([, l]) => l.length);
}

// ---------------------------------------------------------------------------
//  Classificação
// ---------------------------------------------------------------------------

/** { classe, motivos[], achados } a partir do código de saída da suíte e do JSON. */
function classificar(codigo, sinal, diag) {
  const infra = [];
  if (sinal) infra.push('a suíte foi interrompida pelo sinal ' + sinal);
  else if (codigo === 2) infra.push('a suíte não executou (código 2: modelo do OCR ou fonte das imagens ausente)');
  else if (codigo === 3) infra.push('a suíte terminou com erro de infraestrutura (código 3)');
  else if (codigo !== 0 && codigo !== 1) infra.push('código de saída inesperado da suíte: ' + codigo);
  if (!diag) infra.push('registro do diagnóstico ausente ou ilegível (' + path.relative(__dirname, JSON_DIAG) + ')');
  if (diag) {
    if (diag.ambiente && diag.ambiente.cenarioBNaoPreparado) infra.push('cenário B não preparado: ' + diag.ambiente.cenarioBNaoPreparado);
    const ids = (diag.cenarios || []).map((c) => c.id);
    for (const id of ['A', 'B']) if (!ids.includes(id)) infra.push('cenário ' + id + ' sem resultado');
    for (const c of diag.cenarios || []) for (const v of VERSOES) {
      const r = c.versoes && c.versoes[v];
      if (!r) infra.push('cenário ' + c.id + ' · ' + v + ': sem resultado');
      else if (!r.ok) infra.push('cenário ' + c.id + ' · ' + v + ': a leitura não terminou (' + r.mensagem + ')');
      else if (r.versaoCarregada !== v) infra.push('cenário ' + c.id + ' · ' + v + ': carregou o PDF.js ' + r.versaoCarregada);
    }
    if (!diag.testes) infra.push('a suíte não registrou o resultado das asserções');
  }
  if (infra.length) return { classe: 'ERRO DE INFRAESTRUTURA', motivos: infra };

  const motivos = [];
  for (const c of diag.cenarios) {
    for (const v of VERSOES) if (c.versoes[v].diferencasComEsperado.length) motivos.push('cenário ' + c.id + ' · ' + v + ': resultado diferente do esperado');
    if (c.entreVersoes.academicas.length) motivos.push('cenário ' + c.id + ': 3.11.174 e 6.4.299 dão resultados acadêmicos diferentes');
  }
  if (diag.testes.falharam) motivos.push(diag.testes.falharam + ' asserção(ões) da suíte reprovada(s)');
  if (codigo !== 0 && !diag.testes.falharam) motivos.push('a suíte terminou com código ' + codigo + ' sem asserção reprovada registrada');
  if (motivos.length) return { classe: 'DIVERGÊNCIA ACADÊMICA', motivos };
  return { classe: 'EQUIVALENTE', motivos: ['as duas versões, nos dois cenários, dão o resultado acadêmico esperado; ' + diag.testes.passaram + ' asserções passaram, nenhuma reprovou'] };
}

// ---------------------------------------------------------------------------
//  Relatório
// ---------------------------------------------------------------------------

function relatorio(cls, codigo, sinal, diag) {
  const L = [];
  const marca = { EQUIVALENTE: '✅', 'DIVERGÊNCIA ACADÊMICA': '❌', 'ERRO DE INFRAESTRUTURA': '⚠️' }[cls.classe];
  L.push('# Diagnóstico NÃO BLOQUEANTE — PDF misto com fontes naturais');
  L.push('');
  L.push('**Classificação: ' + marca + ' ' + cls.classe + '**');
  L.push('');
  L.push('Este diagnóstico não substitui nem altera a suíte determinística (`testar_pdf_misto_sintetico.js` com o ambiente fixado), ' +
    'que roda no job "Estrutura Curricular" da CI. Aqui a mesma suíte, com as mesmas asserções e o mesmo esperado, lê o PDF ' +
    'com as fontes e o hinting da máquina (`LEITURA_NATURAL=1`). Uma divergência aqui NÃO é teste aprovado.');
  L.push('');
  for (const m of cls.motivos) L.push('- ' + m);
  L.push('');
  L.push('Suíte: código de saída ' + (sinal ? 'sinal ' + sinal : codigo) + (diag && diag.testes ? ' · ' + diag.testes.passaram + ' passaram, ' + diag.testes.falharam + ' reprovaram' : ''));
  if (diag && diag.testes && diag.testes.reprovados.length) {
    L.push('');
    L.push('Asserções reprovadas:');
    for (const t of diag.testes.reprovados) L.push('- ' + t);
  }
  if (!diag) return L.join('\n') + '\n';

  const a = diag.ambiente || {};
  L.push('');
  L.push('## Ambiente de fontes usado');
  L.push('');
  L.push('| Item | Valor |');
  L.push('|---|---|');
  L.push('| Leitura | ' + a.leitura + ' |');
  L.push('| Argumentos do Chromium | `' + (a.argumentosChromium || []).join(' ') + '` |');
  L.push('| Chromium · Node · sistema | ' + [a.chromium, a.node, a.sistema].join(' · ') + ' |');
  for (const c of a.cenarios || []) {
    L.push('| Cenário ' + c.id + ' — fontconfig | ' + c.fontconfig + ' |');
    L.push('| Cenário ' + c.id + ' — "Helvetica" resolve para | ' + c.helvetica + ' |');
    L.push('| Cenário ' + c.id + ' — rasterização de "Helvetica" | `' + c.rasterizacaoHelvetica + '` |');
  }
  L.push('| PDF · modelo do OCR · fonte das imagens (sha256) | `' + [a.pdfSha256, a.modeloSha256, a.fonteImagensSha256].map((s) => String(s).slice(0, 16) + '…').join('` · `') + '` |');

  for (const c of diag.cenarios || []) {
    L.push('');
    L.push('## Cenário ' + c.id + ' — ' + c.nome);
    for (const v of VERSOES) {
      const r = c.versoes[v];
      L.push('');
      L.push('### PDF.js ' + v + ' × esperado');
      L.push('');
      if (!r || !r.ok) { L.push('Leitura não terminou: ' + (r ? r.mensagem : 'sem resultado')); continue; }
      L.push('Modo ' + r.modo + ' · ' + r.paginas + ' páginas · confiança do OCR ' + r.confiancaPorPagina.join(' / ') + ' · pixels escuros da página 1: ' + r.pixelsPagina1 +
        ' · conferência ' + Object.entries(r.academico.conferencia).map(([k, x]) => k + '=' + x).join(' ') + ' · avisos: ' + (r.academico.avisos.join(', ') || 'nenhum'));
      const numeros = r.segundaLeitura.filter((p) => json(p.esperado) !== json(p.lido));
      for (const p of numeros) L.push('- 2ª leitura dos números, página ' + p.pagina + ': esperado `' + p.esperado.join(' ') + '`, lido `' + p.lido.join(' ') + '`');
      // Linhas que o LeitorPdfJupiter não reconheceu (o aviso próprio só sai acima de 15).
      for (const n of r.linhasNaoReconhecidas || []) L.push('- linha não reconhecida, página ' + n.pagina + ': `' + String(n.texto).replace(/`/g, "'") + '`');
      const grupos = explicar(diag.esperado, r.academico);
      if (!grupos.length && !numeros.length) L.push('- igual ao esperado');
      for (const [g, linhas] of grupos) { L.push('- **' + g + '**'); for (const l of linhas) L.push('  - ' + l); }
    }
    L.push('');
    L.push('### 3.11.174 → 6.4.299');
    L.push('');
    if (!c.entreVersoes) { L.push('Sem comparação (alguma leitura não terminou).'); continue; }
    const grupos = explicar(c.versoes['3.11.174'].academico, c.versoes['6.4.299'].academico);
    if (!grupos.length) L.push('- mesmo resultado acadêmico');
    for (const [g, linhas] of grupos) { L.push('- **' + g + '**'); for (const l of linhas) L.push('  - ' + l); }
    const processo = c.entreVersoes.pacoteCompleto.filter((p) => !/^pacote\.(curso|curriculos|disciplinas|vinculos|requisitos|avisos)\b/.test(p));
    if (processo.length) L.push('- Outros campos do pacote que diferem (processo da leitura): ' + processo.slice(0, 20).map((p) => '`' + p + '`').join(', ') + (processo.length > 20 ? ' e mais ' + (processo.length - 20) : ''));
  }
  L.push('');
  L.push('Registro completo: `saida/misto_sintetico_diagnostico.json`; saída da suíte: `saida/diagnostico_fontes_naturais.log`.');
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------------

function rodarSuite() {
  return new Promise((resolve, reject) => {
    const log = fs.createWriteStream(LOG);
    const env = Object.assign({}, process.env, { LEITURA_NATURAL: '1' });
    const filho = spawn(process.execPath, [path.join(__dirname, 'testar_pdf_misto_sintetico.js')], { cwd: __dirname, env, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const s of [filho.stdout, filho.stderr]) s.on('data', (b) => { process.stdout.write(b); log.write(b); });
    filho.on('error', reject);
    filho.on('close', (codigo, sinal) => log.end(() => resolve({ codigo, sinal })));
  });
}

async function principal() {
  fs.mkdirSync(SAIDA, { recursive: true });
  for (const f of [JSON_DIAG, RELATORIO, LOG]) fs.rmSync(f, { force: true });
  console.log('== Diagnóstico NÃO BLOQUEANTE: PDF misto com fontes naturais (LEITURA_NATURAL=1)\n');
  const { codigo, sinal } = await rodarSuite();
  let diag = null;
  try { diag = JSON.parse(fs.readFileSync(JSON_DIAG, 'utf8')); } catch (e) { diag = null; }
  const cls = classificar(codigo, sinal, diag);
  const md = relatorio(cls, codigo, sinal, diag);
  fs.writeFileSync(RELATORIO, md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log('\n' + md);
  const anotacao = cls.classe === 'EQUIVALENTE' ? '::notice title=Diagnóstico de fontes naturais::' : '::error title=Diagnóstico de fontes naturais (não bloqueante)::';
  if (process.env.GITHUB_ACTIONS) console.log(anotacao + cls.classe + ' — ' + cls.motivos.join('; '));
  console.log('CLASSIFICAÇÃO: ' + cls.classe);
  process.exit(CODIGOS[cls.classe]);
}

if (require.main === module) principal().catch((e) => {
  // Falha do próprio diagnóstico: também é erro de infraestrutura, e fica no resumo.
  const md = '# Diagnóstico NÃO BLOQUEANTE — PDF misto com fontes naturais\n\n**Classificação: ⚠️ ERRO DE INFRAESTRUTURA**\n\n- o diagnóstico falhou: ' + String(e && e.message || e) + '\n';
  try { fs.writeFileSync(RELATORIO, md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); } catch (e2) { /* o erro original segue abaixo */ }
  console.error('ERRO DE INFRAESTRUTURA no diagnóstico:', e && e.stack || e);
  console.log('CLASSIFICAÇÃO: ERRO DE INFRAESTRUTURA');
  process.exit(3);
});

module.exports = { explicar, classificar, relatorio };

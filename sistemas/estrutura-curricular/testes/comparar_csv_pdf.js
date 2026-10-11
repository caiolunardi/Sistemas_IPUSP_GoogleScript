// Compara o que o CSV e o PDF (lido por OCR) dizem sobre a mesma estrutura.
// Uso: node comparar_csv_pdf.js <csv> <dir_tsv> [--json saida.json]
'use strict';
const fs = require('fs');
const { carregar, paginasDoTsv } = require('./carregar_leitores');

const [csvPath, tsvDir] = process.argv.slice(2);
const ctx = carregar();
const csv = ctx.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const paginas = paginasDoTsv(tsvDir, 'pg-', 300);
if (!process.argv.includes('--uma-leitura')) {
  const numericas = paginasDoTsv(tsvDir, 'num-', 300, 1445);
  paginas.forEach((p, i) => { if (numericas[i]) p.tokensNumericos = numericas[i].tokens; });
}
const t0 = Date.now();
const pdf = ctx.LeitorPdfJupiter.analisar(paginas, { modo: 'ocr', arquivo: 'grade_curricular.pdf' });
const ms = Date.now() - t0;

function porChave(lista, fn) { const m = {}; lista.forEach((x) => { m[fn(x)] = x; }); return m; }
const out = [];
const log = (...a) => { out.push(a.join(' ')); };

log('== CSV: avisos');
csv.avisos.forEach((a) => log(' ', a.nivel, a.codigo, a.mensagem, a.detalhe ? '| ' + a.detalhe : ''));
log('  resumo:', JSON.stringify(csv.resumoLeitura));
log('== PDF (OCR): avisos  [análise em', ms, 'ms]');
pdf.avisos.forEach((a) => log(' ', a.nivel, a.codigo, a.mensagem, a.detalhe ? '| ' + a.detalhe.slice(0, 400) : ''));
const c = pdf.conferencia;
log('  conferência:', JSON.stringify(Object.assign({}, c, { itens: c.itens.length, linhasNaoReconhecidas: c.linhasNaoReconhecidas.length })));
log('  linhas não reconhecidas:');
c.linhasNaoReconhecidas.forEach((l) => log('    p' + l.pagina + ':', l.texto.slice(0, 120)));
log('  itens corrigidos/conferir:');
c.itens.forEach((i) => log('    p' + i.pagina, i.curriculo.slice(5, 9), i.codigo, i.campo, 'lido="' + i.lido + '"', '→', i.valor, i.situacao, '(' + i.motivo + ')'));

log('== Currículos');
const curCsv = porChave(csv.curriculos, (x) => x.codigo), curPdf = porChave(pdf.curriculos, (x) => x.codigo);
Object.keys(Object.assign({}, curCsv, curPdf)).sort().forEach((k) => {
  log(' ', k, 'CSV:', curCsv[k] ? JSON.stringify({ hab: curCsv[k].habilitacao, nome: curCsv[k].habilitacaoNome, aac: curCsv[k].aacHoras, aacPct: curCsv[k].aacPercentual }) : '—');
  log('   ', 'PDF:', curPdf[k] ? JSON.stringify({ hab: curPdf[k].habilitacao, nome: curPdf[k].habilitacaoNome, situacao: curPdf[k].situacao, aac: curPdf[k].aacHoras, info: curPdf[k].info }) : '—');
});

log('== Vínculos por currículo');
const vCsv = porChave(csv.vinculos, (v) => v.curriculo + '|' + v.disciplina);
const vPdf = porChave(pdf.vinculos, (v) => v.curriculo + '|' + v.disciplina);
const soCsv = Object.keys(vCsv).filter((k) => !vPdf[k]);
const soPdf = Object.keys(vPdf).filter((k) => !vCsv[k]);
log('  CSV:', Object.keys(vCsv).length, 'PDF:', Object.keys(vPdf).length, 'só no CSV:', soCsv.length, 'só no PDF:', soPdf.length);
soCsv.forEach((k) => log('    só CSV', k));
soPdf.forEach((k) => log('    só PDF', k));
let difTipo = 0, difPer = 0;
Object.keys(vCsv).filter((k) => vPdf[k]).forEach((k) => {
  if (vCsv[k].tipo !== vPdf[k].tipo) { difTipo++; log('    tipo', k, vCsv[k].tipo, vPdf[k].tipo); }
  if (vCsv[k].periodoIdeal !== vPdf[k].periodoIdeal) { difPer++; log('    período', k, vCsv[k].periodoIdeal, vPdf[k].periodoIdeal, vPdf[k].periodoConfirmado ? '(confirmado!)' : '(não confirmado)'); }
});
log('  tipos diferentes:', difTipo, ' períodos diferentes:', difPer);

log('== Disciplinas');
const dCsv = porChave(csv.disciplinas, (d) => d.codigo), dPdf = porChave(pdf.disciplinas, (d) => d.codigo);
const campos = ['creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'atpa'];
let difs = 0, naoConf = 0, nomesIguais = 0, nomesPrefixo = 0, nomesDif = 0;
Object.keys(dCsv).forEach((k) => {
  const a = dCsv[k], b = dPdf[k];
  if (!b) { log('    sem PDF', k); return; }
  campos.forEach((f) => {
    if (b[f] == null) { naoConf++; return; }
    if (a[f] !== b[f]) { difs++; log('    DIF', k, f, 'csv=' + a[f], 'pdf=' + b[f], b.naoConfirmados.includes(f) ? '' : '(confirmado pelo OCR!)'); }
  });
  const na = a.nome.toLowerCase(), nb = (b.nome || '').toLowerCase();
  if (na === nb) nomesIguais++;
  else if (na.startsWith(nb)) nomesPrefixo++;
  else { nomesDif++; if (nomesDif <= 25) log('    nome', k, JSON.stringify(a.nome), '| pdf:', JSON.stringify(b.nome)); }
});
log('  diferenças em números confirmados:', difs, ' números não confirmados:', naoConf);
log('  nomes: iguais', nomesIguais, 'PDF cortado (prefixo)', nomesPrefixo, 'diferentes', nomesDif);
const ext = pdf.disciplinas.filter((d) => d.ext != null);
log('  EXT confirmado em', ext.length, 'de', pdf.disciplinas.length, '; com EXT > 0:', ext.filter((d) => d.ext > 0).length);
const ver = pdf.disciplinas.filter((d) => d.versao != null);
log('  versão confirmada em', ver.length, 'de', pdf.disciplinas.length);
let verDif = 0;
csv.disciplinas.forEach((d) => { if (d.versao != null && dPdf[d.codigo] && dPdf[d.codigo].versao != null && d.versao !== dPdf[d.codigo].versao) { verDif++; log('    versão diferente', d.codigo, 'csv(req)=' + d.versao, 'pdf=' + dPdf[d.codigo].versao); } });
log('  versões (CSV via requisito) conferidas com o PDF: diferenças', verDif);

log('== Requisitos');
const rCsv = porChave(csv.requisitos, (r) => r.curriculo + '|' + r.disciplina + '|' + r.requisito);
const rPdf = porChave(pdf.requisitos, (r) => r.curriculo + '|' + r.disciplina + '|' + r.requisito);
const rSoCsv = Object.keys(rCsv).filter((k) => !rPdf[k]), rSoPdf = Object.keys(rPdf).filter((k) => !rCsv[k]);
log('  CSV:', Object.keys(rCsv).length, 'PDF:', Object.keys(rPdf).length, 'só CSV:', rSoCsv.length, 'só PDF:', rSoPdf.length);
rSoCsv.slice(0, 20).forEach((k) => log('    só CSV', k));
rSoPdf.slice(0, 20).forEach((k) => log('    só PDF', k));
let rv = 0;
Object.keys(rCsv).filter((k) => rPdf[k]).forEach((k) => { if (rCsv[k].versaoRequisito !== rPdf[k].versaoRequisito) { rv++; log('    versão do requisito', k, rCsv[k].versaoRequisito, rPdf[k].versaoRequisito); } });
log('  versões de requisito diferentes:', rv);
// grupos "ou"
const gruposOu = {};
pdf.requisitos.forEach((r) => { const k = r.curriculo + '|' + r.disciplina + '|' + r.grupo; gruposOu[k] = (gruposOu[k] || 0) + 1; });
const ou = Object.keys(gruposOu).filter((k) => gruposOu[k] > 1);
log('  grupos "ou" (2+ alternativas):', ou.length, ou.slice(0, 6).join(' ; '));

process.stdout.write(out.join('\n') + '\n');
if (process.argv.includes('--json')) {
  fs.writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify({ csv, pdf }, null, 1));
}

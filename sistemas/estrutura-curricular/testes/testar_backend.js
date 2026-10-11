// Testes do backend (Apps Script simulado) com os arquivos reais do Júpiter.
// Uso: node testar_backend.js <csv> <paginas_ocr.json | pasta_com_tsv>
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirPaginasRevisao } = require('./apoio_revisao');
const { criarAmbiente } = require('./mockGoogle');
const { carregar, paginasDoTsv } = require('./carregar_leitores');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const [csvPath, tsvDir] = process.argv.slice(2);

let ok = 0, falhas = 0;
const falhou = [];
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

// ---------- pacotes ----------
const leitores = carregar();
const bytesCsv = new Uint8Array(fs.readFileSync(csvPath));
const pacoteCsv = () => JSON.parse(JSON.stringify(leitores.LeitorCsvJupiter.lerBytes(bytesCsv, 'grade_curricular.csv')));
// Palavras do PDF lidas por OCR: um JSON gerado por gerar_paginas_ocr.js
// (OCR no navegador, igual ao painel) ou uma pasta com os TSV do
// Tesseract de linha de comando (pg-NN.tsv = página inteira; num-NN.tsv =
// faixa dos números recortada a partir de x = 1445 px, a 300 dpi).
let paginas;
if (/\.json$/i.test(tsvDir)) {
  paginas = JSON.parse(fs.readFileSync(tsvDir, 'utf8')).paginas;
} else {
  paginas = paginasDoTsv(tsvDir, 'pg-', 300);
  const numericas = paginasDoTsv(tsvDir, 'num-', 300, 1445);
  paginas.forEach((p, i) => { p.tokensNumericos = numericas[i].tokens; });
}
const pacotePdfOriginal = leitores.LeitorPdfJupiter.analisar(paginas, { modo: 'ocr', arquivo: 'grade_curricular.pdf' });
function paraServidor(pac) {
  const c = JSON.parse(JSON.stringify(pac));
  if (c.conferencia) { delete c.conferencia.itens; delete c.conferencia.linhasNaoReconhecidas; }
  return c;
}
const pacotePdf = () => paraServidor(pacotePdfOriginal);

function pedirOk(r) { if (!r.ok) throw new Error(r.codigo + ': ' + r.erro); return r.dados; }
function aba(amb, nome) {
  const s = amb.estrutura().getSheetByName(nome);
  const v = s.getRange(1, 1, Math.max(1, s.getLastRow()), Math.max(1, s.getLastColumn())).getValues();
  const cab = v[0];
  return v.slice(1).map((l) => { const o = {}; cab.forEach((t, i) => { o[t] = l[i]; }); return o; });
}
function importar(amb, pacote) {
  const prev = amb.ctx.prepararImportacao(pacote);
  if (!prev.ok) throw new Error('prévia falhou: ' + prev.erro);
  if (!prev.dados.podeGravar) throw new Error('bloqueada: ' + prev.dados.bloqueios.join(' | '));
  abrirPaginasRevisao(amb, prev.dados);
  const r = amb.ctx.confirmarImportacao(pacote, prev.dados.assinatura, { operacao: prev.dados.operacao, revisaoPdf: true, previa: prev.dados.impressao });
  if (!r.ok) throw new Error('confirmação falhou: ' + r.erro);
  return { prev: prev.dados, res: r.dados };
}

console.log('\n== Acesso e preparação da planilha');
// 1.7.0: permissões pela planilha PERMISSOES_DE_ACESSO (aba ESTRUTURA_CURRICULAR, C = e-mail, E = Perfil)
const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example', permissoes: [['secretaria@unidade.example', 'LEITOR'], ['colega@unidade.example', 'ADMINISTRADOR']] });

teste('leitor antes da preparação recebe orientação', () => {
  amb.trocarUsuario('secretaria@unidade.example');
  const r = amb.ctx.obterDadosPainel();
  igual(r.ok, false); igual(r.codigo, 'BASE_NAO_PREPARADA');
});
teste('conta fora da aba de permissões é recusada (mesmo do mesmo domínio)', () => {
  amb.trocarUsuario('outra.pessoa@unidade.example');
  igual(amb.ctx.obterDadosPainel().codigo, 'SEM_ACESSO');
});
teste('conta de fora do domínio é recusada', () => {
  amb.trocarUsuario('alguem@externo.example');
  const r = amb.ctx.obterDadosPainel();
  igual(r.codigo, 'SEM_ACESSO');
});
teste('conta não identificada é recusada', () => {
  amb.trocarUsuario('');
  igual(amb.ctx.obterDadosPainel().codigo, 'SEM_CONTA');
});
teste('dono abre o painel: abas criadas', () => {
  amb.trocarUsuario('dono@unidade.example');
  const r = amb.ctx.obterDadosPainel();
  verdade(r.ok, r.erro);
  igual(r.dados.usuario.papel, 'admin');
  igual(amb.estrutura().getSheets().map((s) => s.getName()), ['Sobre', 'Disciplinas', 'Disciplinas por habilitação', 'Requisitos', 'Currículos', 'Importações', 'Alterações', 'Ajustes manuais', 'Disciplinas para outros cursos']);
  verdade(r.dados.planilhaPreparadaAgora.length === 9, 'criadas=' + JSON.stringify(r.dados.planilhaPreparadaAgora));
  igual(r.dados.base.disciplinas.length, 0);
});
teste('cabeçalhos com notas e proteção só com aviso', () => {
  const s = amb.estrutura().getSheetByName('Disciplinas');
  igual(s.getRange(1, 1, 1, 3).getValues()[0], ['Código', 'Nome', 'Departamento']);
  verdade(s.getRange(1, 1).getNote().length > 10, 'nota');
  verdade(s.getProtections()[0].isWarningOnly(), 'aviso');
  igual(s.getProtections()[0].getUnprotectedRanges()[0].getColumn(), 22, 'Observações livre');
  igual(amb.estrutura().getSheetByName('Currículos').getLastColumn(), 39);
});
teste('segunda abertura não recria nada', () => {
  const r = amb.ctx.obterDadosPainel();
  igual(r.dados.planilhaPreparadaAgora, null);
});
teste('leitor não pode importar', () => {
  amb.trocarUsuario('secretaria@unidade.example');
  const r = amb.ctx.prepararImportacao(pacoteCsv());
  igual(r.codigo, 'SO_ADMIN');
  amb.trocarUsuario('dono@unidade.example');
});
teste('administrador da lista pode importar (prévia)', () => {
  amb.trocarUsuario('colega@unidade.example');
  const r = amb.ctx.prepararImportacao(pacoteCsv());
  verdade(r.ok, r.erro);
  amb.trocarUsuario('dono@unidade.example');
});

console.log('\n== Primeira importação (CSV)');
let previaCsv;
teste('prévia do CSV', () => {
  const r = amb.ctx.prepararImportacao(pacoteCsv());
  verdade(r.ok, r.erro);
  previaCsv = r.dados;
  igual(previaCsv.podeGravar, true);
  igual(previaCsv.primeiraCarga, true);
  igual(previaCsv.curriculos.map((c) => [c.habilitacao, c.modo, c.disciplinas]), [['Psicólogo', 'completo', 169], ['Bacharelado', 'completo', 168], ['Licenciatura', 'completo', 61]]);
  igual(previaCsv.totais.novas, 183);
  igual(amb.estrutura().getSheetByName('Disciplinas').getLastRow(), 1, 'prévia não grava');
});
teste('assinatura errada é recusada', () => {
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), 'x');
  igual(r.codigo, 'PREVIA_DESATUALIZADA');
});
teste('outra importação em andamento', () => {
  const a2 = criarAmbiente({ dirSrc: DIR_SRC, travaOcupada: true });
  igual(a2.ctx.confirmarImportacao(pacoteCsv(), 'x').codigo, 'OCUPADO');
});
teste('gravação do CSV', () => {
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), previaCsv.assinatura);
  verdade(r.ok, r.erro);
  const d = aba(amb, 'Disciplinas');
  igual(d.length, 183);
  igual(aba(amb, 'Disciplinas por habilitação').length, 398);
  igual(aba(amb, 'Requisitos').length, 238);
  igual(aba(amb, 'Currículos').length, 3);
  igual(aba(amb, 'Importações').length, 1);
  const alt = aba(amb, 'Alterações');
  igual(alt.length, 1); igual(alt[0]['O que mudou'], 'Carga inicial');
});
teste('códigos e currículo gravados como texto (zero à esquerda)', () => {
  const d = aba(amb, 'Disciplinas');
  const neuro = d.find((x) => x['Código'] === '0420130');
  verdade(neuro, 'achou 0420130 como texto');
  igual(neuro['Departamento'], 'Outra unidade');
  const cur = aba(amb, 'Currículos');
  igual(cur.map((c) => c['Currículo']), ['470120000262', '470120100262', '470120200262']);
  igual(cur.map((c) => c['Cadastrado em']), ['2026/2', '2026/2', '2026/2']);
});
teste('campos derivados de uma disciplina', () => {
  const d = aba(amb, 'Disciplinas').find((x) => x['Código'] === 'PST1767');
  igual(d['Habilitações'], 'Psicólogo · Bacharelado · Licenciatura');
  igual(d['Semestre de oferecimento'], '1º e 2º semestres');
  igual(d['Tipo e período por habilitação'], 'Psicólogo: Obrigatória, 8º período · Bacharelado: Obrigatória, 8º período · Licenciatura: Obrigatória, 7º período');
  igual(d['Situação'], 'Na estrutura atual');
  const psa = aba(amb, 'Disciplinas').find((x) => x['Código'] === 'PSA1302');
  igual([psa['Créditos-aula'], psa['Créditos-trabalho'], psa['Créditos (total)'], psa['CH total (h)'], psa['Versão'], psa['Origem da versão']], [3, 1, 4, 75, 4, 'CSV (requisito)']);
  igual(psa['Extensão – EXT (h)'], '', 'EXT ainda vazio');
});
teste('requisitos: relação "não informada" só com o CSV', () => {
  const r = aba(amb, 'Requisitos').filter((x) => x['Disciplina'] === 'PSE2355' && x['Habilitação'] === 'Bacharelado');
  igual(r.length, 4);
  igual(r[0]['Relação'], 'Não informado (só CSV)');
  const fora = aba(amb, 'Requisitos').find((x) => x['Requisito (código)'] === '4705282');
  igual(fora['Requisito na estrutura?'], 'Não');
});
teste('AAC no currículo, não na disciplina', () => {
  const cur = aba(amb, 'Currículos');
  igual(cur.map((c) => [c['AAC exigida (h)'], c['AAC (%)']]), [[60, 1.55], [60, 1.45], [0, 0]]);
});
teste('painel recebe a base', () => {
  const r = amb.ctx.obterDadosPainel();
  verdade(r.ok, r.erro);
  igual([r.dados.base.disciplinas.length, r.dados.base.vinculos.length, r.dados.base.requisitos.length, r.dados.base.curriculos.length], [183, 398, 238, 3]);
  igual(r.dados.importacoes.length, 1);
  verdade(JSON.stringify(r.dados).indexOf('ID_ESTRUTURA_TESTE') < 0, 'ID não vai ao navegador');
});
teste('leitor vê importações sem e-mail', () => {
  amb.trocarUsuario('secretaria@unidade.example');
  const r = amb.ctx.obterDadosPainel();
  verdade(r.ok, r.erro); igual(r.dados.usuario.papel, 'leitor'); igual(r.dados.importacoes[0].usuario, '');
  amb.trocarUsuario('dono@unidade.example');
});

console.log('\n== PDF (OCR) como complemento');
let previaPdf;
teste('prévia do PDF: complemento dos 3 currículos, sem divergências', () => {
  const r = amb.ctx.prepararImportacao(pacotePdf());
  verdade(r.ok, r.erro);
  previaPdf = r.dados;
  igual(previaPdf.podeGravar, true, previaPdf.bloqueios.join('|'));
  igual(previaPdf.curriculos.map((c) => c.modo), ['complemento', 'complemento', 'complemento']);
  igual(previaPdf.totais.divergencias, 0, JSON.stringify(previaPdf.mudancas.divergencias.slice(0, 5)));
  igual([previaPdf.totais.novas, previaPdf.totais.alteradas, previaPdf.totais.sairam], [0, 0, 0]);
  igual(previaPdf.complementos.versoes, 183);
  igual(previaPdf.complementos.ext, 183);
  igual(previaPdf.complementos.infoCurriculos, 3);
  verdade(previaPdf.complementos.gruposOu > 0, 'grupos ou');
});
teste('PDF por OCR: sem a revisão humana dos valores exclusivos, nada é gravado', () => {
  verdade(previaPdf.revisao.necessaria, 'revisão necessária');
  igual([previaPdf.revisao.total, previaPdf.revisao.paginas, previaPdf.revisao.itens.length], [386, 4, 100], 'lista completa em 4 páginas de 100');
  const todos = abrirPaginasRevisao(amb, previaPdf);
  igual(todos.length, 386, 'todos os itens acessíveis');
  const tipos = {}; todos.forEach((i) => { tipos[i.tipo] = (tipos[i.tipo] || 0) + 1; });
  const ordenado = (o) => Object.keys(o).sort().reduce((a, k) => { a[k] = o[k]; return a; }, {});
  igual(ordenado(tipos), ordenado({ 'EXT': 183, 'Versão': 137, 'Informações do currículo': 66 }), 'itens de revisão (22 campos × 3 currículos; AAC já veio do CSV e desativação está vazia)');
  previaPdf.infoConferencia.forEach((ic) => { igual(ic.inconsistentes, 0, ic.habilitacao); igual(ic.relacoes.filter((r) => r.situacao === 'falha').length, 0); igual(ic.relacoes.filter((r) => r.situacao === 'ok').length, 11, ic.habilitacao + ' contas'); });
  igual(ordenado(previaPdf.revisao.resumo.porTipo), ordenado(tipos), 'resumo por tipo = lista');
  igual(previaPdf.revisao.resumo.extZero, 159, 'EXT = 0 resumidos (183 − 24)');
  const psc = todos.find((i) => i.tipo === 'EXT' && i.codigo === 'PSC1322');
  igual([psc.valor, psc.anterior, psc.paginas.length > 0], [10, null, true]);
  const r = amb.ctx.confirmarImportacao(pacotePdf(), previaPdf.assinatura, { operacao: previaPdf.operacao });
  igual(r.codigo, 'REVISAO_PENDENTE');
  igual(aba(amb, 'Importações').length, 1, 'nada gravado');
});
teste('gravação do PDF completa EXT, versão, grupos e informações', () => {
  const r = amb.ctx.confirmarImportacao(pacotePdf(), previaPdf.assinatura, { operacao: previaPdf.operacao, revisaoPdf: true });
  verdade(r.ok, r.erro);
  const d = aba(amb, 'Disciplinas');
  const psc = d.find((x) => x['Código'] === 'PSC1322');
  igual([psc['Versão'], psc['Origem da versão'], psc['Extensão – EXT (h)']], [7, 'PDF', 10]);
  igual(d.filter((x) => x['Extensão – EXT (h)'] > 0).length, 24);
  igual(psc['Nome'], 'Introdução à Psicopatologia', 'nome do CSV mantido');
  const req = aba(amb, 'Requisitos').filter((x) => x['Disciplina'] === 'PSE2355' && x['Habilitação'] === 'Bacharelado');
  igual(req.map((x) => x['Grupo']), [1, 1, 1, 1]);
  igual(req[0]['Relação'], 'Ou — basta um do grupo 1');
  const psc2 = aba(amb, 'Requisitos').filter((x) => x['Disciplina'] === 'PSC1322' && x['Habilitação'] === 'Bacharelado');
  igual(psc2.map((x) => x['Relação']), ['E — exigido junto com os demais', 'E — exigido junto com os demais']);
  const of = aba(amb, 'Disciplinas por habilitação').find((x) => x['Código'] === 'PSE2355' && x['Habilitação'] === 'Bacharelado');
  igual(of['Requisitos'], '(PSE2252 ou PSE2254 ou PSE2256 ou PSE2258)');
  const cur = aba(amb, 'Currículos').find((x) => x['Habilitação'] === 'Bacharelado');
  igual([cur['Duração ideal (sem.)'], cur['CH em disciplinas (h)'], cur['Extensão exigida (h)'], cur['Extensão exigida (%)'], cur['Total geral (h)'], cur['Ativação']], [8, 4500, 465, 10.2, 4895, '15/07/2026']);
  verdade(String(cur['Informações específicas']).indexOf('Bacharel') >= 0, 'texto');
  igual(aba(amb, 'Importações').length, 2);
});

console.log('\n== Reimportação e mudanças');
teste('mesmo CSV de novo: nada muda, grupos "ou" e EXT preservados', () => {
  const { prev } = importar(amb, pacoteCsv());
  igual([prev.totais.novas, prev.totais.alteradas, prev.totais.sairam, prev.totais.ofertas, prev.totais.requisitos], [0, 0, 0, 0, 0]);
  const req = aba(amb, 'Requisitos').filter((x) => x['Disciplina'] === 'PSE2355' && x['Habilitação'] === 'Bacharelado');
  igual(req.map((x) => x['Grupo']), [1, 1, 1, 1]);
  const psc = aba(amb, 'Disciplinas').find((x) => x['Código'] === 'PSC1322');
  igual([psc['Versão'], psc['Origem da versão'], psc['Extensão – EXT (h)']], [7, 'PDF', 10]);
});
teste('Observações e coluna extra sobrevivem à importação', () => {
  const s = amb.estrutura().getSheetByName('Disciplinas');
  const cab = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  const linhas = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().map((l) => l[0]);
  const lin = linhas.indexOf('PSA2515') + 2;
  s.getRange(lin, cab.indexOf('Observações') + 1).setValue('Ministrada para a FEA');
  s.insertColumnsAfter(s.getMaxColumns(), 1);
  s.getRange(1, cab.length + 1).setValue('Minha coluna');
  s.getRange(lin, cab.length + 1).setValue('x');
  importar(amb, pacoteCsv());
  const d = aba(amb, 'Disciplinas').find((x) => x['Código'] === 'PSA2515');
  igual([d['Observações'], d['Minha coluna']], ['Ministrada para a FEA', 'x']);
  const r = amb.ctx.obterDadosPainel();
  igual(r.dados.base.disciplinas.find((x) => x.codigo === 'PSA2515').observacoes, 'Ministrada para a FEA');
});
teste('colunas reordenadas continuam sendo lidas pelo título', () => {
  const s = amb.estrutura().getSheetByName('Disciplinas');
  const n = s.getLastRow(), m = s.getLastColumn();
  const v = s.getRange(1, 1, n, m).getValues();
  const troca = v.map((l) => { const c = l.slice(); const t = c[1]; c[1] = c[2]; c[2] = t; return c; });
  s.getRange(1, 1, n, m).setValues(troca.map((l) => l.map((x) => (typeof x === 'string' && /^\d/.test(x) ? "'" + x : x))));
  const { prev } = importar(amb, pacoteCsv());
  igual([prev.totais.novas, prev.totais.alteradas], [0, 0]);
  const d = aba(amb, 'Disciplinas').find((x) => x['Código'] === 'PSA1302');
  igual(d['Nome'], 'Psicologia da Personalidade: Fundamentos');
});

function csvModificado() {
  const p = pacoteCsv();
  // nova estrutura 2027/1 do Bacharelado, com mudanças
  const antigo = '470120100262', novo = '470120100271';
  p.curriculos = p.curriculos.filter((c) => c.codigo === antigo).map((c) => Object.assign(c, { codigo: novo, ano: 2027, semestre: 1 }));
  p.vinculos = p.vinculos.filter((v) => v.curriculo === antigo).map((v) => Object.assign(v, { curriculo: novo }));
  p.requisitos = p.requisitos.filter((r) => r.curriculo === antigo).map((r) => Object.assign(r, { curriculo: novo }));
  // 1) créditos alterados
  p.disciplinas.find((d) => d.codigo === 'PSA1200').creditosTrabalho = 3;
  p.disciplinas.find((d) => d.codigo === 'PSA1200').ch = 135;
  // 2) disciplina só do Bacharelado sai (4701885 só existe no Bach. e Psicólogo; tiramos do Bach.)
  p.vinculos = p.vinculos.filter((v) => v.disciplina !== 'PSA3311');
  p.requisitos = p.requisitos.filter((r) => r.disciplina !== 'PSA3311');
  // 3) oferta alterada
  p.vinculos.find((v) => v.disciplina === 'PSE3452').tipo = 'OBRIGATORIA';
  // 4) nova disciplina
  p.disciplinas.push({ codigo: 'PSE9999', nome: '=HYPERLINK("x") Disciplina nova', versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 });
  p.vinculos.push({ curriculo: novo, disciplina: 'PSE9999', tipo: 'OPTATIVA_LIVRE', periodoIdeal: 3 });
  // 5) requisito novo
  p.requisitos.push({ curriculo: novo, disciplina: 'PSE3452', requisito: 'PSE1141', versaoRequisito: 3, nomeRequisito: 'Etologia', tipoRequisito: 'Requisito', grupo: null });
  p.disciplinas = p.disciplinas.filter((d) => p.vinculos.some((v) => v.disciplina === d.codigo));
  return p;
}
teste('estrutura nova do Bacharelado: prévia mostra as mudanças', () => {
  const r = amb.ctx.prepararImportacao(csvModificado());
  verdade(r.ok, r.erro);
  const pv = r.dados;
  igual(pv.curriculos.map((c) => [c.codigo, c.modo, c.substitui]), [['470120100271', 'completo', '470120100262']]);
  igual(pv.mudancas.novas.map((n) => n.codigo), ['PSE9999']);
  igual(pv.mudancas.alteradas.map((a) => [a.codigo, a.campos.map((c) => c.campo + ':' + c.antes + '→' + c.depois).join(',')]), [['PSA1200', 'Créditos-trabalho:2→3,CH total (h):105→135']]);
  igual(pv.mudancas.ofertas.map((o) => [o.codigo, o.habilitacao, o.tipo, o.antes, o.depois]), [
    ['PSA3311', 'Bacharelado', 'Removida da habilitação', 'Optativa livre, 3º período', '—'],
    ['PSE3452', 'Bacharelado', 'Oferta alterada', 'Optativa livre, 4º período', 'Obrigatória, 4º período']
  ]);
  igual(pv.mudancas.requisitos.map((q) => [q.codigo, q.antes, q.depois]), [['PSE3452', 'PSE1140', 'PSE1140, PSE1141']]);
  igual(pv.totais.sairam, 0, 'PSA3311 continua no Psicólogo');
});
teste('gravação da estrutura nova', () => {
  const { res } = importar(amb, csvModificado());
  igual(res.totais.novas, 1);
  const cur = aba(amb, 'Currículos');
  igual(cur.map((c) => [c['Currículo'], String(c['Na base atual']).slice(0, 3)]), [['470120000262', 'Sim'], ['470120100271', 'Sim'], ['470120200262', 'Sim'], ['470120100262', 'Não']]);
  const nova = aba(amb, 'Disciplinas').find((x) => x['Código'] === 'PSE9999');
  igual(nova['Nome'], '=HYPERLINK("x") Disciplina nova', 'fórmula gravada como texto');
  const alt = aba(amb, 'Alterações').map((a) => a['O que mudou']);
  ['Nova disciplina', 'Dado alterado', 'Removida da habilitação', 'Oferta alterada', 'Requisitos alterados', 'Currículo substituído'].forEach((t) => verdade(alt.includes(t), 'faltou ' + t));
  // grupos "ou" do Bacharelado antigo não passam para o currículo novo (outro número)
  const req = aba(amb, 'Requisitos').filter((x) => x['Disciplina'] === 'PSE2355' && x['Habilitação'] === 'Bacharelado');
  igual(req.map((x) => x['Grupo']), ['', '', '', '']);
});
teste('disciplina que sai de todas as habilitações fica "Fora da estrutura"', () => {
  const p = pacoteCsv();
  const tirar = '4701885'; // Trabalho de Pesquisa em Psicologia II (Psicólogo e Bacharelado)
  // reimporta só o Psicólogo sem ela e o Bacharelado novo sem ela
  const pBach = csvModificado();
  pBach.vinculos = pBach.vinculos.filter((v) => v.disciplina !== tirar);
  pBach.requisitos = pBach.requisitos.filter((r) => r.disciplina !== tirar);
  pBach.disciplinas = pBach.disciplinas.filter((d) => d.codigo !== tirar);
  importar(amb, pBach);
  const cur = '470120000262';
  p.curriculos = p.curriculos.filter((c) => c.codigo === cur);
  p.vinculos = p.vinculos.filter((v) => v.curriculo === cur && v.disciplina !== tirar);
  p.requisitos = p.requisitos.filter((r) => r.curriculo === cur && r.disciplina !== tirar);
  p.disciplinas = p.disciplinas.filter((d) => p.vinculos.some((v) => v.disciplina === d.codigo));
  const { prev } = importar(amb, p);
  igual(prev.mudancas.sairam.map((s) => s.codigo), [tirar]);
  const d = aba(amb, 'Disciplinas').find((x) => x['Código'] === tirar);
  igual(d['Situação'], 'Fora da estrutura atual');
  verdade(String(d['Habilitações']).length > 0, 'mantém o último resumo');
});
teste('estrutura mais antiga é recusada', () => {
  const p = pacoteCsv();
  const r = amb.ctx.prepararImportacao(p); // Bacharelado 262 < 271 da base
  verdade(r.ok, r.erro);
  igual(r.dados.podeGravar, false);
  verdade(r.dados.bloqueios[0].indexOf('mais antiga') >= 0, r.dados.bloqueios[0]);
  const c = amb.ctx.confirmarImportacao(p, r.dados.assinatura);
  igual(c.codigo, 'BLOQUEADA');
});

console.log('\n== PDF sozinho numa base vazia');
teste('PDF por OCR com tudo confirmado pode ser a primeira importação', () => {
  const a2 = criarAmbiente({ dirSrc: DIR_SRC });
  a2.ctx.obterDadosPainel();
  const { prev } = importar(a2, pacotePdf());
  igual(prev.curriculos.map((c) => c.modo), ['completo', 'completo', 'completo']);
  const d = aba(a2, 'Disciplinas');
  igual(d.length, 183);
  const psc = d.find((x) => x['Código'] === 'PSC1322');
  igual([psc['Créditos-aula'], psc['CH total (h)'], psc['Extensão – EXT (h)'], psc['Versão']], [3, 105, 10, 7]);
});
teste('PDF por OCR com número não confirmado é bloqueado numa base vazia', () => {
  const a2 = criarAmbiente({ dirSrc: DIR_SRC });
  a2.ctx.obterDadosPainel();
  const p = pacotePdf();
  const d = p.disciplinas.find((x) => x.codigo === 'PSA1302');
  d.naoConfirmados = ['ch']; d.ch = null;
  const r = a2.ctx.prepararImportacao(p);
  verdade(r.ok, r.erro);
  igual(r.dados.podeGravar, false);
  verdade(/CSV/.test(r.dados.bloqueios[0]), r.dados.bloqueios[0]);
});

console.log('\n== Validação do pacote no servidor');
teste('pacote adulterado é recusado', () => {
  const p = pacoteCsv();
  p.disciplinas[0].creditosAula = 'três';
  const r = amb.ctx.prepararImportacao(p);
  igual(r.codigo, 'PACOTE_INVALIDO');
  const p2 = pacoteCsv(); p2.vinculos[0].curriculo = '999'; igual(amb.ctx.prepararImportacao(p2).codigo, 'PACOTE_INVALIDO');
  const p3 = pacoteCsv(); p3.versaoPacote = 2; igual(amb.ctx.prepararImportacao(p3).codigo, 'PACOTE_VERSAO');
  igual(amb.ctx.prepararImportacao(null).codigo, 'PACOTE_INVALIDO');
});
teste('erro apontado pelo leitor bloqueia a gravação', () => {
  const p = pacoteCsv();
  p.avisos.push({ nivel: 'erro', codigo: 'X', mensagem: 'Problema grave.' });
  const r = amb.ctx.prepararImportacao(p);
  igual(r.dados.podeGravar, false);
});
teste('configuração ausente gera mensagem orientativa', () => {
  const a3 = criarAmbiente({ dirSrc: DIR_SRC, propriedades: { ID_INDEX_SPREADSHEET_ID: '' } });
  const r = a3.ctx.obterDadosPainel();
  igual(r.codigo, 'CONFIGURACAO');
  verdade(r.erro.indexOf('ID_INDEX_SPREADSHEET_ID') >= 0);
});
teste('erros inesperados não vazam detalhes', () => {
  const a4 = criarAmbiente({ dirSrc: DIR_SRC });
  a4.ctx.SpreadsheetApp.openById = () => { throw new Error('detalhe interno 1AbCdEf'); };
  const r = a4.ctx.obterDadosPainel();
  verdade(r.erro.indexOf('1AbCdEf') < 0, r.erro);
});
console.log('\n== Permissões de acesso (1.7.0)');
teste('dono da planilha sem linha na aba de permissões não entra; as antigas propriedades não valem mais', () => {
  const a5 = criarAmbiente({ dirSrc: DIR_SRC, semPermissaoDoDono: true, usuario: 'dono@unidade.example', propriedades: { ESTRUTURA_ADMINS: 'dono@unidade.example', ESTRUTURA_LEITORES: '@unidade.example' } });
  igual(a5.ctx.obterDadosPainel().codigo, 'SEM_ACESSO');
  a5.trocarUsuario('qualquer@unidade.example');
  igual(a5.ctx.obterDadosPainel().codigo, 'SEM_ACESSO', 'domínio em ESTRUTURA_LEITORES não libera');
});
teste('perfil: ADMINISTRADOR = admin; LEITOR, vazio ou desconhecido = leitor; maiúsculas, espaços e e-mail em caixa alta não atrapalham', () => {
  const a = criarAmbiente({ dirSrc: DIR_SRC, permissoes: [['  Prof.Fict@Unidade.Example ', 'leitor'], ['sem.perfil@unidade.example', ''], ['estranho@unidade.example', 'SUPERVISOR'], ['adm2@unidade.example', ' administrador ']] });
  pedirOk(a.ctx.obterDadosPainel());
  const papel = (email) => { a.trocarUsuario(email); const r = a.ctx.obterDadosPainel(); return r.ok ? r.dados.usuario.papel : r.codigo; };
  igual([papel('prof.fict@unidade.example'), papel('sem.perfil@unidade.example'), papel('estranho@unidade.example'), papel('adm2@unidade.example'), papel('nao.listado@unidade.example')],
    ['leitor', 'leitor', 'leitor', 'admin', 'SEM_ACESSO']);
  a.trocarUsuario('prof.fict@unidade.example');
  igual(a.ctx.prepararImportacao(pacoteCsv()).codigo, 'SO_ADMIN', 'leitor não importa');
});
teste('e-mail repetido na aba: vale o menor acesso', () => {
  const a = criarAmbiente({ dirSrc: DIR_SRC, permissoes: [['dup@unidade.example', 'ADMINISTRADOR'], ['dup@unidade.example', 'LEITOR']] });
  pedirOk(a.ctx.obterDadosPainel());
  a.trocarUsuario('dup@unidade.example');
  igual(a.ctx.obterDadosPainel().dados.usuario.papel, 'leitor');
});
teste('tirar a pessoa da aba corta o acesso (depois do cache)', () => {
  const a = criarAmbiente({ dirSrc: DIR_SRC, permissoes: [['sai@unidade.example', 'LEITOR']] });
  pedirOk(a.ctx.obterDadosPainel());
  a.trocarUsuario('sai@unidade.example');
  verdade(a.ctx.obterDadosPainel().ok);
  a.retirarPermissao('sai@unidade.example');
  igual(a.ctx.obterDadosPainel().codigo, 'SEM_ACESSO');
});
teste('configuração: sem a chave PERMISSOES_DE_ACESSO, sem a aba ESTRUTURA_CURRICULAR ou com colunas fora do lugar → CONFIGURACAO (ninguém entra), sem IDs na mensagem', () => {
  const a1 = criarAmbiente({ dirSrc: DIR_SRC, semChavePermissoes: true });
  const r1 = a1.ctx.obterDadosPainel();
  igual(r1.codigo, 'CONFIGURACAO'); verdade(/PERMISSOES_DE_ACESSO/.test(r1.erro), r1.erro);
  const a2 = criarAmbiente({ dirSrc: DIR_SRC, abaPermissoes: 'OUTRA' });
  const r2 = a2.ctx.obterDadosPainel();
  igual(r2.codigo, 'CONFIGURACAO'); verdade(/ESTRUTURA_CURRICULAR/.test(r2.erro), r2.erro);
  const a3 = criarAmbiente({ dirSrc: DIR_SRC });
  a3.permissoes().getSheetByName('ESTRUTURA_CURRICULAR').getRange(1, 5).setValue('Observação 2');
  const r3 = a3.ctx.obterDadosPainel();
  igual(r3.codigo, 'CONFIGURACAO'); verdade(/coluna E o Perfil/.test(r3.erro), r3.erro);
  verdade(![r1, r2, r3].some((r) => /ID_[A-Z_]*TESTE/.test(r.erro)), 'sem IDs');
});
teste('diagnosticarConfiguracao: contagens por perfil, sem e-mails; avisa propriedades antigas', () => {
  const a = criarAmbiente({ dirSrc: DIR_SRC, permissoes: [['l1@unidade.example', 'LEITOR'], ['x@unidade.example', '']], propriedades: { ESTRUTURA_ADMINS: 'velho@unidade.example' } });
  pedirOk(a.ctx.obterDadosPainel());
  const r = a.ctx.diagnosticarConfiguracao();
  verdade(r.ok, r.erro);
  igual(r.dados.permissoes, { administradores: 1, leitores: 1, perfilVazioOuDesconhecido: 1 });
  igual(r.dados.propriedadesAntigas, ['ESTRUTURA_ADMINS (não é mais usada: pode apagar)']);
  verdade(JSON.stringify(r).indexOf('@') < 0, 'sem e-mails');
});
teste('nenhum log com e-mail ou conteúdo', () => {
  const tudo = amb.estado.logs.concat(amb.estado.erros).join('\n');
  verdade(!/@usp\.br/.test(tudo), 'log com e-mail: ' + tudo.slice(0, 200));
});

console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0`);
if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }

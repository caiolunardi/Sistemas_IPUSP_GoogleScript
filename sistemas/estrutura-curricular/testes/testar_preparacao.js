// Testes da preparação da grade (versão 1.3.0, Preparacao.gs): ajustes
// manuais sobre a estrutura, exclusão/restauração, Observações,
// disciplinas para outros cursos (lista por unidade do Júpiter e cadastro
// manual), seleção para a grade, permissões, reimportação e migração do
// esquema 2 → 3. Usa o simulador (mockGoogle.js) e os arquivos reais.
// Uso: node testar_preparacao.js <grade_curricular.csv> <disciplinas_unidade.csv> [--evidencias arquivo]
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const { carregar } = require('./carregar_leitores');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const [csvPath, unidadePath] = process.argv.slice(2);
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_preparacao.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);

let ok = 0, falhas = 0;
const falhou = [];
const pulados = [];
const PULAR = (motivo) => ({ pulado: true, motivo });
function teste(nome, fn) {
  try {
    const r = fn();
    if (r && r.pulado) { pulados.push(nome + ' — ' + r.motivo); console.log('  – PULADO:', nome, '(' + r.motivo + ')'); return; }
    ok++; console.log('  ✓', nome);
  } catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

const L = carregar();
const csvBase = L.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const pacoteCsv = () => JSON.parse(JSON.stringify(csvBase));
// O navegador decodifica o CSV da unidade (Windows-1252 ou UTF-8) com o mesmo decodificador do leitor do Júpiter.
const textoUnidade = L.LeitorCsvJupiter._decodificarBytes(new Uint8Array(fs.readFileSync(unidadePath))).texto;

function abaObjs(amb, nome) {
  const s = amb.estrutura().getSheetByName(nome);
  if (!s || s.getLastRow() < 1) return [];
  const v = s.getRange(1, 1, Math.max(1, s.getLastRow()), Math.max(1, s.getLastColumn())).getValues();
  const cab = v[0];
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; cab.forEach((t, i) => { o[t] = l[i]; }); return o; });
}
function importar(amb, pacote) {
  const prev = amb.ctx.prepararImportacao(pacote);
  if (!prev.ok) throw new Error('prévia: ' + prev.erro);
  const r = amb.ctx.confirmarImportacao(pacote, prev.dados.assinatura, { operacao: prev.dados.operacao, previa: prev.dados.impressao });
  if (!r.ok) throw new Error('confirmação: ' + r.erro);
  return r.dados;
}
function ambienteComBase(extra) {
  const amb = criarAmbiente(Object.assign({ dirSrc: DIR_SRC }, extra || {}));
  amb.ctx.obterDadosPainel();
  importar(amb, pacoteCsv());
  return amb;
}
function painel(amb) { const r = amb.ctx.obterDadosPainel(); if (!r.ok) throw new Error(r.codigo + ' ' + r.erro); return r.dados; }
function ajusteDe(d, chave) { return d.preparacao.ajustes.find((a) => a.chave === chave); }
function pedir(r) { if (!r.ok) throw new Error(r.codigo + ': ' + r.erro); return r.dados; }
/** Aplica os ajustes como o painel faz (para conferir o "valor efetivo"). */
function efetiva(d, chave) {
  const base = d.base.disciplinas.find((x) => x.codigo === chave);
  const a = ajusteDe(d, chave);
  return Object.assign({}, base, a ? a.campos : {});
}

// =====================================================================
console.log('\n== 1. Esquema 3: abas novas');
ev('=== 1. ESQUEMA 3 ===');
teste('planilha nova ganha "Ajustes manuais" e "Disciplinas para outros cursos", com cabeçalho, notas e proteção só com aviso', () => {
  const amb = criarAmbiente({ dirSrc: DIR_SRC });
  pedir(amb.ctx.obterDadosPainel());
  const nomes = amb.estrutura().getSheets().map((s) => s.getName());
  igual(nomes.slice(-2), ['Ajustes manuais', 'Disciplinas para outros cursos']);
  const aj = amb.estrutura().getSheetByName('Ajustes manuais');
  igual(aj.getRange(1, 1, 1, 3).getValues()[0], ['Disciplina (código no Júpiter)', 'Excluída', 'Adicionada à grade horária']);
  verdade(aj.getRange(1, 1).getNote().length > 10, 'nota no cabeçalho');
  verdade(aj.getProtections('SHEET')[0].isWarningOnly(), 'proteção só com aviso');
  const sobre = JSON.stringify(amb.estrutura().getSheetByName('Sobre').getRange(1, 1, 20, 2).getValues());
  verdade(sobre.indexOf('Ajustes manuais') >= 0 && sobre.indexOf('Disciplinas para outros cursos') >= 0, 'aba Sobre lista as abas novas');
  ev('[planilha nova] abas: ' + nomes.join(', '));
});
teste('base criada pela 1.2.x (esquema 2) é migrada ao abrir: abas novas criadas, dados e histórico intactos, Sobre atualizada', () => {
  const dirAnterior = process.env.DIR_SRC_V124;
  if (!dirAnterior) return PULAR('DIR_SRC_V124 não definido: é preciso a fonte 1.2.x (esquema 2)');
  const velho = criarAmbiente({ dirSrc: dirAnterior });
  velho.ctx.obterDadosPainel();
  importar(velho, pacoteCsv());
  const antes = velho.ctx.obterDadosPainel().dados;
  // Leitor antes de um administrador abrir: base "não preparada" (esquema antigo).
  const leitor = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho, usuario: 'leitor@unidade.example' });
  leitor.permitir('leitor@unidade.example', 'LEITOR');
  igual(leitor.ctx.obterDadosPainel().codigo, 'BASE_NAO_PREPARADA');
  const novo = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho });
  const d = painel(novo);
  igual([d.base.disciplinas.length, d.base.versao, d.importacoes.length], [antes.base.disciplinas.length, antes.base.versao, antes.importacoes.length]);
  igual(novo.estrutura().getSheets().filter((s) => !s.isSheetHidden()).map((s) => s.getName()).slice(-2), ['Ajustes manuais', 'Disciplinas para outros cursos']);
  const sobre = JSON.stringify(novo.estrutura().getSheetByName('Sobre').getRange(1, 1, 20, 2).getValues());
  verdade(sobre.indexOf('Ajustes manuais') >= 0 && sobre.indexOf('grade_curricular.csv') >= 0, 'Sobre reescrita com as abas novas e mantendo a última importação');
  const leitor2 = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho, usuario: 'leitor@unidade.example' });
  verdade(leitor2.ctx.obterDadosPainel().ok, 'leitor abre depois da migração');
  ev('[migração esquema 2 → 3] ' + d.base.disciplinas.length + ' disciplinas e ' + d.importacoes.length + ' importação intactas; abas novas criadas; leitor: BASE_NAO_PREPARADA antes e ok depois da abertura pelo administrador');
});
teste('base criada pela 1.3.0 ganha a coluna "Semestre de oferecimento" em "Disciplinas para outros cursos" ao abrir, sem mexer nas linhas', () => {
  const dirAnterior = process.env.DIR_SRC_V130;
  if (!dirAnterior) return PULAR('DIR_SRC_V130 não definido: é preciso a fonte 1.3.0');
  const velho = criarAmbiente({ dirSrc: dirAnterior });
  velho.ctx.obterDadosPainel();
  importar(velho, pacoteCsv());
  pedir(velho.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança', creditosAula: 2 } }));
  pedir(velho.ctx.marcarSelecaoGrade([{ origem: 'outros', chave: 'PST0391' }], true));
  const leitor = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho, usuario: 'leitor@unidade.example' });
  leitor.permitir('leitor@unidade.example', 'LEITOR');
  igual(leitor.ctx.obterDadosPainel().codigo, 'BASE_NAO_PREPARADA', 'leitor antes do administrador');
  const novo = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho });
  const d = painel(novo);
  const aba = novo.estrutura().getSheetByName('Disciplinas para outros cursos');
  const titulos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  igual(titulos[titulos.length - 1], 'Semestre de oferecimento', 'coluna nova no fim');
  const o = d.preparacao.outros[0];
  igual([o.codigo, o.ch, o.naGrade, o.oferecimento], ['PST0391', 30, true, ''], 'linha intacta (marca de grade mantida); semestre não informado');
  verdade(criarAmbiente({ dirSrc: DIR_SRC, reusar: velho, usuario: 'leitor@unidade.example' }).ctx.obterDadosPainel().ok, 'leitor depois');
  ev('[1.3.0 → 1.3.2] coluna "Semestre de oferecimento" acrescentada no fim da aba de outros cursos; linha existente intacta (selecionada, CH 30); leitor: BASE_NAO_PREPARADA antes, ok depois');
});

teste('base criada pela 1.3.1: "Semestre ideal" vira "Semestre de oferecimento" (só o cabeçalho) nas abas Disciplinas, Disciplinas por habilitação e outros cursos; valores mantidos; Ajustes ganha a coluna nova; importar depois funciona', () => {
  const dirAnterior = process.env.DIR_SRC_V131;
  if (!dirAnterior) return PULAR('DIR_SRC_V131 não definido: é preciso a fonte 1.3.1');
  const velho = criarAmbiente({ dirSrc: dirAnterior });
  velho.ctx.obterDadosPainel();
  importar(velho, pacoteCsv());
  pedir(velho.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança', semestreIdeal: '2' } }));
  pedir(velho.ctx.marcarSelecaoGrade([{ origem: 'outros', chave: 'PST0391' }, { origem: 'estrutura', chave: 'PSC1322' }], true));
  const larguras = {};
  ['Disciplinas', 'Disciplinas por habilitação', 'Disciplinas para outros cursos'].forEach((n) => { larguras[n] = velho.estrutura().getSheetByName(n).getLastColumn(); });
  const leitor = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho, usuario: 'leitor@unidade.example' });
  leitor.permitir('leitor@unidade.example', 'LEITOR');
  igual(leitor.ctx.obterDadosPainel().codigo, 'BASE_NAO_PREPARADA', 'leitor antes do administrador');
  const novo = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho });
  const d = painel(novo);
  ['Disciplinas', 'Disciplinas por habilitação', 'Disciplinas para outros cursos'].forEach((n) => {
    const aba = novo.estrutura().getSheetByName(n);
    const t = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    verdade(t.indexOf('Semestre ideal') < 0 && t.filter((x) => x === 'Semestre de oferecimento').length === 1, n + ': ' + t.join(' | '));
    igual(aba.getLastColumn(), larguras[n], n + ': nenhuma coluna a mais');
  });
  igual(abaObjs(novo, 'Disciplinas').find((x) => x['Código'] === 'PSC1322')['Semestre de oferecimento'], '1º semestre', 'valor da estrutura mantido');
  igual(abaObjs(novo, 'Disciplinas para outros cursos')[0]['Semestre de oferecimento'], '2º semestre', 'valor de outros cursos mantido');
  igual(d.preparacao.outros[0].oferecimento, '2');
  // 1.4.0: "Selecionada para a grade" → "Adicionada à grade horária" (só o cabeçalho; a marca continua).
  ['Ajustes manuais', 'Disciplinas para outros cursos'].forEach((n) => {
    const aba = novo.estrutura().getSheetByName(n);
    const t = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    verdade(t.indexOf('Selecionada para a grade') < 0 && t.indexOf('Adicionada à grade horária') >= 0, n + ': ' + t.join(' | '));
  });
  igual([d.preparacao.outros[0].naGrade, ajusteDe(d, 'PSC1322').naGrade], [true, true], 'marca de grade preservada');
  const aj = novo.estrutura().getSheetByName('Ajustes manuais');
  verdade(aj.getRange(1, 1, 1, aj.getLastColumn()).getValues()[0].indexOf('Semestre de oferecimento ajustado') >= 0, 'coluna nova em Ajustes');
  const alt = pacoteCsv(); alt.disciplinas.find((x) => x.codigo === 'PSC1322').nome = 'Nome novo';
  importar(novo, alt);
  igual(abaObjs(novo, 'Disciplinas').find((x) => x['Código'] === 'PSC1322')['Semestre de oferecimento'], '1º semestre', 'reimportação grava na coluna renomeada');
  verdade(criarAmbiente({ dirSrc: DIR_SRC, reusar: velho, usuario: 'leitor@unidade.example' }).ctx.obterDadosPainel().ok, 'leitor depois');
  ev('[1.3.1 → 1.3.2] "Semestre ideal" → "Semestre de oferecimento" só no cabeçalho de 3 abas (sem coluna a mais; valores 1º/2º mantidos); Ajustes ganha "Semestre de oferecimento ajustado"; reimportação grava na coluna renomeada; leitor: BASE_NAO_PREPARADA antes, ok depois');
});

// =====================================================================
console.log('\n== 2. Ajustes manuais na estrutura');
ev('\n=== 2. AJUSTES MANUAIS ===');
teste('editar nome, créditos, EXT e código: só o que difere do Júpiter vai para "Ajustes manuais"; a aba Disciplinas NÃO muda', () => {
  const amb = ambienteComBase();
  const discAntes = JSON.stringify(abaObjs(amb, 'Disciplinas'));
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { codigo: 'PSC1322', nome: 'Introdução à Psicopatologia (turma prática)', creditosAula: 4, creditosTrabalho: 2, ext: 15, departamento: 'PSC' } }));
  const a = r.preparacao.ajustes.find((x) => x.chave === 'PSC1322');
  igual(a.campos, { nome: 'Introdução à Psicopatologia (turma prática)', creditosAula: 4, ext: 15 }, 'só os campos diferentes');
  igual(JSON.stringify(abaObjs(amb, 'Disciplinas')), discAntes, 'aba Disciplinas intacta');
  const linha = abaObjs(amb, 'Ajustes manuais');
  igual(linha.length, 1);
  igual([linha[0]['Disciplina (código no Júpiter)'], linha[0]['Nome ajustado'], linha[0]['Créditos-aula ajustados'], linha[0]['Código ajustado'], linha[0]['Alterado por']], ['PSC1322', 'Introdução à Psicopatologia (turma prática)', 4, '', 'dono@unidade.example']);
  const d = painel(amb);
  igual(efetiva(d, 'PSC1322').nome, 'Introdução à Psicopatologia (turma prática)');
  ev('[ajuste] PSC1322: nome, créditos-aula 3→4 e EXT vazia→15 em "Ajustes manuais" (1 linha); departamento e créditos-trabalho iguais ao Júpiter não são guardados; aba Disciplinas byte a byte igual');
});
teste('voltar um campo ao valor do Júpiter apaga o ajuste; sem ajustes, a linha some', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'Outro nome' } }));
  igual(abaObjs(amb, 'Ajustes manuais').length, 1);
  const base = painel(amb).base.disciplinas.find((x) => x.codigo === 'PSC1322');
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: base.nome } }));
  igual(r.preparacao.ajustes.length, 0);
  igual(abaObjs(amb, 'Ajustes manuais').length, 0, 'linha removida');
});
teste('alterar o código: vale no painel; código repetido é recusado (CODIGO_REPETIDO) sem salvar nada', () => {
  const amb = ambienteComBase();
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { codigo: 'psc1399' } }));
  igual(r.preparacao.ajustes[0].campos.codigo, 'PSC1399', 'maiúsculas');
  const rep = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: { codigo: 'PSC1399' } });
  igual(rep.codigo, 'CODIGO_REPETIDO');
  const rep2 = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: { codigo: 'PSE2355' } });
  igual(rep2.codigo, 'CODIGO_REPETIDO');
  igual(painel(amb).preparacao.ajustes.length, 1, 'nada salvo nas recusas');
  const inval = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: { codigo: 'XY12' } });
  igual(inval.codigo, 'DADOS_INVALIDOS');
  const neg = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: { creditosAula: -1 } });
  igual(neg.codigo, 'DADOS_INVALIDOS');
  ev('[código] PSC1322 → PSC1399 aceito; PSA1302 → PSC1399/PSE2355 recusado (CODIGO_REPETIDO); "XY12" e créditos −1 recusados (DADOS_INVALIDOS)');
});
teste('oferta ajustada: tipo e período por habilitação; igual à do Júpiter = sem ajuste; habilitação que não é da base é recusada', () => {
  const amb = ambienteComBase();
  const d0 = painel(amb);
  const jup = d0.base.vinculos.filter((v) => v.codigo === 'PST1666');
  igual(jup.length, 3);
  const nova = jup.map((v) => ({ curriculo: v.curriculo, tipo: v.tipo, periodo: v.periodoIdeal }));
  nova[2] = { curriculo: nova[2].curriculo, tipo: 'OPTATIVA_ELETIVA', periodo: 8 };
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1666', campos: {}, oferta: nova }));
  const a = r.preparacao.ajustes.find((x) => x.chave === 'PST1666');
  igual(a.oferta.find((o) => o.curriculo === nova[2].curriculo), { curriculo: nova[2].curriculo, tipo: 'OPTATIVA_ELETIVA', periodo: 8 });
  const igualJup = jup.map((v) => ({ curriculo: v.curriculo, tipo: v.tipo, periodo: v.periodoIdeal })).reverse();
  const r2 = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1666', campos: {}, oferta: igualJup }));
  igual(r2.preparacao.ajustes.length, 0, 'oferta igual (em outra ordem) = sem ajuste');
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1666', campos: {}, oferta: [{ curriculo: '999999999999', tipo: 'OBRIGATORIA', periodo: 1 }] }).codigo, 'DADOS_INVALIDOS');
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1666', campos: {}, oferta: [{ curriculo: jup[0].curriculo, tipo: 'X', periodo: 1 }] }).codigo, 'DADOS_INVALIDOS');
});
teste('Observações da ficha vão para a coluna livre "Observações" da aba Disciplinas (e sobrevivem à reimportação)', () => {
  const amb = ambienteComBase();
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: {}, observacoes: 'Disciplina prática.\nTurma única.' }));
  igual(r.observacao, { chave: 'PSA1302', texto: 'Disciplina prática.\nTurma única.' });
  igual(abaObjs(amb, 'Disciplinas').find((x) => x['Código'] === 'PSA1302')['Observações'], 'Disciplina prática.\nTurma única.');
  importar(amb, pacoteCsv());
  igual(painel(amb).base.disciplinas.find((x) => x.codigo === 'PSA1302').observacoes, 'Disciplina prática.\nTurma única.', 'após reimportar');
});
teste('ajustes sobrevivem a uma nova importação do Júpiter (a aba de ajustes não é regravada)', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'Nome ajustado' } }));
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSA1302' }], true));
  const alt = pacoteCsv();
  alt.disciplinas.find((x) => x.codigo === 'PSE2355').nome = 'Nome novo do Júpiter';
  importar(amb, alt);
  const d = painel(amb);
  igual([efetiva(d, 'PSC1322').nome, ajusteDe(d, 'PSA1302').excluida, d.base.disciplinas.find((x) => x.codigo === 'PSE2355').nome], ['Nome ajustado', true, 'Nome novo do Júpiter']);
  ev('[reimportação] ajuste de PSC1322 e exclusão de PSA1302 continuam valendo; mudança do Júpiter em PSE2355 aplicada normalmente');
});

// =====================================================================
console.log('\n== 3. Exclusão e restauração');
ev('\n=== 3. EXCLUSÃO ===');
teste('excluir 3 disciplinas em lote: marca "Sim" (não apaga), tira da seleção; restaurar desfaz', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: '0420130' }]));
  const itens = ['0420130', '0420131', '4701381'].map((c) => ({ origem: 'estrutura', chave: c }));
  const r = pedir(amb.ctx.excluirDisciplinas(itens, true));
  igual(r.alteradas, 3);
  const aj = r.preparacao.ajustes;
  igual(aj.filter((a) => a.excluida).map((a) => a.chave).sort(), ['0420130', '0420131', '4701381']);
  igual(aj.find((a) => a.chave === '0420130').naGrade, false, 'excluída sai da grade');
  igual(painel(amb).base.disciplinas.length, 183, 'dados do Júpiter continuam na base');
  const r2 = pedir(amb.ctx.excluirDisciplinas(itens, false));
  igual(r2.preparacao.ajustes.length, 0, 'restaurar sem outros ajustes = linhas removidas');
  ev('[exclusão] 0420130, 0420131, 4701381 marcadas "Sim" (183 continuam na aba Disciplinas); restauradas → aba de ajustes vazia');
});
teste('adicionar à grade uma disciplina excluída é ignorado', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: '0420130' }], true));
  const r = pedir(amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: '0420130' }, { origem: 'estrutura', chave: '0420131' }]));
  igual([r.adicionadas, r.ignoradas], [1, 1]);
});
teste('disciplina inexistente ou item inválido: recusa sem gravar', () => {
  const amb = ambienteComBase();
  igual(amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'ZZZ9999' }], true).codigo, 'DISCIPLINA_NAO_ENCONTRADA');
  igual(amb.ctx.excluirDisciplinas([], true).codigo, 'DADOS_INVALIDOS');
  igual(amb.ctx.excluirDisciplinas([{ origem: 'x', chave: 'PSA1302' }], true).codigo, 'DADOS_INVALIDOS');
  igual(abaObjs(amb, 'Ajustes manuais').length, 0);
});

// =====================================================================
console.log('\n== 4. Disciplinas para outros cursos: lista por unidade (CSV do Júpiter)');
ev('\n=== 4. LISTA POR UNIDADE ===');
teste('prévia com o CSV real: só as disciplinas que não estão na estrutura (34 de 198), com créditos e CH; nada gravado', () => {
  const amb = ambienteComBase();
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv'));
  igual([p.total, p.novas.length, p.conhecidas, p.repetidas, p.invalidas.length], [198, 34, 164, 0, 0]);
  const pst = p.novas.find((x) => x.codigo === 'PST0391');
  igual([pst.nome, pst.creditosAula, pst.creditosTrabalho, pst.ch, pst.departamento, pst.ativacao], ['Liderança e Comportamento Humano', 2, 0, 30, 'PST', '01/01/2013']);
  igual(abaObjs(amb, 'Disciplinas para outros cursos').length, 0, 'nada gravado');
  ev('[prévia] disciplinas_unidade.csv: 198 linhas; 164 já na estrutura; 34 novas (ex.: PST0391 Liderança e Comportamento Humano, 2+0, 30 h, PST)');
});
teste('incluir as 34 (ou só as escolhidas): marcadas "Lista de disciplinas por unidade"; reimportar o mesmo CSV não traz nada', () => {
  const amb = ambienteComBase();
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv'));
  const escolhidos = p.novas.map((x) => x.codigo).filter((c) => c !== 'PSA0183');
  const r = pedir(amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv', p.assinatura, escolhidos));
  igual(r.incluidas, 33);
  igual(r.preparacao.outros.length, 33);
  igual(r.preparacao.outros[0].origem, 'Lista de disciplinas por unidade (Júpiter)');
  const p2 = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv'));
  igual(p2.novas.map((x) => x.codigo), ['PSA0183'], 'só a que não foi escolhida');
  ev('[inclusão] 33 incluídas (PSA0183 deixada de fora de propósito); nova prévia do mesmo CSV: só PSA0183');
});
teste('assinatura: se a lista muda entre a prévia e a inclusão, PREVIA_DESATUALIZADA e nada é incluído', () => {
  const amb = ambienteComBase();
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv'));
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança e Comportamento Humano' } }));
  const r = amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv', p.assinatura, p.novas.map((x) => x.codigo));
  igual(r.codigo, 'PREVIA_DESATUALIZADA');
  igual(abaObjs(amb, 'Disciplinas para outros cursos').length, 1);
});
teste('código alterado na estrutura: o código original do Júpiter volta como "novo" na lista por unidade (comportamento pedido)', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: '4701381', campos: { codigo: '4701399' } }));
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv'));
  verdade(p.novas.some((x) => x.codigo === '4701381'), '4701381 aparece');
  igual(p.novas.length, 35);
});
teste('disciplina excluída continua "conhecida": a lista por unidade não a traz de volta', () => {
  const amb = ambienteComBase();
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv'));
  pedir(amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'x.csv', p.assinatura, ['PST0391']));
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: 'PST0391' }], true));
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: '4701381' }], true));
  const p2 = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'disciplinas_unidade.csv'));
  verdade(!p2.novas.some((x) => x.codigo === 'PST0391' || x.codigo === '4701381'), 'não voltam');
});
teste('arquivo errado (CSV da grade curricular) é recusado com orientação; linhas inválidas e repetidas são contadas', () => {
  const amb = ambienteComBase();
  const errado = L.LeitorCsvJupiter._decodificarBytes(new Uint8Array(fs.readFileSync(csvPath))).texto;
  const r = amb.ctx.previaDisciplinasUnidade(errado, 'grade_curricular.csv');
  igual(r.codigo, 'PACOTE_INVALIDO');
  verdade(/Lista de disciplinas por unidade/.test(r.erro), r.erro);
  const texto = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\nPST0391;Liderança;01/01/2013;;Semestral;2;0\nPST0391;Liderança;01/01/2013;;Semestral;2;0\nXX;Sem código;;;;;\nPST0999;;;;;;\n"PST0998";"Nome; com ponto e vírgula";;;Semestral;1;0\n';
  const p = pedir(amb.ctx.previaDisciplinasUnidade(texto, 't.csv'));
  igual([p.total, p.novas.map((x) => x.codigo), p.repetidas, p.invalidas.length], [5, ['PST0391', 'PST0998'], 1, 2]);
  igual(p.novas[1].nome, 'Nome; com ponto e vírgula');
  igual(amb.ctx.previaDisciplinasUnidade('', 'v.csv').codigo, 'PACOTE_INVALIDO');
});

// =====================================================================
console.log('\n== 5. Cadastro manual e edição de outros cursos');
ev('\n=== 5. CADASTRO MANUAL ===');
teste('cadastrar PST0391 com unidade/curso atendidos e observação; CH calculada; código repetido recusado', () => {
  const amb = ambienteComBase();
  const r = pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'pst0391', nome: 'Liderança e Comportamento Humano', creditosAula: 2, creditosTrabalho: 0, unidadeAtendida: 'FEA', cursoAtendido: 'Administração' }, observacoes: 'Oferecida para a FEA.' }));
  const o = r.preparacao.outros[0];
  igual([o.chave, o.codigo, o.ch, o.departamento, o.unidadeAtendida, o.cursoAtendido, o.origem, o.observacoes], ['PST0391', 'PST0391', 30, 'PST', 'FEA', 'Administração', 'Cadastro manual', 'Oferecida para a FEA.']);
  igual(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'x' } }).codigo, 'CODIGO_REPETIDO');
  igual(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PSA1302', nome: 'x' } }).codigo, 'CODIGO_REPETIDO', 'já na estrutura');
  igual(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0392' } }).codigo, 'DADOS_INVALIDOS', 'sem nome');
  igual(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0392', nome: 'x', ativacao: '2026-01-01' } }).codigo, 'DADOS_INVALIDOS', 'data');
  ev('[cadastro manual] PST0391 (FEA — Administração), CH 30 h calculada; PST0391 de novo e PSA1302 (já na estrutura) recusados');
});
teste('editar disciplina de outros cursos (inclusive o código) e excluir/restaurar', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança' } }));
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { codigo: 'PST0394', nome: 'Liderança e Comportamento Humano', creditosAula: 2, ch: 30 }, observacoes: 'x' }));
  const o = r.preparacao.outros[0];
  igual([o.chave, o.codigo, o.nome, o.ch, o.observacoes], ['PST0391', 'PST0394', 'Liderança e Comportamento Humano', 30, 'x']);
  igual(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { nome: '' } }).codigo, 'DADOS_INVALIDOS', 'nome obrigatório');
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: 'PST0391' }], true));
  igual(abaObjs(amb, 'Disciplinas para outros cursos')[0]['Excluída'], 'Sim');
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: 'PST0391' }], false));
  igual(abaObjs(amb, 'Disciplinas para outros cursos')[0]['Excluída'], '');
});
teste('semestre de oferecimento ("disciplina de semestre") das disciplinas para outros cursos: 1º, 2º, ambos ou vazio; valor inválido recusado', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança', oferecimento: '2' } }));
  igual(abaObjs(amb, 'Disciplinas para outros cursos')[0]['Semestre de oferecimento'], '2º semestre');
  igual(painel(amb).preparacao.outros[0].oferecimento, '2');
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { oferecimento: 'ambos' } }));
  igual(abaObjs(amb, 'Disciplinas para outros cursos')[0]['Semestre de oferecimento'], '1º e 2º semestres');
  igual(painel(amb).preparacao.outros[0].oferecimento, 'ambos');
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { oferecimento: '' } }));
  igual(abaObjs(amb, 'Disciplinas para outros cursos')[0]['Semestre de oferecimento'], '');
  igual(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { oferecimento: '3' } }).codigo, 'DADOS_INVALIDOS');
  // Texto digitado à mão na planilha também é entendido.
  const aba = amb.estrutura().getSheetByName('Disciplinas para outros cursos');
  const col = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].indexOf('Semestre de oferecimento') + 1;
  aba.getRange(2, col).setValue('1º semestre');
  igual(painel(amb).preparacao.outros[0].oferecimento, '1');
  ev('[semestre de oferecimento, outros cursos] 2 → "2º semestre"; ambos → "1º e 2º semestres"; vazio limpa; "3" recusado; "1º semestre" digitado na planilha → 1');
});

teste('semestre de oferecimento ajustado na estrutura (1.3.2): prática oferecida nos dois semestres; vazio = automático pelo período; a aba Disciplinas não muda', () => {
  const amb = ambienteComBase();
  const antes = JSON.stringify(abaObjs(amb, 'Disciplinas'));
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { oferecimento: 'ambos' } }));
  igual(ajusteDe(r, 'PSC1322').campos.oferecimento, 'ambos');
  igual(abaObjs(amb, 'Ajustes manuais')[0]['Semestre de oferecimento ajustado'], '1º e 2º semestres');
  igual(JSON.stringify(abaObjs(amb, 'Disciplinas')), antes, 'aba Disciplinas intacta');
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { oferecimento: '2' } }));
  igual(abaObjs(amb, 'Ajustes manuais')[0]['Semestre de oferecimento ajustado'], '2º semestre');
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { oferecimento: '1' } }));
  igual(abaObjs(amb, 'Ajustes manuais').length, 0, '1.4.0: escolher o mesmo do período (1º) = sem ajuste');
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { oferecimento: 'ambos' } }));
  const r2 = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { oferecimento: '' } }));
  igual([r2.preparacao.ajustes.length, abaObjs(amb, 'Ajustes manuais').length], [0, 0], 'automático de novo: linha de ajuste removida');
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { oferecimento: 'impar' } }).codigo, 'DADOS_INVALIDOS');
  ev('[oferecimento ajustado] PSC1322 (3º período → 1º semestre) ajustada para "1º e 2º semestres" e depois 2º; vazio volta ao automático e remove a linha; "impar" recusado; aba Disciplinas intacta');
});

// =====================================================================
console.log('\n== 6. Grade horária: adicionar e remover (1.4.0)');
ev('\n=== 6. GRADE HORÁRIA ===');
teste('"Enviar para a Grade Horária" com tudo: entram as que têm semestre de oferecimento (estrutura pelo período); as sem semestre voltam listadas e NÃO entram; uma escrita por aba', () => {
  const amb = ambienteComBase();
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'u.csv'));
  pedir(amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'u.csv', p.assinatura, p.novas.map((x) => x.codigo)));
  const d = painel(amb);
  const itens = d.base.disciplinas.map((x) => ({ origem: 'estrutura', chave: x.codigo })).concat(d.preparacao.outros.map((o) => ({ origem: 'outros', chave: o.chave })));
  const escritasAntes = amb.estado.escritas;
  const r = pedir(amb.ctx.adicionarAGrade(itens));
  igual([r.adicionadas, r.semOferecimento.length], [183, 34], 'estrutura inteira (período) entra; as 34 de outros cursos, sem semestre, não');
  verdade(r.semOferecimento.every((x) => x.origem === 'outros') && r.semOferecimento.some((x) => x.codigo === 'PST0391'), 'lista das que faltam');
  igual(amb.estado.escritas - escritasAntes, 1, 'só a aba de ajustes foi escrita');
  igual([r.preparacao.ajustes.filter((a) => a.naGrade).length, r.preparacao.outros.filter((o) => o.naGrade).length], [183, 0]);
  igual(abaObjs(amb, 'Ajustes manuais').filter((a) => a['Adicionada à grade horária'] === 'Sim').length, 183);
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { oferecimento: '2' } }));
  const r2 = pedir(amb.ctx.adicionarAGrade([{ origem: 'outros', chave: 'PST0391' }, { origem: 'estrutura', chave: 'PSC1322' }]));
  igual([r2.adicionadas, r2.jaEstavam, r2.semOferecimento.length], [1, 1, 0]);
  igual(abaObjs(amb, 'Disciplinas para outros cursos').find((o) => o['Código'] === 'PST0391')['Adicionada à grade horária'], 'Sim');
  ev('[grade] enviar as 217: 183 da estrutura entram (semestre pelo período ideal), 34 de outros cursos sem semestre voltam listadas (ex.: PST0391) e não entram; 1 escrita; PST0391 com 2º semestre → entra');
});
teste('"Remover da grade": tira a marca (uma escrita por aba); a disciplina continua na lista; item inexistente recusa o lote sem gravar', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança', oferecimento: '1' } }));
  pedir(amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PSC1322' }, { origem: 'estrutura', chave: 'PSA1302' }, { origem: 'outros', chave: 'PST0391' }]));
  const antes = amb.estado.escritas;
  const r = pedir(amb.ctx.removerDaGrade([{ origem: 'estrutura', chave: 'PSC1322' }, { origem: 'outros', chave: 'PST0391' }]));
  igual(r.removidas, 2);
  igual(amb.estado.escritas - antes, 2, 'uma escrita em cada aba');
  igual(r.preparacao.ajustes.filter((a) => a.naGrade).map((a) => a.chave), ['PSA1302']);
  igual([painel(amb).base.disciplinas.length, r.preparacao.outros.length], [183, 1], 'continuam na lista');
  const snap = JSON.stringify(abaObjs(amb, 'Ajustes manuais'));
  igual(amb.ctx.removerDaGrade([{ origem: 'estrutura', chave: 'PSA1302' }, { origem: 'estrutura', chave: 'XXX9999' }]).codigo, 'DISCIPLINA_NAO_ENCONTRADA');
  igual(JSON.stringify(abaObjs(amb, 'Ajustes manuais')), snap, 'nada gravado');
  igual(amb.ctx.adicionarAGrade([]).codigo, 'DADOS_INVALIDOS');
  ev('[remover da grade] PSC1322 e PST0391 removidas (2 escritas, uma por aba), PSA1302 continua; lote com código inexistente recusado sem gravar');
});
teste('(1.4.3) "Adicionar à Grade Horária" com alterações por salvar = UMA chamada (salvarDisciplina com adicionarAGrade) e UMA escrita; sem semestre salva e não adiciona; excluída não entra; erro não grava nada', () => {
  const amb = ambienteComBase();
  const p = pedir(amb.ctx.previaDisciplinasUnidade(textoUnidade, 'u.csv'));
  pedir(amb.ctx.incluirDisciplinasUnidade(textoUnidade, 'u.csv', p.assinatura, p.novas.map((x) => x.codigo)));
  const outros = () => abaObjs(amb, 'Disciplinas para outros cursos');
  const chave = painel(amb).preparacao.outros.find((o) => o.codigo === 'PST0391').chave;
  // outros cursos: escolhe o semestre (2º) e adiciona — uma chamada, uma escrita
  let antes = amb.estado.escritas;
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave, campos: { oferecimento: '2' }, observacoes: 'turma única', adicionarAGrade: true }));
  igual(r.grade, { adicionada: true, jaEstava: false, excluida: false, semOferecimento: false });
  igual(amb.estado.escritas - antes, 1, 'uma escrita (a própria gravação da ficha)');
  const linha = outros().find((o) => o['Código'] === 'PST0391');
  igual([linha['Semestre de oferecimento'], linha['Adicionada à grade horária'], linha['Observações']], ['2º semestre', 'Sim', 'turma única']);
  verdade(r.preparacao.outros.find((o) => o.chave === chave).naGrade, 'o painel recebe a marca na mesma resposta');
  // de novo: já estava
  igual(pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave, campos: { nome: 'Liderança nas Organizações' }, adicionarAGrade: true })).grade.jaEstava, true);
  // sem semestre (limpo na mesma alteração): salva e NÃO adiciona
  const chave2 = painel(amb).preparacao.outros.find((o) => o.codigo !== 'PST0391').chave;
  const r2 = pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: chave2, campos: {}, observacoes: 'sem semestre', adicionarAGrade: true }));
  igual(r2.grade.semOferecimento, true);
  const l2 = outros().find((o) => o['Identificador'] === chave2 || o['Observações'] === 'sem semestre');
  igual([l2['Observações'], l2['Adicionada à grade horária']], ['sem semestre', ''], 'salvou, não adicionou');
  // estrutura: ajusta o semestre e adiciona (a linha de ajuste leva as duas coisas, uma escrita)
  antes = amb.estado.escritas;
  const r3 = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { oferecimento: 'ambos' }, adicionarAGrade: true }));
  igual([r3.grade.adicionada, amb.estado.escritas - antes], [true, 1]);
  const aj = abaObjs(amb, 'Ajustes manuais').find((a) => a['Disciplina (código no Júpiter)'] === 'PSC1322');
  igual([aj['Semestre de oferecimento ajustado'], aj['Adicionada à grade horária']], ['1º e 2º semestres', 'Sim']);
  // excluída: salva, não entra
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSA1302' }], true));
  const r4 = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: { oferecimento: '2' }, adicionarAGrade: true }));
  igual([r4.grade.excluida, r4.grade.adicionada], [true, false]);
  // erro (código repetido): nada salvo, nada adicionado
  const snap = JSON.stringify(abaObjs(amb, 'Ajustes manuais'));
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1301', campos: { codigo: 'PSC1322', oferecimento: '1' }, adicionarAGrade: true }).codigo, 'CODIGO_REPETIDO');
  igual(JSON.stringify(abaObjs(amb, 'Ajustes manuais')), snap, 'nada gravado');
  // sem a opção, salvarDisciplina continua igual (não mexe na grade; sem "grade" na resposta)
  const r5 = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1301', campos: { oferecimento: 'ambos' } }));
  verdade(!('grade' in r5) && !r5.preparacao.ajustes.find((a) => a.chave === 'PSA1301').naGrade, 'sem adicionarAGrade, só salva');
  ev('[1.4.3 salvar + adicionar] PST0391: 2º semestre + observação + marca na grade numa chamada e 1 escrita; repetir = jaEstava; outra sem semestre: salva e não entra; PSC1322 ajustada para 1º e 2º + marca = 1 escrita; excluída não entra; código repetido não grava nada; sem a opção, só salva');
});

// =====================================================================
console.log('\n== 6b. Cadastrar nova grade (1.4.0)');
ev('\n=== 6b. CADASTRAR NOVA GRADE ===');
teste('palavra errada: recusa e nada muda', () => {
  const amb = ambienteComBase();
  const antes = amb.estrutura().getSheets().map((s) => s.getName() + ':' + s.getLastRow()).join(',');
  igual(amb.ctx.cadastrarNovaGrade('apague').codigo, 'DADOS_INVALIDOS');
  igual(amb.ctx.cadastrarNovaGrade('').codigo, 'DADOS_INVALIDOS');
  igual(amb.estrutura().getSheets().map((s) => s.getName() + ':' + s.getLastRow()).join(','), antes);
});
teste('"APAGAR": planilha do zero — estrutura, histórico, ajustes, outros cursos, grade e abas ocultas apagados; abas recriadas vazias; importar de novo funciona', () => {
  const amb = ambienteComBase();
  importar(amb, (() => { const x = pacoteCsv(); x.disciplinas.find((y) => y.codigo === 'PSC1322').nome = 'Outro nome'; return x; })());
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança', oferecimento: '1' } }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1302', campos: { nome: 'Ajustada' } }));
  pedir(amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PSC1322' }, { origem: 'outros', chave: 'PST0391' }]));
  verdade(amb.estrutura().getSheets().some((s) => s.isSheetHidden()), 'havia abas ocultas (_anterior_)');
  const idPlanilha = amb.estrutura().getId();
  const r = pedir(amb.ctx.cadastrarNovaGrade('apagar'));
  igual(r.recomecada, true);
  const ss = amb.estrutura();
  igual(ss.getId(), idPlanilha, 'mesma planilha (o ID_INDEX continua valendo)');
  igual(ss.getSheets().map((s) => s.getName()), ['Sobre', 'Disciplinas', 'Disciplinas por habilitação', 'Requisitos', 'Currículos', 'Importações', 'Alterações', 'Ajustes manuais', 'Disciplinas para outros cursos']);
  verdade(!ss.getSheets().some((s) => s.isSheetHidden()), 'nenhuma aba oculta');
  ['Disciplinas', 'Importações', 'Alterações', 'Ajustes manuais', 'Disciplinas para outros cursos'].forEach((n) => igual(abaObjs(amb, n).length, 0, n + ' vazia'));
  verdade(!ss.getDeveloperMetadata().some((m) => m.getKey() === 'estruturaCurricular.recomeco' || m.getKey() === 'estruturaCurricular.gravacao'), 'sem marca de recomeço nem diário');
  const d = painel(amb);
  igual([d.base.disciplinas.length, d.importacoes.length, d.preparacao.ajustes.length, d.preparacao.outros.length], [0, 0, 0, 0]);
  importar(amb, pacoteCsv());
  igual(painel(amb).base.disciplinas.length, 183, 'nova importação');
  ev('[cadastrar nova grade] "apagar" → mesma planilha, 9 abas recriadas vazias, sem abas ocultas nem marca de recomeço; painel com 0 disciplinas/importações/ajustes/outros; nova importação do CSV → 183');
});
teste('recomeço interrompido (falha ao apagar uma aba): leitor espera; administrador, ao abrir o painel, termina o recomeço', () => {
  const amb = ambienteComBase();
  amb.permitir('leitor@unidade.example', 'LEITOR');
  let n = 0;
  amb.injetarFalha((e) => e.tipo === 'deleteSheet' && ++n === 3);
  igual(amb.ctx.cadastrarNovaGrade('APAGAR').ok, false, 'falhou no meio');
  amb.limparFalhas();
  verdade(amb.estrutura().getDeveloperMetadata().some((m) => m.getKey() === 'estruturaCurricular.recomeco'), 'marca de recomeço ficou');
  const leitor = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'leitor@unidade.example' });
  igual(leitor.ctx.obterDadosPainel().codigo, 'BASE_NAO_PREPARADA');
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'x' } }).codigo, 'BASE_NAO_PREPARADA', 'nada é gravado no meio do recomeço');
  const d = painel(amb);
  igual(d.base.disciplinas.length, 0, 'recomeço terminado pelo administrador');
  verdade(!amb.estrutura().getDeveloperMetadata().some((m) => m.getKey() === 'estruturaCurricular.recomeco'), 'marca removida');
  igual(amb.estrutura().getSheets().length, 9);
  verdade(leitor.ctx.obterDadosPainel().ok, 'leitor abre depois');
  ev('[recomeço interrompido] falha no 3º deleteSheet → marca fica; leitor: BASE_NAO_PREPARADA; gravação recusada; administrador abre o painel → recomeço concluído (9 abas, 0 disciplinas)');
});
teste('trava ocupada: "Cadastrar nova grade" não começa (OCUPADO) e nada muda', () => {
  const amb = ambienteComBase();
  const ocupado = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, travaOcupada: true });
  igual(ocupado.ctx.cadastrarNovaGrade('APAGAR').codigo, 'OCUPADO');
  igual(painel(amb).base.disciplinas.length, 183);
});

// =====================================================================
console.log('\n== 7. Permissões, trava e falhas');
ev('\n=== 7. PERMISSÕES E FALHAS ===');
teste('leitor: recebe os ajustes (vê a lista corrigida) mas não os outros cursos nem "alterado por"; não pode alterar nada', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'Nome ajustado' } }));
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Liderança' } }));
  amb.permitir('leitor@unidade.example', 'LEITOR');
  amb.trocarUsuario('leitor@unidade.example');
  const d = painel(amb);
  igual([d.preparacao.ajustes.length, d.preparacao.ajustes[0].alteradoPor, d.preparacao.outros.length], [1, '', 0]);
  ['salvarDisciplina', 'excluirDisciplinas', 'adicionarAGrade', 'removerDaGrade', 'cadastrarNovaGrade', 'cadastrarDisciplinaOutros', 'previaDisciplinasUnidade', 'incluirDisciplinasUnidade'].forEach((f) => {
    igual(amb.ctx[f]({ origem: 'estrutura', chave: 'PSC1322', campos: {} }, true).codigo, 'SO_ADMIN', f);
  });
});
teste('trava ocupada (importação em andamento): OCUPADO, nada gravado', () => {
  const amb = ambienteComBase();
  const ocupado = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, travaOcupada: true });
  igual(ocupado.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'x' } }).codigo, 'OCUPADO');
  igual(abaObjs(amb, 'Ajustes manuais').length, 0);
});
teste('falha persistente na escrita da aba de ajustes: pedido pendente (1.8.7: LOTE_PENDENTE), a aba continua como estava (escrita única)', () => {
  const amb = ambienteComBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'Antes' } }));
  const antes = JSON.stringify(abaObjs(amb, 'Ajustes manuais'));
  // (1.8.7) A ação em lote é retomável: uma falha única é refeita na mesma chamada; aqui a falha é persistente.
  const f = amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Ajustes manuais', 99);
  const r = amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSA1302' }, { origem: 'estrutura', chave: 'PSE2355' }], true);
  verdade(f.disparos > 0, 'falha disparada');
  igual([r.ok, r.codigo], [false, 'LOTE_PENDENTE']);
  amb.limparFalhas();
  igual(JSON.stringify(abaObjs(amb, 'Ajustes manuais')), antes, 'nenhuma exclusão parcial');
  ev('[falha na escrita] exclusão de 2 disciplinas com falha persistente no setValues: LOTE_PENDENTE, aba de ajustes idêntica à anterior');
});
teste('logs sem e-mail nem conteúdo das disciplinas', () => {
  const amb = ambienteComBase();
  amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Ajustes manuais');
  amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSC1322', campos: { nome: 'Nome secreto' } });
  const logs = amb.estado.logs.concat(amb.estado.erros).join('\n');
  verdade(!/@/.test(logs) && logs.indexOf('Nome secreto') < 0, logs.slice(0, 300));
});

// ---------------------------------------------------------------------
ev('\n=== RESULTADO ===\nExecutados: ' + (ok + falhas) + ' (' + ok + ' ok, ' + falhas + ' falha(s)); pulados: ' + pulados.length + (pulados.length ? '\n' + pulados.map((p) => 'Pulado: ' + p).join('\n') : ''));
fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: ${pulados.length}  — evidências em ${path.relative(process.cwd(), ARQ_EVIDENCIAS)}`);
pulados.forEach((p) => console.log('Pulado (não conta como aprovado): ' + p));
if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }

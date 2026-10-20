// Base única de disciplinas (planilha DISCIPLINAS), etapa 1 — migração
// da ESTRUTURA_CURRICULAR (BaseDisciplinas.gs).
// Estrutura SINTÉTICA (curso 47012, Psicólogo e Bacharelado), planilhas
// fictícias do simulador, e-mails .example. Não precisa de arquivos do Júpiter.
// Uso: node testar_base_disciplinas.js
'use strict';
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
let ok = 0, falhas = 0;
const falhou = [];
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';
const PSI = '470120000262', BAC = '470120100262';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA';
const NOMES = { PST1001: 'Disciplina teste', PSA1005: 'Obrigatória PSA', '4701007': 'Interdepartamental teste', MAE0116: 'Estatística de outra unidade', PSE1009: 'Eletiva excluída' };
const BASE = [[PSI, 'PST1001', OB, 1], [BAC, 'PST1001', EL, 2], [PSI, 'PSA1005', OB, 2], [PSI, '4701007', OB, 3], [BAC, 'MAE0116', OB, 1], [PSI, 'PSE1009', EL, 4]];

function pacoteCurso(vinc) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: String(parseInt(c.slice(5, 9), 10)), habilitacaoNome: c === PSI ? 'Psicólogo' : 'Bacharelado', ano: 2026, semestre: 2, situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: NOMES[d], versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 1, ch: 60, ce: 0, cp: 0, ext: null, atpa: 0 })),
    vinculos: vinc.map((v) => ({ curriculo: v[0], disciplina: v[1], tipo: v[2], periodoIdeal: v[3] })),
    requisitos: [], avisos: [], conferencia: null,
    origem: { formato: 'csv', leitura: 'csv', arquivo: 'sintetico.csv', tamanhoBytes: 1000, codificacao: 'UTF-8', geradoEm: null }
  };
  const por = {};
  curs.forEach((c) => { const vs = p.vinculos.filter((v) => v.curriculo === c); por[c] = { disciplinas: vs.length, OBRIGATORIA: vs.filter((v) => v.tipo === OB).length, OPTATIVA_ELETIVA: vs.filter((v) => v.tipo === EL).length, OPTATIVA_LIVRE: 0, requisitos: 0 }; });
  p.resumoLeitura = { curriculos: curs.length, disciplinas: discs.length, vinculos: vinc.length, requisitos: 0, porCurriculo: por };
  return p;
}
function importar(amb, pk) {
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  return pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
}
function ficha(amb, chave, mudar, obs) {
  const d = pedir(amb.ctx.obterDadosPainel());
  const base = d.base.disciplinas.find((x) => x.codigo === chave);
  const campos = {};
  ['codigo', 'nome', 'departamento', 'creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'ext', 'atpa', 'versao'].forEach((k) => { const v = base[k]; campos[k] = v === null || v === undefined ? '' : String(v); });
  return { origem: 'estrutura', chave, campos: Object.assign(campos, mudar), oferta: null, observacoes: obs };
}
const E = (k) => ({ origem: 'estrutura', chave: k });

function ambiente(op) {
  op = op || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(amb.ctx.obterDadosPainel());
  importar(amb, pacoteCurso(BASE));
  amb.chaveOutros = pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Para a FEA', oferecimento: '2', creditosAula: '4', unidadeAtendida: 'FEA', cursoAtendido: 'Administração' }, observacoes: 'Só noturno' })).chave;
  pedir(amb.ctx.adicionarAGrade([E('PST1001'), { origem: 'outros', chave: amb.chaveOutros }]));
  pedir(amb.ctx.excluirDisciplinas([E('PSE1009')], true));
  pedir(amb.ctx.salvarDisciplina(ficha(amb, 'PSA1005', { nome: 'Obrigatória PSA ajustada' }, 'Turma A')));
  if (!op.semPlanilha) amb.criarPlanilhaDisciplinas(op.planilha);
  return amb;
}
function abaObjs(ss, nome) {
  const s = ss.getSheetByName(nome);
  if (!s || s.getLastRow() < 1) return [];
  const v = s.getRange(1, 1, s.getLastRow(), Math.max(1, s.getLastColumn())).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { o[t] = l[i]; }); return o; });
}
const porCodigo = (ss) => { const m = {}; abaObjs(ss, 'DISCIPLINAS').forEach((l) => { m[l.codigo] = l; }); return m; };
const escritasNa = (amb, n0) => amb.estado.eventos.slice(n0).filter((e) => ['setValues', 'setValue', 'appendRow', 'insertSheet', 'clearContent', 'metadado'].includes(e.tipo) && ['DISCIPLINAS', 'OFERTA_HABILITACAO', 'HISTORICO', 'DICIONARIO', 'LEIA-ME', 'Página1'].includes(e.aba));

console.log('Base única de disciplinas — migração (etapa 1)');

teste('A. Sem a chave DISCIPLINAS no ID_INDEX: erro de configuração e nada gravado', () => {
  const amb = ambiente({ planilha: { semChave: true } });
  const r = amb.ctx.migrarDisciplinasParaBaseUnica();
  igual([r.ok, r.codigo], [false, 'CONFIGURACAO']);
  verdade(/DISCIPLINAS/.test(r.erro), r.erro);
  igual(amb.disciplinas().getSheets().map((s) => s.getName()), ['Página1']);
});

teste('B. Chave DISCIPLINAS apontando para a própria estrutura: recusa', () => {
  const amb = ambiente({ planilha: { idDaChave: 'ID_ESTRUTURA_TESTE' } });
  const r = amb.ctx.migrarDisciplinasParaBaseUnica();
  igual([r.ok, r.codigo], [false, 'CONFIGURACAO']);
});

teste('C. Leitor não migra (SO_ADMIN)', () => {
  const amb = ambiente();
  amb.trocarUsuario(LEITOR);
  igual(amb.ctx.migrarDisciplinasParaBaseUnica().codigo, 'SO_ADMIN');
  igual(amb.ctx.simularMigracaoDisciplinas().codigo, 'SO_ADMIN');
});

teste('D. Simulação: mostra as contagens e não grava nada na planilha DISCIPLINAS', () => {
  const amb = ambiente();
  const n0 = amb.estado.eventos.length;
  const r = pedir(amb.ctx.simularMigracaoDisciplinas());
  igual([r.gravado, r.criadas, r.totalNaBase], [false, 6, 6]);
  igual(r.porUniverso, { IP: 4, OUTRA_PARA_IP: 1, IP_PARA_OUTRAS: 1 });
  igual(escritasNa(amb, n0), []);
  igual(amb.disciplinas().getSheets().map((s) => s.getName()), ['Página1']);
});

let ambC;
teste('E. Migração: abas criadas, uma linha por disciplina, ajustes do painel aplicados', () => {
  const amb = ambC = ambiente();
  const r = pedir(amb.ctx.migrarDisciplinasParaBaseUnica());
  igual([r.gravado, r.criadas, r.alteradas, r.totalNaBase], [true, 6, 0, 6]);
  const ss = amb.disciplinas();
  igual(ss.getSheets().map((s) => s.getName()), ['LEIA-ME', 'DISCIPLINAS', 'OFERTA_HABILITACAO', 'HISTORICO', 'DICIONARIO']);
  const d = porCodigo(ss);
  igual(Object.keys(d).sort(), ['4701007', 'MAE0116', 'PSA1005', 'PSE1009', 'PST1001', 'PST2001']);
  const ids = Object.values(d).map((l) => l.disciplina_id);
  verdade(ids.every((x) => /^disc_[0-9a-f-]{36}$/.test(x)), 'IDs no formato disc_UUID: ' + ids.join(', '));
  igual(new Set(ids).size, 6, 'IDs únicos');
  // Do IP, com tipo/semestre da habilitação Psicólogo e oferta nas duas habilitações
  const p = d.PST1001;
  igual([p.universo, p.uso_grade, p.unidade_sigla, p.departamento, p.tipo_principal, p.semestre_ideal_principal, p.semestre_oferecimento, p.na_grade, p.situacao, p.creditos_total, p.habilitacoes],
    ['IP', 'Sim', 'IP', 'PST', 'Obrigatória', 1, '1º e 2º semestres', 'Sim', 'Ativa', 3, 'Psicólogo, Bacharelado']);
  igual(p.oferta_resumo, 'Psicólogo: Obrigatória, 1º período; Bacharelado: Eletiva, 2º período');
  igual(p.link_jupiter, 'https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=PST1001');
  igual(p.chave_estrutura, 'estrutura:PST1001');
  // Ajuste de nome e observação da estrutura
  igual([d.PSA1005.nome, d.PSA1005.observacao_grade], ['Obrigatória PSA ajustada', 'Turma A']);
  // Excluída no painel
  igual([d.PSE1009.situacao, d.PSE1009.na_grade], ['Excluída', 'Não']);
  // De outra unidade no currículo do IP: sigla da unidade fica para preencher
  igual([d.MAE0116.universo, d.MAE0116.unidade_sigla, d.MAE0116.departamento, d.MAE0116.tipo_principal], ['OUTRA_PARA_IP', '', 'Outra unidade', 'Obrigatória']);
  igual(d['4701007'].departamento, 'Interdepartamental');
  // Do IP para outra unidade
  const o = d.PST2001;
  igual([o.universo, o.unidade_atendida, o.curso_atendido, o.semestre_oferecimento, o.na_grade, o.observacao_grade, o.tipo_principal, o.na_estrutura_atual, o.origem_registro, o.chave_estrutura],
    ['IP_PARA_OUTRAS', 'FEA', 'Administração', '2º semestre', 'Sim', 'Só noturno', '', 'Não', 'Cadastro manual', 'outros:' + amb.chaveOutros]);
  igual([o.revisao, o.criada_por], [1, ADMIN]);
});

teste('F. OFERTA_HABILITACAO, HISTORICO e DICIONARIO', () => {
  const ss = ambC.disciplinas();
  const d = porCodigo(ss);
  const of = abaObjs(ss, 'OFERTA_HABILITACAO');
  igual(of.length, 6, 'um vínculo por disciplina × currículo em uso');
  const pst = of.filter((x) => x.codigo === 'PST1001').map((x) => [x.disciplina_id === d.PST1001.disciplina_id, x.curriculo, x.habilitacao, x.tipo, x.periodo_ideal, x.semestre_oferecimento, x.oferta_ajustada]);
  igual(pst, [[true, PSI, 'Psicólogo', 'Obrigatória', 1, '1º semestre', 'Não'], [true, BAC, 'Bacharelado', 'Eletiva', 2, '2º semestre', 'Não']]);
  const h = abaObjs(ss, 'HISTORICO');
  igual(h.length, 6);
  verdade(h.every((x) => x.operacao === 'CRIADA' && x.registrado_por === ADMIN && /Migração/.test(x.origem)), 'histórico de criação');
  const dic = abaObjs(ss, 'DICIONARIO');
  igual(dic.filter((x) => x.dominio === 'universo').map((x) => x.codigo), ['IP', 'IP_PARA_OUTRAS', 'OUTRA_PARA_IP', 'EXTERNA']);
  igual(dic.filter((x) => x.dominio === 'modalidade').map((x) => x.codigo), ['Teórica', 'Prática']);
});

teste('G. Rodar de novo sem mudanças: mesmos IDs, nada criado nem alterado, histórico igual', () => {
  const ss = ambC.disciplinas();
  const antes = porCodigo(ss);
  const r = pedir(ambC.ctx.migrarDisciplinasParaBaseUnica());
  igual([r.criadas, r.alteradas, r.semMudanca, r.linhasNoHistorico], [0, 0, 6, 0]);
  const depois = porCodigo(ss);
  Object.keys(antes).forEach((k) => igual(depois[k].disciplina_id, antes[k].disciplina_id, 'ID de ' + k));
  igual(abaObjs(ss, 'HISTORICO').length, 6);
  igual(abaObjs(ss, 'OFERTA_HABILITACAO').length, 6, 'oferta regerada, sem duplicar');
});

teste('H. Campos da base e colunas extras preservados; mudança na estrutura vira ALTERADA no histórico', () => {
  const ss = ambC.disciplinas();
  const aba = ss.getSheetByName('DISCIPLINAS');
  const tit = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const col = (t) => tit.indexOf(t) + 1;
  const linhaDe = (cod) => { for (let r = 2; r <= aba.getLastRow(); r++) if (aba.getRange(r, col('codigo')).getValue() === cod) return r; return -1; };
  const r1 = linhaDe('PST1001');
  aba.getRange(r1, col('modalidade')).setValue('Teórica');
  aba.getRange(r1, col('observacao_interna')).setValue('Conferir com o departamento');
  aba.getRange(linhaDe('MAE0116'), col('unidade_sigla')).setValue('IME');
  if (aba.getMaxColumns() <= tit.length) aba.insertColumnsAfter(aba.getMaxColumns(), 1);
  aba.getRange(1, tit.length + 1).setValue('Coluna minha');
  aba.getRange(r1, tit.length + 1).setValue('valor meu');
  const idAntes = aba.getRange(r1, col('disciplina_id')).getValue();
  pedir(ambC.ctx.salvarDisciplina(ficha(ambC, 'PST1001', { nome: 'Disciplina teste revisada' }, 'Turma única')));
  const r = pedir(ambC.ctx.migrarDisciplinasParaBaseUnica());
  igual([r.criadas, r.alteradas], [0, 1]);
  const d = porCodigo(ss);
  igual([d.PST1001.disciplina_id, d.PST1001.nome, d.PST1001.observacao_grade, d.PST1001.modalidade, d.PST1001.observacao_interna, d.PST1001['Coluna minha'], d.PST1001.revisao],
    [idAntes, 'Disciplina teste revisada', 'Turma única', 'Teórica', 'Conferir com o departamento', 'valor meu', 2]);
  igual(d.MAE0116.unidade_sigla, 'IME', 'sigla preenchida à mão não é desfeita');
  const alt = abaObjs(ss, 'HISTORICO').filter((x) => x.operacao === 'ALTERADA').map((x) => [x.codigo, x.campo, x.antes, x.depois]);
  igual(alt, [['PST1001', 'nome', 'Disciplina teste', 'Disciplina teste revisada'], ['PST1001', 'observacao_grade', '', 'Turma única']]);
});

teste('I. Disciplina externa cadastrada à mão: preservada; universo EXTERNA fica fora da grade', () => {
  const ss = ambC.disciplinas();
  const aba = ss.getSheetByName('DISCIPLINAS');
  const tit = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const nova = tit.map(() => '');
  nova[tit.indexOf('disciplina_id')] = 'disc_00000000-0000-4000-8000-000000000099';
  nova[tit.indexOf('codigo')] = 'FLF0115';
  nova[tit.indexOf('nome')] = 'Externa de teste';
  nova[tit.indexOf('universo')] = 'EXTERNA';
  nova[tit.indexOf('situacao')] = 'Ativa';
  aba.appendRow(nova);
  const r = pedir(ambC.ctx.migrarDisciplinasParaBaseUnica());
  igual([r.criadas, r.preservadasSemOrigemNaEstrutura, r.totalNaBase], [0, 1, 7]);
  const d = porCodigo(ss);
  igual([d.FLF0115.disciplina_id, d.FLF0115.nome, d.FLF0115.chave_estrutura], ['disc_00000000-0000-4000-8000-000000000099', 'Externa de teste', '']);
});

teste('J. Código repetido entre disciplinas não substituídas: recusa e nada gravado', () => {
  const amb = ambiente();
  pedir(amb.ctx.migrarDisciplinasParaBaseUnica());
  const aba = amb.disciplinas().getSheetByName('DISCIPLINAS');
  const tit = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const linha = (id) => { const l = tit.map(() => ''); l[tit.indexOf('disciplina_id')] = id; l[tit.indexOf('codigo')] = 'XYZ0001'; l[tit.indexOf('chave_estrutura')] = 'manual:' + id; return l; };
  aba.appendRow(linha('disc_a'));
  aba.appendRow(linha('disc_b'));
  const n0 = amb.estado.eventos.length;
  const r = amb.ctx.migrarDisciplinasParaBaseUnica();
  igual([r.ok, r.codigo], [false, 'CODIGO_REPETIDO']);
  verdade(/XYZ0001/.test(r.erro), r.erro);
  igual(escritasNa(amb, n0), []);
});

teste('K. Linha antiga sem chave_estrutura com o mesmo código: reaproveitada (mantém o ID), não duplicada', () => {
  const amb = ambiente();
  amb.ctx.migrarDisciplinasParaBaseUnica();
  const aba = amb.disciplinas().getSheetByName('DISCIPLINAS');
  const tit = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  let r1 = -1;
  for (let r = 2; r <= aba.getLastRow(); r++) if (aba.getRange(r, tit.indexOf('codigo') + 1).getValue() === 'PSA1005') r1 = r;
  const id = aba.getRange(r1, tit.indexOf('disciplina_id') + 1).getValue();
  aba.getRange(r1, tit.indexOf('chave_estrutura') + 1).setValue('');
  const r = pedir(amb.ctx.migrarDisciplinasParaBaseUnica());
  igual([r.criadas, r.alteradas, r.totalNaBase], [0, 1, 6]);
  const d = porCodigo(amb.disciplinas());
  igual([d.PSA1005.disciplina_id, d.PSA1005.chave_estrutura], [id, 'estrutura:PSA1005']);
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }

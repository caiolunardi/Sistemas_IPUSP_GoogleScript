// Etapa 8 (1.8.12) — confirmação do envio vinculada ao CONTEÚDO da prévia.
//
// Separação explícita (o helper NÃO busca uma identificação nova a cada envio,
// o que esconderia o defeito):
//   capturar(amb, sem, ano)  = o que a pessoa conferiu, ANTES de qualquer mudança:
//       1.8.12: previaEnvioGrade (linhas, contagens e identificação);
//       fonte antiga (sem previaEnvioGrade): as contagens que a página mostrava
//       (a API antiga não tinha identificação de conteúdo);
//   enviarCom(amb, conferida) = o envio com AQUELA conferência (semestre, ano,
//       contagens e, quando existe, a identificação capturada).
// Os casos de mudança com as mesmas contagens provam o defeito na fonte antiga
// (envio aceito, conteúdo posterior gravado) e a correção na nova (recusa ANTES
// de cópia, índice, auditoria, grade e renomeação).
// Estrutura curricular SINTÉTICA (curso 47012); planilha das secretarias,
// índice e pastas FICTÍCIOS do simulador. E-mails .example.
// Uso: node testar_etapa8_previa_envio.js [--evidencias arq]
//      DIR_SRC=/caminho/fonte/src … para rodar em outra fonte (ex.: 1.8.11, "antes").
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const { carregarCliente } = require('./cliente_painel');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa8_previa_envio.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);
let ok = 0, falhas = 0;
const falhou = [];
function teste(nome, fn) {
  ev('\n--- ' + nome);
  try { fn(); ok++; console.log('  ✓', nome); ev('RESULTADO: ok'); }
  catch (e) {
    falhas++; falhou.push(nome);
    console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e);
    ev('RESULTADO: FALHOU — ' + String(e && e.message || e).split('\n')[0]);
  }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

// ---------------------------------------------------------------- dados sintéticos
const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';
const P262 = '470120000262', P271 = '470120000271';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA';
const NOMES = { PST1001: 'Disciplina teste', PST1003: 'Eletiva teste', PSA1005: 'Obrigatória PSA', PST1007: 'Fora da grade', PST1008: 'Para trocar' };
const CRED = { PST1001: 2, PST1003: 4, PSA1005: 2, PST1007: 2, PST1008: 0 };
function pacoteCurso(vinc) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: String(parseInt(c.slice(5, 9), 10)), habilitacaoNome: 'Psicólogo', ano: 2000 + parseInt(c.slice(9, 11), 10), semestre: +c.slice(11), situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: NOMES[d] || 'Sintética ' + d, versao: null, versaoOrigem: null, creditosAula: CRED[d] === undefined ? 2 : CRED[d], creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 })),
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
const BASE = [[P262, 'PST1001', OB, 1], [P262, 'PST1003', EL, 1], [P262, 'PSA1005', OB, 1], [P262, 'PST1007', OB, 1], [P262, 'PST1008', OB, 3]];
const E = (k) => ({ origem: 'estrutura', chave: k });
/** Base: PST1001 ("Disciplina teste", obrigatória, período 1, 2 créditos), PST1003 (eletiva), PSA1005 e PST2001 (outros cursos) na grade; PST1007/PST1008 fora. */
function ambienteBase(op) {
  op = op || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(amb.ctx.obterDadosPainel());
  importar(amb, pacoteCurso(BASE));
  amb.chaveOutros = pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Outra 2001', oferecimento: '1', creditosAula: '2' } })).chave;
  pedir(amb.ctx.adicionarAGrade([E('PST1001'), E('PST1003'), E('PSA1005'), { origem: 'outros', chave: amb.chaveOutros }]));
  amb.criarPlanilhaGrade(op.grade);
  return amb;
}
const temPrevia = (amb) => typeof amb.ctx.previaEnvioGrade === 'function';
/** O que a pessoa conferiu, capturado ANTES da mudança. */
function capturar(amb, semestre, ano) {
  semestre = semestre || '1'; ano = ano || 2027;
  if (temPrevia(amb)) {
    const r = pedir(amb.ctx.previaEnvioGrade({ semestre, ano }));
    return { semestre, ano, esperado: r.contagens, assinatura: r.assinatura, linhas: r.grupos };
  }
  // fonte antiga: as contagens da prévia do painel (o que a API antiga levava)
  const g = amb.ctx.linhasDaGrade_(amb.ctx.contextoPreparacao_(amb.estrutura()), semestre);
  const esperado = {}, linhas = {};
  Object.keys(g).forEach((k) => { esperado[k] = g[k].length; linhas[k] = g[k].map((l) => ({ codigo: l.codigo, nome: l.nomeCompleto, tipo: l.tipo, semestreIdeal: l.semestreIdeal, creditosAula: l.creditosAula })); });
  return { semestre, ano, esperado, assinatura: undefined, linhas };
}
const enviarCom = (amb, c) => amb.ctx.enviarGradeParaPreenchimento({ semestre: c.semestre, ano: c.ano, esperado: c.esperado, assinatura: c.assinatura });
const resumoLinhas = (linhas) => Object.keys(linhas).filter((k) => linhas[k].length).map((k) => k + ': ' + linhas[k].map((l) => [l.codigo, l.nome, l.tipo, l.semestreIdeal, l.creditosAula].join(' | ')).join(' ; ')).join(' || ');
/** Linhas efetivamente gravadas numa aba (C, D, E, I, J), a partir da linha 4. */
function gravadas(amb, aba) {
  const s = amb.grade().getSheetByName(aba);
  const out = [];
  for (let r = 4; r < 40; r++) { const c = s.getRange(r, 3).getValue(); if (c === '' || c === null) break; out.push([c, s.getRange(r, 4).getValue(), s.getRange(r, 5).getValue(), s.getRange(r, 9).getValue(), s.getRange(r, 10).getValue()]); }
  return out;
}
/** Fotografia de tudo o que um envio mudaria: grade (células, notas, nome), índice, pastas, planilhas existentes. */
function foto(amb) {
  const g = amb.grade();
  return JSON.stringify({
    nome: g.getName(), abas: g.getSheets().map((s) => [s.getName(), [...s.cells.entries()], [...s.notes.entries()]]),
    indice: [...amb.indiceGrades().getSheets()[0].cells.entries()],
    pastas: [...amb.estado.pastas.entries()].map(([k, v]) => [k, v.arquivos.slice()]),
    planilhas: [...amb.planilhas.keys()]
  });
}
const EFEITOS = ['makeCopy', 'createSpreadsheet', 'moveTo', 'rename', 'clearContent', 'setFormulas'];
const ABAS_GRADE = ['PSA', 'PSC', 'PSE', 'PST', 'Interdepartamentais', 'Outras Unidades'];
function efeitosDesde(amb, n0) {
  return amb.estado.eventos.slice(n0).filter((e) => EFEITOS.includes(e.tipo) || ((e.tipo === 'setValues' || e.tipo === 'setValue' || e.tipo === 'appendRow') && (ABAS_GRADE.includes(e.aba) || e.aba === 'Página1' || e.aba === 'Edições'))).map((e) => e.tipo + (e.aba ? ' ' + e.aba : ''));
}
/** Tentativa com a confirmação ANTERIOR: deve recusar antes de qualquer efeito do envio. */
function tentarComAnterior(amb, conf, rotulo) {
  const antes = foto(amb);
  const n0 = amb.estado.eventos.length;
  const r = enviarCom(amb, conf);
  const ef = efeitosDesde(amb, n0);
  const depois = capturar(amb, conf.semestre, conf.ano);
  ev('  [' + rotulo + '] conferido: ' + resumoLinhas(conf.linhas));
  ev('  [' + rotulo + '] atual:     ' + resumoLinhas(depois.linhas));
  ev('  [' + rotulo + '] confirmação usada: ' + JSON.stringify({ semestre: conf.semestre, ano: conf.ano, esperado: conf.esperado, assinatura: conf.assinatura ? conf.assinatura.slice(0, 12) + '…' : '(nenhuma: API antiga)' }));
  ev('  [' + rotulo + '] resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, erro: r.erro || null }));
  if (r.ok) ev('  [' + rotulo + '] GRAVADO (PST): ' + JSON.stringify(gravadas(amb, 'PST')) + ' · arquivo "' + amb.grade().getName() + '"');
  ev('  [' + rotulo + '] efeitos do envio: ' + JSON.stringify(ef));
  igual(JSON.stringify(depois.esperado), JSON.stringify(conf.esperado), 'contagens continuam iguais (o cenário é o das mesmas contagens)');
  igual([r.ok, r.codigo], [false, 'PREVIA_DESATUALIZADA'], 'recusa');
  verdade(/não foi enviada/.test(r.erro) && !/Nada foi alterado/.test(r.erro), 'mensagem: ' + r.erro);
  igual(ef, [], 'nenhuma escrita de efeito do envio');
  verdade(foto(amb) === antes, 'grade, índice, pastas e planilhas intactos');
  return r;
}

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 8 — confirmação vinculada ao conteúdo da prévia de envio ===');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* */ }

// =====================================================================
console.log('\n== A. Prévia vigente');
teste('A1. capturar, conferir e enviar sem mudanças: C/D/E/I/J na ordem do servidor, grupos vazios, fórmulas, nome, cópia, índice; nova leitura = conteúdo confirmado', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  ev('  conferido: ' + resumoLinhas(c.linhas));
  const r = pedir(enviarCom(amb, c));
  const pst = gravadas(amb, 'PST'), psa = gravadas(amb, 'PSA');
  ev('  gravado PST: ' + JSON.stringify(pst) + ' · PSA: ' + JSON.stringify(psa));
  igual(pst, [['PST1001', 'Disciplina teste', 'Obrigatória', 1, 2], ['PST1003', 'Eletiva teste', 'Eletiva', 1, 4], ['PST2001', 'Outra 2001', '', '', 2]], 'PST na ordem do servidor: obrigatória, eletiva, sem tipo (outros cursos)');
  igual(psa, [['PSA1005', 'Obrigatória PSA', 'Obrigatória', 1, 2]]);
  ['PSC', 'PSE', 'Interdepartamentais', 'Outras Unidades'].forEach((a) => igual(gravadas(amb, a), [], a + ' vazia'));
  const fm = amb.grade().getSheetByName('PST').get(4, 13);
  verdade(/^=IF\(L4/.test(String(fm && fm.formula || fm)), 'fórmula do Horário de Fim: ' + JSON.stringify(fm));
  igual([amb.grade().getName(), r.total, amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length], ['Grade Horária - 1º semestre de 2027', 4, 1]);
  verdade(amb.indiceGrades().getSheets()[0].getRange(1, 1, amb.indiceGrades().getSheets()[0].getLastRow(), 3).getValues().some((l) => l[0] === '2026/1' && l[1]), 'cópia no índice');
  if (temPrevia(amb)) igual(capturar(amb).assinatura, c.assinatura, 'nova leitura do estado = conteúdo confirmado');
  // linhas conferidas = linhas gravadas
  igual(c.linhas.PST.map((l) => [l.codigo, l.nome, l.tipo, l.semestreIdeal === null ? '' : l.semestreIdeal, l.creditosAula === null ? '' : l.creditosAula]), pst, 'conferido = gravado');
});

// =====================================================================
console.log('\n== B. Mudanças com as mesmas contagens, depois da conferência');
const MUDANCAS = [
  ['B1. nome', (a) => pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome posterior' }, oferta: null }))],
  ['B2. créditos-aula', (a) => pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { creditosAula: '4' }, oferta: null }))],
  ['B3. observações', (a) => pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: null, observacoes: 'Observação posterior' }))],
  ['B4. código no mesmo grupo (PST1001 → PST1009)', (a) => pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { codigo: 'PST1009' }, oferta: null }))],
  ['B5. remoção de uma e inclusão de outra no mesmo grupo', (a) => { pedir(a.ctx.removerDaGrade([E('PST1003')])); pedir(a.ctx.adicionarAGrade([E('PST1007')])); }],
  ['B6. tipo (oferta ajustada: obrigatória → eletiva)', (a) => pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P262, tipo: EL, periodo: 1 }] }))],
  ['B7. semestre ideal 1 → 3, oferecimento continua no 1º', (a) => pedir(a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P262, tipo: OB, periodo: 3 }] }))]
];
MUDANCAS.forEach(([nome, mudar]) => {
  teste(nome + ': a confirmação anterior é recusada antes de cópia, índice, auditoria, grade e renomeação', () => {
    const amb = ambienteBase();
    const c = capturar(amb);
    mudar(amb);
    tentarComAnterior(amb, c, nome.split('.')[0]);
  });
});

// =====================================================================
console.log('\n== C. Origem dos dados e oferta');
teste('C1. disciplina para outros cursos: nome mudado depois da conferência → recusa', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: amb.chaveOutros, campos: { codigo: 'PST2001', nome: 'Outra 2001 renomeada', oferecimento: '1', creditosAula: '2' } }));
  tentarComAnterior(amb, c, 'C1');
});
teste('C2. oferta efetiva depois da troca de currículo (ajuste associado ao 271, mesmo tipo/período): conteúdo igual → a confirmação continua válida e envia', () => {
  const amb = ambienteBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P262, tipo: OB, periodo: 5 }] }));
  const c = capturar(amb);
  importar(amb, pacoteCurso(BASE.map((v) => [v[0] === P262 ? P271 : v[0], v[1], v[2], v[3]])));
  const r = enviarCom(amb, c);
  ev('  envio depois da troca: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null }) + ' · PST gravado: ' + JSON.stringify(gravadas(amb, 'PST')));
  pedir(r);
  igual(gravadas(amb, 'PST')[0], ['PST1001', 'Disciplina teste', 'Obrigatória', 5, 2], 'período ajustado associado ao sucessor');
});
teste('C3. restauração explícita ao Júpiter (restaurarOferta) muda o semestre ideal 5 → 1: a confirmação anterior é recusada', () => {
  const amb = ambienteBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P262, tipo: OB, periodo: 5 }] }));
  const c = capturar(amb);
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P262, tipo: OB, periodo: 1 }], restaurarOferta: true }));
  tentarComAnterior(amb, c, 'C3');
});
teste('C4. semestre de oferecimento manual: "1º" → "1º e 2º" não muda a grade do 1º semestre (válida); PSA1005 "1º" → "2º" sai da grade (contagem muda: recusa)', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { oferecimento: 'ambos' }, oferta: null }));
  if (temPrevia(amb)) igual(capturar(amb).assinatura, c.assinatura, 'conteúdo do 1º semestre igual');
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1005', campos: { oferecimento: '2' }, oferta: null }));
  const r = enviarCom(amb, c);
  igual([r.ok, r.codigo], [false, 'PREVIA_DESATUALIZADA']);
});

// =====================================================================
console.log('\n== D. Alvo, formato e chamadas antigas');
function recusaD(nome, pedido, codigo) {
  teste(nome, () => {
    const amb = ambienteBase();
    const c = capturar(amb);
    const antes = foto(amb), n0 = amb.estado.eventos.length;
    const p = pedido(c, amb);
    const r = (p.leitor ? criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: LEITOR, dono: ADMIN }) : amb).ctx.enviarGradeParaPreenchimento(p.pedido);
    ev('  pedido: ' + JSON.stringify(Object.assign({}, p.pedido, { assinatura: p.pedido.assinatura === undefined ? '(ausente)' : String(p.pedido.assinatura).slice(0, 16) })) + ' → ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, erro: r.erro || null }));
    igual([r.ok, r.codigo], [false, codigo]);
    igual(efeitosDesde(amb, n0), [], 'nenhum efeito');
    verdade(foto(amb) === antes, 'nada mudou');
  });
}
recusaD('D1. identificação ausente (pedido antigo, só contagens certas)', (c) => ({ pedido: { semestre: '1', ano: 2027, esperado: c.esperado } }), 'PREVIA_INVALIDA');
recusaD('D2. identificação malformada', (c) => ({ pedido: { semestre: '1', ano: 2027, esperado: c.esperado, assinatura: 'xyz' } }), 'PREVIA_INVALIDA');
recusaD('D3. identificação alterada (um caractere)', (c) => ({ pedido: { semestre: '1', ano: 2027, esperado: c.esperado, assinatura: c.assinatura ? (c.assinatura[0] === 'a' ? 'b' : 'a') + c.assinatura.slice(1) : ('0'.repeat(64)) } }), 'PREVIA_DESATUALIZADA');
recusaD('D4. identificação de 2027/1 usada para 2028/1 (as linhas coincidem)', (c) => ({ pedido: { semestre: '1', ano: 2028, esperado: c.esperado, assinatura: c.assinatura || '0'.repeat(64) } }), 'PREVIA_DESATUALIZADA');
recusaD('D5. alvo inválido continua com a validação amigável', (c) => ({ pedido: { semestre: '3', ano: 2027, esperado: c.esperado, assinatura: c.assinatura } }), 'DADOS_INVALIDOS');
recusaD('D6. leitor continua impedido de enviar', (c) => ({ leitor: true, pedido: { semestre: '1', ano: 2027, esperado: c.esperado, assinatura: c.assinatura } }), 'SO_ADMIN');
teste('D7. leitor não obtém a prévia do envio (só administradores)', () => {
  const amb = ambienteBase();
  verdade(temPrevia(amb), 'previaEnvioGrade existe');
  igual(criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: LEITOR, dono: ADMIN }).ctx.previaEnvioGrade({ semestre: '1', ano: 2027 }).codigo, 'SO_ADMIN');
});

// =====================================================================
console.log('\n== E. Conteúdo equivalente e representação canônica');
teste('E1. mesmos dados lidos de novo: mesma identificação; mudanças fora do conteúdo (campo não enviado, disciplina fora da grade, outro semestre, e-mail/data de alteração) mantêm a confirmação válida e o envio grava o conferido', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  verdade(temPrevia(amb), 'previaEnvioGrade existe');
  igual(capturar(amb).assinatura, c.assinatura, 'estável');
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { ch: '99', departamento: 'PSA' }, oferta: null }));   // CH e departamento não vão para a grade
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1007', campos: { nome: 'Fora da grade, renomeada' }, oferta: null }));   // fora da grade
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1008', campos: { nome: 'Só do 2º' }, oferta: null }));
  const b = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'outra.pessoa@unidade.example', dono: ADMIN });
  b.permitir && b.permitir('outra.pessoa@unidade.example', 'ADMINISTRADOR');
  igual(capturar(amb).assinatura, c.assinatura, 'conteúdo de envio igual');
  pedir(enviarCom(amb, c));
  igual(gravadas(amb, 'PST')[0], ['PST1001', 'Disciplina teste', 'Obrigatória', 1, 2]);
});
teste('E2. representação canônica: zero ≠ vazio; acentos, aspas, barras e quebras de linha; sem colisão por concatenação; ordem e grupos fazem parte; objetos não entram', () => {
  const amb = ambienteBase();
  verdade(typeof amb.ctx.conteudoCanonicoDoEnvio_ === 'function', 'função de conteúdo canônico (controle de unidade, só 1.8.12)');
  const C = amb.ctx;
  const vazio = () => ({ PSA: [], PSC: [], PSE: [], PST: [], INTER: [], OUTRAS: [] });
  const com = (linhas, grupo) => { const v = vazio(); v[grupo || 'PST'] = linhas.map((l) => ({ cde: l.slice(0, 3), ij: l.slice(3) })); return v; };
  const h = (v, s, a) => C.assinaturaDoEnvio_(s || '1', a || 2027, v);
  const base = h(com([['PST1', 'Nome', 'Obrigatória', 1, 0]]));
  verdade(base !== h(com([['PST1', 'Nome', 'Obrigatória', 1, '']])), 'créditos 0 ≠ vazio');
  verdade(h(com([['PST1', 'a', 'b', '', '']])) !== h(com([['PST1', 'a', '', 'b', '']])), 'posição dos campos');
  verdade(h(com([['A', 'b|c', '', '', '']])) !== h(com([['A|b', 'c', '', '', '']])), 'sem colisão por separador');
  verdade(h(com([['PST1', 'Ação "x" \\ y\nz', '', 1, 2]])) !== h(com([['PST1', 'Acao "x" \\ y\nz', '', 1, 2]])), 'acentos contam');
  igual(C.conteudoCanonicoDoEnvio_('1', 2027, com([['PST1', 'l1\nl2 "q"', '', 1, 2]])).includes('l1\\nl2 \\"q\\"'), true, 'escape JSON estável');
  verdade(h(com([['PST1', 'N', '', 1, 2], ['PST2', 'M', '', 1, 2]])) !== h(com([['PST2', 'M', '', 1, 2], ['PST1', 'N', '', 1, 2]])), 'ordem das linhas conta');
  verdade(h(com([['PST1', 'N', '', 1, 2]], 'PST')) !== h(com([['PST1', 'N', '', 1, 2]], 'PSA')), 'grupo conta');
  verdade(base !== h(com([['PST1', 'Nome', 'Obrigatória', 1, 0]]), '2') && base !== h(com([['PST1', 'Nome', 'Obrigatória', 1, 0]]), '1', 2028), 'alvo conta');
  igual(base, h(com([['PST1', 'Nome', 'Obrigatória', 1, 0]])), 'determinística');
  ev('  conteúdo canônico (exemplo): ' + C.conteudoCanonicoDoEnvio_('1', 2027, com([['PST1001', 'Nome – Obs "x"\nlinha 2', 'Obrigatória', 1, 0]])));
});
teste('E3. observação com quebra de linha, aspas e texto que parece fórmula: a identificação da prévia vale e o gravado é o conferido (textoSeguro_)', () => {
  const amb = ambienteBase();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: null, observacoes: 'Turma "A"\nsala 2' }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1003', campos: { nome: '=1+1 não é fórmula' }, oferta: null }));
  const c = capturar(amb);
  pedir(enviarCom(amb, c));
  const pst = gravadas(amb, 'PST');
  ev('  conferido: ' + resumoLinhas(c.linhas) + '\n  gravado: ' + JSON.stringify(pst));
  igual(pst[0][1], 'Disciplina teste – Turma "A"\nsala 2');
  verdade(String(pst[1][1]).indexOf('=1+1 não é fórmula') >= 0, 'nome gravado como texto: ' + pst[1][1]);
  igual(pst[1][1], c.linhas.PST[1].nome === pst[1][1] ? pst[1][1] : "'" + c.linhas.PST[1].nome, 'gravado = conferido (com a proteção de texto de textoSeguro_)');
});

// =====================================================================
console.log('\n== H. Recuperação anterior ao envio');
teste('H1. salvamento individual pendente (nome) concluído no pedido de envio: recusa com recuperado; o salvamento continua gravado; nenhum efeito do envio', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), 99);
  const rs = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome recuperado' }, oferta: null, observacoes: 'obs pendente' });
  igual(rs.codigo, 'SALVAMENTO_PENDENTE');
  amb.limparFalhas();
  const antes = foto(amb), n0 = amb.estado.eventos.length;
  const r = enviarCom(amb, c);
  ev('  resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, erro: r.erro || null, recuperado: r.dados && r.dados.recuperado ? { codigo: r.dados.recuperado.codigo, obs: r.dados.recuperado.observacao } : null }));
  igual([r.ok, r.codigo], [false, 'PREVIA_DESATUALIZADA']);
  verdade(r.dados && r.dados.recuperado && r.dados.recuperado.codigo === 'PST1001', 'recuperado na recusa');
  verdade(!/Nada foi alterado/.test(r.erro), 'não nega a recuperação: ' + r.erro);
  igual(efeitosDesde(amb, n0), [], 'nenhum efeito do envio');
  verdade(foto(amb) === antes, 'grade, índice, pastas intactos');
  const d = pedir(amb.ctx.obterDadosPainel());
  igual([d.salvamentoPendente, (d.preparacao.ajustes.find((a) => a.chave === 'PST1001') || { campos: {} }).campos.nome], [null, 'Nome recuperado'], 'salvamento anterior concluído e gravado');
});
teste('H2. ação em lote pendente (excluir PST1003 + outros) concluída no pedido de envio: recusa com recuperadoLote; nenhum efeito', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Disciplinas para outros cursos', 99);
  const rl = amb.ctx.excluirDisciplinas([E('PST1003'), { origem: 'outros', chave: amb.chaveOutros }], true);
  igual(rl.codigo, 'LOTE_PENDENTE');
  amb.limparFalhas();
  const antes = foto(amb), n0 = amb.estado.eventos.length;
  const r = enviarCom(amb, c);
  ev('  resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, recuperadoLote: r.dados && r.dados.recuperadoLote ? { acao: r.dados.recuperadoLote.acao, total: r.dados.recuperadoLote.total } : null }));
  igual([r.ok, r.codigo], [false, 'PREVIA_DESATUALIZADA']);
  verdade(r.dados && r.dados.recuperadoLote && r.dados.recuperadoLote.acao === 'excluir', 'recuperadoLote na recusa');
  igual(efeitosDesde(amb, n0), [], 'nenhum efeito do envio');
  verdade(foto(amb) === antes, 'intacto');
});
teste('H3. controle: recuperação que NÃO muda o conteúdo do envio (CH) é concluída e o envio prossegue com recuperado', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), 99);
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1007', campos: { ch: '45' }, oferta: null, observacoes: 'só obs fora da grade' }).codigo, 'SALVAMENTO_PENDENTE');
  amb.limparFalhas();
  const r = pedir(enviarCom(amb, c));
  verdade(r.recuperado && r.recuperado.codigo === 'PST1007', 'recuperado devolvido');
  igual(gravadas(amb, 'PST')[0], ['PST1001', 'Disciplina teste', 'Obrigatória', 1, 2]);
});

// =====================================================================
console.log('\n== I. Trava durante a conferência e o envio');
function instalarTrava(amb) {
  const m = { dono: null, exec: 'A', log: [] };
  amb.ctx.LockService = { getScriptLock: () => { let adq = false; return {
    tryLock() { if (m.dono === null || m.dono === m.exec) { m.log.push(m.exec + ' adquirir' + (m.dono === m.exec ? ' (já tinha)' : '')); m.dono = m.exec; adq = true; return true; } m.log.push(m.exec + ' ocupada'); return false; },
    releaseLock() { if (m.dono === m.exec) { m.dono = null; m.log.push(m.exec + ' liberar'); } else m.log.push(m.exec + ' liberar sem propriedade'); adq = false; },
    hasLock() { return adq && m.dono === m.exec; } }; } };
  const orig = amb.ctx.assinaturaDoEnvio_;
  if (orig) amb.ctx.assinaturaDoEnvio_ = function () { m.log.push(m.exec + ' conferir identificação — trava: ' + (m.dono || 'NINGUÉM')); return orig.apply(this, arguments); };
  amb.injetarFalha((e) => { if (['makeCopy', 'setFormulas', 'rename', 'flush'].includes(e.tipo)) m.log.push(m.exec + ' ' + e.tipo + ' — trava: ' + (m.dono || 'NINGUÉM')); return false; }, 1e9);
  return m;
}
teste('I1. envio aprovado: conferência da identificação e efeitos sob a mesma trava, uma liberação; recusa: conferência sob a trava, sem efeitos, liberada; depois outra execução adquire', () => {
  const amb = ambienteBase();
  const c = capturar(amb);
  const m = instalarTrava(amb);
  pedir(enviarCom(amb, c));
  ev('  envio aprovado:\n    ' + m.log.join('\n    '));
  verdade(m.log.some((l) => /conferir identificação — trava: A/.test(l)), 'conferência com a trava');
  igual(m.log.filter((l) => /— trava: NINGUÉM/.test(l)), [], 'nada sem trava');
  igual(m.log.filter((l) => /liberar/.test(l)), ['A liberar'], 'uma liberação');
  // recusa
  const c2 = capturar(amb);
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Outro nome' }, oferta: null }));
  m.log.length = 0;
  const r = enviarCom(amb, c2);
  ev('  envio recusado:\n    ' + m.log.join('\n    '));
  igual(r.codigo, 'PREVIA_DESATUALIZADA');
  verdade(m.log.some((l) => /conferir identificação — trava: A/.test(l)) && !m.log.some((l) => /makeCopy|setFormulas|rename/.test(l)), 'conferência sob a trava e nenhum efeito');
  igual(m.dono, null, 'trava liberada');
  m.exec = 'Z';
  const t = amb.ctx.LockService.getScriptLock();
  igual(t.tryLock(1000), true, 'outra execução adquire');
  t.releaseLock();
});

// ---------------------------------------------------------------- resumo
console.log('\nExecutados: ' + (ok + falhas) + ' · ' + ok + ' ok · ' + falhas + ' falhas · 0 pulados');
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
ev('\n=== Resumo: ' + ok + ' ok, ' + falhas + ' falhas, 0 pulados');
fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
process.exit(falhas ? 1 : 0);

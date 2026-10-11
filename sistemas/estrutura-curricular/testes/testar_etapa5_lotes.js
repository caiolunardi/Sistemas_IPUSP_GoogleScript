// Etapa 5 (1.8.7) — ações em lote (excluir, restaurar, adicionar à grade,
// remover da grade) com itens da estrutura E de outros cursos, pelas
// funções reais, com falhas DETERMINÍSTICAS injetadas no simulador
// (mockGoogle.js: planilhas e Propriedades do script) e reabertura sobre a
// mesma persistência — inclusive a partir de uma FOTOGRAFIA tirada no meio
// da execução (execução encerrada no ponto: catch, nova tentativa e
// resposta não acontecem; o contexto novo só vê o que já estava gravado).
//
// Reprodução da revisão (seção R): PST1001 (estrutura) + PST2001 (outros
// cursos, cadastrado pela API e referenciado pela chave devolvida), falha
// no setValues de "Disciplinas para outros cursos" DEPOIS da escrita de
// "Ajustes manuais"; contexto novo + obterDadosPainel. Na 1.8.6: INESPERADO
// e gravação parcial que sobrevive à reabertura.
//
// Estrutura curricular SINTÉTICA (PST1001, PST1002, 4701003, PSA1004,
// PSE1005, de pacotes_sinteticos.js; o CSV do Júpiter só empresta o formato
// do curso/currículo). Outros cursos sintéticos (PST2001…). E-mails .example.
// Uso: node testar_etapa5_lotes.js <grade_curricular.csv> [--evidencias arq] [--sem-capacidade]
//      DIR_SRC=/caminho/fonte/src … para rodar em outra fonte.
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const csvPath = process.argv[2];
if (!csvPath || csvPath.startsWith('--')) { console.log('Uso: node testar_etapa5_lotes.js <grade_curricular.csv>'); process.exit(2); }
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa5_lotes.txt');
const SEM_CAPACIDADE = process.argv.includes('--sem-capacidade');
const evidencias = [];
const ev = (t) => evidencias.push(t);

let ok = 0, falhas = 0;
const falhou = [], pulados = [];
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

// ---------------------------------------------------------------- dados
const leitores = carregar();
const modelo = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const CODIGOS = { SIN0001: 'PST1001', SIN0002: 'PST1002', SIN0003: '4701003', SIN0004: 'PSA1004', SIN0005: 'PSE1005' };
function pacote() {
  const p = parSintetico(modelo, 5).csv;
  p.disciplinas.forEach((d) => { d.codigo = CODIGOS[d.codigo]; d.nome = 'Sintética ' + d.codigo; });
  p.vinculos.forEach((v) => { v.disciplina = CODIGOS[v.disciplina]; });
  return p;
}
const META_ATIVA = 'estruturaCurricular.ativa';
const META_SALV = 'estruturaCurricular.salvamento';
const PROP_LOTE = 'estruturaCurricular.lote';
const AJ = 'Ajustes manuais';
const OU = 'Disciplinas para outros cursos';
const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';

function importar(amb, pk) {
  pk = pk || pacote();
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  return amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao });
}
function ambienteVazio() {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(amb.ctx.obterDadosPainel());
  return amb;
}
/**
 * Base dos cenários: estrutura sintética; PST1001 e PST1002 com semestre de
 * oferecimento ajustado (1º); outros cursos PST2001 (1º) e PST2002 (2º),
 * cadastrados pela API (a chave usada é a devolvida).
 */
function novoAmbiente() {
  const amb = ambienteVazio();
  pedir(importar(amb));
  ['PST1001', 'PST1002'].forEach((k) => pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: k, campos: { oferecimento: '1' }, oferta: null })));
  amb.chaves = {
    PST2001: pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Outra 2001', oferecimento: '1' } })).chave,
    PST2002: pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2002', nome: 'Outra 2002', oferecimento: '2' } })).chave
  };
  return amb;
}
function reabrir(origem, usuario) { const a = criarAmbiente({ dirSrc: DIR_SRC, reusar: origem, usuario: usuario || ADMIN, dono: ADMIN }); a.chaves = origem.chaves; return a; }
const E = (k) => ({ origem: 'estrutura', chave: k });
const O = (k) => ({ origem: 'outros', chave: k });
const A2 = [E('PST1001'), O('PST2001')];

// ---- leitura DIRETA da persistência
function metadado(ss, k) { const m = ss.meta.find((x) => x.k === k); return m ? m.v : null; }
function abaAtiva(amb, nome) { const ss = amb.estrutura(); const m = JSON.parse(metadado(ss, META_ATIVA)); return ss.sheets.find((s) => s.getSheetId() === m.abas[nome]); }
function objetos(aba) {
  if (!aba || aba.getLastRow() < 2) return [];
  const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { if (t) o[t] = l[i] instanceof Date ? l[i].toISOString() : l[i]; }); return o; });
}
function linhasDe(amb, origem, chave) {
  return origem === 'estrutura'
    ? objetos(amb.estrutura().getSheetByName(AJ)).filter((a) => String(a['Disciplina (código no Júpiter)']) === chave)
    : objetos(amb.estrutura().getSheetByName(OU)).filter((o) => String(o['Identificador']) === chave);
}
/** Marcas gravadas: 'E' = excluída, 'G' = adicionada à grade ('-' = linha de ajuste ausente = nenhuma marca). */
function marcas(amb, origem, chave) {
  const l = linhasDe(amb, origem, chave);
  if (l.length > 1) throw new Error('linhas duplicadas para ' + origem + ':' + chave);
  if (!l.length) return origem === 'estrutura' ? '-' : '(sem linha)';
  return (l[0]['Excluída'] === 'Sim' ? 'E' : '') + (l[0]['Adicionada à grade horária'] === 'Sim' ? 'G' : '') || '-';
}
function lotePend(amb) { const v = amb.props[PROP_LOTE]; return v ? JSON.parse(v) : null; }
function partesLote(amb) { return Object.keys(amb.props).filter((k) => k.indexOf(PROP_LOTE + '.') === 0); }
function situacao(amb, itens) { const o = {}; (itens || A2).forEach((it) => { o[it.origem + ':' + it.chave] = marcas(amb, it.origem, it.chave); }); o.pendente = !!lotePend(amb); return o; }
function painelMarcas(d, itens) {
  const o = {};
  (itens || A2).forEach((it) => {
    const x = it.origem === 'estrutura' ? d.preparacao.ajustes.find((a) => a.chave === it.chave) : d.preparacao.outros.find((a) => a.chave === it.chave);
    o[it.origem + ':' + it.chave] = x ? ((x.excluida ? 'E' : '') + (x.naGrade ? 'G' : '') || '-') : (it.origem === 'estrutura' ? '-' : '(sem linha)');
  });
  return o;
}
function painel(origem, usuario) { const a = reabrir(origem, usuario); return { amb: a, d: pedir(a.ctx.obterDadosPainel()) }; }
function escritas(amb, aba) { return amb.estado.eventos.filter((e) => (e.tipo === 'setValues' || e.tipo === 'setValue') && (!aba || e.aba === aba)).length; }
const falhaOutros = (amb, vezes) => amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === OU, vezes);
const falhaAjustes = (amb, vezes) => amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === AJ, vezes);
function resumoR(r) { return { ok: r.ok, codigo: r.codigo || null, resultado: r.dados && r.dados.resultado || null, erro: r.erro || null, lote: r.dados && r.dados.lote ? { estado: r.dados.lote.estado, acao: r.dados.lote.acao, total: r.dados.lote.total, confirmados: r.dados.lote.confirmados, grupos: r.dados.lote.grupos } : null }; }
const executar = { excluir: (amb, it) => amb.ctx.excluirDisciplinas(it, true), restaurar: (amb, it) => amb.ctx.excluirDisciplinas(it, false), adicionar: (amb, it) => amb.ctx.adicionarAGrade(it), remover: (amb, it) => amb.ctx.removerDaGrade(it) };
/** Pré-condições dos quatro cenários da revisão. */
const PRE = {
  excluir: (amb) => pedir(amb.ctx.adicionarAGrade(A2)),
  restaurar: (amb) => pedir(amb.ctx.excluirDisciplinas(A2, true)),
  adicionar: () => {},
  remover: (amb) => pedir(amb.ctx.adicionarAGrade(A2))
};
const ALVO = { excluir: 'E', restaurar: '-', adicionar: 'G', remover: '-' };
// cliente: dados do painel atualizados com o MESMO contrato do PainelApp
function clienteInicial(amb) { return JSON.parse(JSON.stringify(pedir(amb.ctx.obterDadosPainel()))); }
function aplicarNoCliente(cli, dados) {
  if (!dados) return;
  const patch = (o) => { if (o) { const x = cli.base.disciplinas.find((d) => d.codigo === o.chave); if (x) x.observacoes = o.texto; } };
  if (dados.recuperado) { if (dados.recuperado.preparacao) cli.preparacao = JSON.parse(JSON.stringify(dados.recuperado.preparacao)); patch(dados.recuperado.observacao); }
  if (dados.recuperadoLote && dados.recuperadoLote.preparacao) cli.preparacao = JSON.parse(JSON.stringify(dados.recuperadoLote.preparacao));
  if (dados.preparacao) cli.preparacao = JSON.parse(JSON.stringify(dados.preparacao));
  patch(dados.observacao);
}

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 5 — ações em lote mistas (estrutura + outros cursos) ===');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* */ }

// =====================================================================
console.log('\n== R. Reprodução da revisão: lote PST1001 + PST2001, falha no setValues de outros cursos depois da escrita de Ajustes manuais');
for (const acao of ['excluir', 'restaurar', 'adicionar', 'remover']) {
  for (const [variante, vezes] of [['falha uma vez', 1], ['falha persistente nesta execução', 99]]) {
    teste('R-' + acao + ' (' + variante + '): nada de parcial silencioso; contexto novo com as duas disciplinas no alvo', () => {
      const amb = novoAmbiente();
      PRE[acao](amb);
      const antes = situacao(amb);
      let ajustesGravados = null;
      amb.injetarFalha((e) => { if (e.tipo === 'setValuesDepois' && e.aba === AJ && !ajustesGravados) ajustesGravados = situacao(amb); return false; }, 1);
      const f = falhaOutros(amb, vezes);
      const r = executar[acao](amb, A2);
      const depois = situacao(amb);
      amb.limparFalhas();
      const { amb: a2, d } = painel(amb);
      const reaberto = situacao(a2);
      ev('  antes: ' + JSON.stringify(antes) + ' · Ajustes gravado (instante): ' + JSON.stringify(ajustesGravados));
      ev('  resposta: ' + JSON.stringify(resumoR(r)));
      ev('  persistido depois da chamada: ' + JSON.stringify(depois));
      ev('  contexto novo + obterDadosPainel: persistido ' + JSON.stringify(reaberto) + ' · painel ' + JSON.stringify(painelMarcas(d)) + ' · lotePendente ' + JSON.stringify(d.lotePendente === undefined ? '(campo inexistente)' : d.lotePendente && { estado: d.lotePendente.estado, acao: d.lotePendente.acao }));
      verdade(f.disparos >= 1, 'falha disparada');
      const alvo = { 'estrutura:PST1001': ALVO[acao], 'outros:PST2001': ALVO[acao], pendente: false };
      // comportamento: depois da reabertura, as duas no alvo e nada pendente
      igual(reaberto, alvo, 'persistido depois da reabertura');
      igual(painelMarcas(d), { 'estrutura:PST1001': ALVO[acao], 'outros:PST2001': ALVO[acao] }, 'painel');
      if (vezes === 1) {
        igual([r.ok, r.dados && r.dados.resultado], [true, 'concluido'], 'uma falha: nova tentativa na mesma chamada conclui');
        igual(depois, alvo, 'persistido logo depois da chamada');
      } else {
        igual([r.ok, r.codigo, r.dados.lote.estado, r.dados.lote.acao], [false, 'LOTE_PENDENTE', 'pendente', acao], 'pendência explícita');
        igual(r.dados.lote.grupos, [{ origem: 'estrutura', total: 1, confirmados: 1, faltam: [] }, { origem: 'outros', total: 1, confirmados: 0, faltam: ['PST2001'] }], 'o que está gravado e o que falta, por item');
        igual(depois, { 'estrutura:PST1001': ALVO[acao], 'outros:PST2001': antes['outros:PST2001'], pendente: true }, 'parcial, mas registrado');
        igual(d.lotePendente && d.lotePendente.estado, 'concluido', 'abertura do painel concluiu');
      }
    });
  }
}

// =====================================================================
console.log('\n== 1. Sucesso: misto, homogêneo e um item');
teste('1a. misto com 2+2 itens: excluir, restaurar, adicionar, remover — contagens, persistência, sem registro, contexto novo igual', () => {
  const amb = novoAmbiente();
  const L = [E('PST1001'), E('PST1002'), O('PST2001'), O('PST2002')];
  const r1 = pedir(amb.ctx.adicionarAGrade(L));
  igual([r1.resultado, r1.adicionadas, r1.jaEstavam, r1.ignoradas, r1.semOferecimento], ['concluido', 4, 0, 0, []]);
  igual(situacao(amb, L), { 'estrutura:PST1001': 'G', 'estrutura:PST1002': 'G', 'outros:PST2001': 'G', 'outros:PST2002': 'G', pendente: false });
  const r2 = pedir(amb.ctx.removerDaGrade(L.slice(0, 3)));
  igual([r2.resultado, r2.removidas], ['concluido', 3]);
  igual(situacao(amb, L), { 'estrutura:PST1001': '-', 'estrutura:PST1002': '-', 'outros:PST2001': '-', 'outros:PST2002': 'G', pendente: false });
  const r3 = pedir(amb.ctx.excluirDisciplinas(L, true));
  igual([r3.resultado, r3.alteradas], ['concluido', 4]);
  igual(situacao(amb, L), { 'estrutura:PST1001': 'E', 'estrutura:PST1002': 'E', 'outros:PST2001': 'E', 'outros:PST2002': 'E', pendente: false }, 'excluir tira da grade');
  const r4 = pedir(amb.ctx.excluirDisciplinas(L, false));
  igual([r4.resultado, r4.alteradas], ['concluido', 4]);
  igual(situacao(amb, L), { 'estrutura:PST1001': '-', 'estrutura:PST1002': '-', 'outros:PST2001': '-', 'outros:PST2002': '-', pendente: false }, 'restaurar não devolve à grade');
  igual(partesLote(amb), [], 'nenhuma parte de registro sobrando');
  igual(painelMarcas(painel(amb).d, L), { 'estrutura:PST1001': '-', 'estrutura:PST1002': '-', 'outros:PST2001': '-', 'outros:PST2002': '-' });
});
teste('1b. homogêneo (só estrutura, só outros) e um item (ficha): as quatro ações', () => {
  const amb = novoAmbiente();
  for (const L of [[E('PST1001'), E('PST1002')], [O('PST2001'), O('PST2002')], [E('PST1001')], [O('PST2001')]]) {
    const ab = L[0].origem === 'estrutura' ? AJ : OU;
    const n0 = escritas(amb);
    igual(pedir(amb.ctx.adicionarAGrade(L)).adicionadas, L.length, 'adicionar ' + JSON.stringify(L));
    igual(escritas(amb) - n0, 1, 'uma escrita (só a aba ' + ab + ')');
    igual(pedir(amb.ctx.removerDaGrade(L)).removidas, L.length);
    igual(pedir(amb.ctx.excluirDisciplinas(L, true)).alteradas, L.length);
    L.forEach((it) => igual(marcas(amb, it.origem, it.chave), 'E'));
    igual(pedir(amb.ctx.excluirDisciplinas(L, false)).alteradas, L.length);
    L.forEach((it) => igual(marcas(amb, it.origem, it.chave), '-'));
  }
  igual(lotePend(amb), null);
});

// =====================================================================
console.log('\n== 2. Falha antes da primeira escrita e antes da escrita seguinte');
teste('2a. registro do pedido recusado (partes): NAO_SALVO, nada alterado, nada pendente, nenhuma parte solta', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const antes = situacao(amb);
  const f = amb.injetarFalha((e) => e.tipo === 'propriedades', 1);
  const r = amb.ctx.excluirDisciplinas(A2, true);
  ev('  resposta: ' + JSON.stringify(resumoR(r)));
  igual(f.disparos, 1, 'falha disparada');
  igual(situacao(amb), antes, 'nada alterado');
  igual([r.ok, r.codigo, r.dados && r.dados.resultado], [false, 'NAO_SALVO', 'nao_concluido']);
  verdade(/Nada foi alterado/.test(r.erro), r.erro);
  igual(partesLote(amb), [], 'sem partes');
  igual(painelMarcas(r.dados), { 'estrutura:PST1001': 'G', 'outros:PST2001': 'G' }, 'dados lidos na recusa');
});
teste('2b. cabeçalho do registro recusado (antes de aplicar): NAO_SALVO; partes limpas', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const antes = situacao(amb);
  const f = amb.injetarFalha((e) => e.tipo === 'propriedade' && e.chave === PROP_LOTE, 1);
  const r = amb.ctx.excluirDisciplinas(A2, true);
  igual(f.disparos, 1);
  igual([r.ok, r.codigo, situacao(amb), partesLote(amb)], [false, 'NAO_SALVO', antes, []]);
});
teste('2c. falha (persistente) ANTES da primeira escrita de dados: pendente "nenhuma gravada ainda", pedido registrado; contexto novo conclui', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const f = falhaAjustes(amb, 99);
  const r = amb.ctx.excluirDisciplinas(A2, true);
  ev('  resposta: ' + JSON.stringify(resumoR(r)));
  verdade(f.disparos >= 1, 'falha disparada');
  igual([r.ok, r.codigo, r.dados.lote.confirmados, r.dados.lote.total], [false, 'LOTE_PENDENTE', 0, 2]);
  verdade(/nenhuma está gravada ainda/.test(r.erro) && /continua registrado/.test(r.erro), r.erro);
  igual(situacao(amb), { 'estrutura:PST1001': 'G', 'outros:PST2001': 'G', pendente: true });
  const { amb: a2 } = painel(amb);
  igual(situacao(a2), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
});
teste('2d. falha (persistente) antes da escrita SEGUINTE, 2+2 itens: grupos identificam cada item (estrutura confirmados, outros faltam)', () => {
  const amb = novoAmbiente();
  const L = [E('PST1001'), E('PST1002'), O('PST2001'), O('PST2002')];
  pedir(amb.ctx.adicionarAGrade(L));
  const f = falhaOutros(amb, 99);
  const r = amb.ctx.removerDaGrade(L);
  verdade(f.disparos >= 1);
  igual([r.codigo, r.dados.lote.grupos], ['LOTE_PENDENTE', [{ origem: 'estrutura', total: 2, confirmados: 2, faltam: [] }, { origem: 'outros', total: 2, confirmados: 0, faltam: ['PST2001', 'PST2002'] }]]);
  verdade(/2 de 4 já estão gravadas \(estrutura: 2 de 2; outros cursos: 0 de 2\)/.test(r.erro), r.erro);
  igual(situacao(amb, L), { 'estrutura:PST1001': '-', 'estrutura:PST1002': '-', 'outros:PST2001': 'G', 'outros:PST2002': 'G', pendente: true });
  igual(painelMarcas(r.dados, L), { 'estrutura:PST1001': '-', 'estrutura:PST1002': '-', 'outros:PST2001': 'G', 'outros:PST2002': 'G' }, 'dados lidos na recusa');
});

// =====================================================================
console.log('\n== 3. Falha depois de valores aplicados');
for (const [nome, regra, abaNaoReescrita] of [
  ['3a. escrita de Ajustes aplicada e exceção', (e) => e.tipo === 'setValuesDepois' && e.aba === AJ, AJ],
  ['3b. ÚLTIMA escrita (outros cursos) aplicada e exceção', (e) => e.tipo === 'setValuesDepois' && e.aba === OU, OU],
  ['3c. cabeçalho do registro gravado e exceção', (e) => e.tipo === 'propriedadeDepois' && e.chave === PROP_LOTE, null],
  ['3d. flush depois das escritas', (e) => e.tipo === 'flush', null]]) {
  teste(nome + ': conferência na planilha; nova tentativa só do que falta; concluído', () => {
    const amb = novoAmbiente(); PRE.excluir(amb);
    let instante = null;
    const f = amb.injetarFalha((e) => { const sim = regra(e); if (sim) instante = situacao(amb); return sim; }, 1);
    const n0 = abaNaoReescrita ? escritas(amb, abaNaoReescrita) : 0;
    const r = amb.ctx.excluirDisciplinas(A2, true);
    ev('  persistido no instante do erro: ' + JSON.stringify(instante) + ' · resposta: ' + JSON.stringify(resumoR(r)));
    igual(f.disparos, 1, 'falha disparada');
    igual(situacao(amb), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
    igual([r.ok, r.dados.resultado, r.dados.alteradas], [true, 'concluido', 2]);
    if (abaNaoReescrita) igual(escritas(amb, abaNaoReescrita) - n0, 1, 'a aba já aplicada não foi reescrita na nova tentativa');
    igual(painelMarcas(r.dados), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E' }, 'resposta = planilha');
  });
}

// =====================================================================
console.log('\n== 4. Execução encerrada entre as escritas (fotografia) e reabertura');
function fotoEntreAsEscritas(amb, acao, itens) {
  let foto = null;
  amb.injetarFalha((e) => { if (!foto && e.tipo === 'setValuesDepois' && e.aba === AJ) foto = amb.fotografia(); return false; }, 1);
  pedir(executar[acao](amb, itens || A2));   // a execução original termina normalmente: só a FOTO representa o fim abrupto
  if (!foto) throw new Error('fotografia não tirada');
  foto.chaves = amb.chaves;
  return foto;
}
teste('4a. encerrada logo depois da escrita de Ajustes: a foto tem o parcial + o registro; a abertura do painel conclui', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const foto = fotoEntreAsEscritas(amb, 'excluir');
  const naFoto = situacao(reabrir(foto));
  const { amb: a2, d } = painel(foto);
  ev('  na foto: ' + JSON.stringify(naFoto) + ' · depois da abertura: ' + JSON.stringify(situacao(a2)) + ' · lotePendente ' + JSON.stringify(d.lotePendente && { estado: d.lotePendente.estado, nome: d.lotePendente.nome, total: d.lotePendente.total }));
  igual(naFoto, { 'estrutura:PST1001': 'E', 'outros:PST2001': 'G', pendente: true }, 'parcial registrado');
  igual(situacao(a2), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
  igual([d.lotePendente.estado, d.lotePendente.acao, d.lotePendente.total], ['concluido', 'excluir', 2]);
  igual(painelMarcas(d), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E' }, 'painel com o concluído');
});
teste('4b. encerrada entre as escritas e reaberta por OUTRA gravação: o lote é concluído antes e vem em recuperadoLote (separado das contagens do novo pedido)', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const foto = fotoEntreAsEscritas(amb, 'excluir');
  const a2 = reabrir(foto);
  const r = pedir(a2.ctx.adicionarAGrade([E('PST1002')]));
  ev('  resposta: ' + JSON.stringify({ adicionadas: r.adicionadas, recuperadoLote: r.recuperadoLote && { acao: r.recuperadoLote.acao, total: r.recuperadoLote.total, resumo: r.recuperadoLote.resumo } }));
  igual(situacao(a2, [E('PST1001'), O('PST2001'), E('PST1002')]), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', 'estrutura:PST1002': 'G', pendente: false });
  igual([r.adicionadas, r.jaEstavam], [1, 0], 'contagens só do novo pedido');
  igual([r.recuperadoLote.acao, r.recuperadoLote.total, r.recuperadoLote.resumo], ['excluir', 2, { alteradas: 2 }], 'recuperação anterior identificada');
});
teste('4c. encerrada logo depois do registro (antes de qualquer dado): contexto novo conclui o pedido inteiro', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  let foto = null;
  amb.injetarFalha((e) => { if (!foto && e.tipo === 'propriedadeDepois' && e.chave === PROP_LOTE) foto = amb.fotografia(); return false; }, 1);
  pedir(amb.ctx.excluirDisciplinas(A2, true));
  foto.chaves = amb.chaves;
  igual(situacao(reabrir(foto)), { 'estrutura:PST1001': 'G', 'outros:PST2001': 'G', pendente: true }, 'na foto: nada aplicado, pedido registrado');
  const { amb: a2 } = painel(foto);
  igual(situacao(a2), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
});

// =====================================================================
console.log('\n== 5. Falha repetida durante a recuperação');
teste('5. recuperação que falha de novo: pendência identificada (mesmo id), sem falsa confirmação; "Concluir" depois conclui', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const foto = fotoEntreAsEscritas(amb, 'excluir');
  const id = lotePend(foto).id;
  const a2 = reabrir(foto);
  falhaOutros(a2, 99);
  const d = pedir(a2.ctx.obterDadosPainel());
  ev('  abertura com a escrita falhando: ' + JSON.stringify({ estado: d.lotePendente.estado, id: d.lotePendente.id === id, grupos: d.lotePendente.grupos }));
  igual([d.lotePendente.estado, d.lotePendente.id, d.lotePendente.grupos], ['pendente', id, [{ origem: 'estrutura', total: 1, confirmados: 1, faltam: [] }, { origem: 'outros', total: 1, confirmados: 0, faltam: ['PST2001'] }]]);
  verdade(/Concluir ação pendente/.test(d.lotePendente.mensagem), d.lotePendente.mensagem);
  const r1 = a2.ctx.resolverLotePendente({ acao: 'concluir' });
  igual([r1.ok, r1.codigo, r1.dados.lote.id, lotePend(a2).id], [false, 'LOTE_PENDENTE', id, id], '"Concluir" com a escrita falhando: continua pendente, mesma identidade');
  igual(situacao(a2), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'G', pendente: true });
  a2.limparFalhas();
  const r2 = pedir(a2.ctx.resolverLotePendente({ acao: 'concluir' }));
  igual([r2.resultado, r2.acao, r2.total], ['concluido', 'excluir', 2]);
  igual(situacao(a2), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
  igual(pedir(a2.ctx.resolverLotePendente({ acao: 'concluir' })).resultado, 'nenhum', 'sem registro: "nenhum", não uma pendência para concluir');
});

// =====================================================================
console.log('\n== 6. Repetição, conclusão repetida e ação posterior oposta');
teste('6a. repetir o pedido já concluído: sem linhas nem identidades duplicadas; inclusão repetida = jaEstavam', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.excluirDisciplinas(A2, true));
  igual(pedir(amb.ctx.excluirDisciplinas(A2, true)).alteradas, 2);
  igual(situacao(amb), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
  pedir(amb.ctx.excluirDisciplinas(A2, false));
  pedir(amb.ctx.adicionarAGrade(A2));
  const n0 = escritas(amb);
  const r = pedir(amb.ctx.adicionarAGrade(A2));
  igual([r.adicionadas, r.jaEstavam, escritas(amb) - n0, partesLote(amb)], [0, 2, 0, []], 'nada a mudar: nada escrito, nada registrado');
  igual([linhasDe(amb, 'estrutura', 'PST1001').length, linhasDe(amb, 'outros', 'PST2001').length], [1, 1]);
});
teste('6b. conclusão repetida (duas reaberturas): a segunda não escreve nada', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const foto = fotoEntreAsEscritas(amb, 'excluir');
  const { amb: a2 } = painel(foto);
  const a3 = reabrir(a2);
  const n0 = escritas(a3);
  pedir(a3.ctx.obterDadosPainel());
  igual([escritas(a3) - n0, situacao(a3)], [0, { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false }]);
});
teste('6c. ação posterior OPOSTA: o pedido antigo é concluído antes e o novo vale por último; reabrir não reaplica o antigo', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  falhaOutros(amb, 99);
  igual(amb.ctx.excluirDisciplinas(A2, true).codigo, 'LOTE_PENDENTE');
  const r = amb.ctx.excluirDisciplinas(A2, false);   // restaurar com a escrita ainda falhando: recusado
  igual([r.ok, r.codigo], [false, 'LOTE_PENDENTE'], 'novo pedido recusado enquanto o antigo não conclui');
  amb.limparFalhas();
  const r2 = pedir(amb.ctx.excluirDisciplinas(A2, false));
  igual([r2.alteradas, r2.recuperadoLote && r2.recuperadoLote.acao], [2, 'excluir'], 'antigo concluído antes (recuperadoLote)');
  igual(situacao(amb), { 'estrutura:PST1001': '-', 'outros:PST2001': '-', pendente: false }, 'restaurar vale por último (e não devolve à grade)');
  const { amb: a2 } = painel(amb);
  igual(situacao(a2), { 'estrutura:PST1001': '-', 'outros:PST2001': '-', pendente: false }, 'reabertura não reaplica o antigo');
});

// =====================================================================
console.log('\n== 7–8. Regras: exclusão tira da grade; restauração não devolve; inclusão com combinação de casos');
teste('7. excluir itens na grade tira da grade; restaurar não reinclui (também depois de uma retomada)', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const foto = fotoEntreAsEscritas(amb, 'excluir');
  const { amb: a2 } = painel(foto);
  igual(situacao(a2), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
  pedir(a2.ctx.excluirDisciplinas(A2, false));
  igual(situacao(a2), { 'estrutura:PST1001': '-', 'outros:PST2001': '-', pendente: false });
});
teste('8. inclusão com elegíveis, excluída, já incluída e sem semestre: contagens e listas; iguais depois de uma pendência e da recuperação', () => {
  const amb = novoAmbiente();
  const semSem = pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2003', nome: 'Sem semestre' } })).chave;
  pedir(amb.ctx.excluirDisciplinas([E('PSA1004')], true));
  pedir(amb.ctx.adicionarAGrade([E('PST1002')]));
  const L = [E('PST1001'), O('PST2001'), E('PSA1004'), E('PST1002'), O(semSem)];
  falhaOutros(amb, 99);
  const r = amb.ctx.adicionarAGrade(L);
  ev('  com a escrita de outros cursos falhando: ' + JSON.stringify(resumoR(r)) + ' · resumo ' + JSON.stringify(r.dados.lote && r.dados.lote.resumo));
  igual([r.codigo, r.dados.lote.resumo, r.dados.lote.total], ['LOTE_PENDENTE', { adicionadas: 2, jaEstavam: 1, ignoradas: 1, semOferecimento: 1 }, 2], 'só os 2 elegíveis estão no registro');
  amb.limparFalhas();
  const { amb: a2, d } = painel(amb);
  igual([d.lotePendente.estado, d.lotePendente.resumo], ['concluido', { adicionadas: 2, jaEstavam: 1, ignoradas: 1, semOferecimento: 1 }], 'contagens do pedido na conclusão');
  igual(situacao(a2, L), { 'estrutura:PST1001': 'G', 'outros:PST2001': 'G', 'estrutura:PSA1004': 'E', 'estrutura:PST1002': 'G', ['outros:' + semSem]: '-', pendente: false });
  const r2 = pedir(a2.ctx.adicionarAGrade(L));
  igual([r2.adicionadas, r2.jaEstavam, r2.ignoradas, r2.semOferecimento], [0, 3, 1, [{ origem: 'outros', chave: semSem, codigo: 'PST2003' }]], 'repetir: jaEstavam (não duplica)');
  const amb3 = novoAmbiente();
  const s3 = pedir(amb3.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2003', nome: 'Sem semestre' } })).chave;
  pedir(amb3.ctx.excluirDisciplinas([E('PSA1004')], true));
  pedir(amb3.ctx.adicionarAGrade([E('PST1002')]));
  const r3 = pedir(amb3.ctx.adicionarAGrade([E('PST1001'), O('PST2001'), E('PSA1004'), E('PST1002'), O(s3)]));
  igual([r3.adicionadas, r3.jaEstavam, r3.ignoradas, r3.semOferecimento], [2, 1, 1, [{ origem: 'outros', chave: s3, codigo: 'PST2003' }]], 'sem falha: mesmas contagens e lista');
});

// =====================================================================
console.log('\n== 9. Validações (nada do novo lote é gravado)');
teste('9. lista vazia, origem inválida, itens repetidos e alvo inexistente no FIM: validações atuais; nada gravado nem registrado', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const antes = situacao(amb);
  const n0 = escritas(amb);
  igual(amb.ctx.excluirDisciplinas([], true).codigo, 'DADOS_INVALIDOS');
  igual(amb.ctx.adicionarAGrade([{ origem: 'outra', chave: 'PST1001' }]).codigo, 'DADOS_INVALIDOS');
  const r = amb.ctx.removerDaGrade([E('PST1001'), O('PST2001'), O('NAOEXISTE')]);
  igual([r.ok, r.codigo], [false, 'DISCIPLINA_NAO_ENCONTRADA']);
  const r2 = amb.ctx.excluirDisciplinas([E('PST1001'), E('PSE1005'), E('XYZ9999')], true);
  igual(r2.codigo, 'DISCIPLINA_NAO_ENCONTRADA');
  igual([situacao(amb), escritas(amb) - n0, partesLote(amb), lotePend(amb)], [antes, 0, [], null], 'nada gravado nem registrado');
  igual(marcas(amb, 'estrutura', 'PSE1005'), '-', 'item anterior ao inexistente intacto');
  const r3 = pedir(amb.ctx.removerDaGrade([E('PST1001'), E('PST1001'), O('PST2001'), O('PST2001')]));
  igual(r3.removidas, 2, 'repetidos contam uma vez');
});

// =====================================================================
console.log('\n== 10. Identidade');
teste('10. código efetivo alterado (estrutura e outros) + código antigo reaparecendo como registro novo: retomada pela chave original, o outro registro intacto', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { codigo: 'PST1999' }, oferta: null }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST2001', campos: { codigo: 'PST2009' } }));
  const t = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\nPST2001;Da unidade;01/01/2026;;Semestral;2;0\n';
  const p = pedir(amb.ctx.previaDisciplinasUnidade(t, 'u.csv'));
  pedir(amb.ctx.incluirDisciplinasUnidade(t, 'u.csv', p.assinatura, ['PST2001']));
  const outrosNovo = objetos(amb.estrutura().getSheetByName(OU)).find((o) => o['Código'] === 'PST2001' && o['Identificador'] !== 'PST2001');
  verdade(outrosNovo, 'registro novo independente');
  const chaveNova = outrosNovo['Identificador'];
  const antesNovo = JSON.stringify(linhasDe(amb, 'outros', chaveNova));
  const foto = fotoEntreAsEscritas(amb, 'excluir', A2);
  const j = lotePend(foto);
  igual([j.acao, j.partes >= 1], ['excluir', true]);
  const { amb: a2 } = painel(foto);
  ev('  chave do registro novo: ' + chaveNova + ' · depois da retomada: ' + JSON.stringify(situacao(a2, [E('PST1001'), O('PST2001'), O(chaveNova)])));
  igual(situacao(a2, [E('PST1001'), O('PST2001'), O(chaveNova)]), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', ['outros:' + chaveNova]: '-', pendente: false });
  igual([linhasDe(a2, 'outros', 'PST2001')[0]['Código'], linhasDe(a2, 'estrutura', 'PST1001')[0]['Código ajustado']], ['PST2009', 'PST1999'], 'códigos efetivos mantidos');
  igual(JSON.stringify(linhasDe(a2, 'outros', chaveNova)), antesNovo, 'registro novo intacto');
});

// =====================================================================
console.log('\n== 11. Preservação dos dados depois de uma retomada');
const EXTRAS = { 'Data livre': new Date('2026-10-01T12:00:00.000Z'), 'Texto ISO': "'2026-10-01", 'Número': 42, 'Booleano': true };
function colunasExtras(aba) { aba.insertColumnsAfter(aba.getMaxColumns(), 6); let c = aba.getLastColumn(); ['Data livre', 'Texto ISO', 'Número', 'Booleano', 'Vazio'].forEach((t) => aba.getRange(1, ++c).setValue(t)); }
function preencherExtras(aba, colChave, chave, valores) {
  const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  const c = v[0].indexOf(colChave); const lin = v.findIndex((l, i) => i > 0 && String(l[c]) === chave) + 1;
  if (!lin || Object.keys(valores).some((t) => v[0].indexOf(t) < 0)) throw new Error('montagem: linha ' + chave + '=' + lin + ' títulos ' + JSON.stringify(v[0]));
  Object.keys(valores).forEach((t) => aba.getRange(lin, v[0].indexOf(t) + 1).setValue(valores[t]));
}
function celulas(aba, colChave, chave) {
  const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  const c = v[0].indexOf(colChave); const l = v.find((x, i) => i > 0 && String(x[c]) === chave);
  if (!l) return null;
  const o = {};
  v[0].forEach((t, i) => { if (t && !/^(Excluída|Adicionada à grade horária|Alterado em|Alterado por)$/.test(t)) o[t] = l[i] instanceof Date ? { Date: l[i].getTime() } : { [typeof l[i]]: l[i] }; });
  return o;
}
teste('11. campos fora da ação, observações, outras linhas e colunas extras (Date, texto ISO, número, booleano, vazio) intactos depois de retomar; linha de ajuste que fica vazia segue a regra (removida)', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado', creditosAula: '6' }, oferta: null, observacoes: 'Obs de PST1001' }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST2001', campos: { nome: 'Outra editada' }, observacoes: 'Obs de outros' }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { nome: 'Outra linha de ajuste' }, oferta: null }));
  const aj = amb.estrutura().getSheetByName(AJ), ou = amb.estrutura().getSheetByName(OU);
  colunasExtras(aj); colunasExtras(ou);
  preencherExtras(aj, 'Disciplina (código no Júpiter)', 'PST1001', EXTRAS);
  preencherExtras(aj, 'Disciplina (código no Júpiter)', 'PST1002', { 'Data livre': new Date('2025-05-05T08:30:00.000Z'), 'Número': 0, 'Booleano': false });
  preencherExtras(ou, 'Identificador', 'PST2001', EXTRAS);
  preencherExtras(ou, 'Identificador', 'PST2002', { 'Data livre': new Date('2024-01-02T03:04:05.000Z'), 'Texto ISO': "'2024-01-02T03:04:05.000Z" });
  const antes = { aj1: celulas(aj, 'Disciplina (código no Júpiter)', 'PST1001'), aj2: celulas(aj, 'Disciplina (código no Júpiter)', 'PST1002'), ou1: celulas(ou, 'Identificador', 'PST2001'), ou2: celulas(ou, 'Identificador', 'PST2002') };
  const obsAntes = objetos(abaAtiva(amb, 'Disciplinas')).map((l) => [l['Código'], l['Observações'] || '']);
  const outrasAntes = objetos(abaAtiva(amb, 'Disciplinas'));
  const foto = fotoEntreAsEscritas(amb, 'excluir', [E('PST1001'), O('PST2001'), E('PSE1005')]);
  const { amb: a2 } = painel(foto);
  const aj2 = a2.estrutura().getSheetByName(AJ), ou2 = a2.estrutura().getSheetByName(OU);
  const depois = { aj1: celulas(aj2, 'Disciplina (código no Júpiter)', 'PST1001'), aj2: celulas(aj2, 'Disciplina (código no Júpiter)', 'PST1002'), ou1: celulas(ou2, 'Identificador', 'PST2001'), ou2: celulas(ou2, 'Identificador', 'PST2002') };
  const so = (o) => { const x = {}; ['Data livre', 'Texto ISO', 'Número', 'Booleano', 'Vazio'].forEach((k) => { x[k] = o[k]; }); return x; };
  ev('  extras antes  (Ajustes PST1001): ' + JSON.stringify(so(antes.aj1)));
  ev('  extras depois (Ajustes PST1001): ' + JSON.stringify(so(depois.aj1)));
  ev('  extras antes  (outros PST2001): ' + JSON.stringify(so(antes.ou1)));
  ev('  extras depois (outros PST2001): ' + JSON.stringify(so(depois.ou1)));
  igual(situacao(a2, [E('PST1001'), O('PST2001'), E('PSE1005')]), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', 'estrutura:PSE1005': 'E', pendente: false });
  igual(depois, antes, 'campos, extras (tipo e valor) e outras linhas iguais');
  igual(depois.aj1['Data livre'], { Date: EXTRAS['Data livre'].getTime() }, 'data continua Date');
  igual(depois.aj1['Texto ISO'], { string: '2026-10-01' }, 'texto parecido com data continua texto');
  igual(objetos(abaAtiva(a2, 'Disciplinas')), outrasAntes, 'aba Disciplinas (observações) intacta');
  igual(objetos(abaAtiva(a2, 'Disciplinas')).map((l) => [l['Código'], l['Observações'] || '']), obsAntes);
  pedir(a2.ctx.excluirDisciplinas([E('PSE1005')], false));
  igual(linhasDe(a2, 'estrutura', 'PSE1005').length, 0, 'restaurada sem outros ajustes: linha vazia removida (regra existente)');
  igual(celulas(a2.estrutura().getSheetByName(AJ), 'Disciplina (código no Júpiter)', 'PST1001'), antes.aj1, 'extras das linhas que ficam');
});

// =====================================================================
console.log('\n== 12. Coexistência com o salvamento individual (etapa 4)');
const falhaObs = (amb, vezes) => amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), vezes);
teste('12a. salvamento individual pendente: o lote é recusado enquanto ele não conclui; depois, ele é concluído ANTES do lote (recuperado com a observação)', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const cli = clienteInicial(amb);
  falhaObs(amb, 99);
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { nome: 'B' }, oferta: null, observacoes: 'Obs de B' }).codigo, 'SALVAMENTO_PENDENTE');
  const r = amb.ctx.excluirDisciplinas(A2, true);
  igual([r.ok, r.codigo, lotePend(amb), situacao(amb)], [false, 'SALVAMENTO_PENDENTE', null, { 'estrutura:PST1001': 'G', 'outros:PST2001': 'G', pendente: false }], 'lote recusado, nada registrado');
  amb.limparFalhas();
  const r2 = amb.ctx.excluirDisciplinas(A2, true);
  aplicarNoCliente(cli, r2.dados);
  igual([r2.ok, r2.dados.alteradas, r2.dados.recuperado && r2.dados.recuperado.observacao], [true, 2, { chave: 'PST1002', texto: 'Obs de B' }]);
  igual(cli.base.disciplinas.find((x) => x.codigo === 'PST1002').observacoes, 'Obs de B', 'observação recuperada aplicada no painel (1.8.6)');
  igual(situacao(amb), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
  igual(amb.estrutura().meta.find((m) => m.k === META_SALV), undefined, 'registro individual encerrado');
});
teste('12b. lote pendente: salvamento CONFLITANTE (mesma disciplina) recusado com a ação pendente identificada; depois, lote concluído antes e o salvamento por último', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  falhaOutros(amb, 99);
  igual(amb.ctx.excluirDisciplinas(A2, true).codigo, 'LOTE_PENDENTE');
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Depois do lote' }, oferta: null, observacoes: 'obs nova' });
  igual([r.ok, r.codigo, r.dados.lote.acao, r.dados.lote.total], [false, 'LOTE_PENDENTE', 'excluir', 2]);
  verdade(/"Excluir" em 2 disciplinas não terminou/.test(r.erro), r.erro);
  igual(linhasDe(amb, 'estrutura', 'PST1001')[0]['Nome ajustado'] || '', '', 'salvamento não aplicado');
  igual(amb.estrutura().meta.find((m) => m.k === META_SALV), undefined, 'nenhum registro individual criado');
  amb.limparFalhas();
  const r2 = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Depois do lote' }, oferta: null, observacoes: 'obs nova' }));
  igual([r2.recuperadoLote && r2.recuperadoLote.acao, r2.resultado], ['excluir', 'concluido']);
  const l = linhasDe(amb, 'estrutura', 'PST1001')[0];
  igual([l['Nome ajustado'], l['Excluída'], marcas(amb, 'outros', 'PST2001')], ['Depois do lote', 'Sim', 'E'], 'os dois efeitos, na ordem');
});
teste('12c. os dois registros ao mesmo tempo (montado no teste): um não apaga nem esconde o outro; o individual conclui e vem em "recuperado" mesmo com o lote recusado', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  const ss = amb.estrutura();
  falhaObs(amb, 99);
  igual(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { nome: 'B' }, oferta: null, observacoes: 'Obs de B' }).codigo, 'SALVAMENTO_PENDENTE');
  const regInd = ss.meta.find((m) => m.k === META_SALV).v;
  ss.meta = ss.meta.filter((m) => m.k !== META_SALV);   // tirado só para o lote poder ser registrado…
  amb.limparFalhas();
  falhaOutros(amb, 99);
  igual(amb.ctx.excluirDisciplinas(A2, true).codigo, 'LOTE_PENDENTE');
  const idLote = lotePend(amb).id;
  ss.addDeveloperMetadata(META_SALV, regInd);           // …e reposto: os dois registros existem (o sistema não cria esse estado)
  const a = reabrir(amb);
  falhaOutros(a, 99);
  const r = a.ctx.adicionarAGrade([E('PST1002')]);
  ev('  pedido com os dois registros: ' + JSON.stringify(resumoR(r)) + ' · recuperado ' + JSON.stringify(r.dados && r.dados.recuperado && r.dados.recuperado.observacao));
  igual([r.ok, r.codigo, r.dados.lote.id], [false, 'LOTE_PENDENTE', idLote], 'lote identificado na recusa');
  igual(r.dados.recuperado && r.dados.recuperado.observacao, { chave: 'PST1002', texto: 'Obs de B' }, 'individual concluído e comunicado na recusa');
  igual([lotePend(a).id, a.estrutura().meta.some((m) => m.k === META_SALV)], [idLote, false], 'cada registro encerrado só pelo próprio mecanismo');
  igual(objetos(abaAtiva(a, 'Disciplinas')).find((l) => l['Código'] === 'PST1002')['Observações'], 'Obs de B');
  igual(marcas(a, 'estrutura', 'PST1002'), '-', 'novo pedido não aplicado');
  a.limparFalhas();
  const d = pedir(a.ctx.obterDadosPainel());
  igual([d.lotePendente && d.lotePendente.estado, d.salvamentoPendente, situacao(a)], ['concluido', null, { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false }]);
});
teste('12d. ordem dos dados no painel: lote recuperado aplicado ANTES do pedido mais recente (adicionar pendente, depois remover)', () => {
  const amb = novoAmbiente();
  const cli = clienteInicial(amb);
  falhaOutros(amb, 99);
  aplicarNoCliente(cli, amb.ctx.adicionarAGrade(A2).dados);
  amb.limparFalhas();
  const r = amb.ctx.removerDaGrade(A2);
  aplicarNoCliente(cli, r.dados);
  igual([r.ok, r.dados.recuperadoLote.acao, r.dados.removidas], [true, 'adicionar', 2], 'antigo concluído; o novo remove as duas');
  igual(painelMarcas(cli), { 'estrutura:PST1001': '-', 'outros:PST2001': '-' }, 'painel com o mais recente');
  igual(situacao(amb), { 'estrutura:PST1001': '-', 'outros:PST2001': '-', pendente: false });
});

// =====================================================================
console.log('\n== 13. Recuperação de lote durante outro pedido (aceito ou recusado)');
teste('13. outro pedido aceito: recuperadoLote sem preparação (a resposta traz); outro pedido recusado: recuperadoLote com a preparação lida', () => {
  let amb = novoAmbiente(); PRE.excluir(amb);
  let foto = fotoEntreAsEscritas(amb, 'excluir');
  let a = reabrir(foto);
  let cli;
  const r = pedir(a.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2005', nome: 'Nova' } }));
  igual([!!r.recuperadoLote, !!(r.recuperadoLote && r.recuperadoLote.preparacao), !!r.preparacao], [true, false, true]);
  amb = novoAmbiente(); PRE.excluir(amb);
  foto = fotoEntreAsEscritas(amb, 'excluir');
  a = reabrir(foto);
  cli = JSON.parse(JSON.stringify({ base: { disciplinas: [] }, preparacao: { ajustes: [], outros: [] } }));
  const r2 = a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { codigo: 'PST1001' }, oferta: null });
  aplicarNoCliente(cli, r2.dados);
  ev('  recusado: ' + JSON.stringify({ ok: r2.ok, codigo: r2.codigo, recuperadoLote: r2.dados && r2.dados.recuperadoLote && { acao: r2.dados.recuperadoLote.acao, preparacao: !!r2.dados.recuperadoLote.preparacao } }));
  igual([r2.ok, r2.codigo, r2.dados.recuperadoLote.acao, !!r2.dados.recuperadoLote.preparacao], [false, 'CODIGO_REPETIDO', 'excluir', true]);
  igual(painelMarcas(cli), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E' }, 'dados confirmados aplicados mesmo com a recusa');
});

// =====================================================================
console.log('\n== 14. Registro: remoção, flush depois dela, leitura falhando');
teste('14a. falha ANTES da remoção do registro (persistente): pendente "todas já como pedido"; contexto novo conclui SEM reescrever', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  amb.injetarFalha((e) => e.tipo === 'propriedadeRemover' && e.chave === PROP_LOTE, 99);
  const r = amb.ctx.excluirDisciplinas(A2, true);
  ev('  resposta: ' + JSON.stringify(resumoR(r)));
  igual([r.ok, r.codigo, r.dados.lote.confirmados, r.dados.lote.total, !!lotePend(amb)], [false, 'LOTE_PENDENTE', 2, 2, true]);
  verdade(/todas já estão como pedido/.test(r.erro), r.erro);
  const a2 = reabrir(amb); const n0 = escritas(a2);
  pedir(a2.ctx.obterDadosPainel());
  igual([escritas(a2) - n0, situacao(a2)], [0, { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false }]);
});
for (const [nome, montar] of [
  ['14b. remoção aplicada e exceção', (amb, m) => amb.injetarFalha((e) => { const sim = e.tipo === 'propriedadeRemoverDepois' && e.chave === PROP_LOTE; if (sim) m.registro = lotePend(amb); return sim; }, 1)],
  ['14c. flush DEPOIS da remoção', (amb, m) => { let rem = false; return amb.injetarFalha((e) => { if (e.tipo === 'propriedadeRemoverDepois' && e.chave === PROP_LOTE) rem = true; const sim = rem && e.tipo === 'flush'; if (sim) m.registro = lotePend(amb); return sim; }, 1); }]]) {
  teste(nome + ': conferido → concluído (nunca pendente inexistente); repetir não duplica', () => {
    const amb = novoAmbiente(); PRE.excluir(amb);
    const m = {};
    const f = montar(amb, m);
    const r = amb.ctx.excluirDisciplinas(A2, true);
    ev('  registro no instante do erro: ' + JSON.stringify(m.registro) + ' · resposta: ' + JSON.stringify(resumoR(r)));
    igual([f.disparos, m.registro], [1, null], 'exceção com o registro já removido');
    igual([r.ok, r.dados.resultado, r.dados.alteradas], [true, 'concluido', 2]);
    igual(situacao(amb), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
    igual(partesLote(amb), [], 'partes da remoção interrompida limpas');
    igual(pedir(amb.ctx.excluirDisciplinas(A2, true)).alteradas, 2);
    igual([linhasDe(amb, 'estrutura', 'PST1001').length, linhasDe(amb, 'outros', 'PST2001').length], [1, 1]);
  });
}
teste('14d. remoção feita + leitura falhando na conferência: LOTE_INCERTO identificado (sem confirmar, sem "nada gravado", sem recriar o registro); contexto novo e repetição corretos', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  let rem = false;
  amb.injetarFalha((e) => { if (e.tipo === 'propriedadeRemoverDepois' && e.chave === PROP_LOTE) { rem = true; return true; } return false; }, 1);
  const fl = amb.injetarFalhaLeitura(() => rem, 999);
  const r = amb.ctx.excluirDisciplinas(A2, true);
  amb.limparFalhas();
  ev('  resposta: ' + JSON.stringify(resumoR(r)) + ' · leituras recusadas: ' + fl.disparos);
  verdade(fl.disparos > 0, 'falha de leitura disparada');
  igual([r.ok, r.codigo, r.dados.resultado, r.dados.lote.estado, r.dados.lote.acao, r.dados.lote.total, r.dados.lote.confirmados], [false, 'LOTE_INCERTO', 'incerto', 'incerto', 'excluir', 2, null]);
  igual(r.dados.lote.grupos, [{ origem: 'estrutura', total: 1, confirmados: null, faltam: null }, { origem: 'outros', total: 1, confirmados: null, faltam: null }], 'itens identificados, não conferidos');
  verdade(/Não foi possível confirmar/.test(r.erro) && /não foi possível ler/.test(r.erro), r.erro);
  igual([r.dados.preparacao, r.dados.leituraFalhou, lotePend(amb), partesLote(amb)], [null, true, null, []], 'sem leitura; registro não recriado');
  igual(situacao(amb), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false }, 'o que de fato ficou');
  const { d } = painel(amb);
  igual([d.lotePendente, painelMarcas(d)], [null, { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E' }]);
  igual(pedir(amb.ctx.excluirDisciplinas(A2, true)).alteradas, 2, 'repetir: sem duplicar');
});
teste('14e. "Concluir ação pendente", recuperação automática e abertura do painel com exceção depois da remoção: concluído', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  falhaOutros(amb, 99);
  amb.ctx.excluirDisciplinas(A2, true);
  const remocao = (a) => a.injetarFalha((e) => e.tipo === 'propriedadeRemoverDepois' && e.chave === PROP_LOTE, 1);
  let a = reabrir(amb.fotografia()); remocao(a);
  igual(pedir(a.ctx.resolverLotePendente({ acao: 'concluir' })).resultado, 'concluido', 'explícito');
  a = reabrir(amb.fotografia()); remocao(a);
  igual(pedir(a.ctx.adicionarAGrade([E('PST1002')])).recuperadoLote.acao, 'excluir', 'automático');
  a = reabrir(amb.fotografia()); remocao(a);
  igual(pedir(a.ctx.obterDadosPainel()).lotePendente.estado, 'concluido', 'abertura');
  igual(situacao(a), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
});
teste('14f. registro ilegível (parte faltando): não é tratado como inexistente nem aplicado; recusa identificada', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  falhaOutros(amb, 99);
  amb.ctx.excluirDisciplinas(A2, true);
  amb.limparFalhas();
  partesLote(amb).forEach((k) => { delete amb.props[k]; });
  const r = amb.ctx.adicionarAGrade([E('PST1002')]);
  igual([r.ok, r.codigo, r.dados.lote.estado], [false, 'LOTE_PENDENTE', 'desconhecido']);
  verdade(!!lotePend(amb), 'cabeçalho preservado');
  igual(marcas(amb, 'estrutura', 'PST1002'), '-', 'novo pedido não aplicado');
});

// =====================================================================
console.log('\n== 15. Proteções: importação, recomeço e demais gravações; leitor; base mudou');
teste('15a. com o lote pendente (sem concluir): importação, recomeço, envio da grade, salvar, outros cursos e lista por unidade recusados com a pendência; nada muda', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  falhaOutros(amb, 99);
  amb.ctx.excluirDisciplinas(A2, true);
  const j = lotePend(amb);
  const antes = JSON.stringify(objetos(amb.estrutura().getSheetByName(AJ))) + JSON.stringify(objetos(abaAtiva(amb, 'Disciplinas')));
  const pk = pacote();
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  const t = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\nPST3002;Da unidade;01/01/2026;;Semestral;2;0\n';
  const pu = pedir(amb.ctx.previaDisciplinasUnidade(t, 'u.csv'));
  const rs = {
    importacao: amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }),
    recomeco: amb.ctx.cadastrarNovaGrade('APAGAR'),
    envio: amb.ctx.enviarGradeParaPreenchimento({ semestre: '1', ano: 2027, esperado: {} }),
    salvar: amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSE1005', campos: { nome: 'X' }, oferta: null }),
    outros: amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST3001', nome: 'Y' } }),
    unidade: amb.ctx.incluirDisciplinasUnidade(t, 'u.csv', pu.assinatura, ['PST3002'])
  };
  ev('  códigos: ' + JSON.stringify(Object.keys(rs).map((k) => k + '=' + rs[k].codigo)));
  Object.keys(rs).forEach((k) => igual([rs[k].ok, rs[k].codigo], [false, 'LOTE_PENDENTE'], k));
  igual(lotePend(amb).id, j.id, 'mesmo registro');
  igual(JSON.stringify(objetos(amb.estrutura().getSheetByName(AJ))) + JSON.stringify(objetos(abaAtiva(amb, 'Disciplinas'))), antes, 'nada mudou');
  igual(objetos(amb.estrutura().getSheetByName(OU)).length, 2, 'nenhuma disciplina para outros cursos nova');
});
teste('15b. leitor: não grava (ações em lote recusadas), vê só que há algo pendente; o registro fica para o administrador, que conclui', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  falhaOutros(amb, 99);
  amb.ctx.excluirDisciplinas(A2, true);
  const leitor = reabrir(amb, LEITOR);
  igual(leitor.ctx.excluirDisciplinas(A2, false).codigo, 'SO_ADMIN');
  igual(leitor.ctx.resolverLotePendente({ acao: 'concluir' }).codigo, 'SO_ADMIN');
  const d = pedir(leitor.ctx.obterDadosPainel());
  igual([d.lotePendente, !!lotePend(leitor), situacao(leitor)], [{ tipo: 'lote', estado: 'pendente' }, true, { 'estrutura:PST1001': 'E', 'outros:PST2001': 'G', pendente: true }]);
  const { amb: adm } = painel(leitor);
  igual(situacao(adm), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'E', pendente: false });
});
teste('15c. base mudou (outra importação ativa) depois do registro: não aplica; "Descartar" só nesse caso e com o id; descartar NÃO desfaz o já gravado', () => {
  const amb = novoAmbiente(); PRE.excluir(amb);
  falhaOutros(amb, 99);
  amb.ctx.excluirDisciplinas(A2, true);
  amb.limparFalhas();
  const ss = amb.estrutura();
  const mAtiva = ss.meta.find((x) => x.k === META_ATIVA); const man = JSON.parse(mAtiva.v); man.importacao = 'outra-importacao'; mAtiva.v = JSON.stringify(man);
  const a2 = reabrir(amb);
  const d = pedir(a2.ctx.obterDadosPainel());
  ev('  aviso: ' + d.lotePendente.mensagem);
  igual([d.lotePendente.estado, d.lotePendente.podeDescartar, situacao(a2)], ['base_mudou', true, { 'estrutura:PST1001': 'E', 'outros:PST2001': 'G', pendente: true }]);
  verdade(/NÃO desfaz/.test(d.lotePendente.mensagem), d.lotePendente.mensagem);
  igual(a2.ctx.resolverLotePendente({ acao: 'concluir' }).codigo, 'LOTE_PENDENTE', 'não aplica');
  igual(a2.ctx.resolverLotePendente({ acao: 'descartar', id: 'outro' }).codigo, 'DADOS_INVALIDOS');
  igual(pedir(a2.ctx.resolverLotePendente({ acao: 'descartar', id: d.lotePendente.id })).resultado, 'descartado');
  igual(situacao(a2), { 'estrutura:PST1001': 'E', 'outros:PST2001': 'G', pendente: false }, 'parte gravada continua; nada desfeito, nada aplicado');
  const b = novoAmbiente(); falhaOutros(b, 99); b.ctx.excluirDisciplinas(A2, true); b.limparFalhas();
  igual(b.ctx.resolverLotePendente({ acao: 'descartar', id: lotePend(b).id }).codigo, 'DADOS_INVALIDOS', 'mesma base: não descarta');
});

// =====================================================================
console.log('\n== 17. Capacidade do registro (limite de 6.000 itens por lote)');
if (SEM_CAPACIDADE) { pulados.push('17 (--sem-capacidade)'); console.log('  – PULADO: 17 (--sem-capacidade)'); }
else teste('17. lote misto de 6.000 itens válidos (3.000 da estrutura + 3.000 de outros cursos com chave de 20 caracteres): registro em partes ≤ 9 KB nas Propriedades; retomada conclui; 6.001 itens recusados como antes', () => {
  const amb = ambienteVazio();
  const pk = parSintetico(modelo, 3000).csv;
  pedir(importar(amb, pk));
  const ou = amb.estrutura().getSheetByName(OU);
  const tit = ou.getRange(1, 1, 1, ou.getLastColumn()).getValues()[0];
  const chavesOutros = [];
  const linhas = [];
  for (let i = 0; i < 3000; i++) {
    const k = ('OUTRO-' + String(i).padStart(14, '0')).slice(0, 20);
    chavesOutros.push(k);
    linhas.push(tit.map((t) => (t === 'Identificador' ? k : t === 'Código' ? 'PST' + String(5000 + (i % 4000)).padStart(4, '0') : t === 'Nome' ? 'Sintética ' + i : t === 'Semestre de oferecimento' ? '1º semestre' : '')));
  }
  ou.insertRowsAfter(ou.getMaxRows(), 3001);
  ou.getRange(2, 1, 3000, tit.length).setValues(linhas);
  const est = pk.disciplinas.map((d) => d.codigo);
  const L = est.map(E).concat(chavesOutros.map(O));
  igual(L.length, 6000);
  igual(amb.ctx.excluirDisciplinas(L.slice(0, 5999).concat([O('NAOEXISTE')]), true).codigo, 'DISCIPLINA_NAO_ENCONTRADA', '6.000 com o último inexistente: recusado');
  igual([partesLote(amb).length, objetos(amb.estrutura().getSheetByName(AJ)).filter((x) => x['Excluída'] === 'Sim').length], [0, 0], 'nada gravado nem registrado');
  igual(amb.ctx.excluirDisciplinas(L.concat([O('X1')]), true).erro, 'Seleção grande demais.', '6.001: limite existente');
  let foto = null;
  amb.injetarFalha((e) => { if (!foto && e.tipo === 'setValuesDepois' && e.aba === AJ) foto = amb.fotografia(); return false; }, 1);
  const t0 = Date.now();
  const r = pedir(amb.ctx.excluirDisciplinas(L, true));
  const partes = Object.keys(foto.props).filter((k) => k.indexOf(PROP_LOTE + '.') === 0);
  const tamanhos = partes.map((k) => Buffer.byteLength(foto.props[k], 'utf8'));
  const total = Object.keys(foto.props).reduce((n, k) => n + Buffer.byteLength(k) + Buffer.byteLength(foto.props[k]), 0);
  ev('  6.000 itens: ' + partes.length + ' partes, maior ' + Math.max(...tamanhos) + ' bytes, Propriedades no total ' + total + ' bytes; tempo da chamada ' + (Date.now() - t0) + ' ms (simulador)');
  igual([r.alteradas, partesLote(amb).length, !!lotePend(amb)], [6000, 0, false]);
  verdade(Math.max(...tamanhos) <= 9 * 1024 && total <= 500 * 1024, 'dentro dos limites do Google');
  const ex = (a) => objetos(a.estrutura().getSheetByName(AJ)).filter((x) => x['Excluída'] === 'Sim').length + objetos(a.estrutura().getSheetByName(OU)).filter((x) => x['Excluída'] === 'Sim').length;
  const naFoto = ex(reabrir(foto));
  const { amb: a2 } = painel(foto);
  ev('  fotografia entre as escritas: ' + naFoto + ' excluídas (só a estrutura); depois da abertura do painel: ' + ex(a2));
  igual([naFoto, ex(a2), !!lotePend(a2)], [3000, 6000, false], 'retomada de 6.000 itens a partir da fotografia');
});

// =====================================================================
console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)' + (pulados.length ? '; pulados: ' + pulados.length : ''));
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
ev('\n=== TOTAL: ' + ok + ' ok, ' + falhas + ' falha(s); pulados: ' + pulados.length + ' ===');
try { fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true }); fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n'); } catch (e) { /* */ }
process.exit(falhas ? 1 : 0);

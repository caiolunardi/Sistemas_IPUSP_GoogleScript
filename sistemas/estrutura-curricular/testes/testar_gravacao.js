// Testes da gravação segura (preparação → ativação → recuperação), da
// prévia contra edições manuais, das Informações Básicas do PDF e do
// identificador único das importações. Falhas são INJETADAS no
// simulador em cada ponto da gravação.
// Uso: node testar_gravacao.js <csv> <paginas_ocr.json> [--evidencias saida/evidencias_gravacao.txt]
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirPaginasRevisao } = require('./apoio_revisao');
const { criarAmbiente } = require('./mockGoogle');
const { carregar } = require('./carregar_leitores');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const [csvPath, paginasJson] = process.argv.slice(2);
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_gravacao.txt');
const evidencias = [];
function ev(texto) { evidencias.push(texto); }

let ok = 0, falhas = 0;
const falhou = [];
const pulados = [];
/** Um teste que devolve PULAR(motivo) NÃO conta como executado nem aprovado. */
const PULAR = (motivo) => ({ pulado: true, motivo });
function teste(nome, fn) {
  try {
    const r = fn();
    if (r && r.pulado) { pulados.push(nome + ' — ' + r.motivo); console.log('  – PULADO:', nome, '(' + r.motivo + ')'); return; }
    ok++; console.log('  ✓', nome);
  }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n      ') : e); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

// ---------- pacotes (arquivos reais do Júpiter) ----------
const L = carregar();
const csvBase = L.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const pdfBase = L.LeitorPdfJupiter.analisar(JSON.parse(fs.readFileSync(paginasJson, 'utf8')).paginas, { modo: 'ocr', arquivo: 'grade_curricular.pdf' });
function paraServidor(pac) {
  const c = JSON.parse(JSON.stringify(pac));
  if (c.conferencia) { delete c.conferencia.itens; delete c.conferencia.linhasNaoReconhecidas; }
  return c;
}
const pacoteCsv = () => paraServidor(csvBase);
const pacotePdf = () => paraServidor(pdfBase);
/** CSV com um nome alterado (gera exatamente 1 alteração). */
function pacoteCsvAlterado() {
  const p = pacoteCsv();
  p.disciplinas.find((d) => d.codigo === 'PSC1322').nome = 'Introdução à Psicopatologia (nova ementa)';
  return p;
}

// ---------- utilidades de inspeção ----------
function abaObjs(amb, nome) {
  const s = amb.estrutura().getSheetByName(nome);
  if (!s || s.getLastRow() < 1) return [];
  const v = s.getRange(1, 1, Math.max(1, s.getLastRow()), Math.max(1, s.getLastColumn())).getValues();
  const cab = v[0];
  return v.slice(1).map((l) => { const o = {}; cab.forEach((t, i) => { o[t] = l[i]; }); return o; });
}
function manifesto(amb) {
  const m = amb.estrutura().getDeveloperMetadata().find((x) => x.getKey() === 'estruturaCurricular.ativa');
  return m ? JSON.parse(m.getValue()) : null;
}
function diario(amb) {
  const m = amb.estrutura().getDeveloperMetadata().find((x) => x.getKey() === 'estruturaCurricular.gravacao');
  return m ? JSON.parse(m.getValue()) : null;
}
/** Retrato do estado: o que o painel mostra e o que existe na planilha. */
function retrato(amb) {
  amb.limparFalhas();
  const r = amb.ctx.obterDadosPainel();
  if (!r.ok) return { erro: r.codigo };
  const d = r.dados;
  const m = manifesto(amb);
  const idsImp = d.importacoes.map((i) => i.id);
  return {
    versao: d.base.versao,
    disciplinas: d.base.disciplinas.length,
    ofertas: d.base.vinculos.length,
    requisitos: d.base.requisitos.length,
    curriculos: d.base.curriculos.length,
    importacoesPainel: idsImp.length,
    alteracoesForaDoPainel: d.alteracoes.filter((a) => idsImp.indexOf(a.importacao) < 0).length,
    linhasImportacoesPlanilha: abaObjs(amb, 'Importações').length,
    abasNova: amb.estrutura().getSheets().filter((s) => s.getName().startsWith('_nova_')).length,
    diario: !!diario(amb),
    gravacao: d.gravacao,
    importacaoAtiva: m ? m.importacao : null
  };
}
function fmt(o) { return JSON.stringify(o); }
function importar(amb, pacote, extra) {
  const prev = amb.ctx.prepararImportacao(pacote);
  if (!prev.ok) throw new Error('prévia falhou: ' + prev.erro);
  if (!prev.dados.podeGravar) throw new Error('bloqueada: ' + prev.dados.bloqueios.join(' | '));
  abrirPaginasRevisao(amb, prev.dados);
  const r = amb.ctx.confirmarImportacao(pacote, prev.dados.assinatura, Object.assign({ operacao: prev.dados.operacao, revisaoPdf: true, previa: prev.dados.impressao }, extra || {}));
  return { prev: prev.dados, res: r };
}
function novoAmbiente(extra) {
  const amb = criarAmbiente(Object.assign({ dirSrc: DIR_SRC }, extra || {}));
  amb.ctx.obterDadosPainel();
  return amb;
}
/** Base com CSV + PDF gravados, uma Observação e uma coluna extra. */
function ambienteComBase() {
  const amb = novoAmbiente();
  const a = importar(amb, pacoteCsv()); if (!a.res.ok) throw new Error(a.res.erro);
  const b = importar(amb, pacotePdf()); if (!b.res.ok) throw new Error(b.res.erro);
  const s = amb.estrutura().getSheetByName('Disciplinas');
  const cab = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  const cods = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().map((l) => l[0]);
  s.getRange(cods.indexOf('PSC1322') + 2, cab.indexOf('Observações') + 1).setValue('Obs. de teste: turma única');
  const col = s.getLastColumn() + 1;
  s.getRange(1, col).setValue('Sala preferida');
  s.getRange(cods.indexOf('PSA1302') + 2, col).setValue('Bloco G');
  return amb;
}
function observacaoEExtra(amb) {
  const d = abaObjs(amb, 'Disciplinas');
  return [d.find((x) => x['Código'] === 'PSC1322')['Observações'], d.find((x) => x['Código'] === 'PSA1302')['Sala preferida']];
}
function reiniciar(amb) { return criarAmbiente({ dirSrc: DIR_SRC, reusar: amb }); }

// Predicados de falha
const em = {
  diario: (e) => e.tipo === 'metadado' && e.chave === 'estruturaCurricular.gravacao',
  copiaOferta: (e) => e.tipo === 'copyTo' && e.aba === 'Disciplinas por habilitação',
  escritaCopiaOferta: (e) => e.tipo === 'setValues' && /^_nova_oferta/.test(e.aba),
  escritaCopiaCurriculos: (e) => e.tipo === 'setValues' && /^_nova_curriculos/.test(e.aba),
  historicoImportacoes: (e) => e.tipo === 'setValues' && e.aba === 'Importações',
  historicoAlteracoes: (e) => e.tipo === 'setValues' && e.aba === 'Alterações',
  flush: (e) => e.tipo === 'flush',
  manifesto: (e) => e.tipo === 'metadado' && e.chave === 'estruturaCurricular.ativa'
};
/** Predicado que só dispara DEPOIS que o manifesto foi escrito (fase pós-ativação). */
function depoisDaAtivacao(pred) {
  let armado = false;
  return (e) => {
    if (e.tipo === 'metadado' && e.chave === 'estruturaCurricular.ativa') { armado = true; return false; }
    return armado && pred(e);
  };
}

// =====================================================================
console.log('\n== 1. Falha injetada ANTES da ativação — primeira importação (base vazia)');
ev('=== 1. FALHAS ANTES DA ATIVAÇÃO — PRIMEIRA IMPORTAÇÃO (base vazia; CSV real) ===');
const cenariosAntes = [
  ['diário da gravação', em.diario],
  ['cópia da 2ª aba (copyTo)', em.copiaOferta],
  ['escrita da 2ª aba (cenário da auditoria)', em.escritaCopiaOferta],
  ['escrita da 4ª aba (Currículos)', em.escritaCopiaCurriculos],
  ['histórico: aba Importações', em.historicoImportacoes],
  ['histórico: aba Alterações', em.historicoAlteracoes],
  ['flush antes da ativação', em.flush],
  ['escrita do manifesto (ativação não aconteceu)', em.manifesto]
];
cenariosAntes.forEach(([nome, pred]) => {
  teste('1ª importação, falha em ' + nome + ': base vazia intacta, resposta "não gravada", nova tentativa ok', () => {
    const amb = novoAmbiente();
    const prev = amb.ctx.prepararImportacao(pacoteCsv()).dados;
    amb.injetarFalha(pred);
    const r = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao });
    const f = amb.estado.falhas[0];
    verdade(f.disparos === 1, 'a falha precisa ter disparado');
    igual(r.ok, false); igual(r.codigo, 'NAO_GRAVADA');
    verdade(/não foi gravada/.test(r.erro) && /continua exatamente como estava/.test(r.erro), r.erro);
    const depois = retrato(amb);
    igual([depois.versao, depois.disciplinas, depois.ofertas, depois.requisitos, depois.curriculos, depois.importacoesPainel], [0, 0, 0, 0, 0, 0], 'painel');
    igual([depois.linhasImportacoesPlanilha, depois.abasNova, depois.diario], [0, 0, false], 'planilha limpa');
    ev(`[${nome}] resposta=${r.codigo} | painel=${fmt({ versao: depois.versao, disciplinas: depois.disciplinas, ofertas: depois.ofertas })} | planilha=${fmt({ linhasImportacoes: depois.linhasImportacoesPlanilha, abasNova: depois.abasNova, diario: depois.diario })}`);
    // nova tentativa com a MESMA prévia/operação
    const r2 = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao });
    verdade(r2.ok, r2.erro);
    const fim = retrato(amb);
    igual([fim.versao, fim.disciplinas, fim.ofertas, fim.requisitos, fim.curriculos, fim.importacoesPainel, fim.linhasImportacoesPlanilha, fim.alteracoesForaDoPainel], [1, 183, 398, 238, 3, 1, 1, 0], 'após nova tentativa');
    ev(`   nova tentativa: ok, ${fmt({ versao: fim.versao, disciplinas: fim.disciplinas, ofertas: fim.ofertas, requisitos: fim.requisitos, curriculos: fim.curriculos, importacoes: fim.importacoesPainel, linhasImportacoes: fim.linhasImportacoesPlanilha })}`);
  });
});

teste('1ª importação, falha no histórico (Alterações) E no descarte: estado de recuperação explícito; reinício + recuperação; sem duplicar histórico', () => {
  const amb = novoAmbiente();
  const prev = amb.ctx.prepararImportacao(pacoteCsv()).dados;
  amb.injetarFalha(em.historicoAlteracoes);
  amb.injetarFalha((e) => e.tipo === 'deleteSheet', 10);
  amb.injetarFalha((e) => e.tipo === 'deleteRows', 10);
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao });
  igual(r.codigo, 'NAO_GRAVADA');
  amb.limparFalhas();
  const sobra = { abasNova: amb.estrutura().getSheets().filter((s) => s.getName().startsWith('_nova_')).length, linhasImportacoes: abaObjs(amb, 'Importações').length, diario: !!diario(amb) };
  igual(sobra, { abasNova: 4, linhasImportacoes: 1, diario: true }, 'restos da tentativa');
  // Leitores veem a versão anterior (vazia), sem o histórico da tentativa
  // (leitor não faz recuperação: o estado de recuperação continua explícito).
  amb.permitir('secretaria@unidade.example', 'LEITOR');
  const leitor = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'secretaria@unidade.example' });
  const vis = leitor.ctx.obterDadosPainel();
  verdade(vis.ok, vis.erro);
  igual([vis.dados.base.disciplinas.length, vis.dados.importacoes.length], [0, 0], 'painel durante o estado de recuperação');
  verdade(!!diario(amb), 'leitor não limpa: diário continua');
  ev('[falha no histórico + falha no descarte] resposta=NAO_GRAVADA | restos na planilha=' + fmt(sobra) + ' | painel (leitor) mostra ' + vis.dados.base.disciplinas.length + ' disciplinas e ' + vis.dados.importacoes.length + ' importações; diário continua registrado');
  // Reinício do contexto (nova execução do Apps Script) + nova prévia: recuperação
  const amb2 = reiniciar(amb);
  const prev2 = amb2.ctx.prepararImportacao(pacoteCsv());
  verdade(prev2.ok, prev2.erro);
  verdade(prev2.dados.recuperacao && prev2.dados.recuperacao.descartada, 'recuperação informada');
  const limpo = { abasNova: amb2.estrutura().getSheets().filter((s) => s.getName().startsWith('_nova_')).length, linhasImportacoes: abaObjs(amb2, 'Importações').length, diario: !!diario(amb2) };
  igual(limpo, { abasNova: 0, linhasImportacoes: 0, diario: false }, 'recuperação');
  const r3 = amb2.ctx.confirmarImportacao(pacoteCsv(), prev2.dados.assinatura, { operacao: prev2.dados.operacao });
  verdade(r3.ok, r3.erro);
  const fim = retrato(amb2);
  igual([fim.versao, fim.disciplinas, fim.importacoesPainel, fim.linhasImportacoesPlanilha], [1, 183, 1, 1]);
  ev('   após reinício: prévia fez a recuperação ' + fmt(limpo) + '; nova gravação ok → versão ' + fim.versao + ', ' + fim.disciplinas + ' disciplinas, ' + fim.linhasImportacoesPlanilha + ' linha em Importações');
});

// =====================================================================
console.log('\n== 2. Falha injetada ANTES da ativação — reimportação de base com dados');
ev('\n=== 2. FALHAS ANTES DA ATIVAÇÃO — REIMPORTAÇÃO (base CSV+PDF, Observação e coluna extra; arquivo com 1 nome alterado) ===');
[['escrita da 2ª aba', em.escritaCopiaOferta], ['histórico: aba Alterações', em.historicoAlteracoes], ['escrita do manifesto', em.manifesto]].forEach(([rotulo, pred]) => {
  teste('reimportação, falha em ' + rotulo + ': versão anterior intacta (dados, Observações, extras, histórico); nova tentativa não duplica', () => {
    const amb = ambienteComBase();
    const antes = retrato(amb);
    const obsAntes = observacaoEExtra(amb);
    const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
    igual(prev.totais.alteradas, 1);
    amb.injetarFalha(pred);
    const r = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
    igual(r.codigo, 'NAO_GRAVADA');
    const depois = retrato(amb);
    igual([depois.versao, depois.disciplinas, depois.importacoesPainel, depois.linhasImportacoesPlanilha, depois.abasNova], [antes.versao, antes.disciplinas, antes.importacoesPainel, antes.linhasImportacoesPlanilha, 0]);
    igual(observacaoEExtra(amb), obsAntes, 'Observação e coluna extra');
    const nomeAtual = abaObjs(amb, 'Disciplinas').find((x) => x['Código'] === 'PSC1322')['Nome'];
    igual(nomeAtual, 'Introdução à Psicopatologia', 'dado antigo');
    ev(`[reimportação, falha em ${rotulo}] resposta=${r.codigo} | versão ${antes.versao}→${depois.versao} | importações ${antes.importacoesPainel}→${depois.importacoesPainel} | nome PSC1322 continua "${nomeAtual}" | Observação/extra=${fmt(observacaoEExtra(amb))}`);
    const r2 = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
    verdade(r2.ok, r2.erro);
    const r3 = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
    verdade(r3.ok && r3.dados.jaGravada, 'mesma operação de novo = já gravada');
    const fim = retrato(amb);
    igual([fim.versao, fim.importacoesPainel, fim.linhasImportacoesPlanilha, fim.alteracoesForaDoPainel], [antes.versao + 1, antes.importacoesPainel + 1, antes.linhasImportacoesPlanilha + 1, 0]);
    igual(observacaoEExtra(amb), obsAntes, 'Observação e extra depois da nova tentativa');
    const alt = amb.ctx.obterDadosPainel().dados.alteracoes.filter((a) => a.importacao === r2.dados.id);
    igual(alt.map((a) => [a.codigo, a.campo]), [['PSC1322', 'Nome']], 'histórico da importação');
    ev(`   nova tentativa ok (versão ${fim.versao}, ${fim.importacoesPainel} importações, 1 alteração); repetir a mesma operação → "já gravada", sem nova linha`);
  });
});

// =====================================================================
console.log('\n== 3. Falhas NA e DEPOIS da ativação');
ev('\n=== 3. FALHAS NA E DEPOIS DA ATIVAÇÃO ===');
teste('flush falha logo após o manifesto, mas a leitura confirma: concluída, com pendência (não "não gravada")', () => {
  const amb = ambienteComBase();
  const antes = retrato(amb);
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(depoisDaAtivacao(em.flush));
  const r = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
  verdade(r.ok, r.erro);
  verdade(r.dados.concluida && r.dados.pendencias.length >= 1, fmt(r.dados.pendencias));
  const fim = retrato(amb);
  igual([fim.versao, fim.importacaoAtiva], [antes.versao + 1, r.dados.id]);
  ev('[flush pós-manifesto] resposta ok, concluida=true, pendências=' + fmt(r.dados.pendencias) + ' | versão ' + antes.versao + '→' + fim.versao);
});
teste('ativação incerta (flush e releitura falham): RESULTADO_INCERTO; após reinício, verificarImportacao diz "gravada" e o painel mostra essa versão', () => {
  const amb = ambienteComBase();
  const antes = retrato(amb);
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(depoisDaAtivacao(em.flush));
  amb.injetarFalha(depoisDaAtivacao((e) => e.tipo === 'lerMetadados'));
  const r = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
  igual(r.codigo, 'RESULTADO_INCERTO');
  verdade(/Verificar/.test(r.erro) && !/não foi gravada/.test(r.erro), r.erro);
  const amb2 = reiniciar(amb);
  const v = amb2.ctx.verificarImportacao(prev.operacao);
  verdade(v.ok, v.erro);
  igual(v.dados.situacao, 'gravada');
  const fim = retrato(amb2);
  igual([fim.versao, fim.importacaoAtiva === v.dados.id, fim.importacoesPainel], [antes.versao + 1, true, antes.importacoesPainel + 1]);
  // repetir a confirmação não grava de novo
  const r2 = amb2.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
  verdade(r2.ok && r2.dados.jaGravada, 'já gravada');
  igual(retrato(amb2).linhasImportacoesPlanilha, antes.linhasImportacoesPlanilha + 1);
  ev('[ativação incerta] resposta=RESULTADO_INCERTO | após reinício: verificarImportacao=' + v.dados.situacao + ' (' + v.dados.id + ') | versão ' + antes.versao + '→' + fim.versao + ' | reenvio → já gravada, sem linha duplicada');
});
teste('ativação incerta em que o manifesto NÃO foi gravado: verificarImportacao diz "não gravada"; recuperação limpa; nova tentativa ok', () => {
  const amb = ambienteComBase();
  const antes = retrato(amb);
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(em.manifesto);
  amb.injetarFalha((e) => e.tipo === 'lerMetadados' && amb.estado.falhas[0].disparos === 1);
  const r = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
  igual(r.codigo, 'RESULTADO_INCERTO');
  const amb2 = reiniciar(amb);
  const v = amb2.ctx.verificarImportacao(prev.operacao);
  igual([v.dados.situacao, v.dados.limpezaPendente], ['nao_gravada', true]);
  const vis = retrato(amb2); // admin abre o painel: recuperação automática
  igual([vis.versao, vis.importacoesPainel, vis.linhasImportacoesPlanilha, vis.abasNova, vis.diario], [antes.versao, antes.importacoesPainel, antes.linhasImportacoesPlanilha, 0, false]);
  const r2 = amb2.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
  verdade(r2.ok, r2.erro);
  ev('[ativação incerta, manifesto não escrito] resposta=RESULTADO_INCERTO | verificar=nao_gravada | painel do admin recuperou: versão ' + vis.versao + ', ' + vis.linhasImportacoesPlanilha + ' linhas em Importações | nova tentativa ok');
});
// ---------------------------------------------------------------------
// 3b. Falha na ARRUMAÇÃO depois da ativação. A conferência é feita pelo
// ID INTERNO das abas (não pelo nome: em 1.1.0 conferir só os nomes deu
// falso positivo, porque a aba antiga continuava chamada "Disciplinas").
// Para cada ponto: resposta "gravada com pendências" + alerta; manifesto
// na versão nova; abas visíveis ≠ manifesto (antes); diário mantido;
// reinício do contexto; leitor vê o alerta (e nada muda); administrador
// abre o painel → recuperação; abas visíveis = manifesto (IDs, valores,
// visibilidade, proteção), diário removido, alerta some.
const NOMES_DADOS = ['Disciplinas', 'Disciplinas por habilitação', 'Requisitos', 'Currículos'];
const crypto = require('crypto');
function valoresAba(s) {
  if (!s) return null;
  const v = s.getLastRow() ? s.getRange(1, 1, s.getLastRow(), Math.max(1, s.getLastColumn())).getValues() : [];
  return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 12);
}
/** Estado das 4 abas de dados: aba VISÍVEL pelo nome × aba do MANIFESTO pelo ID. */
function estadoAbas(amb) {
  const ss = amb.estrutura();
  const m = manifesto(amb);
  return NOMES_DADOS.map((nome) => {
    const vis = ss.getSheetByName(nome);
    const ativa = ss.getSheets().find((x) => x.getSheetId() === m.abas[nome]) || null;
    return {
      nome, idVisivel: vis ? vis.getSheetId() : null, visivelOculta: vis ? vis.isSheetHidden() : null,
      idManifesto: m.abas[nome], nomeDaAtiva: ativa ? ativa.getName() : null, ativaOculta: ativa ? ativa.isSheetHidden() : null,
      protegida: ativa ? ativa.getProtections('SHEET').length > 0 : null,
      valoresVisivel: valoresAba(vis), valoresAtiva: valoresAba(ativa)
    };
  });
}
/** Todas as abas visíveis são as do manifesto, visíveis, protegidas, sem cópias auxiliares à mostra. */
function conferirAbasCoerentes(amb, rotulo) {
  estadoAbas(amb).forEach((a) => {
    igual([a.idVisivel, a.visivelOculta, a.nomeDaAtiva, a.ativaOculta, a.protegida, a.valoresVisivel], [a.idManifesto, false, a.nome, false, true, a.valoresAtiva], rotulo + ' — ' + a.nome);
  });
  const soltas = amb.estrutura().getSheets().filter((x) => /^_(nova|anterior)_/.test(x.getName()) && !x.isSheetHidden()).map((x) => x.getName());
  igual(soltas, [], rotulo + ' — cópias auxiliares visíveis');
  const ordem = amb.estrutura().getSheets().filter((x) => !x.isSheetHidden()).map((x) => x.getName());
  igual(ordem, ['Sobre', 'Disciplinas', 'Disciplinas por habilitação', 'Requisitos', 'Currículos', 'Importações', 'Alterações', 'Ajustes manuais', 'Disciplinas para outros cursos'], rotulo + ' — ordem');
}
function nomeVisivelPSC1322(amb) {
  const o = abaObjs(amb, 'Disciplinas').find((x) => x['Código'] === 'PSC1322');
  return o ? o['Nome'] : null;
}
function leitorDe(amb) {
  const l = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'leitor@unidade.example', propriedades: {} });
  l.permitir('leitor@unidade.example', 'LEITOR');
  return l;
}
const NOVO_NOME = 'Introdução à Psicopatologia (nova ementa)';
const PONTOS_ARRUMACAO = [
  { rotulo: 'renomear a aba anterior (setName do ocupante — caso da auditoria)', pred: (e) => e.tipo === 'setName' && /^_anterior_/.test(e.novo), grave: true },
  { rotulo: 'renomear a aba nova para o nome normal (setName da ativa)', pred: (e) => e.tipo === 'setName' && NOMES_DADOS.indexOf(e.novo) >= 0, grave: true },
  { rotulo: 'ocultar a aba anterior (hideSheet)', pred: (e) => e.tipo === 'hideSheet' && /^_anterior_/.test(e.aba), grave: false },
  { rotulo: 'mostrar a aba nova (showSheet)', pred: (e) => e.tipo === 'showSheet', grave: true },
  { rotulo: 'mover abas (moveActiveSheet)', pred: (e) => e.tipo === 'moveActiveSheet', grave: false },
  { rotulo: 'proteger a aba nova (protect)', pred: (e) => e.tipo === 'protect', grave: false },
  { rotulo: 'apagar a cópia anterior mais antiga (deleteSheet)', pred: (e) => e.tipo === 'deleteSheet' && /^_anterior_/.test(e.aba), grave: true }
];
PONTOS_ARRUMACAO.forEach((pt) => {
  teste('arrumação falha em "' + pt.rotulo + '": gravada com pendências e alerta; reinício; leitor avisado; admin abre → abas visíveis = manifesto (IDs, valores, visibilidade)', () => {
    const amb = ambienteComBase();
    const v0 = manifesto(amb).versaoBase;
    const idsAntigos = manifesto(amb).abas;
    const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
    const f = amb.injetarFalha(depoisDaAtivacao(pt.pred), 50);
    const r = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
    verdade(f.disparos > 0, 'a falha foi disparada');
    verdade(r.ok && r.dados.concluida, 'gravada (não "não gravada"): ' + fmt(r));
    verdade(r.dados.pendencias.indexOf('nomes e ordem das abas') >= 0, fmt(r.dados.pendencias));
    igual(r.dados.planilhaDesatualizada, pt.grave, 'alerta na resposta');
    const m = manifesto(amb);
    igual(m.versaoBase, v0 + 1, 'manifesto na versão nova');
    verdade(diario(amb) && diario(amb).fase === 'arrumacao_pendente', 'diário mantido com a pendência: ' + fmt(diario(amb)));
    const antes = estadoAbas(amb);
    const divergentes = antes.filter((a) => a.idVisivel !== a.idManifesto || a.visivelOculta || a.ativaOculta || a.nomeDaAtiva !== a.nome);
    if (pt.grave) verdade(divergentes.length > 0, 'deveria haver aba visível ≠ manifesto');
    const pscVisivelAntes = nomeVisivelPSC1322(amb);
    const auxVisiveis = amb.estrutura().getSheets().filter((x) => /^_(nova|anterior)_/.test(x.getName()) && !x.isSheetHidden()).map((x) => x.getName());
    const semProtecao = antes.filter((a) => !a.protegida).map((a) => a.nome);
    // Reinício do contexto (nova execução do Apps Script), antes de qualquer recuperação.
    amb.limparFalhas();
    const leitor = leitorDe(amb);
    const vl = leitor.ctx.obterDadosPainel();
    verdade(vl.ok, vl.erro);
    igual([vl.dados.base.versao, vl.dados.base.disciplinas.find((d) => d.codigo === 'PSC1322').nome], [v0 + 1, NOVO_NOME], 'leitor: painel na versão nova');
    igual(vl.dados.gravacao.planilhaDesatualizada, pt.grave, 'leitor recebe o alerta');
    igual(JSON.stringify(estadoAbas(amb)), JSON.stringify(antes), 'leitor não altera a planilha');
    // Administrador com a trava ocupada: não recupera, mas avisa.
    const ocupado = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, travaOcupada: true });
    const vo = ocupado.ctx.obterDadosPainel();
    verdade(vo.ok && vo.dados.gravacao.recuperacaoAdiada && vo.dados.gravacao.arrumacaoPendente, 'admin com trava ocupada: ' + fmt(vo.dados && vo.dados.gravacao));
    igual(vo.dados.gravacao.planilhaDesatualizada, pt.grave);
    // Administrador abre o painel: recuperação.
    const admin = reiniciar(amb);
    const va = admin.ctx.obterDadosPainel();
    verdade(va.ok, va.erro);
    igual([va.dados.gravacao.planilhaDesatualizada, va.dados.gravacao.arrumadaAgora, va.dados.gravacao.recuperacaoFalhou, va.dados.gravacao.arrumacaoPendente], [false, true, false, false], 'admin: ' + fmt(va.dados.gravacao));
    conferirAbasCoerentes(amb, pt.rotulo);
    igual(nomeVisivelPSC1322(amb), NOVO_NOME, 'a aba visível "Disciplinas" tem os dados novos');
    igual(observacaoEExtra(amb), ['Obs. de teste: turma única', 'Bloco G']);
    igual(diario(amb), null, 'diário removido depois da recuperação');
    const anteriores = NOMES_DADOS.map((n) => amb.estrutura().getSheetByName('_anterior_' + n));
    igual(anteriores.map((x) => x && x.getSheetId()), NOMES_DADOS.map((n) => idsAntigos[n]), 'cópias _anterior_ = abas da versão anterior');
    verdade(anteriores.every((x) => x.isSheetHidden()), '_anterior_ ocultas');
    const depois = leitorDe(amb).ctx.obterDadosPainel();
    igual(depois.dados.gravacao.planilhaDesatualizada, false, 'alerta some para o leitor');
    ev('[arrumação: ' + pt.rotulo + '] resposta ok+pendências=' + fmt(r.dados.pendencias) + ', planilhaDesatualizada=' + r.dados.planilhaDesatualizada +
      ' | manifesto v' + m.versaoBase + ' | antes: ' + divergentes.map((a) => a.nome + ' visível id=' + a.idVisivel + (a.visivelOculta ? '(oculta)' : '') + ' × manifesto id=' + a.idManifesto + ' "' + a.nomeDaAtiva + '"' + (a.ativaOculta ? '(oculta)' : '')).join('; ') +
      (divergentes.length ? '' : 'IDs, nomes e visibilidade das 4 abas conferem; pendência: ' + (auxVisiveis.length ? 'cópias auxiliares visíveis (' + auxVisiveis.join(', ') + ') ' : '') + (semProtecao.length ? 'sem proteção (' + semProtecao.join(', ') + ') ' : '') + 'ordem') + ' | PSC1322 na aba visível: "' + pscVisivelAntes + '"' +
      ' | reinício; leitor: alerta=' + vl.dados.gravacao.planilhaDesatualizada + ', planilha intacta; admin c/ trava ocupada: adiada' +
      ' | admin abre: 4 abas visíveis = manifesto (IDs, valores, visíveis, protegidas), PSC1322 "' + nomeVisivelPSC1322(amb) + '", diário removido');
  });
});
teste('arrumação falha de novo DURANTE a recuperação: painel abre com alerta e pendência; diário fica; a abertura seguinte conclui', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(depoisDaAtivacao((e) => e.tipo === 'setName'), 50);
  verdade(amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao }).ok);
  const admin = reiniciar(amb);
  admin.injetarFalha((e) => e.tipo === 'setName', 50);
  const v1 = admin.ctx.obterDadosPainel();
  verdade(v1.ok, 'painel abre mesmo com a recuperação falhando: ' + v1.erro);
  igual([v1.dados.gravacao.planilhaDesatualizada, v1.dados.gravacao.recuperacaoFalhou], [true, true], fmt(v1.dados.gravacao));
  igual(v1.dados.base.disciplinas.find((d) => d.codigo === 'PSC1322').nome, NOVO_NOME, 'painel mostra a versão em uso');
  verdade(diario(amb), 'diário continua');
  admin.limparFalhas();
  const v2 = reiniciar(amb).ctx.obterDadosPainel();
  igual([v2.dados.gravacao.planilhaDesatualizada, v2.dados.gravacao.arrumadaAgora], [false, true]);
  conferirAbasCoerentes(amb, 'segunda abertura');
  igual(diario(amb), null);
  ev('[arrumação falha também na recuperação] 1ª abertura do admin: painel ok, alerta + recuperacaoFalhou, diário mantido | 2ª abertura: abas = manifesto, diário removido');
});
teste('arrumação pendente é concluída também pela próxima prévia (sem abrir o painel)', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(depoisDaAtivacao((e) => e.tipo === 'setName'), 50);
  verdade(amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao }).ok);
  const outro = reiniciar(amb);
  const p2 = outro.ctx.prepararImportacao(pacoteCsv());
  verdade(p2.ok && p2.dados.recuperacao && p2.dados.recuperacao.arrumada, fmt(p2.dados && p2.dados.recuperacao));
  conferirAbasCoerentes(amb, 'após a prévia');
});
teste('aba Sobre falha depois da ativação: gravada com pendência; diário fica; admin abre → Sobre reescrita e diário removido', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(depoisDaAtivacao((e) => e.tipo === 'clearContents' || (e.tipo === 'setValues' && e.aba === 'Sobre')), 50);
  const r = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
  verdade(r.ok && r.dados.pendencias.indexOf('aba Sobre') >= 0, fmt(r));
  igual(r.dados.planilhaDesatualizada, false, 'abas de dados já conferem');
  const sobre = () => JSON.stringify(amb.estrutura().getSheetByName('Sobre').getRange(1, 1, 40, 2).getValues());
  verdade(sobre().indexOf(r.dados.id) < 0, 'Sobre ainda sem a importação nova');
  verdade(diario(amb), 'diário mantido');
  amb.limparFalhas();
  reiniciar(amb).ctx.obterDadosPainel();
  verdade(sobre().indexOf(r.dados.id) >= 0 || sobre().indexOf(r.dados.dataHora) >= 0, 'Sobre reescrita com a última importação');
  igual(diario(amb), null, 'diário removido');
  conferirAbasCoerentes(amb, 'Sobre');
  ev('[aba Sobre falhou] resposta ok, pendências=' + fmt(r.dados.pendencias) + ' | diário mantido | admin abre: Sobre reescrita, diário removido');
});
teste('remoção do diário falha: gravada com pendência "diário da gravação"; abas já conferem; admin abre → diário removido', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(depoisDaAtivacao((e) => e.tipo === 'metadadoRemover'), 50);
  const r = amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao });
  verdade(r.ok && r.dados.pendencias.indexOf('diário da gravação') >= 0 && !r.dados.planilhaDesatualizada, fmt(r));
  conferirAbasCoerentes(amb, 'antes');
  verdade(diario(amb), 'diário ficou');
  amb.limparFalhas();
  const v = reiniciar(amb).ctx.obterDadosPainel();
  verdade(v.ok && !v.dados.gravacao.planilhaDesatualizada && !v.dados.gravacao.interrompida, fmt(v.dados.gravacao));
  igual(diario(amb), null);
});
teste('sem diário, mas abas divergentes (ex.: diário removido à mão): o painel do administrador detecta pelo ID e corrige', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsvAlterado()).dados;
  amb.injetarFalha(depoisDaAtivacao((e) => e.tipo === 'setName'), 50);
  verdade(amb.ctx.confirmarImportacao(pacoteCsvAlterado(), prev.assinatura, { operacao: prev.operacao }).ok);
  amb.limparFalhas();
  amb.estrutura().getDeveloperMetadata().find((x) => x.getKey() === 'estruturaCurricular.gravacao').remove();
  igual(diario(amb), null);
  const v = reiniciar(amb).ctx.obterDadosPainel();
  verdade(v.ok && v.dados.gravacao.arrumadaAgora, fmt(v.dados && v.dados.gravacao));
  conferirAbasCoerentes(amb, 'sem diário');
});

// =====================================================================
console.log('\n== 4. Prévia × edições manuais');
ev('\n=== 4. PRÉVIA × EDIÇÕES MANUAIS ===');
function editar(amb, abaNome, codigo, titulo, valor) {
  const s = amb.estrutura().getSheetByName(abaNome);
  const cab = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  const cods = s.getRange(2, cab.indexOf(abaNome === 'Currículos' ? 'Currículo' : 'Código') + 1, s.getLastRow() - 1, 1).getValues().map((l) => String(l[0]));
  s.getRange(cods.indexOf(codigo) + 2, cab.indexOf(titulo) + 1).setValue(valor);
}
teste('prévia com 0 alterações → edição manual de um nome → confirmação recusada; nova prévia mostra a mudança; nada surpresa', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsv()).dados;
  igual([prev.totais.alteradas, prev.totais.novas], [0, 0]);
  editar(amb, 'Disciplinas', 'PSC1322', 'Nome', 'Nome editado à mão');
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao, previa: prev.impressao });
  igual(r.codigo, 'PREVIA_DESATUALIZADA');
  verdade(/editada à mão/.test(r.erro) && /Disciplinas/.test(r.erro), r.erro);
  igual(abaObjs(amb, 'Disciplinas').find((x) => x['Código'] === 'PSC1322')['Nome'], 'Nome editado à mão', 'nada gravado');
  const prev2 = amb.ctx.prepararImportacao(pacoteCsv()).dados;
  igual(prev2.totais.alteradas, 1);
  igual(prev2.mudancas.alteradas[0].campos[0], { campo: 'Nome', antes: 'Nome editado à mão', depois: 'Introdução à Psicopatologia' });
  const r2 = amb.ctx.confirmarImportacao(pacoteCsv(), prev2.assinatura, { operacao: prev2.operacao });
  verdade(r2.ok, r2.erro);
  igual(r2.dados.totais.alteradas, prev2.totais.alteradas, 'gravado = prévia');
  ev('[0 alterações → nome editado → confirmar] resposta=' + r.codigo + ' ("' + r.erro.slice(0, 110) + '…") | nova prévia: 1 alteração (Nome: "Nome editado à mão" → "Introdução à Psicopatologia") | confirmada: ' + r2.dados.totais.alteradas + ' alteração, igual à prévia');
});
teste('edição de célula do sistema em Currículos depois da prévia também invalida', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsv()).dados;
  editar(amb, 'Currículos', '470120100262', 'Total geral (h)', 1);
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao, previa: prev.impressao });
  igual(r.codigo, 'PREVIA_DESATUALIZADA');
  verdade(/Currículos/.test(r.erro), r.erro);
});
teste('Observação e coluna extra editadas depois da prévia: confirmação aceita e as edições são preservadas (regra: colunas manuais)', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsv()).dados;
  igual(prev.totais.alteradas, 0);
  editar(amb, 'Disciplinas', 'PSC1322', 'Observações', 'Obs. editada depois da prévia');
  editar(amb, 'Disciplinas', 'PSA1302', 'Sala preferida', 'Bloco D');
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao });
  verdade(r.ok, r.erro);
  igual(r.dados.totais.alteradas, 0, 'nenhuma alteração surpresa');
  igual(observacaoEExtra(amb), ['Obs. editada depois da prévia', 'Bloco D']);
  ev('[Observação/coluna extra editadas depois da prévia] confirmação aceita; 0 alterações (como na prévia); valores preservados: ' + fmt(observacaoEExtra(amb)));
});
teste('edição durante a preparação (entre a leitura e a ativação): cancelada, nada muda', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsv()).dados;
  let feito = false;
  amb.injetarFalha((e) => {
    if (!feito && e.tipo === 'setValues' && /^_nova_curriculos/.test(e.aba)) { feito = true; editar(amb, 'Disciplinas', 'PSC1322', 'Observações', 'digitada durante a gravação'); }
    return false;
  });
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao });
  igual(r.codigo, 'EDICAO_DURANTE_GRAVACAO');
  const fim = retrato(amb);
  igual([fim.abasNova, fim.diario], [0, false]);
  igual(observacaoEExtra(amb)[0], 'digitada durante a gravação', 'edição humana preservada na aba em uso');
  ev('[edição durante a preparação] resposta=' + r.codigo + ' | nada ativado; a edição humana continua na aba em uso');
});
teste('edição no instante da ativação: gravação concluída + aviso apontando a cópia de segurança com a edição', () => {
  const amb = ambienteComBase();
  const prev = amb.ctx.prepararImportacao(pacoteCsv()).dados;
  let feito = false;
  amb.injetarFalha((e) => {
    if (!feito && e.tipo === 'metadado' && e.chave === 'estruturaCurricular.ativa') { feito = true; editar(amb, 'Disciplinas', 'PSC1322', 'Observações', 'digitada na ativação'); }
    return false;
  });
  const r = amb.ctx.confirmarImportacao(pacoteCsv(), prev.assinatura, { operacao: prev.operacao });
  verdade(r.ok && r.dados.avisos.length === 1, fmt(r));
  const backup = amb.estrutura().getSheetByName('_anterior_Disciplinas');
  verdade(backup && backup.isSheetHidden(), 'cópia de segurança oculta');
  const vals = backup.getRange(1, 1, backup.getLastRow(), backup.getLastColumn()).getValues();
  const cOb = vals[0].indexOf('Observações');
  verdade(vals.some((l) => l[cOb] === 'digitada na ativação'), 'edição está na cópia de segurança');
  ev('[edição no instante da ativação] resposta ok + aviso: "' + r.dados.avisos[0].slice(0, 120) + '…"');
});

// =====================================================================
console.log('\n== 5. Informações Básicas do PDF conferidas no servidor');
ev('\n=== 5. INFORMAÇÕES BÁSICAS DO PDF (conferência no servidor) ===');
function pdfComInfo(alterar) {
  const p = pacotePdf();
  const c = p.curriculos.find((x) => x.codigo === '470120100262');
  alterar(c.info, c);
  c.info.conferido = true; // o navegador "diz" que conferiu: deve ser ignorado
  return p;
}
function curriculoBach(amb) { return abaObjs(amb, 'Currículos').find((x) => x['Currículo'] === '470120100262' || x['Habilitação'] === 'Bacharelado'); }
teste('bloco correto (PDF real): 11 contas ok por currículo e valores gravados', () => {
  const amb = novoAmbiente();
  importar(amb, pacoteCsv());
  const { prev, res } = importar(amb, pacotePdf());
  verdade(res.ok, res.erro);
  prev.infoConferencia.forEach((ic) => igual([ic.relacoes.filter((r) => r.situacao === 'ok').length, ic.inconsistentes], [11, 0], ic.habilitacao));
  const c = curriculoBach(amb);
  igual([c['Obrigatórias – aula (h)'], c['Obrigatórias – total (h)'], c['Total geral (h)']], [2160, 3870, 4895]);
  ev('[bloco correto] 3 currículos × 11 contas ok (inclui aula/trabalho obrigatórios × grade do CSV e AAC × CSV); Bacharelado gravado: aula 2160, total obrig. 3870, total geral 4895');
});
teste('números contraditórios (1000 + 300 ≠ 9999) no complemento: bloqueia só os campos envolvidos, preserva os anteriores e mostra na prévia', () => {
  const amb = novoAmbiente();
  importar(amb, pacoteCsv());
  importar(amb, pacotePdf());
  const p = pdfComInfo((i) => { i.chAulaObrigatoria = 1000; i.chTrabalhoObrigatoria = 300; i.chObrigatoria = 9999; });
  const { prev, res } = importar(amb, p);
  verdade(res.ok, res.erro);
  const ic = prev.infoConferencia.find((x) => x.curriculo === '470120100262');
  const inc = ic.campos.filter((x) => x.situacao === 'inconsistente').map((x) => x.campo);
  igual(inc, ['chAulaObrigatoria', 'chTrabalhoObrigatoria', 'chObrigatoria', 'chEletiva', 'chLivre', 'chDisciplinas']);
  verdade(ic.relacoes.find((r) => /Obrigatórias: aula/.test(r.rotulo)).situacao === 'falha');
  const c = curriculoBach(amb);
  igual([c['Obrigatórias – aula (h)'], c['Obrigatórias – trabalho (h)'], c['Obrigatórias – total (h)'], c['CH em disciplinas (h)']], [2160, 1710, 3870, 4500], 'valores anteriores preservados');
  ev('[1000 + 300 = 9999] campos NÃO gravados: ' + inc.join(', ') + ' | contas com falha: ' + ic.relacoes.filter((r) => r.situacao === 'falha').map((r) => r.rotulo + ' (' + r.conta + ')').join('; ') + ' | Currículos mantém 2160/1710/3870/4500');
});
teste('mesmos números contraditórios sobre base só com CSV: campos ficam vazios (não gravados)', () => {
  const amb = novoAmbiente();
  importar(amb, pacoteCsv());
  const p = pdfComInfo((i) => { i.chAulaObrigatoria = 1000; i.chTrabalhoObrigatoria = 300; i.chObrigatoria = 9999; });
  const { res } = importar(amb, p);
  verdade(res.ok, res.erro);
  const c = curriculoBach(amb);
  igual([c['Obrigatórias – aula (h)'], c['Obrigatórias – total (h)'], c['Duração ideal (sem.)']], ['', '', 8], 'só os campos coerentes/sem conta');
});
teste('valores ausentes: não gravados, anteriores preservados, contas "não verificáveis"', () => {
  const amb = novoAmbiente();
  importar(amb, pacoteCsv());
  importar(amb, pacotePdf());
  const p = pdfComInfo((i) => { i.totalGeral = null; i.estagio = null; });
  const { prev } = importar(amb, p);
  const ic = prev.infoConferencia.find((x) => x.curriculo === '470120100262');
  igual(ic.campos.filter((x) => x.situacao === 'ausente').map((x) => x.campo), ['dataDesativacao', 'totalGeral', 'estagio'].sort((a, b) => ['duracaoIdeal', 'duracaoMinima', 'duracaoMaxima', 'chAulaObrigatoria', 'chTrabalhoObrigatoria', 'chObrigatoria', 'chAulaEletiva', 'chTrabalhoEletiva', 'chEletiva', 'chAulaLivre', 'chTrabalhoLivre', 'chLivre', 'chDisciplinas', 'estagio', 'aac', 'aexApolo', 'extensaoOptativas', 'chDisciplinasMaisAac', 'extensaoTotal', 'extensaoPercentual', 'totalGeral', 'dataAtivacao', 'dataDesativacao', 'informacoesEspecificas'].indexOf(a) - ['duracaoIdeal', 'duracaoMinima', 'duracaoMaxima', 'chAulaObrigatoria', 'chTrabalhoObrigatoria', 'chObrigatoria', 'chAulaEletiva', 'chTrabalhoEletiva', 'chEletiva', 'chAulaLivre', 'chTrabalhoLivre', 'chLivre', 'chDisciplinas', 'estagio', 'aac', 'aexApolo', 'extensaoOptativas', 'chDisciplinasMaisAac', 'extensaoTotal', 'extensaoPercentual', 'totalGeral', 'dataAtivacao', 'dataDesativacao', 'informacoesEspecificas'].indexOf(b)));
  verdade(ic.relacoes.find((r) => /total geral/.test(r.rotulo)).situacao === 'nao_verificavel');
  const c = curriculoBach(amb);
  igual([c['Total geral (h)'], c['Estágio (h)']], [4895, 360], 'anteriores preservados');
  ev('[valores ausentes] totalGeral e estágio = "ausente" (não gravados); conta do total geral "não verificável"; Currículos mantém 4895 e 360');
});
teste('AAC do PDF diferente da AAC do CSV: não gravada; CSV preservado', () => {
  const amb = novoAmbiente();
  importar(amb, pacoteCsv());
  const p = pdfComInfo((i, c) => { i.aac = 90; c.aacHoras = 90; });
  const { prev, res } = importar(amb, p);
  verdade(res.ok, res.erro);
  const ic = prev.infoConferencia.find((x) => x.curriculo === '470120100262');
  igual(ic.campos.find((x) => x.campo === 'aac').situacao, 'inconsistente');
  igual(curriculoBach(amb)['AAC exigida (h)'], 60);
  ev('[AAC 90 no PDF × 60 no CSV] AAC "inconsistente" (contas: total+AAC e AAC×CSV falham); AAC gravada continua 60');
});
teste('primeira importação só pelo PDF: bloco correto gravado; com números contraditórios, só os campos coerentes', () => {
  const a1 = novoAmbiente();
  const r1 = importar(a1, pacotePdf());
  verdade(r1.res.ok, r1.res.erro);
  igual(r1.prev.infoConferencia.map((ic) => ic.inconsistentes), [0, 0, 0]);
  igual(curriculoBach(a1)['Total geral (h)'], 4895);
  const a2 = novoAmbiente();
  const r2 = importar(a2, pdfComInfo((i) => { i.chAulaObrigatoria = 1000; i.chTrabalhoObrigatoria = 300; i.chObrigatoria = 9999; }));
  verdade(r2.res.ok, r2.res.erro);
  const c = curriculoBach(a2);
  igual([c['Obrigatórias – aula (h)'], c['Total geral (h)'], c['AAC exigida (h)']], ['', 4895, 60]);
  ev('[1ª importação pelo PDF] bloco correto: gravado (total geral 4895) | contraditório: campos da conta que falhou ficam vazios; total geral 4895 e AAC 60 gravados');
});
teste('o "conferido: true" enviado pelo navegador é ignorado', () => {
  const amb = novoAmbiente();
  const p = pdfComInfo((i) => { i.chObrigatoria = 9999; i.conferido = true; });
  const prev = amb.ctx.prepararImportacao(p).dados;
  const ic = prev.infoConferencia.find((x) => x.curriculo === '470120100262');
  verdade(ic.inconsistentes > 0, 'servidor refez as contas');
});

// =====================================================================
console.log('\n== 6. Identificador único das importações');
ev('\n=== 6. IDENTIFICADOR ÚNICO ===');
teste('duas importações com o relógio congelado no mesmo segundo: IDs diferentes, histórico agrupado certo', () => {
  const amb = novoAmbiente({ agora: new Date('2026-09-27T15:00:00-03:00') });
  const a = importar(amb, pacoteCsv());
  const b = importar(amb, pacoteCsvAlterado());
  verdade(a.res.ok && b.res.ok, (a.res.erro || '') + (b.res.erro || ''));
  verdade(a.res.dados.id !== b.res.dados.id, 'ids iguais: ' + a.res.dados.id);
  igual([a.res.dados.dataHora, b.res.dados.dataHora], ['27/09/2026 15:00', '27/09/2026 15:00']);
  verdade(/^IMP-20260927-150000-[0-9a-f]{8}$/.test(a.res.dados.id), a.res.dados.id);
  const d = amb.ctx.obterDadosPainel().dados;
  igual(d.importacoes.map((i) => i.id), [b.res.dados.id, a.res.dados.id]);
  const porId = {}; d.alteracoes.forEach((x) => { porId[x.importacao] = (porId[x.importacao] || 0) + 1; });
  igual([porId[a.res.dados.id], porId[b.res.dados.id]], [1, 1], 'Carga inicial × 1 alteração');
  ev('[mesmo segundo] ' + a.res.dados.id + ' e ' + b.res.dados.id + ' (data legível na coluna "Data e hora": ' + a.res.dados.dataHora + ') | alterações por importação: ' + fmt(porId));
});
teste('colisão improvável dos 8 primeiros caracteres no mesmo segundo: sufixo -2', () => {
  const amb = novoAmbiente({ agora: new Date('2026-09-27T15:00:00-03:00'), uuids: ['abcdef12-0000-4000-8000-000000000001', 'abcdef12-0000-4000-8000-000000000002'] });
  const a = importar(amb, pacoteCsv());
  const b = importar(amb, pacoteCsvAlterado());
  igual([a.res.dados.id, b.res.dados.id], ['IMP-20260927-150000-abcdef12', 'IMP-20260927-150000-abcdef12-2']);
});

// =====================================================================
console.log('\n== 7. Conferência do PDF separada por tipo de evidência');
ev('\n=== 7. CONFERÊNCIA DO PDF (categorias) ===');
teste('prévia do PDF (complemento) separa leitura, coerência, concordância com o CSV, exclusivos do PDF e itens a revisar', () => {
  const amb = novoAmbiente();
  importar(amb, pacoteCsv());
  const prev = amb.ctx.prepararImportacao(pacotePdf()).dados;
  const c = prev.conferenciaPdf;
  igual(c.leitura, 'ocr');
  igual([c.concordancia.campos, c.concordancia.camposIguais, c.concordancia.ofertas, c.concordancia.ofertasIguais], [1098, 1098, 398, 398]);
  const cont = c.contas;
  verdade(cont.numerosLidos + cont.numerosCorrigidos === 3582 && cont.numerosAConferir === 0, fmt(cont));
  igual(prev.revisao.necessaria, true);
  ev('[prévia do PDF] leitura=ocr | coerentes com as contas do relatório: ' + (cont.numerosLidos + cont.numerosCorrigidos) + ' (' + cont.numerosCorrigidos + ' corrigidos) | concordância com o CSV: ' + c.concordancia.camposIguais + '/' + c.concordancia.campos + ' números e ' + c.concordancia.ofertasIguais + '/' + c.concordancia.ofertas + ' ofertas | exclusivos do PDF a revisar: ' + prev.revisao.total + ' itens (EXT, versões sem 2ª fonte, informações)');
});

// =====================================================================
console.log('\n== 8. Outros: colunas extras, aba apagada, migração da 1.0.0');
ev('\n=== 8. OUTROS ===');
teste('coluna extra em "Requisitos" e em "Disciplinas por habilitação" sobrevive à reimportação', () => {
  const amb = ambienteComBase();
  ['Requisitos', 'Disciplinas por habilitação'].forEach((nome) => {
    const s = amb.estrutura().getSheetByName(nome);
    const col = s.getLastColumn() + 1;
    s.getRange(1, col).setValue('Anotação');
    s.getRange(2, col).setValue('nota em ' + nome);
  });
  const chave = (nome) => { const o = abaObjs(amb, nome)[0]; return nome === 'Requisitos' ? [o['Currículo'], o['Disciplina'], o['Requisito (código)']] : [o['Currículo'], o['Código']]; };
  const k1 = chave('Requisitos'), k2 = chave('Disciplinas por habilitação');
  const r = importar(amb, pacoteCsvAlterado());
  verdade(r.res.ok, r.res.erro);
  const req = abaObjs(amb, 'Requisitos').find((o) => o['Currículo'] === k1[0] && o['Disciplina'] === k1[1] && o['Requisito (código)'] === k1[2]);
  const of = abaObjs(amb, 'Disciplinas por habilitação').find((o) => o['Currículo'] === k2[0] && o['Código'] === k2[1]);
  igual([req['Anotação'], of['Anotação']], ['nota em Requisitos', 'nota em Disciplinas por habilitação']);
});
teste('aba em uso apagada à mão: BASE_INCONSISTENTE, nada é gravado', () => {
  const amb = ambienteComBase();
  const s = amb.estrutura().getSheetByName('Currículos');
  amb.estrutura().deleteSheet(s);
  const r = amb.ctx.obterDadosPainel();
  igual(r.codigo, 'BASE_INCONSISTENTE');
  const p = amb.ctx.prepararImportacao(pacoteCsv());
  igual(p.codigo, 'BASE_INCONSISTENTE');
  ev('[aba Currículos apagada à mão] painel e prévia: ' + r.codigo + ' ("' + r.erro.slice(0, 90) + '…")');
});
teste('base criada pela 1.0.0 (esquema 1) é migrada: dados e histórico continuam; nova importação funciona', () => {
  const dirV100 = process.env.DIR_SRC_V100;
  if (!dirV100) return PULAR('DIR_SRC_V100 não definido: é preciso a fonte 1.0.0 para criar a base antiga');
  const velho = criarAmbiente({ dirSrc: dirV100 });
  velho.ctx.obterDadosPainel();
  const pv = velho.ctx.prepararImportacao(pacoteCsv()).dados;
  verdade(velho.ctx.confirmarImportacao(pacoteCsv(), pv.assinatura).ok);
  const novo = criarAmbiente({ dirSrc: DIR_SRC, reusar: velho });
  const d = novo.ctx.obterDadosPainel();
  verdade(d.ok, d.erro);
  igual([d.dados.base.disciplinas.length, d.dados.importacoes.length, d.dados.base.versao], [183, 1, 1]);
  const r = importar(novo, pacoteCsvAlterado());
  verdade(r.res.ok, r.res.erro);
  igual(novo.ctx.obterDadosPainel().dados.importacoes.length, 2);
  ev('[migração 1.0.0 → atual] base antiga lida (183 disciplinas, 1 importação, versão 1); nova importação ok (2 importações)');
});

// =====================================================================
console.log('\n== 9. Revisão humana do PDF: lista completa, paginada e conferida no servidor');
ev('\n=== 9. REVISÃO HUMANA PAGINADA ===');
const { parSintetico } = require('./pacotes_sinteticos');
function ambienteSintetico(n) {
  const par = parSintetico(pdfBase, n);
  const amb = novoAmbiente();
  const a = importar(amb, par.csv);
  if (!a.res.ok) throw new Error('CSV sintético: ' + a.res.erro);
  return { amb, par };
}
const chaveItem = (i) => i.tipo + '|' + i.codigo + '|' + i.campo;
teste('pacote sintético de 551 disciplinas: 1.102 valores, TODOS acessíveis em 12 páginas; recusa sem todas as páginas; grava os 1.102 depois', () => {
  const { amb, par } = ambienteSintetico(551);
  const pr = amb.ctx.prepararImportacao(par.pdfOcr);
  verdade(pr.ok && pr.dados.podeGravar, pr.erro || fmt(pr.dados.bloqueios));
  const rv = pr.dados.revisao;
  igual([rv.necessaria, rv.total, rv.paginas, rv.tamanhoPagina, rv.itens.length], [true, 1102, 12, 100, 100], 'prévia');
  const extNaoZero = par.pdfOcr.disciplinas.filter((d) => d.ext !== 0).length;
  igual([rv.resumo.porTipo.EXT, rv.resumo.porTipo['Versão'], rv.resumo.extZero], [551, 551, 551 - extNaoZero], 'resumo (EXT = 0 explícito)');
  const antes = retrato(amb);
  // (a) caixa marcada, só a página 1 aberta
  const r1 = amb.ctx.confirmarImportacao(par.pdfOcr, pr.dados.assinatura, { operacao: pr.dados.operacao, revisaoPdf: true });
  igual(r1.codigo, 'REVISAO_INCOMPLETA', fmt(r1));
  verdade(/11 de 12 páginas/.test(r1.erro) && /páginas 2–12/.test(r1.erro), r1.erro);
  // (b) páginas 2–11 abertas, falta a 12
  const vistos = abrirPaginasRevisao(amb, pr.dados, 11);
  igual(vistos.length, 1100);
  const r2 = amb.ctx.confirmarImportacao(par.pdfOcr, pr.dados.assinatura, { operacao: pr.dados.operacao, revisaoPdf: true });
  igual(r2.codigo, 'REVISAO_INCOMPLETA');
  verdade(/página 12\)/.test(r2.erro), r2.erro);
  // (c) todas as páginas: lista completa, sem repetição, igual ao que será gravado
  const todos = abrirPaginasRevisao(amb, pr.dados);
  igual(todos.length, 1102, 'itens acessíveis');
  igual(new Set(todos.map(chaveItem)).size, 1102, 'sem repetição');
  const esperados = new Set();
  par.pdfOcr.disciplinas.forEach((d) => { esperados.add('EXT|' + d.codigo + '|Extensão – EXT (h)'); esperados.add('Versão|' + d.codigo + '|Versão'); });
  igual(todos.filter((i) => !esperados.has(chaveItem(i))).length, 0, 'todos os itens são valores a gravar');
  const primeiroZero = todos.findIndex((i) => i.tipo === 'EXT' && i.valor === 0);
  verdade(todos.slice(primeiroZero).every((i) => i.tipo === 'EXT' && i.valor === 0), 'EXT = 0 reunidos no fim');
  verdade(todos.every((i) => i.paginas && i.paginas.length), 'página do PDF em cada item');
  const semRev = amb.ctx.confirmarImportacao(par.pdfOcr, pr.dados.assinatura, { operacao: pr.dados.operacao });
  igual(semRev.codigo, 'REVISAO_PENDENTE', 'sem a caixa marcada');
  const depoisRecusas = retrato(amb);
  igual([depoisRecusas.versao, depoisRecusas.linhasImportacoesPlanilha, depoisRecusas.abasNova], [antes.versao, antes.linhasImportacoesPlanilha, 0], 'recusas não gravam nada');
  const r3 = amb.ctx.confirmarImportacao(par.pdfOcr, pr.dados.assinatura, { operacao: pr.dados.operacao, revisaoPdf: true });
  verdade(r3.ok, r3.erro);
  const disc = abaObjs(amb, 'Disciplinas').filter((x) => /^SIN/.test(x['Código']));
  const gravadosExt = disc.filter((x) => x['Extensão – EXT (h)'] !== '' && x['Extensão – EXT (h)'] !== null).length;
  const gravadosVersao = disc.filter((x) => x['Origem da versão'] === 'PDF').length;
  igual([gravadosExt, gravadosVersao], [551, 551], 'valores gravados');
  ev('[revisão 551 disciplinas] 1.102 valores; prévia traz a página 1 (100) de 12 + resumo (EXT 551: ' + extNaoZero + ' ≠ 0, ' + rv.resumo.extZero + ' = 0, páginas ' + rv.resumo.extZeroPaginas.join('–') + '; Versão 551)' +
    ' | caixa marcada só com a pág. 1: REVISAO_INCOMPLETA ("' + r1.erro.slice(0, 95) + '…") | pág. 2–11: REVISAO_INCOMPLETA (falta a 12) | sem a caixa: REVISAO_PENDENTE | nada gravado nas recusas' +
    ' | 12/12 páginas: 1.102 itens acessíveis, sem repetição, todos a gravar | gravou: 551 EXT + 551 versões');
});
teste('a lista de revisão é da pessoa e da operação: outro administrador não abre as páginas nem confirma com elas', () => {
  const { amb, par } = ambienteSintetico(120);
  const pr = amb.ctx.prepararImportacao(par.pdfOcr).dados;
  abrirPaginasRevisao(amb, pr);
  const outro = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'outra.admin@unidade.example' });
  outro.permitir('outra.admin@unidade.example', 'ADMINISTRADOR');
  const pg = outro.ctx.obterPaginaRevisao(pr.operacao, 2);
  // o reinício zera o cache no simulador: recria a lista pelo dono
  igual(pg.codigo, 'REVISAO_EXPIRADA');
  const amb2 = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb });
  const pr2 = amb2.ctx.prepararImportacao(par.pdfOcr).dados;
  abrirPaginasRevisao(amb2, pr2);
  amb2.permitir('outra.admin@unidade.example', 'ADMINISTRADOR');
  amb2.trocarUsuario('outra.admin@unidade.example');
  igual(amb2.ctx.obterPaginaRevisao(pr2.operacao, 2).codigo, 'REVISAO_EXPIRADA', 'página de outra pessoa');
  igual(amb2.ctx.confirmarImportacao(par.pdfOcr, pr2.assinatura, { operacao: pr2.operacao, revisaoPdf: true }).codigo, 'REVISAO_INCOMPLETA', 'confirmação por outra pessoa');
  amb2.trocarUsuario('dono@unidade.example');
  verdade(amb2.ctx.confirmarImportacao(par.pdfOcr, pr2.assinatura, { operacao: pr2.operacao, revisaoPdf: true }).ok, 'dono confirma');
});
teste('lista de revisão expirada (cache vazio após reinício): páginas → REVISAO_EXPIRADA; confirmação → REVISAO_INCOMPLETA; nada gravado', () => {
  const { amb, par } = ambienteSintetico(120);
  const pr = amb.ctx.prepararImportacao(par.pdfOcr).dados;
  abrirPaginasRevisao(amb, pr);
  const novo = reiniciar(amb);
  igual(novo.ctx.obterPaginaRevisao(pr.operacao, 2).codigo, 'REVISAO_EXPIRADA');
  const r = novo.ctx.confirmarImportacao(par.pdfOcr, pr.assinatura, { operacao: pr.operacao, revisaoPdf: true });
  igual(r.codigo, 'REVISAO_INCOMPLETA');
  igual(retrato(novo).versao, 1);
});
teste('capacidade: acima de MAX_ITENS_REVISAO a importação é BLOQUEADA com mensagem clara (nunca cortada)', () => {
  const { amb, par } = ambienteSintetico(551);
  amb.ctx.MAX_ITENS_REVISAO = 1000;
  const pr = amb.ctx.prepararImportacao(par.pdfOcr);
  verdade(pr.ok && !pr.dados.podeGravar, fmt(pr.dados && pr.dados.podeGravar));
  verdade(/1102 itens, acima da capacidade da revisão \(1000\)/.test(pr.dados.bloqueios.join(' ')), pr.dados.bloqueios.join(' | '));
  igual(pr.dados.revisao.total, 1102, 'o total continua informado');
  const r = amb.ctx.confirmarImportacao(par.pdfOcr, pr.dados.assinatura, { operacao: pr.dados.operacao, revisaoPdf: true });
  igual(r.codigo, 'BLOQUEADA');
  ev('[capacidade] com o limite reduzido a 1.000 no teste: prévia bloqueada ("' + pr.dados.bloqueios[0].slice(0, 110) + '…"); confirmação BLOQUEADA');
});
teste('volume máximo de um pacote válido (3.000 disciplinas → 6.000 valores): 60 páginas, todas acessíveis; maior página < 100 KB (limite do CacheService)', () => {
  const { amb, par } = ambienteSintetico(3000);
  const pr = amb.ctx.prepararImportacao(par.pdfOcr);
  verdade(pr.ok && pr.dados.podeGravar, pr.erro);
  igual([pr.dados.revisao.total, pr.dados.revisao.paginas], [6000, 60]);
  let maior = 0;
  for (const [k, v] of amb.cache) if (/^rev:.*:p\d+$/.test(k)) maior = Math.max(maior, Buffer.byteLength(v, 'utf8'));
  verdade(maior < 100 * 1024, 'maior página no cache: ' + maior + ' bytes');
  const todos = abrirPaginasRevisao(amb, pr.dados);
  igual(todos.length, 6000);
  const tamPrevia = Buffer.byteLength(JSON.stringify(pr.dados), 'utf8');
  const r = amb.ctx.confirmarImportacao(par.pdfOcr, pr.dados.assinatura, { operacao: pr.dados.operacao, revisaoPdf: true });
  verdade(r.ok, r.erro);
  ev('[volume máximo] 3.000 disciplinas → 6.000 valores em 60 páginas; maior página no cache: ' + maior + ' bytes (< 102.400); resposta da prévia: ' + tamPrevia + ' bytes; gravado');
});
teste('PDF real (OCR): 386 valores em 4 páginas; resumo EXT = 0 (159) nas últimas páginas; recusa com 3 de 4 páginas; grava com as 4', () => {
  const amb = novoAmbiente();
  importar(amb, pacoteCsv());
  const pr = amb.ctx.prepararImportacao(pacotePdf()).dados;
  const rv = pr.revisao;
  igual([rv.total, rv.paginas, rv.itens.length, rv.resumo.extZero], [386, 4, 100, 159]);
  abrirPaginasRevisao(amb, pr, 3);
  const r1 = amb.ctx.confirmarImportacao(pacotePdf(), pr.assinatura, { operacao: pr.operacao, revisaoPdf: true });
  igual(r1.codigo, 'REVISAO_INCOMPLETA');
  const todos = abrirPaginasRevisao(amb, pr);
  igual(todos.length, 386);
  const psc = todos.find((i) => i.tipo === 'EXT' && i.codigo === 'PSC1322');
  igual([psc.valor, psc.paginas.length > 0], [10, true]);
  const r2 = amb.ctx.confirmarImportacao(pacotePdf(), pr.assinatura, { operacao: pr.operacao, revisaoPdf: true });
  verdade(r2.ok, r2.erro);
  ev('[PDF real] 386 valores (EXT 183: 24 ≠ 0 e 159 = 0 nas páginas ' + rv.resumo.extZeroPaginas.join('–') + '; Versão 137; Informações 66) em 4 páginas | 3 de 4 abertas: REVISAO_INCOMPLETA | 4 de 4: gravado');
});

// =====================================================================
console.log('\n== 10. Leitura concorrente: manifesto que muda durante a leitura');
ev('\n=== 10. LEITURA CONCORRENTE ===');
/**
 * Substitui a função global "nome" do código (no contexto do simulador)
 * por uma versão que, nas primeiras "vezes" chamadas, executa "acao" ANTES
 * da original: é o ponto exato da intercalação. Devolve { chamadas }.
 */
function intercalar(amb, nome, acao, vezes) {
  const original = amb.ctx[nome];
  // Só contam (e só disparam) as chamadas da leitura observada, não as
  // feitas pelas próprias importações intercaladas.
  const c = { chamadas: 0, dentro: false, restaurar: () => { amb.ctx[nome] = original; } };
  amb.ctx[nome] = function () {
    if (!c.dentro) {
      c.chamadas++;
      if (c.chamadas <= vezes) { c.dentro = true; try { acao(c.chamadas); } finally { c.dentro = false; } }
    }
    return original.apply(this, arguments);
  };
  return c;
}
function importarComo(amb, email, pacote) {
  const quem = amb.opcoes.usuario;
  amb.trocarUsuario(email);
  try { return importar(amb, pacote).res; } finally { amb.trocarUsuario(quem); }
}
function csvComNome(nome) { const p = pacoteCsv(); p.disciplinas.find((d) => d.codigo === 'PSC1322').nome = nome; return p; }
function ambienteLeitorComBase() {
  const amb = novoAmbiente();
  verdade(importar(amb, pacoteCsv()).res.ok);
  amb.permitir('leitor@unidade.example', 'LEITOR');
  return amb;
}
teste('duas importações concluídas ENTRE a leitura do manifesto e lerBase_ (painel): lê de novo e devolve só a versão 3, sem BASE_INCONSISTENTE', () => {
  const amb = ambienteLeitorComBase();
  const ids = [];
  const h = intercalar(amb, 'lerBase_', () => {
    ids.push(importarComo(amb, 'dono@unidade.example', csvComNome('Nome v2')).dados.id);
    ids.push(importarComo(amb, 'dono@unidade.example', csvComNome('Nome v3')).dados.id);
  }, 1);
  amb.trocarUsuario('leitor@unidade.example');
  const d = amb.ctx.obterDadosPainel();
  h.restaurar();
  verdade(d.ok, d.codigo + ' ' + d.erro);
  igual([d.dados.base.versao, d.dados.base.importacao, d.dados.base.disciplinas.find((x) => x.codigo === 'PSC1322').nome, d.dados.importacoes[0].id, d.dados.importacoes.length], [3, ids[1], 'Nome v3', ids[1], 3], 'versão, dados e histórico da MESMA versão');
  igual(h.chamadas, 2, 'lerBase_ chamada 2 vezes (1 repetição)');
  ev('[painel × 2 importações entre manifesto e lerBase_] 1ª leitura (manifesto v1) encontrou as abas da v1 apagadas → manifesto mudou → releitura: versão 3, PSC1322 "Nome v3", histórico com 3 importações (a última = ' + ids[1] + '); lerBase_ chamada ' + h.chamadas + ' vezes');
});
teste('importações concluídas DEPOIS de lerBase_ e antes do histórico: não mistura dados da v1 com histórico da v3', () => {
  const amb = ambienteLeitorComBase();
  const h = intercalar(amb, 'lerUltimasLinhas_', () => {
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v2'));
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v3'));
  }, 1);
  amb.trocarUsuario('leitor@unidade.example');
  const d = amb.ctx.obterDadosPainel();
  h.restaurar();
  verdade(d.ok, d.erro);
  igual([d.dados.base.versao, d.dados.base.disciplinas.find((x) => x.codigo === 'PSC1322').nome, d.dados.importacoes.length, d.dados.importacoes[0].id], [3, 'Nome v3', 3, d.dados.base.importacao]);
});
teste('duas importações intercaladas DENTRO da conferência de colunas (entre o manifesto e a 1ª aba lida por ID): leitor não recebe "base não preparada"', () => {
  const amb = ambienteLeitorComBase();
  const h = intercalar(amb, 'abaPorId_', () => {
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v2'));
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v3'));
  }, 1);
  amb.trocarUsuario('leitor@unidade.example');
  const d = amb.ctx.obterDadosPainel();
  h.restaurar();
  verdade(d.ok, d.codigo + ' ' + d.erro);
  igual([d.dados.base.versao, d.dados.base.disciplinas.find((x) => x.codigo === 'PSC1322').nome], [3, 'Nome v3']);
});
teste('prévia (prepararImportacao) com duas importações intercaladas antes de lerBase_: prévia da versão 3, que grava', () => {
  const amb = novoAmbiente();
  verdade(importar(amb, pacoteCsv()).res.ok);
  const h = intercalar(amb, 'lerBase_', () => {
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v2'));
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v3'));
  }, 1);
  const pr = amb.ctx.prepararImportacao(csvComNome('Nome v4'));
  h.restaurar();
  verdade(pr.ok, pr.codigo + ' ' + pr.erro);
  igual([pr.dados.impressao.versaoBase, pr.dados.totais.alteradas], [3, 1]);
  const r = amb.ctx.confirmarImportacao(csvComNome('Nome v4'), pr.dados.assinatura, { operacao: pr.dados.operacao });
  verdade(r.ok, r.erro);
  ev('[prévia × 2 importações intercaladas] prévia calculada sobre a versão 3 (1 alteração) e gravada (versão 4)');
});
teste('importações sem parar durante a leitura: no máximo 3 tentativas, depois BASE_EM_ATUALIZACAO (sem espera indefinida, sem mistura)', () => {
  const amb = ambienteLeitorComBase();
  let n = 1;
  const h = intercalar(amb, 'lerBase_', () => {
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v' + (++n)));
    importarComo(amb, 'dono@unidade.example', csvComNome('Nome v' + (++n)));
  }, 99);
  amb.trocarUsuario('leitor@unidade.example');
  const d = amb.ctx.obterDadosPainel();
  h.restaurar();
  igual([d.ok, d.codigo, h.chamadas], [false, 'BASE_EM_ATUALIZACAO', 3]);
  ev('[importações contínuas] 3 tentativas, depois BASE_EM_ATUALIZACAO ("' + d.erro + '")');
});
teste('aba em uso apagada DE VERDADE (manifesto não muda): BASE_INCONSISTENTE na 1ª tentativa, sem repetir', () => {
  const amb = ambienteLeitorComBase();
  const m = manifesto(amb);
  amb.estrutura().deleteSheet(amb.estrutura().getSheets().find((x) => x.getSheetId() === m.abas['Disciplinas']));
  const h = intercalar(amb, 'lerBase_', () => {}, 0);
  amb.trocarUsuario('leitor@unidade.example');
  const d = amb.ctx.obterDadosPainel();
  h.restaurar();
  igual([d.codigo, h.chamadas], ['BASE_INCONSISTENTE', 1]);
  amb.trocarUsuario('dono@unidade.example');
  igual(amb.ctx.prepararImportacao(pacoteCsv()).codigo, 'BASE_INCONSISTENTE');
  ev('[aba apagada de verdade] painel e prévia: BASE_INCONSISTENTE; lerBase_ chamada 1 vez (sem repetição)');
});

// ---------------------------------------------------------------------
fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
ev('\n=== RESULTADO ===\nExecutados: ' + (ok + falhas) + ' (' + ok + ' ok, ' + falhas + ' falha(s)); pulados: ' + pulados.length + (pulados.length ? '\n' + pulados.map((p) => 'Pulado: ' + p).join('\n') : ''));
fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: ${pulados.length}  — evidências em ${path.relative(process.cwd(), ARQ_EVIDENCIAS)}`);
pulados.forEach((p) => console.log('Pulado (não conta como aprovado): ' + p));
if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }

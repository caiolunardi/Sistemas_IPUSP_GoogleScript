// Etapa 8 (1.8.12) na interface real (Chromium) com o servidor real no
// simulador: "Enviar Grade para Preenchimento" confere a PRÉVIA DO ENVIO lida
// do servidor e o pedido leva a identificação dessa fotografia.
// Respostas controladas pela opção "portao" de ambiente_navegador.js
// (segurar, soltar fora de ordem, responder com erro) e as respostas da
// prévia registradas no servidor (o teste confere que a identificação do
// pedido é a da prévia MOSTRADA, sem leitura nova no clique final).
// "Outra aba" = alteração feita direto no servidor simulado, que a página
// não vê. Estrutura curricular SINTÉTICA (curso 47012).
// (1.8.13) Correção complementar (casos 18e e 19*): a validade da confirmação
// depende do CONTEÚDO DO ENVIO calculado com os dados da página, não da
// referência de P.estado.idx — mudanças feitas pela PÁGINA com as funções reais
// (executarNoServidor/chamarServidor → aplicarPreparacao) ou reaplicação de
// uma cópia da preparação; e a nota da recuperação no envio recusado distingue
// gravação concluída de painel atualizado (leituraFalhou, com falha injetada SÓ
// na leitura de anexarRecuperados_). Em 19k a resposta do envio é FORJADA pelo
// portão (contrato do callback com os dois indicadores).
// Uso: node testar_navegador_etapa8.js
'use strict';
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const ADMIN = 'dono@unidade.example';
const P262 = '470120000262';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA';
const NOMES = { PST1001: 'Disciplina teste', PST1003: 'Eletiva teste', PSA1005: 'Obrigatória PSA', PST1007: 'Só do 2º semestre' };
function pacoteCurso(vinc) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: '0', habilitacaoNome: 'Psicólogo', ano: 2026, semestre: 2, situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: NOMES[d], versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 })),
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
const E = (k) => ({ origem: 'estrutura', chave: k });
function celulasPST(amb) {
  const s = amb.grade().getSheetByName('PST');
  const out = [];
  for (let r = 4; r < 20; r++) { const c = s.getRange(r, 3).getValue(); if (!c) break; out.push([c, s.getRange(r, 4).getValue(), s.getRange(r, 5).getValue(), s.getRange(r, 9).getValue(), s.getRange(r, 10).getValue()]); }
  return out;
}

/** (1.8.13) Linhas do servidor (previaEnvioGrade real, fora da página) na forma de projecaoDoEnvio. */
function orig2(c, sem) {
  const r = c.previaOriginal({ semestre: sem, ano: 2027 });
  const out = {};
  Object.keys(r.dados.grupos).forEach((g) => { out[g] = r.dados.grupos[g].map((l) => [l.codigo, l.nome, l.tipo, l.semestreIdeal, l.creditosAula]); });
  return out;
}
/** (1.8.13) Falha SÓ na leitura da preparação feita para anexar o que uma recuperação gravou (anexarRecuperados_). */
function falharLeituraAoAnexar(amb) {
  const anexar = amb.ctx.anexarRecuperados_, ler = amb.ctx.preparacaoParaCliente_;
  let dentro = false, falhas = 0;
  amb.ctx.anexarRecuperados_ = function () { dentro = true; try { return anexar.apply(this, arguments); } finally { dentro = false; } };
  amb.ctx.preparacaoParaCliente_ = function () { if (dentro) { falhas++; throw new Error('falha simulada na leitura da preparação'); } return ler.apply(this, arguments); };
  return { falhas: () => falhas, restaurar: () => { amb.ctx.anexarRecuperados_ = anexar; amb.ctx.preparacaoParaCliente_ = ler; } };
}
/** (1.8.13) Tudo o que um envio mudaria fora da estrutura: nome e células da grade, índice, pastas. */
function fotoEnvio(amb) {
  const g = amb.grade();
  return JSON.stringify({ nome: g.getName(), abas: g.getSheets().map((s) => [s.getName(), [...s.cells.entries()]]), indice: [...amb.indiceGrades().getSheets()[0].cells.entries()], pastas: [...amb.estado.pastas.entries()].map(([k, v]) => [k, v.arquivos.length]) });
}
const curta = (s) => (s ? String(s).slice(0, 12) + '…' : s);
/** (1.8.13) A confirmação está válida e o clique envia a identificação ORIGINAL mostrada (sem prévia nova), gravando o conteúdo. */
async function enviarValido(c, rotulo, ano) {
  const mostrada = c.previas[c.previas.length - 1].assinatura;
  const atual = c.assinaturaServidor(ano);
  const nPrev = c.chamadas('previaEnvioGrade').length;
  const m = await c.modal();
  const n = await c.respostas();
  await c.pagina.click('[data-confirmar-envio]', { force: true }).catch(() => {});
  await c.pagina.waitForFunction(() => /enviada para preenchimento|não foi enviada/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 5000 }).catch(() => {});
  if (c.chamadas('enviarGradeParaPreenchimento').length) await c.esperarResposta(n + 1).catch(() => {});
  const envios = c.chamadas('enviarGradeParaPreenchimento');
  const texto = (await c.modal()).texto;
  console.log('     fatos [' + rotulo + ']: ' + JSON.stringify({ janela: m.invalido ? 'inválida' : 'válida', botao: m.confirmar, assinaturaMostrada: curta(mostrada), assinaturaAtualNoServidor: curta(atual), iguais: mostrada === atual,
    pedidosDeEnvio: envios.map((p) => curta(p.args[0].assinatura)), previasNoClique: c.chamadas('previaEnvioGrade').length - nPrev, gravadoPST: celulasPST(c.amb), arquivo: c.amb.grade().getName(), tela: texto.slice(0, 90) }));
  igual(atual, mostrada, 'conteúdo de envio igual: a identificação do servidor não mudou');
  igual([m.confirmar, m.invalido], ['habilitado', false], 'confirmação válida');
  igual(envios.length, 1, 'um pedido de envio');
  igual(envios[0].args[0].assinatura, mostrada, 'o pedido leva a identificação ORIGINAL mostrada');
  igual(c.chamadas('previaEnvioGrade').length, nPrev, 'nenhuma prévia nova no clique');
  verdade(/enviada para preenchimento/.test(texto), 'envio concluído: ' + texto.slice(0, 120));
}
/** (1.8.13) Salvamento individual pendente produzido pelos mecanismos reais (falha no setValue da observação). */
function salvamentoPendente(amb, chave, campos, observacoes) {
  amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), 99);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave, campos, oferta: null, observacoes });
  amb.limparFalhas();
  igual(r.codigo, 'SALVAMENTO_PENDENTE', 'pendência produzida');
}
/** (1.8.13) Ação em lote pendente (excluir PST1003 + PST2001 para outros cursos) pelos mecanismos reais. */
function lotePendente(amb) {
  amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Disciplinas para outros cursos', 99);
  const r = amb.ctx.excluirDisciplinas([E('PST1003'), { origem: 'outros', chave: amb.chaveOutros }], true);
  amb.limparFalhas();
  igual(r.codigo, 'LOTE_PENDENTE', 'pendência de lote produzida');
}

let nav;
async function montar(opcoes) {
  opcoes = opcoes || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  pedir(amb.ctx.obterDadosPainel());
  // (1.8.13) opcoes.extra: PST1007 na grade, mas só do 2º semestre (fora da grade de 2027/1), e PST2001 para outros cursos
  importar(amb, pacoteCurso([[P262, 'PST1001', OB, 1], [P262, 'PST1003', EL, 1], [P262, 'PSA1005', OB, 1]].concat(opcoes.extra ? [[P262, 'PST1007', OB, 2]] : [])));
  pedir(amb.ctx.adicionarAGrade([E('PST1001'), E('PST1003'), E('PSA1005')].concat(opcoes.extra ? [E('PST1007')] : [])));
  if (opcoes.extra) amb.chaveOutros = pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Outra 2001', oferecimento: '1', creditosAula: '2' } })).chave;
  amb.criarPlanilhaGrade();
  // respostas reais da prévia, para conferir de onde vem a identificação do pedido
  const previas = [];
  const orig = amb.ctx.previaEnvioGrade;
  amb.ctx.previaEnvioGrade = function () { const r = orig.apply(this, arguments); previas.push(r && r.dados ? { assinatura: r.dados.assinatura, ano: r.dados.ano, semestre: r.dados.semestre } : { erro: r && r.codigo }); return r; };
  // (1.8.13) respostas reais do envio (resumo dos indicadores de recuperação), para a evidência
  const respostasEnvio = [];
  const origEnvio = amb.ctx.enviarGradeParaPreenchimento;
  const resumoRec = (x) => x ? { codigo: x.codigo || null, nome: x.nome || null, total: x.total || null, leituraFalhou: !!x.leituraFalhou, comPreparacao: !!x.preparacao } : null;
  amb.ctx.enviarGradeParaPreenchimento = function () { const r = origEnvio.apply(this, arguments); const d = (r && r.dados) || {}; respostasEnvio.push({ ok: r.ok, codigo: r.codigo || null, recuperado: resumoRec(d.recuperado), recuperadoLote: resumoRec(d.recuperadoLote) }); return r; };
  const fila = [], pedidos = [];
  const segurar = new Set(opcoes.segurar || []);
  const portao = (nome, args) => { pedidos.push({ nome, args }); return segurar.has(nome) ? new Promise((liberar) => fila.push({ nome, args, liberar })) : null; };
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0, portao });
  const c = { amb, pagina, errosPagina, fila, pedidos, previas, segurar, respostasEnvio, dialogos: [] };
  pagina.on('dialog', (d) => { c.dialogos.push(d.message()); d.accept(); });
  await esperarCarregado(pagina);
  c.respostas = () => pagina.evaluate(() => window.__gasRespondidas || 0);
  c.esperarResposta = async (n) => { await pagina.waitForFunction((k) => (window.__gasRespondidas || 0) >= k, n, { timeout: 15000 }); await pagina.evaluate(() => new Promise((r) => setTimeout(r, 30))); };
  c.esperarFila = async (n) => { const t0 = Date.now(); while (c.fila.length < n) { if (Date.now() - t0 > 10000) throw new Error('chamada não chegou'); await new Promise((r) => setTimeout(r, 20)); } };
  c.chamadas = (nome) => c.pedidos.filter((p) => p.nome === nome);
  c.irPrevia = async (ano) => {
    await pagina.click('#etapa-4');
    await pagina.selectOption('#gradeSemestre', '1');
    await pagina.selectOption('#gradeAno', String(ano || 2027));
  };
  // (1.8.13) identificação do conteúdo ATUAL, lida direto no servidor simulado (não passa pela página nem entra em c.previas)
  c.previaOriginal = orig;
  c.assinaturaServidor = (ano) => { const r = orig({ semestre: '1', ano: ano || 2027 }); return r && r.dados ? r.dados.assinatura : '(erro ' + (r && r.codigo) + ')'; };
  // (1.8.13) mudanças aplicadas pela PÁGINA, com as funções reais do painel (transporte, chamarServidor, aplicarPreparacao)
  c.reaplicarCopia = (mut) => pagina.evaluate((m) => {
    const p = JSON.parse(JSON.stringify(Painel.estado.dados.preparacao));
    if (m) (new Function('p', m))(p);
    const antes = Painel.estado.idx;
    Painel.interno.aplicarPreparacao(p);
    return Painel.estado.idx !== antes;   // outra referência de idx
  }, mut || null);
  c.salvarPelaPagina = (pedido) => pagina.evaluate((ped) => Painel.interno.executarNoServidor('salvarDisciplina', [ped], null).then(
    (r) => { if (r.preparacao) Painel.interno.aplicarPreparacao(r.preparacao, r.observacao); return 'ok'; }, (e) => 'erro ' + e.codigo), pedido);
  c.removerPelaPagina = (itens) => pagina.evaluate((its) => Painel.interno.executarNoServidor('removerDaGrade', [its], null).then(
    (r) => { Painel.interno.aplicarPreparacao(r.preparacao); return 'ok'; }, (e) => 'erro ' + e.codigo), itens);
  c.nomeLocal = (id) => pagina.evaluate((k) => { const d = Painel.estado.idx.itens[k]; return d ? d.nome : null; }, id);
  c.avisoCentral = () => pagina.evaluate(() => { const el = document.getElementById('salvamentoPendente'); return el && !el.hidden ? el.textContent.replace(/\s+/g, ' ').trim() : ''; });
  c.abrirEnvio = async (esperarPronta) => {
    const n = await c.respostas();
    await pagina.click('#enviarGradePreenchimento');
    await pagina.waitForSelector('#modalEnvioGrade:not([hidden])');
    if (esperarPronta !== false) await pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
  };
  c.modal = () => pagina.evaluate(() => {
    const $ = (id) => document.getElementById(id);
    const b = document.querySelector('[data-confirmar-envio]');
    return {
      aberto: !$('modalEnvioGrade').hidden, subtitulo: $('envioGradeSubtitulo').textContent,
      texto: $('envioGradeCorpo').textContent.replace(/\s+/g, ' '),
      linhas: Array.from(document.querySelectorAll('[data-previa-envio] tbody tr')).map((tr) => Array.from(tr.cells).map((td) => td.textContent.trim())),
      confirmar: b ? (b.disabled ? 'desabilitado' : 'habilitado') : 'ausente',
      reconferir: !!document.querySelector('[data-reconferir-envio]'), invalido: !!document.querySelector('[data-envio-invalido]')
    };
  });
  return c;
}
async function fim(c) { igual(c.errosPagina, [], 'erros de JavaScript na página'); await c.pagina.context().close(); }

(async () => {
  nav = await abrirNavegador();
  console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
  console.log('\n== 18. Confirmação do envio vinculada ao conteúdo da prévia');

  await teste('18a. a confirmação mostra as linhas que serão gravadas (do servidor) e o pedido leva a identificação DESSA prévia, sem nova leitura no clique; envio grava o conferido', async () => {
    const c = await montar();
    await c.irPrevia();
    await c.abrirEnvio();
    const m = await c.modal();
    igual(m.linhas, [['PSA', 'PSA1005', 'Obrigatória PSA', 'Obrigatória', '1', '2'], ['PST', 'PST1001', 'Disciplina teste', 'Obrigatória', '1', '2'], ['PST', 'PST1003', 'Eletiva teste', 'Eletiva', '1', '2']], 'linhas na confirmação');
    verdade(!/[0-9a-f]{64}/.test(m.texto), 'nenhum hash na tela');
    const nPrevias = c.chamadas('previaEnvioGrade').length;
    const n = await c.respostas();
    await c.pagina.click('[data-confirmar-envio]');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForFunction(() => /enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent));
    const ped = c.chamadas('enviarGradeParaPreenchimento')[0].args[0];
    igual([c.chamadas('previaEnvioGrade').length, ped.assinatura, ped.semestre, ped.ano], [nPrevias, c.previas[c.previas.length - 1].assinatura, '1', 2027], 'identificação e alvo da prévia mostrada; nenhuma prévia nova no clique');
    igual(celulasPST(c.amb), [['PST1001', 'Disciplina teste', 'Obrigatória', 1, 2], ['PST1003', 'Eletiva teste', 'Eletiva', 1, 2]]);
    await fim(c);
  });

  await teste('18b. duas abas: A confere; B muda o nome (mesmas contagens); A confirma → "A grade não foi enviada" + "Conferir de novo", nada gravado; nova conferência mostra o nome novo e A envia o conteúdo novo', async () => {
    const c = await montar();
    await c.irPrevia();
    await c.abrirEnvio();
    pedir(c.amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome posterior' }, oferta: null }));   // "aba B"
    const nomeAntes = c.amb.grade().getName();
    await c.pagina.click('[data-confirmar-envio]');
    await c.pagina.waitForFunction(() => !document.getElementById('modalEnvioGrade').hidden && /não foi enviada|enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 15000 });
    let m = await c.modal();
    // fatos observados, antes das conferências (no log mesmo quando falha)
    console.log('     fatos: ' + JSON.stringify({ tela: m.texto.slice(0, 160), pedido: c.chamadas('enviarGradeParaPreenchimento').map((p) => Object.assign({}, p.args[0], { assinatura: p.args[0].assinatura ? p.args[0].assinatura.slice(0, 12) + '…' : '(nenhuma)' })), gravadoPST: celulasPST(c.amb), arquivo: c.amb.grade().getName(), copias: c.amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length }));
    await c.pagina.waitForSelector('#modalEnvioGrade:not([hidden]) [data-reconferir-envio]', { timeout: 3000 });
    verdade(/A grade não foi enviada/.test(m.texto) && /Confira a prévia de novo/.test(m.texto) && !/Nada foi alterado/.test(m.texto), m.texto);
    igual([c.amb.grade().getName(), c.amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length], [nomeAntes, 0], 'nenhuma cópia, arquivo não renomeado');
    let n = await c.respostas();
    await c.pagina.click('[data-reconferir-envio]');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
    m = await c.modal();
    verdade(m.linhas.some((l) => l[1] === 'PST1001' && l[2] === 'Nome posterior'), 'nova conferência mostra o nome novo: ' + JSON.stringify(m.linhas));
    n = await c.respostas();
    await c.pagina.click('[data-confirmar-envio]');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForFunction(() => /enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent));
    const envios = c.chamadas('enviarGradeParaPreenchimento');
    igual(envios[1].args[0].assinatura, c.previas[c.previas.length - 1].assinatura, 'segunda tentativa com a identificação da nova conferência');
    verdade(envios[0].args[0].assinatura !== envios[1].args[0].assinatura, 'a primeira levava a identificação antiga');
    igual(celulasPST(c.amb)[0], ['PST1001', 'Nome posterior', 'Obrigatória', 1, 2]);
    await fim(c);
  });

  await teste('18c. respostas fora de ordem: abrir (prévia segura), fechar, mudar o ano, reabrir; a resposta antiga não habilita nada; a nova habilita com o ano novo', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia(2027);
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    await c.pagina.click('#envioGradeRodape [data-fechar-envio]');
    await c.pagina.waitForSelector('#modalEnvioGrade', { state: 'hidden' });
    await c.pagina.selectOption('#gradeAno', '2028');
    await c.abrirEnvio(false);
    await c.esperarFila(2);
    let n = await c.respostas();
    c.fila[0].liberar(null);   // resposta da PRIMEIRA abertura (2027) chega depois
    await c.esperarResposta(n + 1);
    let m = await c.modal();
    igual([m.confirmar, m.linhas.length, /2028\/1/.test(m.subtitulo)], ['desabilitado', 0, true], 'resposta antiga ignorada');
    n = await c.respostas();
    c.fila[1].liberar(null);
    await c.esperarResposta(n + 1);
    m = await c.modal();
    igual([m.confirmar, m.linhas.length], ['habilitado', 3], 'resposta vigente');
    c.segurar.clear();
    n = await c.respostas();
    await c.pagina.click('[data-confirmar-envio]');
    await c.esperarResposta(n + 1);
    const ped = c.chamadas('enviarGradeParaPreenchimento')[0].args[0];
    igual([ped.ano, ped.assinatura], [2028, c.previas.filter((p) => p.ano === 2028)[0].assinatura], 'pedido do alvo e da prévia vigentes');
    igual(c.amb.grade().getName(), 'Grade Horária - 1º semestre de 2028');
    await fim(c);
  });

  await teste('18d. falha ao obter a prévia: mensagem, "Fazer a cópia e enviar" desabilitado, "Tentar de novo" funciona', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia();
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    let n = await c.respostas();
    c.fila[0].liberar({ resposta: { ok: false, codigo: 'INESPERADO', erro: 'Falha simulada na leitura.' } });
    await c.esperarResposta(n + 1);
    let m = await c.modal();
    verdade(/Não foi possível conferir/.test(m.texto) && /Nada foi enviado/.test(m.texto), m.texto);
    igual([m.confirmar, m.reconferir], ['desabilitado', true]);
    await c.pagina.click('[data-confirmar-envio]', { force: true }).catch(() => {});
    igual(c.chamadas('enviarGradeParaPreenchimento').length, 0, 'nenhum envio');
    c.segurar.clear();
    n = await c.respostas();
    await c.pagina.click('[data-reconferir-envio]');
    await c.esperarResposta(n + 1);
    m = await c.modal();
    igual(m.confirmar, 'habilitado');
    await fim(c);
  });

  await teste('18e. dados da página com a confirmação aberta (durante a leitura e depois): a MESMA preparação reaplicada (outra referência de idx) mantém a confirmação; uma mudança REAL de nome, salva e aplicada pela página, tira a validade ("Conferir de novo") e o clique não envia', async () => {
    // (1.8.13) Na 1.8.12 este caso esperava a invalidação pela simples reaplicação (referência de idx);
    // agora a reaplicação idêntica é o controle POSITIVO e a mudança real de um campo enviado, o negativo.
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia();
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    verdade(await c.reaplicarCopia(), 'reaplicação gera outra referência de idx');
    let n = await c.respostas();
    c.fila[0].liberar(null);
    await c.esperarResposta(n + 1);
    let m = await c.modal();
    console.log('     fatos (reaplicação idêntica durante a leitura): ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido }));
    igual([m.confirmar, m.invalido], ['habilitado', false], 'reaplicação idêntica durante a leitura não invalida');
    verdade(await c.reaplicarCopia(), 'outra referência');
    m = await c.modal();
    console.log('     fatos (reaplicação idêntica depois da conferência): ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido }));
    igual([m.confirmar, m.invalido], ['habilitado', false], 'reaplicação idêntica depois da conferência não invalida');
    // mudança REAL de um campo enviado, salva e aplicada pela página
    igual(await c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome mudado na página' }, oferta: null }), 'ok');
    m = await c.modal();
    console.log('     fatos (nome salvo pela página depois da conferência): ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido, reconferir: m.reconferir }));
    igual([m.confirmar, m.invalido, m.reconferir], ['desabilitado', true, true], 'mudança real depois da conferência');
    await c.pagina.click('[data-confirmar-envio]', { force: true }).catch(() => {});
    await c.pagina.evaluate(() => new Promise((r) => setTimeout(r, 100)));
    igual(c.chamadas('enviarGradeParaPreenchimento').length, 0, 'nada enviado');
    // durante a leitura: mudança real
    await c.pagina.click('[data-reconferir-envio]');
    await c.esperarFila(2);
    igual(await c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Outro nome na página' }, oferta: null }), 'ok');
    n = await c.respostas();
    c.fila[1].liberar(null);
    await c.esperarResposta(n + 1);
    m = await c.modal();
    console.log('     fatos (nome salvo pela página durante a leitura): ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido, reconferir: m.reconferir }));
    igual([m.confirmar, m.invalido, m.reconferir], ['desabilitado', true, true], 'mudança real durante a leitura');
    igual(c.chamadas('enviarGradeParaPreenchimento').length, 0, 'nada enviado');
    await fim(c);
  });

  await teste('18f. duplo clique em "Fazer a cópia e enviar": um único envio', async () => {
    const c = await montar();
    await c.irPrevia();
    await c.abrirEnvio();
    await c.pagina.evaluate(() => { const b = document.querySelector('[data-confirmar-envio]'); b.click(); b.click(); });
    await c.pagina.waitForFunction(() => /enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 15000 });
    igual(c.chamadas('enviarGradeParaPreenchimento').length, 1);
    await fim(c);
  });

  await teste('18g. salvamento pendente concluído no pedido de envio: recusa sem negar a recuperação ("…continua gravada…"), "Conferir de novo"', async () => {
    const c = await montar();
    await c.irPrevia();
    await c.abrirEnvio();
    c.amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), 99);
    igual(c.amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome recuperado' }, oferta: null, observacoes: 'x' }).codigo, 'SALVAMENTO_PENDENTE');
    c.amb.limparFalhas();
    const n = await c.respostas();
    await c.pagina.click('[data-confirmar-envio]');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForSelector('#modalEnvioGrade:not([hidden]) [data-reconferir-envio]');
    const m = await c.modal();
    verdade(/A grade não foi enviada/.test(m.texto) && /concluída uma gravação que estava pendente \(PST1001\)/.test(m.texto) && /continua gravada/.test(m.texto), m.texto);
    igual(c.amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length, 0);
    await fim(c);
  });

  // ===================================================================
  console.log('\n== 19. Correção complementar (1.8.13): validade pelo conteúdo do envio e nota da recuperação');

  // ---- 4.1 conteúdo equivalente continua válido (durante a leitura E depois da conferência)
  await teste('19a. [4.1 A] a mesma preparação reaplicada com outra referência (durante a leitura e duas vezes depois): confirmação válida; o clique envia a identificação ORIGINAL, sem prévia nova, e o servidor grava o conferido', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia();
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    verdade(await c.reaplicarCopia(), 'outra referência de idx durante a leitura');
    const n = await c.respostas();
    c.segurar.clear();
    c.fila[0].liberar(null);
    await c.esperarResposta(n + 1);
    verdade(await c.reaplicarCopia(), 'outra referência'); await c.reaplicarCopia();
    await enviarValido(c, '19a');
    igual(celulasPST(c.amb), [['PST1001', 'Disciplina teste', 'Obrigatória', 1, 2], ['PST1003', 'Eletiva teste', 'Eletiva', 1, 2]]);
    await fim(c);
  });

  await teste('19b. [4.1 B] salvamento REAL só de CH de PST1001 (da grade), pela página e com a resposta aplicada no painel, durante a leitura e depois: confirmação válida; envio com a identificação original; CH gravada', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia();
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    igual(await c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: { ch: '90' }, oferta: null }), 'ok', 'CH 90 durante a leitura');
    const n = await c.respostas();
    c.segurar.clear();
    c.fila[0].liberar(null);
    await c.esperarResposta(n + 1);
    igual(await c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: { ch: '95' }, oferta: null }), 'ok', 'CH 95 depois da conferência');
    await enviarValido(c, '19b');
    const aj = pedir(c.amb.ctx.obterDadosPainel()).preparacao.ajustes.find((a) => a.chave === 'PST1001');
    console.log('     persistido PST1001: ' + JSON.stringify(aj && aj.campos));
    igual(String(aj.campos.ch), '95', 'CH gravada');
    igual(celulasPST(c.amb)[0], ['PST1001', 'Disciplina teste', 'Obrigatória', 1, 2]);
    await fim(c);
  });

  await teste('19c. [4.1 C] mudanças em disciplinas FORA da grade de 2027/1 (PST1007 só do 2º semestre; PST2001 para outros cursos, fora da grade), pela página, durante a leitura e depois: confirmação válida; envio com a identificação original', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'], extra: true });
    await c.irPrevia();
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    igual(await c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1007', campos: { nome: 'Só do 2º, renomeada' }, oferta: null }), 'ok');
    const n = await c.respostas();
    c.segurar.clear();
    c.fila[0].liberar(null);
    await c.esperarResposta(n + 1);
    igual(await c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1007', campos: { creditosAula: '6' }, oferta: null }), 'ok');
    igual(await c.salvarPelaPagina({ origem: 'outros', chave: c.amb.chaveOutros, campos: { codigo: 'PST2001', nome: 'Outra 2001 renomeada', oferecimento: '1', creditosAula: '2' }, oferta: null }), 'ok');
    await enviarValido(c, '19c');
    await fim(c);
  });

  await teste('19d. [4.1 D] só metadados (alteradoEm/alteradoPor de todas as linhas, como depois da gravação por outra pessoa) reaplicados durante a leitura e depois, e controles da página (aba e caixa da prévia, filtro da lista): confirmação válida; envio com a identificação original', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia();
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    await c.reaplicarCopia("p.ajustes.forEach(function (a) { a.alteradoEm = '2027-01-01T10:00:00.000Z'; a.alteradoPor = 'outra.pessoa@unidade.example'; });");
    const n = await c.respostas();
    c.segurar.clear();
    c.fila[0].liberar(null);
    await c.esperarResposta(n + 1);
    await c.reaplicarCopia("p.ajustes.forEach(function (a) { a.alteradoEm = '2027-02-02T11:00:00.000Z'; a.alteradoPor = 'mais.uma@unidade.example'; });");
    const controles = await c.pagina.evaluate(() => {
      const feitos = [];
      const aba = document.querySelector('[data-previa-aba="PST"]'); if (aba) { aba.click(); feitos.push('aba PST'); }
      const cx = document.querySelector('.caixaPrevia'); if (cx) { cx.click(); feitos.push('caixa ' + cx.getAttribute('data-previa-sel')); }
      const f = document.getElementById('gFiltroTipo');
      if (f && f.options.length > 1) { f.value = f.options[1].value; f.dispatchEvent(new Event('change', { bubbles: true })); feitos.push('filtro tipo=' + f.value); }
      return feitos;
    });
    console.log('     controles acionados: ' + JSON.stringify(controles));
    verdade(controles.length >= 2, 'controles acionados');
    await enviarValido(c, '19d');
    await fim(c);
  });

  // ---- 4.2 mudanças relevantes continuam exigindo nova conferência
  const RELEVANTES = [
    ['nome', (c) => c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome novo' }, oferta: null })],
    ['observações', (c) => c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: null, observacoes: 'Observação nova' })],
    ['créditos-aula', (c) => c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: { creditosAula: '4' }, oferta: null })],
    ['tipo da oferta principal (obrigatória → eletiva)', (c) => c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P262, tipo: EL, periodo: 1 }] })],
    ['composição (PST1003 removida da grade)', (c) => c.removerPelaPagina([{ origem: 'estrutura', chave: 'PST1003' }])]
  ];
  for (const [rot, mudar] of RELEVANTES) {
    await teste('19e. [4.2] ' + rot + ', salvo e aplicado pela página depois da conferência: a confirmação perde a validade e o clique não envia; "Conferir de novo" mostra o novo conteúdo e envia a NOVA identificação', async () => {
      const c = await montar();
      await c.irPrevia();
      await c.abrirEnvio();
      const sig0 = c.previas[c.previas.length - 1].assinatura;
      igual(await mudar(c), 'ok');
      const m = await c.modal();
      await c.pagina.click('[data-confirmar-envio]', { force: true }).catch(() => {});
      await c.pagina.evaluate(() => new Promise((r) => setTimeout(r, 100)));
      const atual = c.assinaturaServidor();
      console.log('     fatos [19e ' + rot + ']: ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido, reconferir: m.reconferir, assinaturaConferida: curta(sig0), assinaturaAtual: curta(atual), pedidosDeEnvio: c.chamadas('enviarGradeParaPreenchimento').length }));
      verdade(atual !== sig0, 'o conteúdo do envio mudou de fato');
      igual([m.confirmar, m.invalido, m.reconferir], ['desabilitado', true, true], 'confirmação invalidada');
      igual(c.chamadas('enviarGradeParaPreenchimento').length, 0, 'nada enviado');
      const n = await c.respostas();
      await c.pagina.click('[data-reconferir-envio]');
      await c.esperarResposta(n + 1);
      await c.pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
      await enviarValido(c, '19e ' + rot);
      await fim(c);
    });
  }

  await teste('19f. [4.2] alvo trocado com a janela aberta (ano 2027 → 2028 pelo seletor): confirmação invalidada, nada enviado; "Conferir de novo" confere 2028/1 e envia a identificação dele', async () => {
    const c = await montar();
    await c.irPrevia();
    await c.abrirEnvio();
    await c.pagina.evaluate(() => { const s = document.getElementById('gradeAno'); s.value = '2028'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    const m = await c.modal();
    await c.pagina.click('[data-confirmar-envio]', { force: true }).catch(() => {});
    await c.pagina.evaluate(() => new Promise((r) => setTimeout(r, 100)));
    console.log('     fatos [19f]: ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido, pedidosDeEnvio: c.chamadas('enviarGradeParaPreenchimento').length }));
    igual([m.confirmar, m.invalido], ['desabilitado', true]);
    igual(c.chamadas('enviarGradeParaPreenchimento').length, 0);
    const n = await c.respostas();
    await c.pagina.click('[data-reconferir-envio]');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
    await enviarValido(c, '19f', 2028);
    igual(c.chamadas('enviarGradeParaPreenchimento')[0].args[0].ano, 2028);
    await fim(c);
  });

  // ---- recuperação devolvida pela própria prévia
  await teste('19g. recuperação devolvida pela PRÓPRIA prévia (salvamento pendente do nome de PST1001 concluído no pedido de prévia): aplicada no painel, a confirmação fica válida, mostra o nome recuperado e envia', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia();
    salvamentoPendente(c.amb, 'PST1001', { nome: 'Nome recuperado na prévia' }, 'Obs da prévia');
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    const n = await c.respostas();
    c.segurar.clear();
    c.fila[0].liberar(null);
    await c.esperarResposta(n + 1);
    const m = await c.modal();
    const local = await c.nomeLocal('PST1001');
    console.log('     fatos [19g]: ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido, linhaPST1001: m.linhas.find((l) => l[1] === 'PST1001'), nomeNaPagina: local }));
    igual(local, 'Nome recuperado na prévia', 'recuperação aplicada no painel');
    verdade(m.linhas.some((l) => l[1] === 'PST1001' && l[2] === 'Nome recuperado na prévia – Obs da prévia'), 'a prévia mostra o conteúdo recuperado');
    await enviarValido(c, '19g');
    await fim(c);
  });

  await teste('19h. recuperação da própria prévia NÃO dispensa a conferência: uma mudança independente e relevante (nome de PST1003, salvo pela página durante a leitura) + a recuperação trazida pela prévia → confirmação invalidada', async () => {
    const c = await montar({ segurar: ['previaEnvioGrade'] });
    await c.irPrevia();
    await c.abrirEnvio(false);
    await c.esperarFila(1);
    igual(await c.salvarPelaPagina({ origem: 'estrutura', chave: 'PST1003', campos: { nome: 'Eletiva renomeada na página' }, oferta: null }), 'ok');
    salvamentoPendente(c.amb, 'PST1001', { nome: 'Nome recuperado na prévia' }, 'Obs da prévia');
    const n = await c.respostas();
    c.segurar.clear();
    c.fila[0].liberar(null);
    await c.esperarResposta(n + 1);
    const m = await c.modal();
    console.log('     fatos [19h]: ' + JSON.stringify({ botao: m.confirmar, invalido: m.invalido, nomePST1001NaPagina: await c.nomeLocal('PST1001'), nomePST1003NaPagina: await c.nomeLocal('PST1003') }));
    igual(await c.nomeLocal('PST1001'), 'Nome recuperado na prévia', 'a recuperação veio com a prévia');
    igual([m.confirmar, m.invalido], ['desabilitado', true], 'mudança independente durante a leitura exige nova conferência');
    await fim(c);
  });

  // ---- 4.3 recuperação com a leitura falhando
  async function confirmarComRecuperacao(c, rotulo) {
    const antes = fotoEnvio(c.amb);
    const n = await c.respostas();
    await c.pagina.click('[data-confirmar-envio]');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForSelector('#modalEnvioGrade:not([hidden]) [data-reconferir-envio]', { timeout: 5000 }).catch(() => {});
    const m = await c.modal();
    const notas = await c.pagina.evaluate(() => Array.from(document.querySelectorAll('#envioGradeCorpo p')).map((p) => p.textContent.trim()).filter((s) => /pendente/.test(s)));
    const fatos = { resposta: c.respostasEnvio[c.respostasEnvio.length - 1], notaDoModal: notas, avisoCentral: await c.avisoCentral(), reconferir: m.reconferir, efeitosDoEnvio: fotoEnvio(c.amb) === antes ? 'nenhum' : 'HOUVE', copias: c.amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length };
    return { m, fatos, antes };
  }

  await teste('19i. [4.3 A] salvamento individual concluído no pedido de envio e falha SÓ na leitura da preparação: modal diz que a gravação continua e que o painel NÃO conseguiu atualizar (recarregar), sem "já aparece no painel"; nome local antigo, nome novo persistido; nenhum efeito do envio', async () => {
    const c = await montar();
    await c.irPrevia();
    await c.abrirEnvio();
    salvamentoPendente(c.amb, 'PST1001', { nome: 'Nome recuperado sem leitura' }, 'Obs recuperada');
    const leitura = falharLeituraAoAnexar(c.amb);
    const { m, fatos } = await confirmarComRecuperacao(c, '19i');
    leitura.restaurar();
    fatos.falhasDeLeitura = leitura.falhas();
    fatos.nomeNaPagina = await c.nomeLocal('PST1001');
    fatos.nomePersistido = (pedir(c.amb.ctx.obterDadosPainel()).preparacao.ajustes.find((a) => a.chave === 'PST1001') || { campos: {} }).campos.nome;
    console.log('     fatos [19i]: ' + JSON.stringify(fatos));
    igual([fatos.resposta.codigo, fatos.resposta.recuperado && fatos.resposta.recuperado.leituraFalhou], ['PREVIA_DESATUALIZADA', true], 'recusa com recuperado.leituraFalhou');
    verdade(fatos.falhasDeLeitura >= 1, 'a falha foi na leitura');
    verdade(/A grade não foi enviada/.test(m.texto), m.texto);
    verdade(!/já aparece no painel/.test(m.texto), 'não afirma que já aparece no painel: ' + m.texto);
    verdade(fatos.notaDoModal.some((s) => /PST1001/.test(s) && /continua gravada/.test(s) && /não conseguiu atualizar/.test(s) && /[Rr]ecarregue/.test(s)), 'nota distingue gravação concluída de painel atualizado');
    verdade(/Recarregue/.test(fatos.avisoCentral), 'aviso central de recarga mantido');
    igual([fatos.nomeNaPagina, fatos.nomePersistido], ['Disciplina teste', 'Nome recuperado sem leitura'], 'painel antigo, gravação persistida');
    igual([fatos.efeitosDoEnvio, fatos.copias], ['nenhum', 0], 'nenhum efeito do envio');
    await fim(c);
  });

  await teste('19j. [4.3 B] ação em lote (excluir PST1003 + PST2001) concluída no pedido de envio e falha SÓ na leitura: modal sem "já aparece no painel", com recarga; PST1003 ainda não excluída no painel, excluída na planilha; nenhum efeito do envio', async () => {
    const c = await montar({ extra: true });
    await c.irPrevia();
    await c.abrirEnvio();
    lotePendente(c.amb);
    const leitura = falharLeituraAoAnexar(c.amb);
    const { m, fatos } = await confirmarComRecuperacao(c, '19j');
    leitura.restaurar();
    fatos.falhasDeLeitura = leitura.falhas();
    fatos.PST1003NaPagina = await c.pagina.evaluate(() => ({ excluida: Painel.estado.idx.itens.PST1003._excluida }));
    fatos.PST1003Persistida = !!(pedir(c.amb.ctx.obterDadosPainel()).preparacao.ajustes.find((a) => a.chave === 'PST1003') || {}).excluida;
    console.log('     fatos [19j]: ' + JSON.stringify(fatos));
    igual([fatos.resposta.codigo, fatos.resposta.recuperadoLote && fatos.resposta.recuperadoLote.leituraFalhou], ['PREVIA_DESATUALIZADA', true], 'recusa com recuperadoLote.leituraFalhou');
    verdade(!/já aparece no painel/.test(m.texto), 'não afirma que já aparece no painel: ' + m.texto);
    verdade(fatos.notaDoModal.some((s) => /continua gravada/.test(s) && /não conseguiu atualizar/.test(s) && /[Rr]ecarregue/.test(s)), 'nota do lote com recarga');
    verdade(/Recarregue/.test(fatos.avisoCentral), 'aviso central de recarga mantido');
    igual([fatos.PST1003NaPagina.excluida, fatos.PST1003Persistida], [false, true], 'painel antigo, exclusão persistida');
    igual([fatos.efeitosDoEnvio, fatos.copias], ['nenhum', 0], 'nenhum efeito do envio');
    await fim(c);
  });

  for (const sentido of ['individual lido + lote com leituraFalhou', 'individual com leituraFalhou + lote lido']) {
    await teste('19k. [4.3 C, contrato do callback] os dois indicadores na recusa, ' + sentido + ': cada um tem a sua nota; a falha de leitura de um não é escondida pelo outro', async () => {
      const c = await montar({ segurar: ['enviarGradeParaPreenchimento'] });
      await c.irPrevia();
      await c.abrirEnvio();
      const prep = pedir(c.amb.ctx.obterDadosPainel()).preparacao;   // leitura válida (dados atuais)
      const indFalhou = sentido.startsWith('individual com');
      const resposta = { ok: false, codigo: 'PREVIA_DESATUALIZADA', erro: 'A grade mudou depois da prévia que você conferiu (disciplinas, nomes, observações, tipos, semestres ideais ou créditos). Confira a prévia de novo e envie. A grade não foi enviada.',
        dados: { recuperado: Object.assign({ id: 'sintetico', chave: 'PST1001', codigo: 'PST1001', observacao: null }, indFalhou ? { leituraFalhou: true } : { preparacao: prep }),
          recuperadoLote: Object.assign({ nome: 'Excluir', acao: 'excluir', total: 1 }, indFalhou ? { preparacao: prep } : { leituraFalhou: true }) } };
      await c.pagina.click('[data-confirmar-envio]');
      await c.esperarFila(1);
      const n = await c.respostas();
      c.fila[0].liberar({ resposta });   // resposta FORJADA (o servidor não executa): contrato do callback
      await c.esperarResposta(n + 1);
      await c.pagina.waitForSelector('#modalEnvioGrade:not([hidden]) [data-reconferir-envio]', { timeout: 5000 }).catch(() => {});
      const m = await c.modal();
      const notas = await c.pagina.evaluate(() => Array.from(document.querySelectorAll('#envioGradeCorpo p')).map((p) => p.textContent.trim()).filter((s) => /pendente/.test(s)));
      const aviso = await c.avisoCentral();
      console.log('     fatos [19k ' + sentido + ']: ' + JSON.stringify({ notaDoModal: notas, avisoCentral: aviso }));
      verdade(!/já aparece no painel/.test(m.texto), 'sem "já aparece no painel": ' + m.texto);
      const ind = notas.find((s) => /PST1001/.test(s)), lote = notas.find((s) => /Excluir/.test(s));
      verdade(ind && lote, 'uma nota para cada indicador: ' + JSON.stringify(notas));
      verdade(/continua gravada/.test(ind) && /continua gravada/.test(lote), 'as duas gravações continuam');
      if (indFalhou) { verdade(/não conseguiu atualizar/.test(ind) && /foram atualizados/.test(lote), JSON.stringify(notas)); }
      else { verdade(/foram atualizados/.test(ind) && /não conseguiu atualizar/.test(lote), JSON.stringify(notas)); }
      verdade(/Recarregue/.test(aviso), 'aviso central de recarga');
      await fim(c);
    });
  }

  await teste('19l. [4.3 D, controle] salvamento individual concluído no pedido de envio com leitura válida: recusa com a nota da gravação concluída, dados aplicados no painel, sem pedido de recarga; nenhum efeito do envio', async () => {
    const c = await montar();
    await c.irPrevia();
    await c.abrirEnvio();
    salvamentoPendente(c.amb, 'PST1001', { nome: 'Nome recuperado com leitura' }, 'Obs lida');
    const { m, fatos } = await confirmarComRecuperacao(c, '19l');
    fatos.nomeNaPagina = await c.nomeLocal('PST1001');
    console.log('     fatos [19l]: ' + JSON.stringify(fatos));
    igual([fatos.resposta.codigo, fatos.resposta.recuperado && fatos.resposta.recuperado.leituraFalhou, fatos.resposta.recuperado && fatos.resposta.recuperado.comPreparacao], ['PREVIA_DESATUALIZADA', false, true]);
    verdade(fatos.notaDoModal.some((s) => /PST1001/.test(s) && /continua gravada/.test(s)) && !/não conseguiu/.test(m.texto), m.texto);
    igual(fatos.nomeNaPagina, 'Nome recuperado com leitura', 'dados aplicados');
    verdade(!/Recarregue/.test(fatos.avisoCentral), 'sem pedido de recarga: ' + fatos.avisoCentral);
    igual([fatos.efeitosDoEnvio, fatos.copias], ['nenhum', 0]);
    await fim(c);
  });

  await teste('19m. [4.3 D, controle] ação em lote concluída no pedido de envio com leitura válida: nota da ação concluída, PST1003 excluída no painel, sem pedido de recarga; nenhum efeito do envio', async () => {
    const c = await montar({ extra: true });
    await c.irPrevia();
    await c.abrirEnvio();
    lotePendente(c.amb);
    const { m, fatos } = await confirmarComRecuperacao(c, '19m');
    fatos.PST1003NaPagina = await c.pagina.evaluate(() => Painel.estado.idx.itens.PST1003._excluida);
    console.log('     fatos [19m]: ' + JSON.stringify(fatos));
    igual([fatos.resposta.codigo, fatos.resposta.recuperadoLote && fatos.resposta.recuperadoLote.leituraFalhou], ['PREVIA_DESATUALIZADA', false]);
    verdade(fatos.notaDoModal.some((s) => /continua gravada/.test(s)) && !/não conseguiu/.test(m.texto), m.texto);
    igual(fatos.PST1003NaPagina, true, 'dados aplicados');
    verdade(!/Recarregue/.test(fatos.avisoCentral), 'sem pedido de recarga: ' + fatos.avisoCentral);
    igual([fatos.efeitosDoEnvio, fatos.copias], ['nenhum', 0]);
    await fim(c);
  });

  await teste('19n. [controle] recuperação que NÃO muda o conteúdo do envio (CH e observação de PST1007, fora da grade de 2027/1) concluída no pedido de envio: o envio prossegue e a recuperação é aplicada', async () => {
    const c = await montar({ extra: true });
    await c.irPrevia();
    await c.abrirEnvio();
    salvamentoPendente(c.amb, 'PST1007', { ch: '45' }, 'Só obs fora da grade');
    const n = await c.respostas();
    await c.pagina.click('[data-confirmar-envio]');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForFunction(() => /enviada para preenchimento|não foi enviada/.test(document.getElementById('envioGradeCorpo').textContent), null, { timeout: 5000 });
    const m = await c.modal();
    const obsLocal = await c.pagina.evaluate(() => Painel.estado.idx.itens.PST1007.observacoes);
    console.log('     fatos [19n]: ' + JSON.stringify({ resposta: c.respostasEnvio[0], tela: m.texto.slice(0, 80), observacaoPST1007NaPagina: obsLocal, gravadoPST: celulasPST(c.amb) }));
    verdade(c.respostasEnvio[0].ok && c.respostasEnvio[0].recuperado && c.respostasEnvio[0].recuperado.codigo === 'PST1007', 'envio com recuperado');
    verdade(/enviada para preenchimento/.test(m.texto), m.texto);
    igual(obsLocal, 'Só obs fora da grade', 'recuperação aplicada');
    await fim(c);
  });

  await teste('19o. [implementação 1.8.13] coerência: o conteúdo do envio calculado com os dados da página (projecaoDoEnvio) é igual às linhas do servidor, com observações, aspas, créditos zero e vazios, eletiva × obrigatória, oferta ajustada, disciplina de outros cursos na grade e fora do semestre', async () => {
    const c = await montar({ extra: true });
    pedir(c.amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { creditosAula: '0' }, oferta: null, observacoes: 'Turma "A" – sala 2' }));
    pedir(c.amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1003', campos: { nome: 'Eletiva ajustada' }, oferta: [{ curriculo: P262, tipo: EL, periodo: 3 }] }));
    pedir(c.amb.ctx.salvarDisciplina({ origem: 'outros', chave: c.amb.chaveOutros, campos: { codigo: 'PST2001', nome: 'Outra 2001', oferecimento: 'ambos', creditosAula: '' }, oferta: null, observacoes: 'para outros' }));
    pedir(c.amb.ctx.adicionarAGrade([{ origem: 'outros', chave: c.amb.chaveOutros }]));
    pedir(c.amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PSA1005', campos: { codigo: 'PSA1015' }, oferta: null }));
    await c.pagina.evaluate(() => Painel.carregar());
    await esperarCarregado(c.pagina);
    await c.irPrevia();
    for (const sem of ['1', '2']) {
      const local = await c.pagina.evaluate((s) => window.Preparacao && window.Preparacao.projecaoDoEnvio ? window.Preparacao.projecaoDoEnvio({ semestre: s, ano: 2027 }) : null, sem);
      const srv = orig2(c, sem);
      console.log('     sem ' + sem + ' página: ' + JSON.stringify(local) + '\n     sem ' + sem + ' servidor: ' + JSON.stringify(srv));
      igual(local, srv, 'semestre ' + sem);
    }
    await fim(c);
  });

  await nav.close();
  console.log('\nExecutados: ' + (ok + falhas) + ' · ' + ok + ' ok · ' + falhas + ' falhas');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

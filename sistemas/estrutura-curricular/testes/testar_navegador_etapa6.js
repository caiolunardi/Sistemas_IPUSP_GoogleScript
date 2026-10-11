// Etapa 6 (1.8.9; 1.8.10: 17f–17m, restauração explícita da oferta) na interface real (Chromium) com o servidor real no
// simulador: oferta ajustada depois de uma troca de currículo. Confere na
// página carregada (contexto novo, dados de obterDadosPainel): semestre de
// oferecimento e oferta do painel iguais aos do servidor; selo "Oferta a
// revisar" na lista; avisos e "Onde aparece" na ficha; salvar só o nome
// mantém os vínculos a revisar; mudar a oferta sem marcar "Descartar…" é
// recusado sem perder o rascunho; com a caixa marcada, confirmação
// (cancelar = nada é enviado; aceitar = grava); prévia da grade.
// Estrutura curricular SINTÉTICA do curso 47012 (currículos 262 → 271).
// Uso: node testar_navegador_etapa6.js
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
const AJ = 'Ajustes manuais';
const HAB = { 0: 'Psicólogo', 100: 'Psicologia - Bacharelado', 200: 'Psicologia - Licenciatura' };
const P262 = '470120000262', B262 = '470120100262', L262 = '470120200262';
const P271 = '470120000271', B271 = '470120100271', L271 = '470120200271';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA', LI = 'OPTATIVA_LIVRE';
const DESCONHECIDO = '470120900262';
function pacoteCurso(vinc, nomes) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: String(parseInt(c.slice(5, 9), 10)), habilitacaoNome: HAB[parseInt(c.slice(5, 9), 10)], ano: 2000 + parseInt(c.slice(9, 11), 10), semestre: +c.slice(11), situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: (nomes && nomes[d]) || 'Sintética ' + d, versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 })),
    vinculos: vinc.map((v) => ({ curriculo: v[0], disciplina: v[1], tipo: v[2], periodoIdeal: v[3] })),
    requisitos: [], avisos: [], conferencia: null,
    origem: { formato: 'csv', leitura: 'csv', arquivo: 'sintetico.csv', tamanhoBytes: 1000, codificacao: 'UTF-8', geradoEm: null }
  };
  const por = {};
  curs.forEach((c) => { const vs = p.vinculos.filter((v) => v.curriculo === c); por[c] = { disciplinas: vs.length, OBRIGATORIA: vs.filter((v) => v.tipo === OB).length, OPTATIVA_ELETIVA: vs.filter((v) => v.tipo === EL).length, OPTATIVA_LIVRE: vs.filter((v) => v.tipo === LI).length, requisitos: 0 }; });
  p.resumoLeitura = { curriculos: curs.length, disciplinas: discs.length, vinculos: vinc.length, requisitos: 0, porCurriculo: por };
  return p;
}
function importar(amb, pk) {
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  return pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
}
const BASE = [
  [P262, 'PST1001', OB, 1], [B262, 'PST1001', OB, 1], [L262, 'PST1001', OB, 1],
  [P262, 'PST1002', OB, 2], [B262, 'PST1002', EL, 2],
  [L262, 'PST1003', OB, 3]
];
const troca = (lista, de, para) => lista.map((v) => [v[0] === de ? para : v[0], v[1], v[2], v[3]]);
const SUCESSOR = troca(troca(troca(BASE, P262, P271), B262, B271), L262, L271);
function tabela(aba) { return aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues(); }
function ofertaGuardada(amb, chave) {
  const v = tabela(amb.estrutura().getSheetByName(AJ));
  const ck = v[0].indexOf('Disciplina (código no Júpiter)'), cc = v[0].indexOf('Oferta ajustada');
  const l = v.find((x, i) => i > 0 && String(x[ck]) === chave);
  return l ? l[cc] : '(sem linha)';
}
function guardarOferta(amb, chave, texto) {
  const aba = amb.estrutura().getSheetByName(AJ);
  const v = tabela(aba);
  const ck = v[0].indexOf('Disciplina (código no Júpiter)'), cc = v[0].indexOf('Oferta ajustada');
  const i = v.findIndex((x, n) => n > 0 && String(x[ck]) === chave);
  aba.getRange(i + 1, cc + 1).setValue(texto);
}
function servidor(amb, chave) {
  const ctx = amb.ctx.contextoPreparacao_(amb.estrutura());
  const p = amb.ctx.ofertaPrincipal_(ctx, chave, ctx.ajustes[chave]);
  return { oferecimento: amb.ctx.oferecimentoEfetivo_(ctx, { origem: 'estrutura', chave }), principal: p ? p.curriculo + ':' + p.tipo + ':' + p.periodo : null };
}

let nav;
/**
 * Base: três habilitações 262; PST1001 com oferta ajustada (Psicólogo 262 obrigatória 4; Bacharelado 262
 * eletiva 6); PST1002 com oferta ajustada (Psicólogo 262 obrigatória 5) + um vínculo de currículo
 * desconhecido (editado na planilha); importação dos sucessores 271. Página aberta depois (contexto novo).
 */
async function montar(opcoes) {
  opcoes = opcoes || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  pedir(amb.ctx.obterDadosPainel());
  importar(amb, pacoteCurso(BASE));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: {}, oferta: [{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: B262, tipo: EL, periodo: 6 }] }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: {}, oferta: [{ curriculo: P262, tipo: OB, periodo: 5 }] }));
  guardarOferta(amb, 'PST1002', JSON.stringify([{ curriculo: P262, tipo: OB, periodo: 5 }, { curriculo: DESCONHECIDO, tipo: EL, periodo: 2 }]));
  importar(amb, pacoteCurso(SUCESSOR));
  if (opcoes.preparar) opcoes.preparar(amb);
  return abrirC(amb);
}
/** Página nova (contexto novo do navegador) sobre a mesma persistência. */
async function abrirC(amb) {
  const chamadas = [], pedidos = [];
  const portao = (nome, args) => { chamadas.push(nome); pedidos.push({ nome, args }); return null; };
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0, portao });
  const c = { amb, pagina, errosPagina, chamadas, pedidos, dialogos: [], aceitarDialogo: true };
  c.ultimoSalvar = () => { const x = c.pedidos.filter((q) => q.nome === 'salvarDisciplina'); return x.length ? x[x.length - 1].args[0] : null; };
  c.salvares = () => c.pedidos.filter((q) => q.nome === 'salvarDisciplina').length;
  c.ficha = () => pagina.evaluate(() => {
    const $ = (id) => document.getElementById(id);
    const corpo = $('modalDisciplinaCorpo');
    return {
      nome: $('fichaCampo-nome') ? $('fichaCampo-nome').value : null,
      salvarTravado: $('fichaSalvar').disabled, alterada: window.Preparacao.fichaAlterada(),
      associada: /Oferta ajustada associada ao currículo atual/.test(corpo.textContent), revisar: !!document.querySelector('[data-oferta-a-revisar]'),
      voltar: !!document.querySelector('[data-voltar-jupiter]'), aberta: !$('modalDisciplina').hidden,
      linhas: Array.from(document.querySelectorAll('tr[data-oferta-curriculo]')).map((tr) => tr.getAttribute('data-oferta-curriculo') + ':' + tr.querySelector('[data-oferta="tipo"]').value + ':' + (tr.querySelector('[data-oferta="periodo"]').value || '-'))
    };
  });
  pagina.on('dialog', (d) => { c.dialogos.push(d.message()); if (c.aceitarDialogo) d.accept(); else d.dismiss(); });
  await esperarCarregado(pagina);
  c.respostas = () => pagina.evaluate(() => window.__gasRespondidas || 0);
  c.esperarResposta = async (n) => { await pagina.waitForFunction((k) => (window.__gasRespondidas || 0) >= k, n, { timeout: 15000 }); await pagina.evaluate(() => new Promise((r) => setTimeout(r, 20))); };
  c.clicarEsperar = async (seletor) => { const n = await c.respostas(); await pagina.click(seletor); await c.esperarResposta(n + 1); };
  c.abrir = async (id) => { await pagina.click('#corpoTabela tr[data-id="' + id + '"] td:nth-child(2)'); await pagina.waitForSelector('#modalDisciplina:not([hidden])'); };
  c.painel = (chave) => pagina.evaluate((k) => {
    const I = Painel.interno, d = Painel.estado.idx.disciplinas[k];
    return { ajustada: !!d._ofertaAjustada, oferecimento: I.oferecimentoDe(d), ofertas: I.ofertasDe(d).map((o) => o.habCodigo + ':' + o.curriculo + ':' + o.tipo + ':' + (o.periodo || '-')), pendencias: (d._ofertaPendencias || []).length, associada: d._ofertaAssociada || 0, nome: d.nome };
  }, chave);
  c.aviso = () => pagina.evaluate(() => document.getElementById('aviso').hidden ? '' : document.getElementById('aviso').textContent);
  return c;
}
/**
 * (1.8.10) Cenário da restauração: Psicólogo 262 com PST1001 "Nome Júpiter" obrigatória no 1º;
 * ajuste pela API (nome "Nome ajustado", salvo nomeAjustado = false; oferta 262 obrigatória 4); sucessor
 * 271 com PST1001 obrigatória no período jupiter271 (padrão 4 = igual à oferta associada).
 * pendente = acrescenta à lista guardada um vínculo de currículo desconhecido.
 */
const NOMES = { PST1001: 'Nome Júpiter', PST1002: 'Outra Júpiter' };
const BASE_R = [[P262, 'PST1001', OB, 1], [P262, 'PST1002', OB, 2]];
const sucessorR = (per) => [[P271, 'PST1001', OB, per], [P271, 'PST1002', OB, 2]];
async function montarR(opcoes) {
  opcoes = opcoes || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  pedir(amb.ctx.obterDadosPainel());
  importar(amb, pacoteCurso(BASE_R, NOMES));
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: opcoes.nomeAjustado === false ? {} : { nome: 'Nome ajustado' }, oferta: [{ curriculo: P262, tipo: OB, periodo: 4 }] }));
  importar(amb, pacoteCurso(sucessorR(opcoes.jupiter271 || 4), NOMES));
  if (opcoes.pendente) guardarOferta(amb, 'PST1001', JSON.stringify([{ curriculo: P262, tipo: OB, periodo: 4 }, { curriculo: DESCONHECIDO, tipo: EL, periodo: 2 }]));
  if (opcoes.preparar) opcoes.preparar(amb);
  return abrirC(amb);
}
const semAjusteDeOferta = (amb, k) => ['', '(sem linha)'].includes(ofertaGuardada(amb, k));
/** Reimporta o 271 com o período do Júpiter em per e abre uma página nova: painel × servidor. */
async function depoisDaReimportacao(amb, per) {
  importar(amb, pacoteCurso(sucessorR(per), NOMES));
  const c2 = await abrirC(amb);
  const r = { painel: await c2.painel('PST1001'), servidor: servidor(amb, 'PST1001'), guardada: ofertaGuardada(amb, 'PST1001') };
  await fim(c2);
  return r;
}
async function fim(c) { igual(c.errosPagina, [], 'erros de JavaScript na página'); await c.pagina.context().close(); }

(async () => {
  nav = await abrirNavegador();
  console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
  console.log('\n== 17. Interface: oferta ajustada depois de troca de currículo');

  await teste('17a. carga: painel = servidor (semestre e oferta principal) para associada e a revisar; selo "Oferta a revisar" só em PST1002', async () => {
    const c = await montar();
    const p1 = await c.painel('PST1001'), p2 = await c.painel('PST1002');
    const s1 = servidor(c.amb, 'PST1001'), s2 = servidor(c.amb, 'PST1002');
    igual([p1.oferecimento, s1.oferecimento, p1.ofertas, p1.associada, p1.pendencias], ['2', '2', ['0:' + P271 + ':OBRIGATORIA:4', '100:' + B271 + ':OPTATIVA_ELETIVA:6'], 2, 0], 'PST1001');
    igual(s1.principal, P271 + ':OBRIGATORIA:4');
    igual([p2.oferecimento, s2.oferecimento, p2.ofertas, p2.pendencias], ['1', '1', ['0:' + P271 + ':OBRIGATORIA:5'], 1], 'PST1002 (o vínculo par a revisar não conta)');
    const selos = await c.pagina.evaluate(() => ['PST1001', 'PST1002', 'PST1003'].map((k) => { const tr = document.querySelector('#corpoTabela tr[data-id="' + k + '"]'); return /Oferta a revisar/.test(tr ? tr.textContent : '') ? 1 : 0; }));
    igual(selos, [0, 1, 0], 'selo na lista');
    await fim(c);
  });

  await teste('17b. ficha de PST1001: aviso de associação, "Onde aparece" com tipo/período ajustados no 271, sem caixa de descarte', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    const f = await c.pagina.evaluate(() => ({
      associada: /Oferta ajustada associada ao currículo atual/.test(document.getElementById('modalDisciplinaCorpo').textContent),
      revisar: !!document.querySelector('[data-oferta-a-revisar]'),
      caixa: !!document.getElementById('fichaDescartarPendentes'),
      linhas: Array.from(document.querySelectorAll('tr[data-oferta-curriculo]')).map((tr) => tr.getAttribute('data-oferta-curriculo') + ':' + tr.querySelector('[data-oferta="tipo"]').value + ':' + (tr.querySelector('[data-oferta="periodo"]').value || '-')),
      salvarTravado: document.getElementById('fichaSalvar').disabled
    }));
    igual(f, { associada: true, revisar: false, caixa: false, linhas: [P271 + ':OBRIGATORIA:4', B271 + ':OPTATIVA_ELETIVA:6', L271 + '::-'], salvarTravado: true });
    await fim(c);
  });

  await teste('17c. ficha de PST1002: aviso "Oferta a revisar" com o vínculo e o motivo; salvar SÓ o nome grava o nome e mantém o vínculo', async () => {
    const c = await montar();
    const guardada = ofertaGuardada(c.amb, 'PST1002');
    await c.abrir('PST1002');
    const aviso = await c.pagina.textContent('[data-oferta-a-revisar]');
    verdade(aviso.includes(DESCONHECIDO) && /desconhecido/.test(aviso) && /Optativa eletiva/.test(aviso), aviso);
    verdade(await c.pagina.$('#fichaDescartarPendentes'), 'caixa de descarte');
    await c.pagina.fill('#fichaCampo-nome', 'Nome novo 1002');
    await c.clicarEsperar('#fichaSalvar');
    igual([await c.aviso(), c.dialogos.length], ['Alterações salvas.', 0], 'sem confirmação');
    igual(ofertaGuardada(c.amb, 'PST1002'), guardada, 'lista guardada intacta');
    const p = await c.painel('PST1002');
    igual([p.nome, p.pendencias, p.oferecimento], ['Nome novo 1002', 1, '1']);
    verdade(await c.pagina.$('[data-oferta-a-revisar]'), 'aviso continua na ficha redesenhada');
    await fim(c);
  });

  await teste('17d. mudar o período sem marcar "Descartar": recusa OFERTA_A_REVISAR, rascunho mantido, nada gravado; marcar + cancelar confirmação: nada enviado; aceitar: grava e o aviso some', async () => {
    const c = await montar();
    const guardada = ofertaGuardada(c.amb, 'PST1002');
    await c.abrir('PST1002');
    await c.pagina.fill('tr[data-oferta-curriculo="' + P271 + '"] [data-oferta="periodo"]', '7');
    await c.clicarEsperar('#fichaSalvar');
    verdade(/vínculo a revisar/.test(await c.aviso()) && /Nada foi salvo/.test(await c.aviso()), await c.aviso());
    igual([await c.pagina.inputValue('tr[data-oferta-curriculo="' + P271 + '"] [data-oferta="periodo"]'), ofertaGuardada(c.amb, 'PST1002')], ['7', guardada], 'rascunho mantido; nada gravado');
    await c.pagina.check('#fichaDescartarPendentes');
    c.aceitarDialogo = false;
    const n0 = c.chamadas.filter((x) => x === 'salvarDisciplina').length;
    await c.pagina.click('#fichaSalvar');
    await c.pagina.evaluate(() => new Promise((r) => setTimeout(r, 100)));
    igual([c.dialogos.length, c.chamadas.filter((x) => x === 'salvarDisciplina').length - n0, ofertaGuardada(c.amb, 'PST1002')], [1, 0, guardada], 'cancelar: nada enviado');
    verdade(/Descartar o vínculo de oferta a revisar de PST1002/.test(c.dialogos[0]), c.dialogos[0]);
    c.aceitarDialogo = true;
    await c.clicarEsperar('#fichaSalvar');
    igual(await c.aviso(), 'Alterações salvas.');
    igual(JSON.parse(ofertaGuardada(c.amb, 'PST1002')), [{ curriculo: P271, tipo: OB, periodo: 7 }], 'nova lista, sem o vínculo a revisar');
    const p = await c.painel('PST1002');
    igual([p.pendencias, p.oferecimento, servidor(c.amb, 'PST1002').oferecimento], [0, '1', '1']);
    verdade(!(await c.pagina.$('[data-oferta-a-revisar]')) && !(await c.pagina.$('#fichaDescartarPendentes')), 'aviso e caixa somem');
    await fim(c);
  });

  await teste('17e. prévia da grade (2º semestre): PST1001 adicionada aparece com o período ajustado no Psicólogo; o servidor manda a mesma linha', async () => {
    const c = await montar({ preparar: (amb) => pedir(amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PST1001' }])) });
    await c.pagina.click('#etapa-4');
    await c.pagina.selectOption('#gradeSemestre', '2');
    if (await c.pagina.$('#previa-aba-PST')) await c.pagina.click('#previa-aba-PST');
    await c.pagina.waitForSelector('#previaPaineis tbody tr[data-codigo="PST1001"]', { timeout: 5000 });
    const linha = (await c.pagina.textContent('#previaPaineis tbody tr[data-codigo="PST1001"]')).replace(/\s+/g, ' ');
    verdade(/Psicólogo 4º/.test(linha), linha);
    const ctx = c.amb.ctx.contextoPreparacao_(c.amb.estrutura());
    igual(c.amb.ctx.linhasDaGrade_(ctx, '2').PST.map((x) => [x.codigo, x.tipo, x.semestreIdeal]), [['PST1001', 'Obrigatória', 4]]);
    await fim(c);
  });

  console.log('\n== 18. (1.8.10) "Voltar aos dados do Júpiter" com oferta associada igual à do Júpiter');

  await teste('17f. (A) reprodução: Voltar + Salvar envia a intenção, remove o ajuste de oferta (e o de nome); reimportação 4 → 3 passa a valer (semestre "1") no painel e no servidor', async () => {
    const c = await montarR();
    await c.abrir('PST1001');
    let f = await c.ficha();
    igual([f.nome, f.associada, f.linhas], ['Nome ajustado', true, [P271 + ':OBRIGATORIA:4']], 'ficha antes');
    await c.pagina.click('[data-voltar-jupiter]');
    f = await c.ficha();
    igual([f.nome, f.linhas, f.salvarTravado], ['Nome Júpiter', [P271 + ':OBRIGATORIA:4'], false], 'formulário com o Júpiter');
    await c.clicarEsperar('#fichaSalvar');
    // Fatos observados (registrados antes das conferências, para o log mostrar o resultado mesmo quando falha).
    const q = c.ultimoSalvar();
    const fatos = { aviso: await c.aviso(), pedido: { restaurarOferta: q.restaurarOferta === undefined ? '(ausente)' : q.restaurarOferta, oferta: q.oferta, nome: q.campos.nome }, guardadaDepois: ofertaGuardada(c.amb, 'PST1001') };
    f = await c.ficha();
    const p = await c.painel('PST1001');
    fatos.fichaDepois = { associada: f.associada, ofertaAjustada: p.ajustada, ofertaAssociada: p.associada, nome: p.nome };
    await fim(c);
    const r = await depoisDaReimportacao(c.amb, 3);
    fatos.reimportacao3 = { guardada: r.guardada, painel: { oferecimento: r.painel.oferecimento, ofertas: r.painel.ofertas, associada: r.painel.associada }, servidor: r.servidor };
    console.log('     fatos: ' + JSON.stringify(fatos));
    igual(fatos.aviso, 'Alterações salvas.');
    verdade(['', '(sem linha)'].includes(fatos.guardadaDepois), 'coluna "Oferta ajustada" depois de salvar: ' + fatos.guardadaDepois);
    igual([r.painel.oferecimento, r.painel.ofertas, r.servidor.oferecimento, r.servidor.principal], ['1', ['0:' + P271 + ':OBRIGATORIA:3'], '1', P271 + ':OBRIGATORIA:3'], 'depois da reimportação 4 → 3, o Júpiter volta a determinar a oferta');
    igual([fatos.fichaDepois.associada, fatos.fichaDepois.ofertaAjustada, fatos.fichaDepois.ofertaAssociada, fatos.fichaDepois.nome], [false, false, 0, 'Nome Júpiter'], 'ficha redesenhada com o lido');
    igual([q.restaurarOferta, q.oferta, q.campos.nome, q.ofertaPendentes], [true, [{ curriculo: P271, tipo: OB, periodo: 4 }], 'Nome Júpiter', undefined], 'pedido enviado pelo botão');
  });

  await teste('17g. (B) só ajuste de oferta: "Salvar" desabilitado ao abrir e habilitado pelo Voltar (valores visíveis iguais); a restauração salva remove o ajuste', async () => {
    const c = await montarR({ nomeAjustado: false });
    await c.abrir('PST1001');
    let f = await c.ficha();
    igual([f.salvarTravado, f.voltar, f.linhas], [true, true, [P271 + ':OBRIGATORIA:4']]);
    await c.pagina.click('[data-voltar-jupiter]');
    f = await c.ficha();
    igual([f.salvarTravado, f.alterada, f.linhas], [false, true, [P271 + ':OBRIGATORIA:4']], 'intenção reconhecida como alteração');
    await c.clicarEsperar('#fichaSalvar');
    igual([await c.aviso(), c.ultimoSalvar().restaurarOferta], ['Alterações salvas.', true]);
    verdade(semAjusteDeOferta(c.amb, 'PST1001'), ofertaGuardada(c.amb, 'PST1001'));
    await fim(c);
    const r = await depoisDaReimportacao(c.amb, 3);
    igual([r.painel.oferecimento, r.servidor.oferecimento], ['1', '1']);
  });

  await teste('17h. (C) controle: salvar só o nome / só a observação sem Voltar, com oferta igual à do Júpiter — lista guardada intacta (associada e com vínculo a revisar)', async () => {
    let c = await montarR();
    let guardada = ofertaGuardada(c.amb, 'PST1001');
    await c.abrir('PST1001');
    await c.pagina.fill('#fichaCampo-nome', 'Nome C');
    await c.clicarEsperar('#fichaSalvar');
    igual([await c.aviso(), c.ultimoSalvar().restaurarOferta, ofertaGuardada(c.amb, 'PST1001')], ['Alterações salvas.', undefined, guardada], 'nome');
    igual((await c.painel('PST1001')).associada, 1);
    await fim(c);
    c = await montarR({ pendente: true });
    guardada = ofertaGuardada(c.amb, 'PST1001');
    await c.abrir('PST1001');
    await c.pagina.fill('#fichaObservacoes', 'Obs C');
    await c.clicarEsperar('#fichaSalvar');
    igual([await c.aviso(), c.ultimoSalvar().restaurarOferta, ofertaGuardada(c.amb, 'PST1001'), (await c.painel('PST1001')).pendencias], ['Alterações salvas.', undefined, guardada, 1], 'observação com vínculo a revisar');
    await fim(c);
  });

  await teste('17i. (D) com vínculo a revisar e parte efetiva igual ao Júpiter: Voltar + Salvar é recusado (rascunho e intenção mantidos); caixa + cancelar não envia; caixa + confirmar restaura', async () => {
    const c = await montarR({ pendente: true });
    const guardada = ofertaGuardada(c.amb, 'PST1001');
    await c.abrir('PST1001');
    await c.pagina.click('[data-voltar-jupiter]');
    await c.clicarEsperar('#fichaSalvar');
    const av = await c.aviso();
    verdade(/a revisar/.test(av) && /voltar à oferta do Júpiter/.test(av) && /Nada foi salvo/.test(av), av);
    let f = await c.ficha();
    igual([f.nome, f.salvarTravado, f.alterada, f.revisar, ofertaGuardada(c.amb, 'PST1001')], ['Nome Júpiter', false, true, true, guardada], 'recusa: rascunho mantido, nada gravado');
    igual(c.ultimoSalvar().restaurarOferta, true);
    await c.pagina.check('#fichaDescartarPendentes');
    c.aceitarDialogo = false;
    const n0 = c.salvares();
    await c.pagina.click('#fichaSalvar');
    await c.pagina.evaluate(() => new Promise((r) => setTimeout(r, 100)));
    igual([c.dialogos.length, c.salvares() - n0, ofertaGuardada(c.amb, 'PST1001')], [1, 0, guardada], 'cancelar: nada enviado');
    c.aceitarDialogo = true;
    await c.clicarEsperar('#fichaSalvar');
    igual(await c.aviso(), 'Alterações salvas.');
    const q = c.ultimoSalvar();
    igual([q.restaurarOferta, q.ofertaPendentes], [true, 'descartar']);
    verdade(semAjusteDeOferta(c.amb, 'PST1001'), ofertaGuardada(c.amb, 'PST1001'));
    f = await c.ficha();
    igual([f.revisar, f.associada, (await c.painel('PST1001')).pendencias], [false, false, 0]);
    await fim(c);
  });

  await teste('17j. (E) Voltar e depois mudar o período à mão: vale a escolha final (sem intenção de restauração no pedido)', async () => {
    const c = await montarR();
    await c.abrir('PST1001');
    await c.pagina.click('[data-voltar-jupiter]');
    await c.pagina.fill('tr[data-oferta-curriculo="' + P271 + '"] [data-oferta="periodo"]', '6');
    await c.clicarEsperar('#fichaSalvar');
    const q = c.ultimoSalvar();
    igual([await c.aviso(), q.restaurarOferta, q.oferta], ['Alterações salvas.', undefined, [{ curriculo: P271, tipo: OB, periodo: 6 }]]);
    igual(JSON.parse(ofertaGuardada(c.amb, 'PST1001')), [{ curriculo: P271, tipo: OB, periodo: 6 }]);
    igual(servidor(c.amb, 'PST1001').oferecimento, '2');
    await fim(c);
  });

  await teste('17k. (F) Voltar sem salvar e fechar: nada gravado; outra ficha e a mesma reaberta não herdam a intenção; depois de uma restauração concluída, salvar outro campo não a repete', async () => {
    const c = await montarR();
    const bruto = ofertaGuardada(c.amb, 'PST1001');
    await c.abrir('PST1001');
    await c.pagina.click('[data-voltar-jupiter]');
    await c.pagina.click('#modalDisciplina .modal__fechar');
    await c.pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
    igual([c.salvares(), ofertaGuardada(c.amb, 'PST1001')], [0, bruto], 'fechar: nada enviado nem gravado');
    await c.abrir('PST1002');
    await c.pagina.fill('#fichaCampo-nome', 'Outra ajustada');
    await c.clicarEsperar('#fichaSalvar');
    igual(c.ultimoSalvar().restaurarOferta, undefined, 'outra ficha');
    await c.pagina.click('#modalDisciplina .modal__fechar');
    await c.pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
    await c.abrir('PST1001');
    let f = await c.ficha();
    igual([f.nome, f.salvarTravado, f.alterada, ofertaGuardada(c.amb, 'PST1001')], ['Nome ajustado', true, false, bruto], 'a mesma reaberta: estado gravado, sem intenção');
    await c.pagina.click('[data-voltar-jupiter]');
    await c.clicarEsperar('#fichaSalvar');
    igual(c.ultimoSalvar().restaurarOferta, true);
    await c.pagina.fill('#fichaCampo-nome', 'Nome depois');
    await c.clicarEsperar('#fichaSalvar');
    igual([await c.aviso(), c.ultimoSalvar().restaurarOferta], ['Alterações salvas.', undefined], 'salvamento seguinte comum');
    verdade(semAjusteDeOferta(c.amb, 'PST1001'), ofertaGuardada(c.amb, 'PST1001'));
    await fim(c);
  });

  await teste('17l. (G) restauração com falha na escrita da observação: salvamento pendente; "Concluir salvamento pendente" conclui; reaberta e reimportada, vale o Júpiter', async () => {
    const c = await montarR();
    await c.abrir('PST1001');
    await c.pagina.click('[data-voltar-jupiter]');
    await c.pagina.fill('#fichaObservacoes', 'Obs G');
    c.amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), 99);
    await c.clicarEsperar('#fichaSalvar');
    verdade(/não terminou/.test(await c.aviso()), await c.aviso());
    igual(c.ultimoSalvar().restaurarOferta, true);
    verdade(!!c.amb.estrutura().meta.find((m) => m.k === 'estruturaCurricular.salvamento'), 'registro do salvamento pendente');
    c.amb.limparFalhas();
    const n = await c.respostas();
    const temBotao = await c.pagina.evaluate(() => { const b = document.querySelector('[data-concluir-salvamento]'); if (b) b.click(); return !!b; });
    verdade(temBotao, 'botão "Concluir salvamento pendente"');
    await c.esperarResposta(n + 1);
    igual(await c.aviso(), 'Salvamento de PST1001 concluído.');
    verdade(semAjusteDeOferta(c.amb, 'PST1001'), ofertaGuardada(c.amb, 'PST1001'));
    await fim(c);
    const r = await depoisDaReimportacao(c.amb, 3);
    igual([r.painel.oferecimento, r.servidor.oferecimento, r.painel.associada], ['1', '1', 0]);
  });

  await teste('17m. (H) [] intencional: só sai com Voltar + Salvar; oferta associada DIFERENTE do Júpiter: restaurada; disciplina sem ajuste: sem "Voltar"', async () => {
    let c = await montarR({ preparar: (amb) => pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: {}, oferta: [] })) });
    await c.abrir('PST1002');
    let f = await c.ficha();
    igual([f.linhas, f.salvarTravado], [[P271 + '::-'], true], '[] na ficha');
    await c.pagina.click('[data-voltar-jupiter]');
    await c.clicarEsperar('#fichaSalvar');
    igual([c.ultimoSalvar().restaurarOferta, (await c.painel('PST1002')).ofertas, servidor(c.amb, 'PST1002').oferecimento], [true, ['0:' + P271 + ':OBRIGATORIA:2'], '2']);
    verdade(semAjusteDeOferta(c.amb, 'PST1002'), ofertaGuardada(c.amb, 'PST1002'));
    await fim(c);
    c = await montarR({ jupiter271: 1 });
    await c.abrir('PST1001');
    igual((await c.ficha()).linhas, [P271 + ':OBRIGATORIA:4'], 'associada (4) ≠ Júpiter (1)');
    await c.pagina.click('[data-voltar-jupiter]');
    await c.clicarEsperar('#fichaSalvar');
    igual([c.ultimoSalvar().restaurarOferta, (await c.painel('PST1001')).oferecimento], [true, '1']);
    verdade(semAjusteDeOferta(c.amb, 'PST1001'), ofertaGuardada(c.amb, 'PST1001'));
    await c.pagina.click('#modalDisciplina .modal__fechar');
    await c.pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
    await c.abrir('PST1002');
    igual((await c.ficha()).voltar, false, 'sem ajuste: sem "Voltar aos dados do Júpiter"');
    await fim(c);
  });

  await nav.close();
  console.log('\nExecutados: ' + (ok + falhas) + ' · ' + ok + ' ok · ' + falhas + ' falhas');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

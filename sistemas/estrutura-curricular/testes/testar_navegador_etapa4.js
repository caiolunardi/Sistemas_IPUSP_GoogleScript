// Etapa 4 (1.8.5; casos 14d estendido e 14g–14j da 1.8.6) na interface real (Chromium) com o servidor real no
// simulador: salvar uma disciplina da ESTRUTURA com falhas injetadas na
// planilha (mockGoogle.js) e, quando preciso, respostas CONTROLADAS
// (opção "portao" de ambiente_navegador.js). Confere mensagens, aviso fixo
// de salvamento pendente, dados confirmados (lista), rascunho, botões,
// proteção da etapa 3 e o que ficou gravado.
// Estrutura curricular SINTÉTICA (PST1001, PST1002, 4701003, PSA1004,
// PSE1005); o CSV do Júpiter só empresta o formato do curso/currículo.
// Uso: node testar_navegador_etapa4.js <grade_curricular.csv>
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const [csvPath] = process.argv.slice(2);
if (!csvPath) { console.log('Uso: node testar_navegador_etapa4.js <grade_curricular.csv>'); process.exit(2); }

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 3).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const leitores = carregar();
const modelo = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const CODIGOS = { SIN0001: 'PST1001', SIN0002: 'PST1002', SIN0003: '4701003', SIN0004: 'PSA1004', SIN0005: 'PSE1005' };
function pacote() {
  const p = parSintetico(modelo, 5).csv;
  p.disciplinas.forEach((d) => { d.codigo = CODIGOS[d.codigo]; d.nome = 'Sintética ' + d.codigo; });
  p.vinculos.forEach((v) => { v.disciplina = CODIGOS[v.disciplina]; });
  return p;
}
const META_SALV = 'estruturaCurricular.salvamento';
function objetos(aba) {
  if (!aba || aba.getLastRow() < 2) return [];
  const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { if (t) o[t] = l[i]; }); return o; });
}
function persistido(amb, chave) {
  const ss = amb.estrutura();
  const m = JSON.parse(ss.meta.find((x) => x.k === 'estruturaCurricular.ativa').v);
  const disc = ss.sheets.find((s) => s.getSheetId() === m.abas.Disciplinas);
  const a = objetos(ss.getSheetByName('Ajustes manuais')).find((x) => String(x['Disciplina (código no Júpiter)']) === chave);
  const d = objetos(disc).find((x) => String(x['Código']) === chave);
  return { nome: a ? a['Nome ajustado'] : '(sem linha)', obs: d ? String(d['Observações'] || '') : null, pendente: !!ss.meta.find((x) => x.k === META_SALV) };
}
const falhaObs = (amb, vezes) => amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), vezes);

let nav;
async function montar(segurar) {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(amb.ctx.obterDadosPainel());
  const pk = pacote();
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  const fila = [];
  const nomes = new Set(segurar || []);
  const portao = (nome, args) => (nomes.has(nome) ? new Promise((liberar) => fila.push({ nome, args, liberar })) : null);
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0, portao });
  const dialogos = [];
  pagina.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await esperarCarregado(pagina);
  const c = { amb, pagina, errosPagina, fila, dialogos, entregues: 0 };
  c.abrir = async (id) => { await pagina.click('#corpoTabela tr[data-id="' + id + '"] td:nth-child(2)'); await pagina.waitForSelector('#modalDisciplina:not([hidden])'); };
  c.fechar = async () => { await pagina.click('#modalDisciplina .modal__fechar'); await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' }); };
  c.esperarResposta = async (n) => { await pagina.waitForFunction((k) => (window.__gasRespondidas || 0) >= k, n, { timeout: 15000 }); await pagina.evaluate(() => new Promise((r) => setTimeout(r, 0))); };
  c.respostas = () => pagina.evaluate(() => window.__gasRespondidas || 0);
  c.liberar = async (i) => { const n = await c.respostas(); c.fila[i].liberar(null); await c.esperarResposta(n + 1); };
  c.esperarFila = async (n) => { const t0 = Date.now(); while (c.fila.length < n) { if (Date.now() - t0 > 10000) throw new Error('chamada não chegou'); await new Promise((r) => setTimeout(r, 20)); } };
  /** Clica e espera a resposta do servidor. */
  c.clicarEsperar = async (seletor) => { const n = await c.respostas(); await pagina.click(seletor); await c.esperarResposta(n + 1); };
  c.tela = () => pagina.evaluate(() => {
    const $ = (id) => document.getElementById(id);
    const pend = $('salvamentoPendente');
    return {
      aberta: !$('modalDisciplina').hidden, fichaAtual: Painel.estado.fichaAtual,
      nome: $('fichaCampo-nome') ? $('fichaCampo-nome').value : null, nomeTravado: $('fichaCampo-nome') ? $('fichaCampo-nome').disabled : null,
      obs: $('fichaObservacoes') ? $('fichaObservacoes').value : null,
      salvarTexto: $('fichaSalvar').textContent, salvarTravado: $('fichaSalvar').disabled,
      alterada: window.Preparacao.fichaAlterada(), aviso: $('aviso').hidden ? '' : $('aviso').textContent,
      pendenteVisivel: !!pend && !pend.hidden, pendenteTexto: pend && !pend.hidden ? pend.textContent : '',   // (a 1.8.4 não tem o aviso fixo)
      listaNome: (Painel.estado.idx.itens.PST1001 || {}).nome, listaObs: ((Painel.estado.dados.base.disciplinas.find((d) => d.codigo === 'PST1001')) || {}).observacoes
    };
  });
  return c;
}
async function fim(c) { igual(c.errosPagina, [], 'erros de JavaScript na página'); await c.pagina.context().close(); }
async function editarA(c) { await c.pagina.fill('#fichaCampo-nome', 'Nome ajustado'); await c.pagina.fill('#fichaObservacoes', 'Observação nova'); }

(async () => {
  nav = await abrirNavegador();
  console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
  console.log('\n== 14. Interface');

  await teste('14a. concluído: "Alterações salvas.", ficha com o gravado, sem aviso de pendência', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    await editarA(c);
    await c.clicarEsperar('#fichaSalvar');
    const t = await c.tela();
    igual([t.aviso, t.nome, t.obs, t.alterada, t.salvarTexto, t.pendenteVisivel, t.listaNome, t.listaObs], ['Alterações salvas.', 'Nome ajustado', 'Observação nova', false, 'Salvar', false, 'Nome ajustado', 'Observação nova']);
    igual(persistido(c.amb, 'PST1001'), { nome: 'Nome ajustado', obs: 'Observação nova', pendente: false });
    await fim(c);
  });

  await teste('14b. não concluído (planilha recusou o registro): "Nada foi salvo", rascunho preservado, controles liberados, nada gravado', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    await editarA(c);
    c.amb.injetarFalha((e) => e.tipo === 'metadado' && e.chave === META_SALV, 1);
    await c.clicarEsperar('#fichaSalvar');
    const t = await c.tela();
    verdade(/Nada foi salvo em PST1001/.test(t.aviso), t.aviso);
    igual([t.nome, t.obs, t.alterada, t.nomeTravado, t.salvarTravado, t.salvarTexto, t.pendenteVisivel, t.listaNome], ['Nome ajustado', 'Observação nova', true, false, false, 'Salvar', false, 'Sintética PST1001']);
    igual(persistido(c.amb, 'PST1001'), { nome: '(sem linha)', obs: '', pendente: false });
    await fim(c);
  });

  await teste('14c. pendente (observação não grava): mensagem do que falta, aviso fixo com "Concluir", rascunho preservado, lista com o que está gravado; "Concluir" conclui e atualiza a ficha', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    await editarA(c);
    falhaObs(c.amb, 99);
    await c.clicarEsperar('#fichaSalvar');
    const t = await c.tela();
    verdade(/não terminou/.test(t.aviso) && /observação ainda não/.test(t.aviso), t.aviso);
    igual([t.nome, t.obs, t.alterada, t.nomeTravado, t.salvarTravado, t.pendenteVisivel], ['Nome ajustado', 'Observação nova', true, false, false, true], 'rascunho e aviso fixo');
    igual([t.listaNome, t.listaObs], ['Nome ajustado', ''], 'dados confirmados = o que está gravado');
    verdade(/PST1001/.test(t.pendenteTexto) && /Concluir salvamento pendente/.test(t.pendenteTexto), t.pendenteTexto);
    igual(persistido(c.amb, 'PST1001'), { nome: 'Nome ajustado', obs: '', pendente: true });
    // A escrita volta a funcionar. O aviso fixo fica na página, atrás da ficha aberta: na tela a pessoa
    // o usa depois de fechar a ficha (ou salva de novo). Aqui o botão é acionado direto, com a ficha
    // ainda aberta, para conferir que a mesma instância, sem edições, é redesenhada com o gravado.
    c.amb.limparFalhas();
    const temBotao = await c.pagina.evaluate(() => { const b = document.querySelector('[data-concluir-salvamento]'); if (b) b.click(); return !!b; });
    verdade(temBotao, 'botão "Concluir salvamento pendente"');
    await c.esperarResposta(3);
    const t2 = await c.tela();
    igual([t2.aviso, t2.pendenteVisivel, t2.nome, t2.obs, t2.alterada, t2.listaObs], ['Salvamento de PST1001 concluído.', false, 'Nome ajustado', 'Observação nova', false, 'Observação nova'], 'concluído e ficha atualizada');
    igual(persistido(c.amb, 'PST1001'), { nome: 'Nome ajustado', obs: 'Observação nova', pendente: false });
    await fim(c);
  });

  await teste('14d. pendente com B aberta (resposta atrasada): B e o rascunho intactos; aviso cita PST1001; salvar B depois conclui A antes e grava B', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.abrir('PST1001');
    await editarA(c);
    falhaObs(c.amb, 99);
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.fechar();
    await c.abrir('PST1002');
    await c.pagina.fill('#fichaCampo-nome', 'B rascunho');
    await c.liberar(0);
    const t = await c.tela();
    igual([t.aberta, t.fichaAtual, t.nome, t.alterada, t.salvarTexto, t.salvarTravado], [true, 'PST1002', 'B rascunho', true, 'Salvar', false], 'ficha B');
    verdade(/PST1001/.test(t.aviso) && t.pendenteVisivel, t.aviso);
    c.amb.limparFalhas();
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(2);
    await c.liberar(1);
    const t2 = await c.tela();
    igual([t2.fichaAtual, t2.nome, t2.alterada, t2.aviso, t2.pendenteVisivel], ['PST1002', 'B rascunho', false, 'Alterações salvas.', false]);
    igual([persistido(c.amb, 'PST1001'), persistido(c.amb, 'PST1002').nome], [{ nome: 'Nome ajustado', obs: 'Observação nova', pendente: false }, 'B rascunho']);
    // (1.8.6) A concluída na chamada de B: os dados do painel de A já têm a observação gravada
    igual([t2.listaNome, t2.listaObs], ['Nome ajustado', 'Observação nova'], 'lista/dados de A depois de B (listaObs)');
    // ficha de A reaberta: pré-preenchida com o confirmado; salvar só o nome não apaga a observação
    await c.fechar();
    await c.abrir('PST1001');
    const t3 = await c.tela();
    igual([t3.fichaAtual, t3.nome, t3.obs, t3.alterada], ['PST1001', 'Nome ajustado', 'Observação nova', false], 'ficha de A reaberta');
    await c.pagina.fill('#fichaCampo-nome', 'Outra correção em A');
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(3);
    await c.liberar(2);
    const t4 = await c.tela();
    igual([t4.aviso, t4.nome, t4.obs, t4.listaNome, t4.listaObs], ['Alterações salvas.', 'Outra correção em A', 'Observação nova', 'Outra correção em A', 'Observação nova'], 'depois de salvar A reaberta');
    igual(persistido(c.amb, 'PST1001'), { nome: 'Outra correção em A', obs: 'Observação nova', pendente: false });
    const novo = pedir(criarAmbiente({ dirSrc: DIR_SRC, reusar: c.amb, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' }).ctx.obterDadosPainel());
    igual(novo.base.disciplinas.find((d) => d.codigo === 'PST1001').observacoes, 'Observação nova', 'contexto novo');
    await fim(c);
  });

  await teste('14e. pendente depois de fechar e REABRIR A (nova instância): o formulário novo não é tocado; aviso fixo aparece', async () => {
    const c = await montar(['salvarDisciplina']);
    await c.abrir('PST1001');
    await editarA(c);
    falhaObs(c.amb, 99);
    await c.pagina.click('#fichaSalvar');
    await c.esperarFila(1);
    await c.fechar();
    await c.abrir('PST1001');
    await c.pagina.fill('#fichaObservacoes', 'rascunho da nova instância');
    const antes = await c.tela();
    await c.liberar(0);
    const t = await c.tela();
    igual([t.fichaAtual, t.nome, t.obs, t.alterada], ['PST1001', antes.nome, 'rascunho da nova instância', true], 'nova instância intacta');
    verdade(t.pendenteVisivel, 'aviso fixo');
    await fim(c);
  });

  await teste('14f. pendência ao abrir o painel (execução anterior interrompida): concluída na abertura, com aviso', async () => {
    const c0 = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
    pedir(c0.ctx.obterDadosPainel());
    const pk = pacote();
    const p0 = pedir(c0.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
    pedir(c0.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
    falhaObs(c0, 99);
    c0.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
    const amb = criarAmbiente({ dirSrc: DIR_SRC, reusar: c0, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
    const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pagina);
    const aviso = await pagina.textContent('#aviso');
    verdade(/PST1001 que tinha ficado pendente foi concluído/.test(aviso), aviso);
    igual(await pagina.evaluate(() => { const p = document.getElementById('salvamentoPendente'); return !p || p.hidden; }), true);
    igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', obs: 'Observação nova', pendente: false });
    igual(errosPagina, []);
    await pagina.context().close();
  });

  await teste('14g. (1.8.6) REPRODUÇÃO A→B→A na interface: A pendente; B salva com A já fechada; A reaberta depois de tudo mostra e mantém a observação recuperada', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    await c.pagina.fill('#fichaCampo-nome', 'A corrigida');
    await c.pagina.fill('#fichaObservacoes', 'Observação recuperada de A');
    falhaObs(c.amb, 99);
    await c.clicarEsperar('#fichaSalvar');
    const t0 = await c.tela();
    await c.fechar();   // rascunho descartado (o diálogo de confirmação é aceito)
    await c.abrir('PST1002');
    await c.pagina.fill('#fichaCampo-nome', 'B corrigida');
    await c.pagina.fill('#fichaObservacoes', 'Observação de B');
    c.amb.limparFalhas();
    await c.clicarEsperar('#fichaSalvar');
    const t1 = await c.tela();
    const obsB = await c.pagina.evaluate(() => Painel.estado.dados.base.disciplinas.find((d) => d.codigo === 'PST1002').observacoes);
    const pA1 = persistido(c.amb, 'PST1001');
    await c.fechar();
    await c.abrir('PST1001');
    const t2 = await c.tela();
    const idxObs = await c.pagina.evaluate(() => Painel.estado.idx.itens.PST1001.observacoes);
    await c.pagina.fill('#fichaCampo-nome', 'Outra correção em A');
    await c.clicarEsperar('#fichaSalvar');
    const t3 = await c.tela();
    const pA2 = persistido(c.amb, 'PST1001');
    const novo = pedir(criarAmbiente({ dirSrc: DIR_SRC, reusar: c.amb, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' }).ctx.obterDadosPainel());
    const obsNovo = novo.base.disciplinas.find((d) => d.codigo === 'PST1001').observacoes;
    console.log('     retrato: A pendente → painel ' + JSON.stringify({ pendenteVisivel: t0.pendenteVisivel, listaObs: t0.listaObs }) +
      ' | depois de B → planilha A ' + JSON.stringify(pA1) + ', painel ' + JSON.stringify({ listaObsA: t1.listaObs, obsB }) +
      ' | A reaberta → ficha ' + JSON.stringify({ nome: t2.nome, obs: t2.obs, indice: idxObs }) +
      ' | depois de salvar A → planilha ' + JSON.stringify(pA2) + ', painel ' + JSON.stringify({ obs: t3.obs, listaObs: t3.listaObs }) + ' | contexto novo obs A ' + JSON.stringify(obsNovo));
    igual([t0.pendenteVisivel, t0.listaObs], [true, ''], 'A pendente; dados confirmados ainda sem a observação');
    igual(pA1, { nome: 'A corrigida', obs: 'Observação recuperada de A', pendente: false }, 'B concluiu A na planilha');
    igual(pA2, { nome: 'Outra correção em A', obs: 'Observação recuperada de A', pendente: false }, 'planilha depois de salvar A reaberta');
    igual([obsNovo, novo.salvamentoPendente], ['Observação recuperada de A', null], 'contexto novo');
    igual([t1.aviso, t1.pendenteVisivel, t1.listaObs, obsB], ['Alterações salvas.', false, 'Observação recuperada de A', 'Observação de B'], 'depois de B: A e B nos dados do painel');
    igual([t2.nome, t2.obs, idxObs], ['A corrigida', 'Observação recuperada de A', 'Observação recuperada de A'], 'ficha reaberta e índice usado por ela');
    igual([t3.aviso, t3.nome, t3.obs, t3.listaObs], ['Alterações salvas.', 'Outra correção em A', 'Observação recuperada de A', 'Observação recuperada de A'], 'painel depois de salvar A');
    await fim(c);
  });

  await teste('14h. (1.8.6) recuperação feita por OUTRA operação (botão da grade na ficha de B): observação de A aplicada nos dados do painel e aviso fixo some', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    await editarA(c);
    falhaObs(c.amb, 99);
    await c.clicarEsperar('#fichaSalvar');
    await c.fechar();
    c.amb.limparFalhas();
    await c.abrir('PST1002');
    await c.clicarEsperar('#fichaGrade');
    const t = await c.tela();
    igual([t.fichaAtual, t.pendenteVisivel, t.listaNome, t.listaObs], ['PST1002', false, 'Nome ajustado', 'Observação nova'], 'dados de A atualizados');
    igual(persistido(c.amb, 'PST1001'), { nome: 'Nome ajustado', obs: 'Observação nova', pendente: false });
    await fim(c);
  });

  await teste('14i. (1.8.6) exceção depois de remover o registro: "Alterações salvas." com a observação; sem aviso de pendência', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    await editarA(c);
    c.amb.injetarFalha((e) => e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV, 1);
    await c.clicarEsperar('#fichaSalvar');
    const t = await c.tela();
    igual([t.aviso, t.nome, t.obs, t.alterada, t.pendenteVisivel, t.listaObs], ['Alterações salvas.', 'Nome ajustado', 'Observação nova', false, false, 'Observação nova']);
    igual(persistido(c.amb, 'PST1001'), { nome: 'Nome ajustado', obs: 'Observação nova', pendente: false });
    await fim(c);
  });

  await teste('14j. (1.8.6) remoção feita e leitura falhando: "Não foi possível confirmar", rascunho preservado, aviso fixo sem botão', async () => {
    const c = await montar();
    await c.abrir('PST1001');
    await editarA(c);
    let removido = false;
    c.amb.injetarFalha((e) => { if (e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV) { removido = true; return true; } return false; }, 1);
    c.amb.injetarFalhaLeitura(() => removido, 999);
    await c.clicarEsperar('#fichaSalvar');
    c.amb.limparFalhas();
    const t = await c.tela();
    verdade(/Não foi possível confirmar o salvamento de PST1001/.test(t.aviso), t.aviso);
    igual([t.nome, t.obs, t.alterada, t.nomeTravado, t.salvarTravado, t.pendenteVisivel], ['Nome ajustado', 'Observação nova', true, false, false, true], 'rascunho e aviso');
    verdade(/Salvamento não confirmado/.test(t.pendenteTexto) && !/Concluir salvamento pendente/.test(t.pendenteTexto), t.pendenteTexto);
    // salvar de novo (repetir o rascunho) conclui sem duplicar
    await c.clicarEsperar('#fichaSalvar');
    const t2 = await c.tela();
    igual([t2.aviso, t2.alterada, t2.pendenteVisivel, t2.listaObs], ['Alterações salvas.', false, false, 'Observação nova']);
    igual(persistido(c.amb, 'PST1001'), { nome: 'Nome ajustado', obs: 'Observação nova', pendente: false });
    await fim(c);
  });

  await nav.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('ERRO GERAL:', e && e.stack || e); process.exit(1); });

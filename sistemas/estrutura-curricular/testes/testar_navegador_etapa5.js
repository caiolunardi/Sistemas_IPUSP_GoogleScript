// Etapa 5 (1.8.7; 16i–16j da correção complementar 1.8.8) na interface real (Chromium) com o servidor real no
// simulador: ações em lote (etapa 3 "Enviar para a Grade Horária", Prévia
// "Remover da grade", lista da etapa 1 "Excluir", ficha "Excluir" e botão da
// grade com UM item) com falhas injetadas na planilha (mockGoogle.js) e,
// quando preciso, respostas CONTROLADAS (opção "portao" de
// ambiente_navegador.js). Confere: resultado confirmado, aviso fixo de ação
// pendente (com "Concluir" só quando retomável) ou não confirmada, listas
// com os dados LIDOS, seleção mantida, camada de carregamento e controles
// liberados, rascunho de ficha preservado, recuperação feita durante outro
// pedido (aceito ou recusado) e respostas atrasadas com outra ficha aberta.
// Estrutura curricular SINTÉTICA (PST1001, PST1002, 4701003, PSA1004,
// PSE1005) e outros cursos sintéticos (PST2001, PST2002).
// Uso: node testar_navegador_etapa5.js <grade_curricular.csv>
'use strict';
const fs = require('fs');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const [csvPath] = process.argv.slice(2);
if (!csvPath) { console.log('Uso: node testar_navegador_etapa5.js <grade_curricular.csv>'); process.exit(2); }

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
const PROP_LOTE = 'estruturaCurricular.lote';
const AJ = 'Ajustes manuais';
const OU = 'Disciplinas para outros cursos';
const ADMIN = 'dono@unidade.example';
const A2 = [{ origem: 'estrutura', chave: 'PST1001' }, { origem: 'outros', chave: 'PST2001' }];
function objetos(aba) {
  if (!aba || aba.getLastRow() < 2) return [];
  const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { if (t) o[t] = l[i]; }); return o; });
}
function marcas(amb, origem, chave) {
  const l = origem === 'estrutura'
    ? objetos(amb.estrutura().getSheetByName(AJ)).filter((a) => String(a['Disciplina (código no Júpiter)']) === chave)
    : objetos(amb.estrutura().getSheetByName(OU)).filter((o) => String(o['Identificador']) === chave);
  if (l.length > 1) throw new Error('linhas duplicadas');
  return l.length ? ((l[0]['Excluída'] === 'Sim' ? 'E' : '') + (l[0]['Adicionada à grade horária'] === 'Sim' ? 'G' : '') || '-') : '-';
}
const sit = (amb) => ({ PST1001: marcas(amb, 'estrutura', 'PST1001'), PST2001: marcas(amb, 'outros', 'PST2001'), pendente: !!amb.props[PROP_LOTE] });
const falhaOutros = (amb, vezes) => amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === OU, vezes);

let nav;
/** Base: estrutura sintética; PST1001/PST1002 com 1º semestre; outros PST2001 (1º) e PST2002 (2º). preparar(amb) roda antes de abrir a página. */
async function montar(opcoes) {
  opcoes = opcoes || {};
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN });
  pedir(amb.ctx.obterDadosPainel());
  const pk = pacote();
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  ['PST1001', 'PST1002'].forEach((k) => pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: k, campos: { oferecimento: '1' }, oferta: null })));
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Outra 2001', oferecimento: '1' } }));
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2002', nome: 'Outra 2002', oferecimento: '2' } }));
  if (opcoes.preparar) opcoes.preparar(amb);
  const fila = [];
  const nomes = new Set(opcoes.segurar || []);
  const chamadas = [];
  const portao = (nome, args) => { chamadas.push(nome); return nomes.has(nome) ? new Promise((liberar) => fila.push({ nome, args, liberar })) : null; };
  const { pagina, errosPagina } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0, portao });
  const dialogos = [];
  pagina.on('dialog', (d) => { dialogos.push(d.message()); d.accept(); });
  await esperarCarregado(pagina);
  const c = { amb, pagina, errosPagina, fila, dialogos, chamadas };
  c.respostas = () => pagina.evaluate(() => window.__gasRespondidas || 0);
  c.esperarResposta = async (n) => { await pagina.waitForFunction((k) => (window.__gasRespondidas || 0) >= k, n, { timeout: 15000 }); await pagina.evaluate(() => new Promise((r) => setTimeout(r, 20))); };
  c.clicarEsperar = async (seletor) => { const n = await c.respostas(); await pagina.click(seletor); await c.esperarResposta(n + 1); };
  c.esperarFila = async (n) => { const t0 = Date.now(); while (c.fila.length < n) { if (Date.now() - t0 > 10000) throw new Error('chamada não chegou'); await new Promise((r) => setTimeout(r, 20)); } };
  c.liberar = async (i) => { const n = await c.respostas(); c.fila[i].liberar(null); await c.esperarResposta(n + 1); };
  c.abrir = async (corpo, id) => { await pagina.click('#' + corpo + ' tr[data-id="' + id + '"] td:nth-child(2)'); await pagina.waitForSelector('#modalDisciplina:not([hidden])'); };
  c.fechar = async () => { await pagina.click('#modalDisciplina .modal__fechar'); await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' }); };
  c.tela = () => pagina.evaluate(() => {
    const $ = (id) => document.getElementById(id);
    const pend = $('salvamentoPendente');
    const prep = Painel.estado.dados.preparacao;
    const m = (lst, k) => { const x = lst.find((a) => a.chave === k); return x ? ((x.excluida ? 'E' : '') + (x.naGrade ? 'G' : '') || '-') : '-'; };
    const carregando = $('carregando');
    return {
      aviso: $('aviso').hidden ? '' : $('aviso').textContent,
      pendenteVisivel: !!pend && !pend.hidden, pendenteTexto: pend && !pend.hidden ? pend.textContent : '',
      botaoConcluirLote: !!document.querySelector('[data-concluir-lote]'), botaoDescartarLote: !!document.querySelector('[data-descartar-lote]'),
      dados: { PST1001: m(prep.ajustes, 'PST1001'), PST2001: m(prep.outros, 'PST2001'), PST1002: m(prep.ajustes, 'PST1002') },
      carregandoVisivel: !!carregando && !carregando.hidden && getComputedStyle(carregando).display !== 'none',
      fichaAberta: !$('modalDisciplina').hidden, fichaAtual: Painel.estado.fichaAtual,
      nome: $('fichaCampo-nome') ? $('fichaCampo-nome').value : null, nomeTravado: $('fichaCampo-nome') ? $('fichaCampo-nome').disabled : null,
      salvarTravado: $('fichaSalvar') ? $('fichaSalvar').disabled : null, alterada: window.Preparacao.fichaAlterada()
    };
  });
  return c;
}
async function fim(c) { igual(c.errosPagina, [], 'erros de JavaScript na página'); await c.pagina.context().close(); }
/** Etapa 3: escolhe PST1001 e PST2001 e clica "Enviar para a Grade Horária". */
async function escolherEtapa3(c) {
  await c.pagina.click('#etapa-3');
  await c.pagina.check('#gCorpoTabela tr[data-id="PST1001"] .caixaSelecao');
  await c.pagina.check('#gCorpoTabela tr[data-id="O:PST2001"] .caixaSelecao');
}

(async () => {
  nav = await abrirNavegador();
  console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
  console.log('\n== 16. Interface');

  await teste('16a. etapa 3, lote misto (estrutura + outros cursos) concluído: aviso de sucesso, listas com o gravado, sem aviso fixo, carregamento escondido', async () => {
    const c = await montar();
    await escolherEtapa3(c);
    await c.clicarEsperar('#gBarraLote [data-lote="enviarGrade"]');
    const t = await c.tela();
    igual([t.aviso, t.pendenteVisivel, t.dados.PST1001, t.dados.PST2001, t.carregandoVisivel], ['2 disciplinas adicionadas à grade horária.', false, 'G', 'G', false]);
    igual(sit(c.amb), { PST1001: 'G', PST2001: 'G', pendente: false });
    await fim(c);
  });

  await teste('16b. etapa 3, lote misto PENDENTE (escrita de outros cursos falhando): aviso do que falta, aviso fixo com "Concluir ação pendente", listas com o lido, seleção mantida; "Concluir" conclui', async () => {
    const c = await montar();
    await escolherEtapa3(c);
    falhaOutros(c.amb, 99);
    await c.clicarEsperar('#gBarraLote [data-lote="enviarGrade"]');
    const t = await c.tela();
    verdade(/não terminou/.test(t.aviso) && /1 de 2 já estão gravadas/.test(t.aviso), t.aviso);
    verdade(/Ação em lote pendente — Adicionar à grade horária \(2 disciplinas\)/.test(t.pendenteTexto) && t.botaoConcluirLote && !t.botaoDescartarLote, t.pendenteTexto);
    igual([t.dados.PST1001, t.dados.PST2001, t.carregandoVisivel], ['G', '-', false], 'dados lidos: só a estrutura gravada');
    const marcado = await c.pagina.isChecked('#gCorpoTabela tr[data-id="O:PST2001"] .caixaSelecao');
    const barra = (await c.pagina.textContent('#gBarraLote')).replace(/\s+/g, ' ');
    verdade(marcado && /1 escolhida/.test(barra) && !(await c.pagina.isDisabled('#gBarraLote [data-lote="enviarGrade"]')), 'seleção do que falta mantida e utilizável: ' + barra);
    igual(sit(c.amb), { PST1001: 'G', PST2001: '-', pendente: true });
    c.amb.limparFalhas();
    await c.clicarEsperar('[data-concluir-lote]');
    const t2 = await c.tela();
    igual([t2.aviso, t2.pendenteVisivel, t2.dados.PST1001, t2.dados.PST2001], ['Ação "Adicionar à grade horária" concluída.', false, 'G', 'G']);
    igual(sit(c.amb), { PST1001: 'G', PST2001: 'G', pendente: false });
    await fim(c);
  });

  await teste('16c. Prévia "Remover da grade" (lote misto) NÃO CONFIRMADO (registro encerrado + leitura falhando): aviso fixo sem "Concluir", seleção mantida, controles livres; repetir conclui', async () => {
    const c = await montar({ preparar: (amb) => pedir(amb.ctx.adicionarAGrade(A2)) });
    await c.pagina.click('#etapa-4');
    if (await c.pagina.$('#previa-aba-PST')) await c.pagina.click('#previa-aba-PST');
    await c.pagina.waitForSelector('#previaPaineis tbody tr[data-codigo="PST2001"]', { timeout: 5000 });
    await c.pagina.check('#previaTodas');
    let rem = false;
    c.amb.injetarFalha((e) => { if (e.tipo === 'propriedadeRemoverDepois' && e.chave === PROP_LOTE) { rem = true; return true; } return false; }, 1);
    c.amb.injetarFalhaLeitura(() => rem, 999);
    await c.clicarEsperar('[data-previa-remover]');
    c.amb.limparFalhas();
    const t = await c.tela();
    verdade(/Não foi possível confirmar a ação "Remover da grade horária"/.test(t.aviso), t.aviso);
    verdade(/Ação em lote não confirmada/.test(t.pendenteTexto) && !t.botaoConcluirLote, t.pendenteTexto);
    igual(t.carregandoVisivel, false);
    verdade(/selecionad/.test(await c.pagina.textContent('#previaPaineis .barraLote')), 'seleção da prévia mantida');
    igual(sit(c.amb), { PST1001: '-', PST2001: '-', pendente: false }, 'o que de fato ficou');
    await c.clicarEsperar('[data-previa-remover]');
    const t2 = await c.tela();
    verdade(/Removidas da grade: 0/.test(t2.aviso) && !t2.pendenteVisivel, t2.aviso + ' | ' + t2.pendenteTexto);
    igual([t2.dados.PST1001, t2.dados.PST2001], ['-', '-'], 'dados lidos depois de repetir');
    await fim(c);
  });

  await teste('16d. lote pendente concluído durante OUTRO pedido aceito (salvar outra ficha): aviso distingue a recuperação, listas atualizadas sem reabrir fichas, aviso fixo some', async () => {
    const c = await montar({ preparar: (amb) => pedir(amb.ctx.adicionarAGrade(A2)) });
    falhaOutros(c.amb, 99);
    igual(c.amb.ctx.excluirDisciplinas(A2, true).codigo, 'LOTE_PENDENTE');   // fora da página: ela ainda mostra o estado de antes
    c.amb.limparFalhas();
    await c.abrir('corpoTabela', 'PSE1005');
    await c.pagina.fill('#fichaCampo-nome', 'Nome de PSE1005');
    await c.clicarEsperar('#fichaSalvar');
    const t = await c.tela();
    verdade(/^Alterações salvas\. \(Antes, foi concluída a ação pendente "Excluir" em 2 disciplinas/.test(t.aviso), t.aviso);
    igual([t.dados.PST1001, t.dados.PST2001, t.pendenteVisivel, t.fichaAtual, t.nome], ['E', 'E', false, 'PSE1005', 'Nome de PSE1005']);
    igual(sit(c.amb), { PST1001: 'E', PST2001: 'E', pendente: false });
    await fim(c);
  });

  await teste('16e. lote pendente concluído durante outro pedido RECUSADO (código repetido): rascunho preservado, dados do lote aplicados, aviso com a recusa e a recuperação', async () => {
    const c = await montar({ preparar: (amb) => pedir(amb.ctx.adicionarAGrade(A2)) });
    falhaOutros(c.amb, 99);
    c.amb.ctx.excluirDisciplinas(A2, true);
    c.amb.limparFalhas();
    await c.abrir('corpoTabela', 'PSE1005');
    await c.pagina.fill('#fichaCampo-nome', 'Rascunho de PSE1005');
    await c.pagina.fill('#fichaCampo-codigo', 'PST1002');
    await c.clicarEsperar('#fichaSalvar');
    const t = await c.tela();
    verdade(/PST1002 já é usado/.test(t.aviso) && /\(Antes, foi concluída a ação pendente "Excluir"/.test(t.aviso), t.aviso);
    igual([t.fichaAtual, t.nome, t.alterada, t.nomeTravado, t.salvarTravado], ['PSE1005', 'Rascunho de PSE1005', true, false, false], 'rascunho e controles');
    igual([t.dados.PST1001, t.dados.PST2001], ['E', 'E'], 'dados confirmados do lote aplicados');
    await fim(c);
  });

  await teste('16f. ficha, UM item: "Excluir" (outros cursos) pendente → ficha continua aberta e livre, aviso fixo; botão da grade com resposta ATRASADA e pendente, com a ficha de B aberta e editada → B e o rascunho intactos', async () => {
    const c = await montar({ segurar: ['adicionarAGrade'] });
    await c.pagina.click('#etapa-2');
    await c.abrir('oCorpoTabela', 'O:PST2001');
    falhaOutros(c.amb, 99);
    await c.clicarEsperar('#fichaExcluir');
    const t = await c.tela();
    verdade(/Ação em lote pendente — Excluir \(1 disciplina\)/.test(t.pendenteTexto) && t.botaoConcluirLote, t.pendenteTexto);
    igual([t.fichaAberta, t.fichaAtual, t.salvarTravado, t.carregandoVisivel, t.dados.PST2001], [true, 'O:PST2001', true, false, '-'], 'ficha continua aberta (não fechou como se tivesse excluído), sem edição pendente');
    verdade(!(await c.pagina.isDisabled('#fichaExcluir')), 'botão Excluir liberado');
    c.amb.limparFalhas();
    await c.fechar();
    await c.clicarEsperar('[data-concluir-lote]');
    igual([(await c.tela()).dados.PST2001, sit(c.amb).PST2001], ['E', 'E']);
    // resposta atrasada: botão da grade na ficha de PST2002 (outros, 2º semestre), depois B aberta e editada
    await c.abrir('oCorpoTabela', 'O:PST2002');
    falhaOutros(c.amb, 99);
    await c.pagina.click('#fichaGrade');
    await c.esperarFila(1);
    await c.fechar();   // gravação em andamento: a confirmação é aceita
    await c.pagina.click('#etapa-1');
    await c.abrir('corpoTabela', 'PST1002');
    await c.pagina.fill('#fichaCampo-nome', 'B rascunho');
    await c.liberar(0);
    const t2 = await c.tela();
    igual([t2.fichaAtual, t2.nome, t2.alterada, t2.salvarTravado, t2.nomeTravado], ['PST1002', 'B rascunho', true, false, false], 'ficha B e rascunho intactos');
    verdade(/Ação em lote pendente — Adicionar à grade horária \(1 disciplina\)/.test(t2.pendenteTexto), t2.pendenteTexto);
    verdade(/PST2002/.test(t2.aviso), 'aviso cita a disciplina de origem: ' + t2.aviso);
    igual(sit(c.amb).pendente, true);
    await fim(c);
  });

  await teste('16g. botão da grade na ficha (UM item de outros cursos) pendente: controles da ficha liberados, aviso fixo; abertura do painel depois conclui com aviso', async () => {
    const c = await montar();
    await c.pagina.click('#etapa-2');
    await c.abrir('oCorpoTabela', 'O:PST2001');
    falhaOutros(c.amb, 99);
    await c.clicarEsperar('#fichaGrade');
    const t = await c.tela();
    igual([t.fichaAberta, t.nomeTravado, t.carregandoVisivel, t.pendenteVisivel, t.dados.PST2001], [true, false, false, true, '-']);
    verdade(!(await c.pagina.isDisabled('#fichaGrade')), 'botão da grade liberado');
    c.amb.limparFalhas();
    await c.pagina.context().close();
    const amb2 = criarAmbiente({ dirSrc: DIR_SRC, reusar: c.amb, usuario: ADMIN, dono: ADMIN });
    const { pagina, errosPagina } = await abrirPainel(nav, { amb: amb2, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pagina);
    const aviso = await pagina.textContent('#aviso');
    verdade(/A ação "Adicionar à grade horária" que tinha ficado pendente foi concluída/.test(aviso), aviso);
    igual([sit(amb2).PST2001, await pagina.evaluate(() => { const p = document.getElementById('salvamentoPendente'); return !p || p.hidden; })], ['G', true]);
    igual(errosPagina, []);
    await pagina.context().close();
  });

  await teste('16h. etapa 1, "Excluir" em lote (2 da estrutura) pendente: aviso, aviso fixo, seleção mantida e utilizável, sem erro na página; "Concluir" conclui e a lista mostra as excluídas', async () => {
    const c = await montar();
    await c.pagina.check('#corpoTabela tr[data-id="PST1001"] .caixaSelecao');
    await c.pagina.check('#corpoTabela tr[data-id="PST1002"] .caixaSelecao');
    c.amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === AJ, 99);
    await c.clicarEsperar('#barraLote [data-lote="excluir"]');
    const t = await c.tela();
    verdade(/não terminou/.test(t.aviso) && /nenhuma está gravada ainda/.test(t.aviso), t.aviso);
    verdade(/Ação em lote pendente — Excluir \(2 disciplinas\)/.test(t.pendenteTexto), t.pendenteTexto);
    verdade(await c.pagina.isChecked('#corpoTabela tr[data-id="PST1001"] .caixaSelecao') && await c.pagina.isChecked('#corpoTabela tr[data-id="PST1002"] .caixaSelecao'), 'seleção mantida');
    verdade(!(await c.pagina.isDisabled('#barraLote [data-lote="excluir"]')), 'botão liberado');
    c.amb.limparFalhas();
    await c.clicarEsperar('[data-concluir-lote]');
    const t2 = await c.tela();
    igual([t2.dados.PST1001, t2.dados.PST1002, t2.pendenteVisivel], ['E', 'E', false]);
    await fim(c);
  });

  // (1.8.8) Correção complementar: "Concluir ação pendente" concluído e conferido, com a leitura final falhando.
  await teste('16i. (1.8.8) "Concluir ação pendente" conclui e confere, mas a leitura final falha: aviso fixo de recarga continua (sem "Concluir"/"Descartar"), mensagem diz que a tela não foi atualizada, dados de antes mantidos, controles livres, ficha aberta e rascunho intactos; recarga normal mostra as duas exclusões', async () => {
    const c = await montar({ preparar: (amb) => { falhaOutros(amb, 99); igual(amb.ctx.excluirDisciplinas(A2, true).codigo, 'LOTE_PENDENTE'); } });   // a falha continua durante a carga da página
    const t0 = await c.tela();
    verdade(/Ação em lote pendente — Excluir \(2 disciplinas\)/.test(t0.pendenteTexto) && t0.botaoConcluirLote, 'carga: ' + t0.pendenteTexto);
    igual([t0.dados.PST1001, t0.dados.PST2001, sit(c.amb)], ['E', '-', { PST1001: 'E', PST2001: '-', pendente: true }], 'carga: parcial lido e pedido registrado');
    // a escrita volta; a LEITURA passa a falhar só depois da remoção do registro (aplicação e conferência já feitas)
    c.amb.limparFalhas();
    let removido = false;
    c.amb.injetarFalha((e) => { if (e.tipo === 'propriedadeRemoverDepois' && e.chave === PROP_LOTE) removido = true; return false; }, 99);
    const fl = c.amb.injetarFalhaLeitura(() => removido, 9999);
    const respostas = [];
    const orig = c.amb.ctx.resolverLotePendente;
    c.amb.ctx.resolverLotePendente = function () { const r = orig.apply(null, arguments); respostas.push(JSON.parse(JSON.stringify(r))); return r; };
    // outra ficha aberta com rascunho (o aviso fixo fica atrás dela: o botão é acionado direto, como no 14c)
    await c.abrir('corpoTabela', 'PSE1005');
    await c.pagina.fill('#fichaCampo-nome', 'Rascunho de PSE1005');
    const n = await c.respostas();
    const temBotao = await c.pagina.evaluate(() => { const b = document.querySelector('[data-concluir-lote]'); if (b) b.click(); return !!b; });
    verdade(temBotao, 'botão "Concluir ação pendente"');
    await c.esperarResposta(n + 1);
    await c.pagina.waitForTimeout(50);   // callbacks e temporizadores da resposta
    const t = await c.tela();
    c.amb.limparFalhas();
    const r = respostas[0];
    console.log('     retrato: resposta ' + JSON.stringify({ ok: r && r.ok, resultado: r && r.dados && r.dados.resultado, preparacao: r && r.dados ? r.dados.preparacao : '?', leituraFalhou: r && r.dados && r.dados.leituraFalhou }) +
      ' | planilha ' + JSON.stringify(sit(c.amb)) + ' | painel ' + JSON.stringify({ PST1001: t.dados.PST1001, PST2001: t.dados.PST2001 }) +
      ' | aviso fixo ' + JSON.stringify(t.pendenteVisivel ? t.pendenteTexto : '(oculto)') + ' | mensagem ' + JSON.stringify(t.aviso) + ' | leituras recusadas ' + fl.disparos + ' | remoção do registro observada ' + removido);
    igual([r.ok, r.dados.resultado, r.dados.preparacao, r.dados.leituraFalhou], [true, 'concluido', null, true], 'resposta real do servidor');
    verdade(removido && fl.disparos > 0, 'leitura recusada depois da remoção do registro');
    igual(sit(c.amb), { PST1001: 'E', PST2001: 'E', pendente: false }, 'planilha: as duas excluídas; registro encerrado');
    verdade(t.pendenteVisivel && /Gravação concluída/.test(t.pendenteTexto) && /Recarregue a página/.test(t.pendenteTexto), 'aviso fixo de recarga: ' + (t.pendenteTexto || '(oculto)'));
    igual([t.botaoConcluirLote, t.botaoDescartarLote], [false, false], 'sem "Concluir"/"Descartar" para a ação encerrada');
    verdade(/concluída/.test(t.aviso) && /não conseguiu atualizar/.test(t.aviso) && /recarregue a página/.test(t.aviso), 'mensagem final: ' + t.aviso);
    igual([t.dados.PST1001, t.dados.PST2001], ['E', '-'], 'painel continua com os dados de antes (desatualizados), sem fingir leitura nova');
    igual([t.carregandoVisivel, t.fichaAberta, t.fichaAtual, t.nome, t.alterada, t.nomeTravado, t.salvarTravado], [false, true, 'PSE1005', 'Rascunho de PSE1005', true, false, false], 'carregamento escondido; ficha aberta, rascunho e controles intactos');
    await fim(c);
    // recarga normal (sem falha de leitura): as duas exclusões e nenhum aviso
    const amb2 = criarAmbiente({ dirSrc: DIR_SRC, reusar: c.amb, usuario: ADMIN, dono: ADMIN });
    const { pagina, errosPagina } = await abrirPainel(nav, { amb: amb2, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pagina);
    const depois = await pagina.evaluate(() => {
      const p = document.getElementById('salvamentoPendente'); const prep = Painel.estado.dados.preparacao;
      const m = (lst, k) => { const x = lst.find((a) => a.chave === k); return x ? ((x.excluida ? 'E' : '') + (x.naGrade ? 'G' : '') || '-') : '-'; };
      return { avisoFixo: !!p && !p.hidden, PST1001: m(prep.ajustes, 'PST1001'), PST2001: m(prep.outros, 'PST2001') };
    });
    console.log('     depois da recarga: ' + JSON.stringify(depois));
    igual(depois, { avisoFixo: false, PST1001: 'E', PST2001: 'E' }, 'recarga com leitura normal');
    igual(errosPagina, []);
    await pagina.context().close();
  });

  await teste('16j. (1.8.8) "Concluir ação pendente" com leitura válida: dados atualizados e aviso do lote removido', async () => {
    const c = await montar({ preparar: (amb) => { falhaOutros(amb, 99); amb.ctx.excluirDisciplinas(A2, true); } });
    const t0 = await c.tela();
    verdade(t0.botaoConcluirLote, 'carga: ' + t0.pendenteTexto);
    c.amb.limparFalhas();
    await c.clicarEsperar('[data-concluir-lote]');
    const t = await c.tela();
    igual([t.aviso, t.pendenteVisivel, t.dados.PST1001, t.dados.PST2001, t.carregandoVisivel, sit(c.amb)], ['Ação "Excluir" concluída.', false, 'E', 'E', false, { PST1001: 'E', PST2001: 'E', pendente: false }]);
    await fim(c);
  });

  await teste('16k. (1.8.8, RESPOSTA SIMULADA — stub do portão, sem executar o servidor) resultado "nenhum" sem leitura: aviso fixo de recarga, mensagem sem afirmar atualização', async () => {
    const c = await montar({ segurar: ['resolverLotePendente'], preparar: (amb) => { falhaOutros(amb, 99); amb.ctx.excluirDisciplinas(A2, true); } });
    verdade((await c.tela()).botaoConcluirLote, 'carga com a pendência');
    await c.pagina.click('[data-concluir-lote]');
    await c.esperarFila(1);
    const n = await c.respostas();
    c.fila[0].liberar({ resposta: { ok: true, dados: { resultado: 'nenhum', preparacao: null, leituraFalhou: true } } });
    await c.esperarResposta(n + 1);
    const t = await c.tela();
    verdade(/Recarregue a página/.test(t.pendenteTexto) && !t.botaoConcluirLote && !t.botaoDescartarLote, t.pendenteTexto || '(oculto)');
    verdade(/^Não há ação em lote pendente\. O painel não conseguiu atualizar/.test(t.aviso), t.aviso);
    igual([t.dados.PST1001, t.dados.PST2001, t.carregandoVisivel], ['E', '-', false], 'dados de antes, carregamento escondido');
    await fim(c);
  });

  await nav.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
  if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.log('ERRO GERAL:', e && e.stack || e); process.exit(1); });

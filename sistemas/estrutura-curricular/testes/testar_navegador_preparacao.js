// Testes da preparação da grade (1.3.0) no Chromium real: etapas, ficha
// editável, Observações, exclusão/restauração (lote e ficha), lista por
// unidade (CSV), cadastro manual, lista para a grade (seleção) e a visão
// do leitor. Backend real no simulador (mockGoogle.js); dados fictícios
// além dos arquivos do Júpiter passados na linha de comando.
// Uso: node testar_navegador_preparacao.js <grade_curricular.csv> <disciplinas_unidade.csv> [<arquivo.pdf>]
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');

const [csvPath, unidadePath, pdfPath] = process.argv.slice(2);
const SAIDA = path.join(__dirname, 'saida', 'preparacao');
fs.mkdirSync(SAIDA, { recursive: true });

let ok = 0, falhas = 0;
const falhou = [];
async function teste(nome, fn) {
  const t0 = Date.now();
  try { await fn(); ok++; console.log('  ✓', nome, '(' + Math.round((Date.now() - t0) / 1000) + ' s)'); }
  catch (e) {
    falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 5).join('\n      '));
    // Não deixa uma janela aberta derrubar os testes seguintes.
    if (recuperar) await recuperar().catch(() => {});
  }
}
let recuperar = null;
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

const errosAnteriores = [];
const leitores = carregar();
const pacote = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');

function abaObjs(amb, nome) {
  const s = amb.estrutura().getSheetByName(nome);
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { o[t] = l[i]; }); return o; });
}

(async () => {
  const nav = await abrirNavegador();
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  amb.ctx.obterDadosPainel();
  const p0 = amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pacote)));
  verdade(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pacote)), p0.dados.assinatura, { operacao: p0.dados.operacao, previa: p0.dados.impressao }).ok, 'carga inicial');
  const totalEstrutura = amb.ctx.obterDadosPainel().dados.base.disciplinas.filter((d) => d.situacao === 'Na estrutura atual').length;

  let { pagina, errosPagina, chamadas, contexto } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0 });
  // Diálogos de confirmação: a resposta é definida em cada teste.
  let respostaDialogo = true;
  const dialogos = [];
  const ligarDialogos = (pg) => pg.on('dialog', (d) => { dialogos.push(d.message()); return respostaDialogo ? d.accept() : d.dismiss(); });
  ligarDialogos(pagina);
  await esperarCarregado(pagina);
  const contagem = (p) => pagina.textContent('#' + (p ? p + 'ContagemResultado' : 'contagemResultado')).then((t) => Number((t.match(/\d+/) || ['-1'])[0]));
  recuperar = () => pagina.evaluate(() => {
    ['modalDisciplina', 'modalUnidade', 'modalImportacao'].forEach((id) => { const m = document.getElementById(id); if (m && !m.hidden) { m.hidden = true; document.body.classList.remove('modalAberto'); } });
  });
  async function abrirLinha(prefixo, codigo) {
    await pagina.fill('#' + (prefixo ? prefixo + 'CampoBusca' : 'campoBusca'), codigo);
    await pagina.waitForTimeout(250);
    await pagina.click('#' + (prefixo ? prefixo + 'CorpoTabela' : 'corpoTabela') + ' tr[data-codigo="' + codigo + '"] td:nth-child(2)');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
  }
  async function fecharFicha() {
    await pagina.click('#modalDisciplina .modal__fechar');
    await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
  }

  console.log('\n== Etapas');
  await teste('administrador vê as 4 etapas com contagens, "Cadastrar nova grade" e "Carregar grade antiga" (desativado); a etapa 1 tem a coluna de caixas', async () => {
    verdade(await pagina.isVisible('#etapas'), 'barra de etapas');
    igual(await pagina.getAttribute('#etapa-1', 'aria-selected'), 'true');
    igual(await pagina.locator('#etapas [role="tab"]').count(), 4);
    igual((await pagina.textContent('#etapa-4 .etapas__titulo')).trim(), 'Prévia da grade horária');
    igual((await pagina.textContent('#etapaContagem1')).trim(), totalEstrutura + ' disciplinas');
    igual((await pagina.textContent('#etapaContagem2')).trim(), '0 disciplinas');
    igual((await pagina.textContent('#etapaContagem3')).trim(), '0 adicionadas à grade');
    igual((await pagina.textContent('#etapaContagem4')).trim(), '0 disciplinas');
    verdade(await pagina.isVisible('[data-cadastrar-nova-grade]') && await pagina.isEnabled('[data-cadastrar-nova-grade]'), 'Cadastrar nova grade');
    verdade(await pagina.isDisabled('#carregarGradeAntiga'), 'Carregar grade antiga ainda não funciona');
    verdade(await pagina.isVisible('#cabSelecao #selTodos'), 'caixa "selecionar todas" no cabeçalho');
    igual(await pagina.locator('#corpoTabela .caixaSelecao').count(), totalEstrutura);
    // Teclado: setas trocam de etapa.
    await pagina.focus('#etapa-1');
    await pagina.keyboard.press('ArrowRight');
    verdade(await pagina.isVisible('#etapaPainel-2') && !(await pagina.isVisible('#etapaPainel-1')), 'etapa 2 pela seta');
    verdade(!(await pagina.isVisible('#estadoBase')), 'cartão da base só na etapa 1');
    await pagina.keyboard.press('ArrowLeft');
    verdade(await pagina.isVisible('#etapaPainel-1'), 'volta à etapa 1');
    await pagina.screenshot({ path: path.join(SAIDA, 'p01-etapas-lista.png') });
  });

  console.log('\n== Ficha editável');
  await teste('ficha do administrador: campos editáveis, "Salvar" só com alteração; salva nome, créditos e Observações; ajuste guardado só com o que mudou', async () => {
    await abrirLinha('', 'PSC1322');
    verdade(await pagina.isVisible('#fichaSalvar'), 'botão Salvar');
    verdade(await pagina.isDisabled('#fichaSalvar'), 'Salvar desabilitado sem alteração');
    igual(await pagina.inputValue('#fichaCampo-codigo'), 'PSC1322');
    igual(await pagina.inputValue('#fichaCampo-creditosTrabalho'), '2');
    // Rodapé: Excluir à esquerda, Fechar e Salvar à direita.
    const botoes = await pagina.$$eval('#modalDisciplina .modal__rodape button:not([hidden])', (bs) => bs.map((b) => b.textContent.trim()));
    igual(botoes, ['Excluir disciplina', 'Adicionar à Grade Horária', 'Fechar', 'Salvar']);
    await pagina.fill('#fichaCampo-nome', 'Psicopatologia (nome ajustado no teste)');
    await pagina.fill('#fichaCampo-creditosAula', '4');
    igual((await pagina.textContent('#fichaChAviso')).trim(), 'Pelos créditos seriam 120 h — confira a CH.', 'aviso de CH');
    await pagina.fill('#fichaObservacoes', 'Disciplina prática (observação de teste).');
    verdade(await pagina.isEnabled('#fichaSalvar'), 'Salvar habilitado');
    await pagina.screenshot({ path: path.join(SAIDA, 'p02-ficha-editando.png'), fullPage: true });
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => /Júpiter:/.test(document.getElementById('modalDisciplinaCorpo').textContent));
    verdade(await pagina.isDisabled('#fichaSalvar'), 'depois de salvar, sem alteração pendente');
    const dica = await pagina.textContent('#fichaCampo-nome-dica');
    verdade(/Ajustado · Júpiter: Psicopatologia/.test(dica) || /Ajustado · Júpiter:/.test(dica), dica);
    igual(await pagina.textContent('#modalDisciplinaTitulo'), 'Psicopatologia (nome ajustado no teste)');
    // Planilha: só os campos diferentes do Júpiter; observação na aba Disciplinas.
    const aj = abaObjs(amb, 'Ajustes manuais').find((a) => a['Disciplina (código no Júpiter)'] === 'PSC1322');
    verdade(aj, 'linha em Ajustes manuais');
    igual([aj['Nome ajustado'], aj['Créditos-aula ajustados'], aj['Código ajustado'], aj['Créditos-trabalho ajustados']], ['Psicopatologia (nome ajustado no teste)', 4, '', ''], 'só o que mudou');
    igual(aj['Alterado por'], 'dono@unidade.example');
    const disc = abaObjs(amb, 'Disciplinas').find((d) => d['Código'] === 'PSC1322');
    igual(disc['Observações'], 'Disciplina prática (observação de teste).');
    await pagina.screenshot({ path: path.join(SAIDA, 'p03-ficha-salva.png'), fullPage: true });
    await fecharFicha();
    const linha = await pagina.textContent('#corpoTabela tr[data-codigo="PSC1322"]');
    verdade(/nome ajustado no teste/.test(linha) && /Ajustada/.test(linha), linha);
  });

  await teste('o ajuste persiste: nova sessão do painel mostra o valor ajustado; filtro "Ajustadas no painel"', async () => {
    await contexto.close();
    ({ pagina, errosPagina: errosPagina, chamadas, contexto } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0 }).then((r) => { errosAnteriores.push(...errosPagina); return r; }));
    ligarDialogos(pagina);
    await esperarCarregado(pagina);
    await pagina.check('[data-filtro="ajustadas"]');
    igual(await contagem(''), 1);
    await pagina.click('#corpoTabela tr[data-codigo="PSC1322"] td:nth-child(2)');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
    igual(await pagina.inputValue('#fichaCampo-nome'), 'Psicopatologia (nome ajustado no teste)');
    igual(await pagina.inputValue('#fichaCampo-creditosAula'), '4');
    igual(await pagina.inputValue('#fichaObservacoes'), 'Disciplina prática (observação de teste).');
    verdade(/Tem 4 créditos-aula/.test(await pagina.textContent('#modalDisciplinaCorpo')), 'resumo usa o valor ajustado');
    await fecharFicha();
    await pagina.uncheck('[data-filtro="ajustadas"]');
  });

  await teste('alterações não salvas: "X" pergunta; "Cancelar" mantém a ficha; ESC e clique fora não fecham', async () => {
    await abrirLinha('', 'PSE2355');
    await pagina.fill('#fichaCampo-nome', 'Nome alterado sem salvar');
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(5, 450);
    verdade(await pagina.isVisible('#modalDisciplina'), 'ESC/clique fora não fecham');
    dialogos.length = 0;
    respostaDialogo = false;
    await pagina.click('#modalDisciplina .modal__fechar');
    igual(dialogos.length, 1, 'perguntou');
    verdade(/Descartar as alterações/.test(dialogos[0]), dialogos[0]);
    verdade(await pagina.isVisible('#modalDisciplina'), 'ficha continua aberta');
    igual(await pagina.inputValue('#fichaCampo-nome'), 'Nome alterado sem salvar');
    respostaDialogo = true;
    await pagina.click('#modalDisciplina .modal__rodape [data-fechar-modal]');
    await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
    verdade(!abaObjs(amb, 'Ajustes manuais').some((a) => a['Disciplina (código no Júpiter)'] === 'PSE2355'), 'nada gravado');
  });

  await teste('"Onde aparece" editável: mudar o tipo numa habilitação grava a oferta ajustada', async () => {
    await abrirLinha('', 'PSE2355');
    const linhas = await pagina.locator('#formFicha [data-oferta-curriculo]').count();
    verdade(linhas >= 3, 'uma linha por habilitação: ' + linhas);
    const primeira = pagina.locator('#formFicha [data-oferta-curriculo]').first();
    const tipoAntes = await primeira.locator('[data-oferta="tipo"]').inputValue();
    await primeira.locator('[data-oferta="tipo"]').selectOption('');
    verdade(await primeira.locator('[data-oferta="periodo"]').isDisabled(), 'período desabilitado sem tipo');
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => /Oferta ajustada no painel/.test(document.getElementById('modalDisciplinaCorpo').textContent));
    const aj = abaObjs(amb, 'Ajustes manuais').find((a) => a['Disciplina (código no Júpiter)'] === 'PSE2355');
    verdade(aj && aj['Oferta ajustada'], 'oferta ajustada gravada');
    verdade(tipoAntes, 'tinha tipo antes');
    // Voltar aos dados do Júpiter + Salvar desfaz tudo.
    await pagina.click('[data-voltar-jupiter]');
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => !/Oferta ajustada no painel/.test(document.getElementById('modalDisciplinaCorpo').textContent));
    verdade(!abaObjs(amb, 'Ajustes manuais').some((a) => a['Disciplina (código no Júpiter)'] === 'PSE2355'), 'linha de ajuste removida');
    await fecharFicha();
  });

  console.log('\n== Exclusão');
  await teste('excluir em lote pelas caixas (com confirmação) e restaurar pelo filtro Situação › Excluídas', async () => {
    await pagina.fill('#campoBusca', '');
    await pagina.waitForTimeout(250);
    const antes = await contagem('');
    const caixas = pagina.locator('#corpoTabela .caixaSelecao');
    await caixas.nth(0).check();
    await caixas.nth(1).check();
    const codigos = await pagina.$$eval('#corpoTabela tr.linhaMarcada', (ls) => ls.map((l) => l.getAttribute('data-codigo')));
    verdade(codigos.length >= 2, 'linhas marcadas: ' + codigos);
    verdade(/disciplinas selecionadas/.test(await pagina.textContent('#barraLote')), 'barra de lote');
    await pagina.screenshot({ path: path.join(SAIDA, 'p04-selecao-lote.png') });
    dialogos.length = 0;
    respostaDialogo = false;
    await pagina.click('#barraLote [data-lote="excluir"]');
    igual(dialogos.length, 1, 'confirmação');
    igual(await contagem(''), antes, 'cancelado: nada excluído');
    respostaDialogo = true;
    await pagina.click('#barraLote [data-lote="excluir"]');
    await pagina.waitForFunction((n) => Number((document.getElementById('contagemResultado').textContent.match(/\d+/) || [0])[0]) === n, antes - codigos.length);
    verdade(await pagina.isHidden('#barraLote'), 'seleção limpa');
    const excl = abaObjs(amb, 'Ajustes manuais').filter((a) => a['Excluída'] === 'Sim').map((a) => a['Disciplina (código no Júpiter)']).sort();
    igual(excl, codigos.slice().sort(), 'flag Excluída na planilha');
    igual((await pagina.textContent('#etapaContagem1')).trim(), (totalEstrutura - codigos.length) + ' disciplinas');
    // Restaurar
    await pagina.selectOption('#filtroSituacao', 'EXCLUIDA');
    igual(await contagem(''), codigos.length);
    verdade(/Excluída/.test(await pagina.textContent('#corpoTabela')), 'selo Excluída');
    await pagina.check('#selTodos');
    verdade(await pagina.isVisible('#barraLote [data-lote="restaurar"]'), 'botão Restaurar');
    await pagina.click('#barraLote [data-lote="restaurar"]');
    await pagina.waitForFunction(() => /^0 /.test(document.getElementById('contagemResultado').textContent));
    await pagina.selectOption('#filtroSituacao', 'NA');
    igual(await contagem(''), antes);
    verdade(!abaObjs(amb, 'Ajustes manuais').some((a) => a['Excluída'] === 'Sim'), 'nenhuma excluída');
  });

  await teste('excluir e restaurar pela ficha', async () => {
    await abrirLinha('', 'PSE2355');
    await pagina.click('#fichaExcluir');
    await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
    igual(await contagem(''), 0, 'sumiu da lista');
    await pagina.selectOption('#filtroSituacao', 'EXCLUIDA');
    await pagina.click('#corpoTabela tr[data-codigo="PSE2355"] td:nth-child(2)');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
    igual((await pagina.textContent('#fichaExcluir')).trim(), 'Restaurar disciplina');
    await pagina.click('#fichaExcluir');
    await pagina.waitForFunction(() => document.getElementById('fichaExcluir').textContent.trim() === 'Excluir disciplina');
    await fecharFicha();
    await pagina.selectOption('#filtroSituacao', 'NA');
    igual(await contagem(''), 1);
    await pagina.fill('#campoBusca', '');
    await pagina.waitForTimeout(250);
  });

  console.log('\n== Etapa 2: disciplinas para outros cursos');
  let novasUnidade = 0;
  await teste('lista por unidade: PDF recusado com explicação; ESC/clique fora não fecham; prévia só com as que não estão na lista', async () => {
    await pagina.click('#etapa-2');
    verdade(/Nenhuma disciplina para outros cursos ainda/.test(await pagina.textContent('#oListaVazia')), 'lista vazia orienta');
    await pagina.click('[data-abrir-unidade]');
    await pagina.waitForSelector('#modalUnidade:not([hidden]) #entradaUnidade', { state: 'attached' });
    if (pdfPath) {
      await pagina.setInputFiles('#entradaUnidade', pdfPath);
      await pagina.waitForFunction(() => /Este é um PDF/.test(document.getElementById('unidadeCorpo').textContent));
    }
    await pagina.setInputFiles('#entradaUnidade', unidadePath);
    await pagina.waitForSelector('.caixaUnidade');
    const txt = await pagina.textContent('#unidadeCorpo');
    const m = /(\d+) disciplinas no arquivo · (\d+) ainda não estão na lista · (\d+) já estão/.exec(txt);
    verdade(m, txt.slice(0, 300));
    novasUnidade = Number(m[2]);
    igual([Number(m[1]), novasUnidade], [198, 34], 'totais do arquivo');
    igual(await pagina.locator('.caixaUnidade').count(), 34);
    verdade(/PST0391/.test(txt), 'PST0391 na prévia');
    verdade(!/PSC1322/.test(txt), 'disciplina da estrutura não aparece');
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(5, 450);
    verdade(await pagina.isVisible('#modalUnidade'), 'janela continua aberta');
    await pagina.screenshot({ path: path.join(SAIDA, 'p05-previa-unidade.png'), fullPage: true });
  });

  await teste('incluir as escolhidas (desmarcando uma): entram na etapa 2 com o selo "Para outros cursos"', async () => {
    const primeira = await pagina.locator('.caixaUnidade').first().getAttribute('value');
    await pagina.locator('.caixaUnidade').first().uncheck();
    igual((await pagina.textContent('[data-unidade="incluir"]')).trim(), 'Incluir 33 disciplinas');
    verdade(await pagina.evaluate(() => document.getElementById('unidadeTodas').indeterminate), 'caixa geral indeterminada');
    await pagina.click('[data-unidade="incluir"]');
    await pagina.waitForFunction(() => /33 disciplinas incluídas/.test(document.getElementById('unidadeCorpo').textContent));
    await pagina.click('#unidadeRodape [data-fechar-unidade]');
    await pagina.waitForSelector('#modalUnidade', { state: 'hidden' });
    igual(await contagem('o'), 33);
    igual((await pagina.textContent('#etapaContagem2')).trim(), '33 disciplinas');
    verdade(!(await pagina.$('#oCorpoTabela tr[data-codigo="' + primeira + '"]')), 'a desmarcada não entrou');
    const linha = await pagina.textContent('#oCorpoTabela tr[data-codigo="PST0391"]');
    verdade(/Liderança/.test(linha) && /Para outros cursos/i.test(linha), linha);
    const outros = abaObjs(amb, 'Disciplinas para outros cursos');
    igual(outros.length, 33);
    const pst = outros.find((o) => o['Código'] === 'PST0391');
    igual([pst['Créditos-aula'], pst['CH total (h)'], pst['Excluída'], pst['Adicionada à grade horária']].map(String), ['2', '30', '', ''], 'incluída ativa e ainda fora da grade');
    await pagina.screenshot({ path: path.join(SAIDA, 'p06-outros-cursos.png') });
    // Importar de novo: só a que ficou de fora aparece.
    await pagina.click('[data-abrir-unidade]');
    await pagina.setInputFiles('#entradaUnidade', unidadePath);
    await pagina.waitForSelector('.caixaUnidade');
    igual(await pagina.locator('.caixaUnidade').count(), 1);
    igual(await pagina.locator('.caixaUnidade').first().getAttribute('value'), primeira);
    await pagina.click('#unidadeRodape [data-unidade="outro"]');
    await pagina.click('#unidadeRodape [data-fechar-unidade]');
    await pagina.waitForSelector('#modalUnidade', { state: 'hidden' });
  });

  await teste('cadastro manual: exige código e nome; código repetido é recusado; cadastro válido entra na lista', async () => {
    await pagina.click('[data-cadastrar-outros]');
    await pagina.waitForSelector('#modalDisciplina:not([hidden]) #fichaCampo-codigo');
    igual((await pagina.textContent('#fichaSalvar')).trim(), 'Cadastrar');
    verdade(await pagina.isDisabled('#fichaSalvar'), 'sem código e nome');
    verdade(await pagina.isHidden('#fichaExcluir'), 'sem Excluir no cadastro');
    await pagina.fill('#fichaCampo-codigo', 'PST0391');
    await pagina.fill('#fichaCampo-nome', 'Tentativa com código repetido');
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => { const a = document.getElementById('aviso'); return a && !a.hidden && /PST0391/.test(a.textContent); });
    verdade(await pagina.isVisible('#modalDisciplina'), 'continua no cadastro');
    await pagina.fill('#fichaCampo-codigo', 'PST9990');
    await pagina.fill('#fichaCampo-nome', 'Disciplina fictícia de teste');
    await pagina.fill('#fichaCampo-creditosAula', '2');
    await pagina.fill('#fichaCampo-unidadeAtendida', 'Unidade fictícia');
    await pagina.fill('#fichaCampo-cursoAtendido', 'Curso fictício');
    await pagina.fill('#fichaObservacoes', 'Cadastrada no teste.');
    await pagina.screenshot({ path: path.join(SAIDA, 'p07-cadastro.png'), fullPage: true });
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => document.getElementById('fichaSalvar').textContent.trim() === 'Salvar');
    igual(await pagina.inputValue('#fichaCampo-ch'), '30', 'CH calculada 15 h × 2');
    await fecharFicha();
    igual(await contagem('o'), 34);
    const o = abaObjs(amb, 'Disciplinas para outros cursos').find((x) => x['Código'] === 'PST9990');
    igual([o['Origem'], o['Unidade atendida'], o['Observações']], ['Cadastro manual', 'Unidade fictícia', 'Cadastrada no teste.']);
  });

  await teste('excluir uma disciplina para outros cursos em lote', async () => {
    await pagina.fill('#oCampoBusca', 'PST9990');
    await pagina.waitForTimeout(250);
    await pagina.check('#oCorpoTabela .caixaSelecao');
    await pagina.click('#oBarraLote [data-lote="excluir"]');
    await pagina.waitForFunction(() => /^0 /.test(document.getElementById('oContagemResultado').textContent));
    await pagina.fill('#oCampoBusca', '');
    await pagina.waitForTimeout(250);
    igual(await contagem('o'), 33);
    igual(abaObjs(amb, 'Disciplinas para outros cursos').find((x) => x['Código'] === 'PST9990')['Excluída'], 'Sim');
  });

  await teste('"Disciplina de semestre" (semestre de oferecimento) na ficha de outros cursos: 1º, 2º ou 1º e 2º; grava, aparece na lista e no resumo; filtro "Não informado"', async () => {
    await abrirLinha('o', 'PST0391');
    igual(await pagina.textContent('label[for="fichaCampo-oferecimento"]'), 'Disciplina de semestre');
    igual(await pagina.$$eval('#fichaCampo-oferecimento option', (os) => os.map((o) => o.textContent)), ['— não informado —', '1º', '2º', '1º e 2º']);
    igual(await pagina.inputValue('#fichaCampo-oferecimento'), '', 'começa não informado');
    verdade(/Semestre de oferecimento não informado/.test(await pagina.textContent('#modalDisciplinaCorpo')), 'resumo pede o semestre');
    verdade(await pagina.isVisible('#fichaGrade') && await pagina.isDisabled('#fichaGrade'), '"Adicionar à Grade Horária" travado sem semestre');
    verdade(/escolha a "Disciplina de semestre"/.test(await pagina.textContent('#fichaGradeNota')), 'nota explica');
    verdade(!/semestre ideal/i.test(await pagina.textContent('#modalDisciplina')), 'a ficha não fala em "semestre ideal"');
    await pagina.selectOption('#fichaCampo-oferecimento', '1');
    verdade(await pagina.isEnabled('#fichaSalvar'), 'Salvar habilitado');
    await pagina.screenshot({ path: path.join(SAIDA, 'p07b-ficha-outros-semestre.png') });
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => /Oferecida no 1º semestre do ano/.test(document.getElementById('modalDisciplinaCorpo').textContent));
    await fecharFicha();
    igual(abaObjs(amb, 'Disciplinas para outros cursos').find((x) => x['Código'] === 'PST0391')['Semestre de oferecimento'], '1º semestre');
    verdade(/Oferecida: 1º semestre/.test(await pagina.textContent('#oCorpoTabela tr[data-codigo="PST0391"]')), 'selo na lista');
    await abrirLinha('o', 'PSA0183');
    await pagina.selectOption('#fichaCampo-oferecimento', '2');
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => document.getElementById('fichaSalvar').disabled);
    await fecharFicha();
    await pagina.fill('#oCampoBusca', '');
    await pagina.waitForTimeout(250);
    await pagina.click('#oBotaoFiltros').catch(() => {});
    await pagina.selectOption('#oFiltroSemestre', 'nenhum');
    igual(await contagem('o'), 31, '33 menos as 2 com semestre');
    await pagina.selectOption('#oFiltroSemestre', '1');
    igual(await contagem('o'), 1);
    await pagina.selectOption('#oFiltroSemestre', '');
  });

  console.log('\n== Etapa 3: lista para a grade horária');
  const impares = new Set(pacote.vinculos.filter((v) => v.periodoIdeal % 2 === 1).map((v) => v.disciplina)).size;
  const pares = new Set(pacote.vinculos.filter((v) => v.periodoIdeal && v.periodoIdeal % 2 === 0).map((v) => v.disciplina)).size;
  await teste('"Disciplina de semestre" da estrutura vem pré-preenchida pelo período (1º); ajustar para "1º e 2º"; depois de salvar, "Adicionar à Grade Horária" na ficha', async () => {
    await pagina.click('#etapa-3');
    await abrirLinha('g', 'PSC1322');
    igual(await pagina.textContent('label[for="fichaCampo-oferecimento"]'), 'Disciplina de semestre');
    igual(await pagina.$$eval('#fichaCampo-oferecimento option', (os) => os.map((o) => o.textContent)), ['1º', '2º', '1º e 2º']);
    igual(await pagina.inputValue('#fichaCampo-oferecimento'), '1', 'pré-preenchida pelo período ideal (3º → 1º)');
    verdade(/Pelo período ideal \(ímpar\), é oferecida no 1º semestre do ano/.test(await pagina.textContent('#modalDisciplinaCorpo')), 'resumo pelo período');
    verdade(await pagina.isEnabled('#fichaGrade') && (await pagina.textContent('#fichaGrade')).trim() === 'Adicionar à Grade Horária', 'já pode adicionar (semestre definido)');
    await pagina.selectOption('#fichaCampo-oferecimento', 'ambos');
    // 1.4.1: com a alteração por salvar, "Adicionar à Grade Horária" fica ativo e SALVA antes de adicionar.
    verdade(await pagina.isEnabled('#fichaGrade') && /As alterações serão salvas antes/.test(await pagina.textContent('#fichaGradeNota')), 'adicionar salva junto');
    await pagina.screenshot({ path: path.join(SAIDA, 'p07c-ficha-estrutura-oferecimento.png') });
    const chAntes = chamadas.length;
    // 1.4.3: uma chamada só, com o andamento no próprio botão (sem a tela "carregando" do painel).
    await pagina.evaluate(() => {
      window.__vistos = { textos: [], carregando: false };
      window.__obs = new MutationObserver(() => {
        const b = document.getElementById('fichaGrade');
        if (b && window.__vistos.textos[window.__vistos.textos.length - 1] !== b.textContent.trim()) window.__vistos.textos.push(b.textContent.trim());
        if (!document.getElementById('carregando').hidden) window.__vistos.carregando = true;
      });
      window.__obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    });
    await pagina.click('#fichaGrade');
    await pagina.waitForFunction(() => document.getElementById('fichaGrade').textContent.trim() === '✓ Adicionada à Grade Horária');
    const vistos = await pagina.evaluate(() => { window.__obs.disconnect(); return window.__vistos; });
    igual(chamadas.slice(chAntes), ['salvarDisciplina'], 'salvou e adicionou numa chamada só');
    verdade(vistos.textos.includes('Salvando e adicionando…') && !vistos.carregando, 'andamento no botão, sem a tela de carregando: ' + JSON.stringify(vistos));
    igual((await pagina.textContent('#aviso')).trim(), 'Alterações salvas e disciplina adicionada à Grade Horária.');
    verdade(/Semestre de oferecimento ajustado no painel: oferecida nos dois semestres/.test(await pagina.textContent('#modalDisciplinaCorpo')), 'resumo atualizado');
    igual((await pagina.textContent('#fichaCampo-oferecimento-dica')).trim(), 'Ajustado · pelo período: 1º');
    igual(abaObjs(amb, 'Ajustes manuais').find((a) => a['Disciplina (código no Júpiter)'] === 'PSC1322')['Semestre de oferecimento ajustado'], '1º e 2º semestres');
    verdade(await pagina.isDisabled('#fichaGrade'), 'nas etapas 1–3, só informa');
    igual(abaObjs(amb, 'Ajustes manuais').find((a) => a['Disciplina (código no Júpiter)'] === 'PSC1322')['Adicionada à grade horária'], 'Sim');
    await fecharFicha();
    const linha = await pagina.textContent('#gCorpoTabela tr[data-codigo="PSC1322"]');
    verdade(/Adicionada à Grade Horária/.test(linha) && /Oferecida: 1º e 2º semestres/.test(linha), linha);
    verdade(await pagina.isChecked('#gCorpoTabela tr[data-codigo="PSC1322"] .caixaSelecao') && await pagina.isDisabled('#gCorpoTabela tr[data-codigo="PSC1322"] .caixaSelecao'), 'caixa marcada e travada');
    await pagina.fill('#gCampoBusca', '');
    await pagina.waitForTimeout(250);
  });

  await teste('filtros: Período ideal "Ímpares"/"Pares" = só pelo período ideal; "Semestre de oferecimento" = o que vale (ajuste, período, ou o informado em outros cursos)', async () => {
    const opcoes = await pagina.$$eval('#gFiltroPeriodo option', (os) => os.map((o) => o.value));
    igual(opcoes.slice(0, 3), ['', 'impar', 'par']);
    await pagina.selectOption('#gFiltroPeriodo', 'impar');
    igual(await contagem('g'), impares, 'só a estrutura, pelo período');
    verdade(/Períodos ímpares/.test(await pagina.textContent('#gChipsFiltros')), 'chip');
    await pagina.selectOption('#gFiltroPeriodo', 'par');
    igual(await contagem('g'), pares);
    await pagina.selectOption('#gFiltroPeriodo', '');
    await pagina.selectOption('#gFiltroSemestre', '1');
    igual(await contagem('g'), impares + 1, 'oferecidas no 1º: pelo período + PST0391');
    verdade(!!(await pagina.$('#gCorpoTabela tr[data-codigo="PST0391"]')) && !(await pagina.$('#gCorpoTabela tr[data-codigo="PSA0183"]')), 'outros pelo informado');
    verdade(/Oferecida no 1º semestre/.test(await pagina.textContent('#gChipsFiltros')), 'chip');
    await pagina.selectOption('#gFiltroSemestre', '2');
    igual(await contagem('g'), pares + 2, 'oferecidas no 2º: pelo período + PSA0183 + PSC1322 (ajustada para 1º e 2º)');
    verdade(!!(await pagina.$('#gCorpoTabela tr[data-codigo="PSC1322"]')), 'PSC1322 pelo ajuste');
    await pagina.selectOption('#gFiltroDepartamento', 'PSA');
    const psaPares = new Set(pacote.vinculos.filter((v) => v.periodoIdeal && v.periodoIdeal % 2 === 0 && v.disciplina.startsWith('PSA')).map((v) => v.disciplina)).size;
    igual(await contagem('g'), psaPares + 1, 'PSA oferecidas no 2º semestre + PSA0183');
    await pagina.selectOption('#gFiltroDepartamento', '');
    await pagina.selectOption('#gFiltroSemestre', '');
  });

  await teste('"Enviar para a Grade Horária": escolher é só na tela (nenhuma chamada); enviar = uma chamada; as sem semestre de oferecimento não entram e ficam listadas e marcadas', async () => {
    const total = await contagem('g');
    igual(total, totalEstrutura + 33, 'estrutura + outros cursos ativos');
    const barra = async () => (await pagina.textContent('#gBarraLote')).replace(/\s+/g, ' ').trim();
    verdade(/^1 de /.test(await barra()), 'só a PSC1322 na grade: ' + await barra());
    verdade(await pagina.isDisabled('#gBarraLote [data-lote="enviarGrade"]'), 'Enviar travado sem escolha');
    const chamadasAntes = chamadas.length;
    await pagina.click('#gSelTodos');
    verdade(new RegExp((total - 1) + ' escolhidas para enviar').test(await barra()), await barra());
    await pagina.fill('#gCampoBusca', 'PSA1302');
    await pagina.waitForTimeout(250);
    await pagina.uncheck('#gCorpoTabela .caixaSelecao');
    await pagina.fill('#gCampoBusca', '');
    await pagina.waitForTimeout(250);
    verdade(new RegExp((total - 2) + ' escolhidas para enviar').test(await barra()), await barra());
    igual(chamadas.length, chamadasAntes, 'nenhuma chamada ao escolher');
    await pagina.screenshot({ path: path.join(SAIDA, 'p08-lista-grade-escolha.png') });
    await pagina.click('#gBarraLote [data-lote="enviarGrade"]');
    await pagina.waitForFunction(() => /Não enviadas por falta do semestre de oferecimento/.test(document.getElementById('gBarraLote').textContent));
    igual(chamadas.slice(chamadasAntes), ['adicionarAGrade'], 'uma única chamada');
    const naGradeEsperado = totalEstrutura - 1 + 2;   // estrutura menos PSA1302, mais PST0391 e PSA0183 (com semestre)
    verdade(new RegExp('^' + naGradeEsperado + ' de ' + total).test(await barra()), await barra());
    verdade(/31 escolhidas para enviar/.test(await barra()), 'as 31 sem semestre continuam marcadas: ' + await barra());
    igual((await pagina.textContent('#etapaContagem3')).trim(), naGradeEsperado + ' adicionadas à grade');
    igual(abaObjs(amb, 'Disciplinas para outros cursos').filter((o) => o['Adicionada à grade horária'] === 'Sim').map((o) => o['Código']).sort(), ['PSA0183', 'PST0391']);
    igual(abaObjs(amb, 'Ajustes manuais').filter((a) => a['Adicionada à grade horária'] === 'Sim').length, totalEstrutura - 1);
    await pagina.selectOption('#gFiltroSelecionadas', 'nao');
    igual(await contagem('g'), 32, 'PSA1302 + 31 sem semestre');
    await pagina.selectOption('#gFiltroSelecionadas', '');
    await pagina.click('#gBarraLote [data-lote="limpar"]');
    verdade(!/Não enviadas/.test(await barra()), 'limpar tira o aviso');
    await pagina.screenshot({ path: path.join(SAIDA, 'p08-lista-grade.png') });
  });

  await teste('ficha abre e edita também pela etapa 3 (disciplina para outros cursos)', async () => {
    await abrirLinha('g', 'PST0391');
    verdade(/Disciplina para outros cursos/i.test(await pagina.textContent('#modalDisciplinaCodigo')), 'cabeçalho indica a origem');
    await pagina.fill('#fichaCampo-cursoAtendido', 'Curso fictício B');
    await pagina.click('#fichaSalvar');
    await pagina.waitForFunction(() => document.getElementById('fichaSalvar').disabled);
    await fecharFicha();
    igual(abaObjs(amb, 'Disciplinas para outros cursos').find((x) => x['Código'] === 'PST0391')['Curso atendido'], 'Curso fictício B');
    await pagina.fill('#gCampoBusca', '');
  });

  console.log('\n== Etapa 4: prévia da grade horária');
  // Semestre de oferecimento de cada disciplina da estrutura pelo período ideal (PSC1322 ajustada para os dois).
  const oferecimentoEstr = (c) => {
    if (c === 'PSC1322') return 'ambos';
    const par = new Set(pacote.vinculos.filter((v) => v.disciplina === c && v.periodoIdeal).map((v) => v.periodoIdeal % 2));
    return par.size === 2 ? 'ambos' : par.has(1) ? '1' : par.has(0) ? '2' : '';
  };
  const grupoDe = (c) => { const p = c.slice(0, 3); return ['PSA', 'PSC', 'PSE', 'PST'].includes(p) ? p : p === '470' ? 'INTER' : 'OUTRAS'; };
  const esperadoPrevia = (sem) => {
    const e = { PSA: 0, PSC: 0, PSE: 0, PST: 0, INTER: 0, OUTRAS: 0 };
    abaObjs(amb, 'Ajustes manuais').filter((a) => a['Adicionada à grade horária'] === 'Sim').map((a) => a['Disciplina (código no Júpiter)'])
      .forEach((c) => { const o = oferecimentoEstr(c); if (o === 'ambos' || o === sem) e[grupoDe(c)]++; });
    if (sem === '1') e.PST++; else e.PSA++;   // PST0391 (1º) e PSA0183 (2º), outros cursos, no departamento
    return ['PSA (' + e.PSA + ')', 'PSC (' + e.PSC + ')', 'PSE (' + e.PSE + ')', 'PST (' + e.PST + ')', 'Interdepartamentais (' + e.INTER + ')', 'Outras Unidades (' + e.OUTRAS + ')'];
  };
  const abasPrevia = () => pagina.$$eval('#previaAbas [role="tab"]', (bs) => bs.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  await teste('Prévia: semestre e ano da grade (padrão = próximo semestre); a prévia mostra só as do semestre escolhido (ou dos dois); "Enviar Grade para Preenchimento" ativo (1.5.0)', async () => {
    await pagina.click('#etapa-4');
    const hoje = new Date();
    const padrao = hoje.getMonth() >= 6 ? { s: '1', a: hoje.getFullYear() + 1 } : { s: '2', a: hoje.getFullYear() };
    igual([await pagina.inputValue('#gradeSemestre'), await pagina.inputValue('#gradeAno')], [padrao.s, String(padrao.a)]);
    igual(await pagina.$$eval('#gradeSemestre option', (os) => os.map((o) => o.textContent)), ['1º semestre (ímpar)', '2º semestre (par)']);
    igual(await pagina.locator('#gradeAno option').count(), 5);
    verdade(await pagina.isEnabled('#enviarGradePreenchimento') && (await pagina.textContent('#enviarGradePreenchimento')).trim() === 'Enviar Grade para Preenchimento', 'botão presente e ativo');
    verdade(!/próxima etapa/.test(await pagina.textContent('#gradeAlvo')), 'sem "(próxima etapa)"');
    await pagina.selectOption('#gradeSemestre', '2');
    await pagina.selectOption('#gradeAno', '2027');
    igual(await abasPrevia(), esperadoPrevia('2'));
    verdade(/Grade horária 2027\/2/.test(await pagina.textContent('#gradeAlvoResumo')), await pagina.textContent('#gradeAlvoResumo'));
    await pagina.click('#previa-aba-PSA');
    verdade(!!(await pagina.$('#previaPaineis tr[data-codigo="PSA0183"]')), 'PSA0183 (2º semestre) aparece no 2º');
    await pagina.screenshot({ path: path.join(SAIDA, 'p10b-previa-2o-semestre.png') });
    await pagina.selectOption('#gradeSemestre', '1');
    igual(await abasPrevia(), esperadoPrevia('1'));
    verdade(/Grade horária 2027\/1 \(1º semestre de 2027\)/.test(await pagina.textContent('#gradeAlvoResumo')), 'ex.: 2027/1');
    verdade(!(await pagina.$('#previaPaineis tr[data-codigo="PSA0183"]')), 'PSA0183 (só 2º) não aparece no 1º');
  });

  await teste('Prévia: 6 abas (PSA, PSC, PSE, PST, Interdepartamentais, Outras Unidades) pelo prefixo do código; colunas Código, Nome, Semestre ideal (por habilitação) e Observações', async () => {
    await pagina.click('#etapa-4');
    await pagina.selectOption('#gradeSemestre', '2');
    await pagina.click('#previa-aba-PSA');
    igual(await abasPrevia(), esperadoPrevia('2'));
    const esperado = { PSA: Number(esperadoPrevia('2')[0].match(/\d+/)[0]) };
    igual(await pagina.$$eval('#previaPaineis thead th', (ts) => ts.map((t) => t.textContent.trim())), ['Selecionar', 'Código', 'Nome', 'Semestre ideal', 'Observações']);
    igual(await pagina.locator('#previaPaineis tbody tr').count(), esperado.PSA);
    const psa0183 = await pagina.textContent('#previaPaineis tr[data-codigo="PSA0183"]');
    verdade(/Para outros cursos/.test(psa0183), 'disciplina para outros cursos no PSA');
    await pagina.selectOption('#gradeSemestre', '1');
    await pagina.click('#previa-aba-PSC');
    const psc = (await pagina.textContent('#previaPaineis tr[data-codigo="PSC1322"]')).replace(/\s+/g, ' ');
    verdade(/Psicólogo 3º · Bacharelado 3º · Licenciatura 3º/.test(psc) && /Disciplina prática/.test(psc), psc);
    await pagina.keyboard.press('ArrowRight');
    igual(await pagina.getAttribute('#previa-aba-PSE', 'aria-selected'), 'true', 'setas trocam de aba');
    await pagina.click('#previa-aba-INTER');
    verdade(await pagina.$$eval('#previaPaineis tbody tr', (ts) => ts.every((t) => t.getAttribute('data-codigo').startsWith('470'))), 'só 470…');
    await pagina.click('#previa-aba-OUTRAS');
    verdade(await pagina.$$eval('#previaPaineis tbody tr', (ts) => ts.every((t) => !/^(PSA|PSC|PSE|PST|470)/.test(t.getAttribute('data-codigo')))), 'só outras unidades');
    await pagina.screenshot({ path: path.join(SAIDA, 'p10-previa.png') });
  });

  await teste('Prévia: "Selecionar todas" + "Remover da grade" (com confirmação); caixa individual; a disciplina volta a ficar livre na etapa 3', async () => {
    await pagina.click('#previa-aba-OUTRAS');
    const n = await pagina.locator('#previaPaineis tbody tr').count();
    verdade(n >= 2, 'outras unidades: ' + n);
    await pagina.check('#previaTodas');
    verdade(new RegExp(n + ' selecionadas').test(await pagina.textContent('#previaPaineis .barraLote')), 'todas selecionadas');
    respostaDialogo = false;
    await pagina.click('[data-previa-remover]');
    igual(await pagina.locator('#previaPaineis tbody tr').count(), n, 'cancelado: nada removido');
    await pagina.uncheck('#previaTodas');
    const primeira = await pagina.locator('#previaPaineis tbody tr').first().getAttribute('data-codigo');
    await pagina.locator('#previaPaineis .caixaPrevia').first().check();
    verdade(/1 selecionada/.test(await pagina.textContent('#previaPaineis .barraLote')), 'uma selecionada');
    respostaDialogo = true;
    await pagina.click('[data-previa-remover]');
    await pagina.waitForFunction((k) => document.querySelectorAll('#previaPaineis tbody tr').length === k, n - 1);
    const linhaAj = abaObjs(amb, 'Ajustes manuais').find((a) => a['Disciplina (código no Júpiter)'] === primeira);
    verdade(!linhaAj || linhaAj['Adicionada à grade horária'] === '', 'marca retirada (linha sem outros ajustes é removida)');
    await pagina.check('#previaTodas');
    await pagina.click('[data-previa-remover]');
    await pagina.waitForFunction(() => /Nenhuma disciplina de outras unidades/.test(document.getElementById('previaPaineis').textContent));
    await pagina.click('#etapa-3');
    await pagina.fill('#gCampoBusca', primeira);
    await pagina.waitForTimeout(250);
    verdade(!(await pagina.isDisabled('#gCorpoTabela .caixaSelecao')) && !/Adicionada à Grade/.test(await pagina.textContent('#gCorpoTabela')), 'livre de novo na etapa 3');
    await pagina.fill('#gCampoBusca', '');
    await pagina.waitForTimeout(250);
  });

  await teste('Prévia: a ficha abre ao clicar, é editável e tem "Remover da grade"', async () => {
    await pagina.click('#etapa-4');
    await pagina.click('#previa-aba-PST');
    await pagina.click('#previaPaineis tr[data-codigo="PST0391"] td:nth-child(3)');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
    verdade(await pagina.isVisible('#fichaCampo-nome'), 'ficha editável');
    igual((await pagina.textContent('#fichaGrade')).trim(), 'Remover da grade');
    await pagina.screenshot({ path: path.join(SAIDA, 'p11-previa-ficha.png') });
    await pagina.click('#fichaGrade');
    await pagina.waitForFunction(() => document.getElementById('fichaGrade').textContent.trim() === 'Adicionar à Grade Horária');
    await fecharFicha();
    verdade(!(await pagina.$('#previaPaineis tr[data-codigo="PST0391"]')), 'saiu da prévia');
    igual(abaObjs(amb, 'Disciplinas para outros cursos').find((o) => o['Código'] === 'PST0391')['Adicionada à grade horária'], '');
  });

  console.log('\n== Enviar Grade para Preenchimento (1.5.0)');
  await teste('"Enviar Grade para Preenchimento": confirmação com as contagens das abas e o nome novo (1.8.12: prévia do envio lida do servidor); "Cancelar" não envia; confirmar = UMA chamada de envio, cópia de segurança, planilha gravada e renomeada; resultado com a cópia', async () => {
    amb.criarPlanilhaGrade();
    await pagina.click('#etapa-4');
    await pagina.selectOption('#gradeSemestre', '1');
    await pagina.selectOption('#gradeAno', '2027');
    const abas = await abasPrevia();
    const cont = abas.map((t) => Number(t.match(/\((\d+)\)/)[1]));
    const chAntes = chamadas.length;
    await pagina.click('#enviarGradePreenchimento');
    await pagina.waitForSelector('#modalEnvioGrade:not([hidden])');
    await pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');   // (1.8.12) prévia do envio carregada
    const corpo = (await pagina.textContent('#envioGradeCorpo')).replace(/\s+/g, ' ');
    const linhas = await pagina.$$eval('#envioGradeCorpo .tabelaEnvio:not([data-previa-envio]) tbody tr', (ts) => ts.map((t) => Array.from(t.cells).map((c) => c.textContent.trim())));
    igual(await pagina.$$eval('[data-previa-envio] tbody tr', (ts) => ts.length), cont.reduce((a, b) => a + b, 0), '(1.8.12) uma linha por disciplina que será gravada');
    igual(linhas, [['PSA', String(cont[0])], ['PSC', String(cont[1])], ['PSE', String(cont[2])], ['PST', String(cont[3])], ['Interdepartamentais', String(cont[4])], ['Outras Unidades', String(cont[5])], ['Total', String(cont.reduce((a, b) => a + b, 0))]]);
    verdade(/cópia de segurança/.test(corpo) && /será apagado/.test(corpo) && /"Grade Horária - 1º semestre de 2027"/.test(corpo), corpo);
    igual((await pagina.textContent('#envioGradeSubtitulo')).trim(), 'Grade horária 2027/1 (1º semestre de 2027)');
    await pagina.screenshot({ path: path.join(SAIDA, 'p12-envio-confirmacao.png') });
    await pagina.click('#envioGradeRodape [data-fechar-envio]');
    await pagina.waitForSelector('#modalEnvioGrade', { state: 'hidden' });
    igual(chamadas.slice(chAntes), ['previaEnvioGrade'], 'abrir só lê a prévia do envio; cancelar não envia');
    igual(amb.grade().getName(), 'Grade Horária - 1º Semestre de 2026');
    await pagina.click('#enviarGradePreenchimento');
    await pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
    await pagina.click('[data-confirmar-envio]');
    await pagina.waitForFunction(() => /enviada para preenchimento/.test(document.getElementById('envioGradeCorpo').textContent) && !document.getElementById('modalEnvioGrade').hidden);
    igual(chamadas.slice(chAntes), ['previaEnvioGrade', 'previaEnvioGrade', 'enviarGradeParaPreenchimento'], 'uma chamada de envio');
    const res = (await pagina.textContent('#envioGradeCorpo')).replace(/\s+/g, ' ');
    verdade(/Grade 2027\/1 enviada para preenchimento/.test(res) && /"Grade Horária - 1º semestre de 2027"/.test(res) && /Cópia de segurança \(2026\/1\)/.test(res), res);
    verdade(/^https:\/\//.test(await pagina.getAttribute('#envioGradeCorpo a', 'href')), 'link da cópia');
    igual(amb.grade().getName(), 'Grade Horária - 1º semestre de 2027', 'renomeada');
    const g = amb.grade();
    igual(g.getSheetByName('PSA').getRange(4, 3, cont[0], 1).getValues().map((l) => l[0]).filter(Boolean).length, cont[0], 'PSA com as disciplinas da prévia');
    igual(g.getSheetByName('PSA').getRange(4 + cont[0], 3).getValue(), '', 'e nada depois');
    igual(amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length, 1, 'uma cópia');
    await pagina.screenshot({ path: path.join(SAIDA, 'p13-envio-resultado.png') });
    await pagina.click('#envioGradeRodape [data-fechar-envio]');
  });
  await teste('grade mudou por trás da página DEPOIS da conferência: o servidor recusa (PREVIA_DESATUALIZADA) sem mexer em nada; "Conferir de novo" mostra o conteúdo atual (1.8.12)', async () => {
    const d = amb.ctx.obterDadosPainel().dados;
    const uma = d.preparacao.ajustes.find((a) => a.naGrade && /^PSA/.test(a.chave) && oferecimentoEstr(a.chave) === '1');
    verdade(uma, 'uma do PSA na grade do 1º');
    const nome = amb.grade().getName();
    await pagina.click('#enviarGradePreenchimento');
    await pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
    const psaAntes = await pagina.$$eval('[data-previa-envio] tbody tr', (ts) => ts.filter((t) => t.cells[0].textContent.trim() === 'PSA').length);
    amb.ctx.removerDaGrade([{ origem: 'estrutura', chave: uma.chave }]);   // outra pessoa, outra aba do navegador
    await pagina.click('[data-confirmar-envio]');
    await pagina.waitForFunction(() => /não foi enviada/.test(document.getElementById('envioGradeCorpo').textContent) && !document.getElementById('modalEnvioGrade').hidden);
    verdade(/A grade mudou depois da prévia que você conferiu/.test(await pagina.textContent('#envioGradeCorpo')), 'mensagem');
    igual([amb.grade().getName(), amb.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.length], [nome, 1], 'nada mudou, nenhuma cópia nova');
    await pagina.click('[data-reconferir-envio]');
    await pagina.waitForSelector('[data-confirmar-envio]:not([disabled])');
    const psaDepois = await pagina.$$eval('[data-previa-envio] tbody tr', (ts) => ts.filter((t) => t.cells[0].textContent.trim() === 'PSA').length);
    igual(psaDepois, psaAntes - 1, 'nova conferência com o conteúdo atual: PSA ' + psaAntes + ' → ' + psaDepois);
    verdade(/A lista mudou desde que a página foi carregada/.test(await pagina.textContent('#envioGradeCorpo')), 'aviso de que a página está atrás do servidor');
    await pagina.click('#envioGradeRodape [data-fechar-envio]');
    amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: uma.chave }]);
  });

  console.log('\n== Leitor');
  await teste('leitor: sem etapas, sem caixas, ficha só leitura; vê os ajustes e não vê as excluídas', async () => {
    // Exclui uma da estrutura pelo servidor para conferir que o leitor não a vê.
    verdade(amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSE2355' }], true).ok, 'excluir');
    amb.permitir('leitor@unidade.example', 'LEITOR');
    amb.trocarUsuario('leitor@unidade.example');
    const { pagina: pl, contexto: cxl, errosPagina: errosL, chamadas: chL } = await abrirPainel(nav, { amb, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pl);
    verdade(await pl.isHidden('#etapas'), 'sem etapas');
    verdade(await pl.isHidden('#cabSelecao'), 'sem coluna de caixas');
    igual(await pl.locator('.caixaSelecao').count(), 0);
    verdade(!(await pl.$('#corpoTabela tr[data-codigo="PSE2355"]')), 'excluída não aparece');
    await pl.fill('#campoBusca', 'PSC1322');
    await pl.waitForTimeout(250);
    await pl.click('#corpoTabela tr[data-codigo="PSC1322"] td:nth-child(1)');
    await pl.waitForSelector('#modalDisciplina:not([hidden])');
    igual(await pl.textContent('#modalDisciplinaTitulo'), 'Psicopatologia (nome ajustado no teste)');
    igual(await pl.locator('#modalDisciplinaCorpo input, #modalDisciplinaCorpo select, #modalDisciplinaCorpo textarea').count(), 0, 'sem campos editáveis');
    verdade(await pl.isHidden('#fichaSalvar') && await pl.isHidden('#fichaExcluir'), 'sem Salvar/Excluir');
    verdade(/Disciplina prática/.test(await pl.textContent('#modalDisciplinaCorpo')), 'observação visível ao leitor');
    // Leitor não consegue gravar nem chamando o servidor direto.
    const r = await pl.evaluate(() => new Promise((ok) => google.script.run.withSuccessHandler(ok).withFailureHandler((e) => ok({ falha: String(e) })).removerDaGrade([{ origem: 'estrutura', chave: 'PSC1322' }])));
    verdade(r && r.ok === false && r.codigo === 'SO_ADMIN', JSON.stringify(r));
    await pl.screenshot({ path: path.join(SAIDA, 'p09-leitor-ficha.png'), fullPage: true });
    igual(errosL, []);
    verdade(!chL.some((c) => /salvar|excluir|adicionar|incluir|cadastrar/i.test(c) || (c === 'removerDaGrade' && chL.filter((x) => x === c).length > 1)), 'nenhuma gravação pela interface');
    verdade(await pl.isHidden('#acoesGrade') && await pl.isHidden('#fichaGrade'), 'sem ações de grade para o leitor');
    await cxl.close();
    amb.trocarUsuario('dono@unidade.example');
  });

  console.log('\n== Cadastrar nova grade');
  await teste('"Cadastrar nova grade": só com APAGAR; apaga tudo e o painel volta ao começo (importar o CSV)', async () => {
    await pagina.click('[data-cadastrar-nova-grade]');
    await pagina.waitForSelector('#modalRecomeco:not([hidden])');
    verdade(/apaga tudo e não pode ser desfeito/.test(await pagina.textContent('#recomecoCorpo')), 'aviso');
    verdade(await pagina.isDisabled('[data-confirmar-recomeco]'), 'travado sem a palavra');
    await pagina.fill('#recomecoPalavra', 'apaga');
    verdade(await pagina.isDisabled('[data-confirmar-recomeco]'), 'palavra errada');
    await pagina.keyboard.press('Escape');
    verdade(await pagina.isVisible('#modalRecomeco'), 'ESC não fecha');
    await pagina.screenshot({ path: path.join(SAIDA, 'p12-cadastrar-nova-grade.png') });
    await pagina.fill('#recomecoPalavra', 'apagar');
    await pagina.click('[data-confirmar-recomeco]');
    await pagina.waitForFunction(() => /Nenhuma estrutura curricular importada ainda/.test(document.getElementById('estadoBase').textContent));
    verdade(await pagina.isHidden('#etapas') && await pagina.isHidden('#areaDados'), 'volta ao começo');
    verdade(await pagina.isVisible('[data-cadastrar-nova-grade]') && await pagina.isVisible('[data-abrir-importacao]'), 'botões do começo');
    ['Disciplinas', 'Importações', 'Ajustes manuais', 'Disciplinas para outros cursos'].forEach((n) => igual(abaObjs(amb, n).length, 0, n));
    await pagina.screenshot({ path: path.join(SAIDA, 'p13-depois-de-recomecar.png') });
  });

  await teste('nenhum erro de JavaScript nas páginas do administrador', async () => {
    igual(errosAnteriores.concat(errosPagina), []);
  });

  await nav.close();
  console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: 0`);
  if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });

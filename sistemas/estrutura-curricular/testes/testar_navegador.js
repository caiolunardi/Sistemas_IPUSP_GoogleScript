// Testes do painel no Chromium real (página + backend simulado).
// Uso: node testar_navegador.js <csv> <pdf> [--sem-ocr]
'use strict';
const fs = require('fs');
const path = require('path');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const [csvPath, pdfPath] = process.argv.slice(2);
const SEM_OCR = process.argv.includes('--sem-ocr');
const SAIDA = path.join(__dirname, 'saida');
fs.mkdirSync(SAIDA, { recursive: true });

let ok = 0, falhas = 0;
const falhou = [];
const pulados = [];
async function teste(nome, fn) {
  const t0 = Date.now();
  try { await fn(); ok++; console.log('  ✓', nome, '(' + Math.round((Date.now() - t0) / 1000) + ' s)'); }
  catch (e) { falhas++; falhou.push(nome); console.log('  ✗', nome, '\n     ', String(e && e.stack || e).split('\n').slice(0, 4).join('\n      ')); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }

// Esperado, calculado direto do CSV pelo leitor (para conferir os filtros).
const leitores = carregar();
const pacote = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'x.csv');
/** Modelo para o pacote sintético (só curso e currículo; nenhum dado real além do código do currículo). */
function pacotePdfModelo() { return JSON.parse(JSON.stringify(pacote)); }
function esperadoFiltro(fn) {
  const cods = new Set(pacote.vinculos.filter(fn).map((v) => v.disciplina));
  return cods.size;
}

(async () => {
  const nav = await abrirNavegador();
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  const { pagina, errosPagina, chamadas } = await abrirPainel(nav, { amb, largura: 1280, altura: 900 });
  await esperarCarregado(pagina);

  console.log('\n== Importação do CSV pela interface');
  await teste('abre a importação e lê o CSV (conferência)', async () => {
    await pagina.click('[data-abrir-importacao]');
    await pagina.waitForSelector('#modalImportacao:not([hidden]) #entradaArquivo', { state: 'attached' });
    await pagina.screenshot({ path: path.join(SAIDA, '01-importar-arquivo.png') });
    await pagina.setInputFiles('#entradaArquivo', csvPath);
    await pagina.waitForSelector('[data-imp="previa"]');
    const txt = await pagina.textContent('#importacaoCorpo');
    verdade(/Psicólogo/.test(txt) && /Bacharelado/.test(txt) && /Licenciatura/.test(txt), 'habilitações');
    verdade(/183 disciplinas diferentes/.test(txt), txt.slice(0, 300));
    await pagina.screenshot({ path: path.join(SAIDA, '02-conferencia-csv.png'), fullPage: true });
  });
  await teste('janela de importação só fecha pelos botões: ESC e clique no fundo não descartam o arquivo lido', async () => {
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(5, 450);   // fundo escurecido, fora do painel
    verdade(await pagina.isVisible('#modalImportacao'), 'janela continua aberta');
    verdade(await pagina.isVisible('[data-imp="previa"]'), 'conferência continua na tela (arquivo não descartado)');
  });
  await teste('prévia da primeira carga e gravação', async () => {
    await pagina.click('[data-imp="previa"]');
    await pagina.waitForSelector('[data-imp="gravar"]:not([disabled])');
    verdade(/Primeira importação/.test(await pagina.textContent('#importacaoCorpo')));
    await pagina.screenshot({ path: path.join(SAIDA, '03-previa-csv.png'), fullPage: true });
    await pagina.click('[data-imp="gravar"]');
    await pagina.waitForSelector('[data-imp="concluir"]');
    verdade(/Importação gravada/.test(await pagina.textContent('#importacaoCorpo')));
    await pagina.click('[data-imp="concluir"]');
    await esperarCarregado(pagina);
    await pagina.waitForSelector('#areaDados:not([hidden])');
    igual(await pagina.textContent('#contagemResultado'), '183 disciplinas');
    await pagina.screenshot({ path: path.join(SAIDA, '04-lista.png') });
  });

  console.log('\n== Falhas na gravação vistas pela interface');
  async function reimportarCsvAtePrevia() {
    await pagina.click('[data-abrir-importacao]');
    await pagina.waitForSelector('#modalImportacao:not([hidden]) #entradaArquivo', { state: 'attached' });
    await pagina.setInputFiles('#entradaArquivo', csvPath);
    await pagina.waitForSelector('[data-imp="previa"]');
    await pagina.click('[data-imp="previa"]');
    await pagina.waitForSelector('[data-imp="gravar"]:not([disabled])');
  }
  await teste('falha antes da ativação: "não foi gravado — a base continua como estava"; nova tentativa grava uma vez só', async () => {
    await reimportarCsvAtePrevia();
    amb.injetarFalha((e) => e.tipo === 'setValues' && /^_nova_oferta/.test(e.aba));
    await pagina.click('[data-imp="gravar"]');
    await pagina.waitForSelector('#importacaoCorpo .alerta--erro');
    const txt = await pagina.textContent('#importacaoCorpo');
    verdade(/Não foi gravado — a base continua como estava/.test(txt), txt.slice(0, 300));
    await pagina.screenshot({ path: path.join(SAIDA, '04a-falha-nao-gravada.png'), fullPage: true });
    await pagina.click('[data-imp="gravar"]');
    await pagina.waitForSelector('[data-imp="concluir"]');
    verdade(/Importação gravada/.test(await pagina.textContent('#importacaoCorpo')));
    await pagina.click('[data-imp="concluir"]');
    await esperarCarregado(pagina);
    igual(amb.ctx.obterDadosPainel().dados.importacoes.length, 2, 'duas importações concluídas (carga + reimportação)');
  });
  await teste('resultado incerto: a interface não diz "não gravado" e "Verificar agora" confirma a gravação', async () => {
    await reimportarCsvAtePrevia();
    let armado = false;
    amb.injetarFalha((e) => { if (e.tipo === 'metadado' && e.chave === 'estruturaCurricular.ativa') armado = true; return armado && e.tipo === 'flush'; });
    amb.injetarFalha((e) => armado && e.tipo === 'lerMetadados');
    await pagina.click('[data-imp="gravar"]');
    await pagina.waitForSelector('[data-imp="verificar"]');
    const txt = await pagina.textContent('#importacaoCorpo');
    verdade(/Não foi possível confirmar se a importação foi gravada/.test(txt) && !/Não foi gravado/.test(txt), txt.slice(0, 300));
    await pagina.screenshot({ path: path.join(SAIDA, '04b-resultado-incerto.png'), fullPage: true });
    await pagina.click('[data-imp="verificar"]');
    await pagina.waitForSelector('[data-imp="concluir"]');
    verdade(/Importação gravada/.test(await pagina.textContent('#importacaoCorpo')));
    await pagina.click('[data-imp="concluir"]');
    await esperarCarregado(pagina);
    igual(amb.ctx.obterDadosPainel().dados.importacoes.length, 3);
  });

  console.log('\n== Busca e filtros');
  async function contagem() { return parseInt((await pagina.textContent('#contagemResultado')).replace(/\D/g, ''), 10) || 0; }
  async function limpar() { await pagina.click('#limparFiltros', { force: true }).catch(() => {}); await pagina.evaluate(() => { document.getElementById('limparFiltros').click(); }); }
  await teste('busca sem acento e por código', async () => {
    await pagina.fill('#campoBusca', 'psicopatologia');
    await pagina.waitForTimeout(300);
    const n = await contagem();
    const esperado = pacote.disciplinas.filter((d) => /psicopatologia/i.test(d.nome.normalize('NFD').replace(/[̀-ͯ]/g, ''))).length;
    igual(n, esperado, 'psicopatologia');
    await pagina.fill('#campoBusca', 'pse23');
    await pagina.waitForTimeout(300);
    igual(await contagem(), pacote.disciplinas.filter((d) => d.codigo.startsWith('PSE23')).length);
    await pagina.fill('#campoBusca', 'treino etologia');
    await pagina.waitForTimeout(300);
    igual(await contagem(), pacote.disciplinas.filter((d) => /treino/i.test(d.nome) && /etologia/i.test(d.nome)).length);
    await pagina.fill('#campoBusca', '');
    await pagina.waitForTimeout(300);
  });
  await teste('habilitação + obrigatoriedade + período valem para a MESMA habilitação', async () => {
    await pagina.selectOption('#filtroHabilitacao', '100');
    await pagina.selectOption('#filtroTipo', 'OBRIGATORIA');
    await pagina.selectOption('#filtroPeriodo', '3');
    igual(await contagem(), esperadoFiltro((v) => v.curriculo === '470120100262' && v.tipo === 'OBRIGATORIA' && v.periodoIdeal === 3));
    await pagina.screenshot({ path: path.join(SAIDA, '05-filtros.png') });
    await limpar();
    await pagina.selectOption('#filtroHabilitacao', '200');
    await pagina.selectOption('#filtroTipo', 'OPTATIVA_ELETIVA');
    igual(await contagem(), esperadoFiltro((v) => v.curriculo === '470120200262' && v.tipo === 'OPTATIVA_ELETIVA'));
    await limpar();
  });
  await teste('semestre ideal, departamento, créditos e características', async () => {
    await pagina.selectOption('#filtroSemestre', '1');
    igual(await contagem(), esperadoFiltro((v) => v.periodoIdeal % 2 === 1));
    await pagina.selectOption('#filtroDepartamento', 'PSE');
    igual(await contagem(), esperadoFiltro((v) => v.periodoIdeal % 2 === 1 && v.disciplina.startsWith('PSE')));
    await limpar();
    await pagina.selectOption('#filtroCreditos', '4');
    igual(await contagem(), pacote.disciplinas.filter((d) => d.creditosAula === 4).length);
    await limpar();
    await pagina.check('[data-filtro="comEstagio"]');
    igual(await contagem(), pacote.disciplinas.filter((d) => d.ce > 0).length);
    await limpar();
    await pagina.check('[data-filtro="varia"]');
    const variam = (() => { const m = {}; pacote.vinculos.forEach((v) => { (m[v.disciplina] = m[v.disciplina] || new Set()).add(v.tipo + '|' + v.periodoIdeal); }); return Object.values(m).filter((s) => s.size > 1).length; })();
    igual(await contagem(), variam);
    await limpar();
    await pagina.check('[data-filtro="comRequisito"]');
    await pagina.selectOption('#filtroHabilitacao', '200');
    igual(await contagem(), new Set(pacote.requisitos.filter((r) => r.curriculo === '470120200262').map((r) => r.disciplina)).size);
    await limpar();
    igual(await contagem(), 183);
  });
  await teste('chips de filtros removem o filtro', async () => {
    await pagina.selectOption('#filtroTipo', 'OPTATIVA_LIVRE');
    const antes = await contagem();
    await pagina.click('[data-remover-filtro="tipo"]');
    verdade((await contagem()) > antes);
    igual(await pagina.inputValue('#filtroTipo'), '');
  });
  await teste('ordenação e download da lista', async () => {
    await pagina.selectOption('#ordenacao', 'nome');
    const primeiro = await pagina.textContent('#corpoTabela tr:first-child .tabela__nome');
    const nomes = pacote.disciplinas.map((d) => d.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    igual(primeiro, nomes[0]);
    await pagina.selectOption('#ordenacao', 'codigo');
    await pagina.selectOption('#filtroSemestre', '2');
    const [download] = await Promise.all([pagina.waitForEvent('download'), pagina.click('#baixarLista')]);
    const arq = path.join(SAIDA, 'lista-2o-semestre.csv');
    await download.saveAs(arq);
    const conteudo = fs.readFileSync(arq, 'utf8');
    verdade(conteudo.charCodeAt(0) === 0xfeff, 'BOM');
    igual(conteudo.split('\r\n').length - 1, esperadoFiltro((v) => v.periodoIdeal % 2 === 0), 'linhas no CSV');
    verdade(/Psicólogo — tipo;Psicólogo — período ideal/.test(conteudo), 'cabeçalho por habilitação');
    await limpar();
  });

  console.log('\n== Ficha da disciplina');
  await teste('ficha abre pelo teclado, mostra o resumo, NÃO fecha com ESC nem clique fora, fecha no "X" devolvendo o foco', async () => {
    await pagina.fill('#campoBusca', 'PSC1322');
    await pagina.waitForTimeout(300);
    await pagina.focus('#corpoTabela [data-abrir-ficha="PSC1322"]');
    await pagina.keyboard.press('Enter');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
    const txt = await pagina.textContent('#modalDisciplinaCorpo');
    verdade(/Tem 3 créditos-aula e 2 créditos-trabalho: 3 horas de aula por semana e 105 horas no semestre\./.test(txt), txt.slice(0, 300));
    verdade(/Obrigatória no 3º período do Psicólogo, do Bacharelado e da Licenciatura\./.test(txt), 'oferta');
    verdade(/Carga horária especial: 30 h de estágio\./.test(txt), 'estágio');
    verdade(/O CSV não diz se estes requisitos valem todos juntos/.test(txt), 'nota do CSV');
    verdade(/Em todas as habilitações|Psicólogo, Bacharelado/.test(txt), 'agrupamento de requisitos');
    await pagina.screenshot({ path: path.join(SAIDA, '06-ficha-csv.png'), fullPage: true });
    // foco preso
    for (let i = 0; i < 40; i++) await pagina.keyboard.press('Tab');
    verdade(await pagina.evaluate(() => document.getElementById('modalDisciplina').contains(document.activeElement)), 'foco fora do modal');
    // ESC e clique no fundo NÃO fecham a ficha (regra 1.2.2); só o "X".
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(5, 450);
    verdade(await pagina.isVisible('#modalDisciplina'), 'ficha continua aberta após ESC e clique fora');
    await pagina.click('#modalDisciplina .modal__fechar');
    await pagina.waitForSelector('#modalDisciplina', { state: 'hidden' });
    igual(await pagina.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-abrir-ficha')), 'PSC1322', 'foco devolvido');
    verdade(!(await pagina.evaluate(() => document.body.classList.contains('modalAberto'))), 'rolagem liberada');
  });
  await teste('navegar para um requisito e voltar', async () => {
    await pagina.fill('#campoBusca', 'PSE2355');
    await pagina.waitForTimeout(300);
    await pagina.click('#corpoTabela tr[data-codigo="PSE2355"] td:nth-child(2)');
    await pagina.waitForSelector('#modalDisciplina:not([hidden])');
    await pagina.click('#modalDisciplinaCorpo [data-abrir-ficha="PSE2254"]');
    await pagina.waitForFunction(() => document.getElementById('modalDisciplinaCodigo').textContent.indexOf('PSE2254') >= 0);
    verdade(/É requisito para/.test(await pagina.textContent('#modalDisciplinaCorpo')), 'é requisito para');
    await pagina.click('[data-voltar-ficha]');
    await pagina.waitForFunction(() => document.getElementById('modalDisciplinaCodigo').textContent.indexOf('PSE2355') >= 0);
    await pagina.click('#modalDisciplina .modal__rodape [data-fechar-modal]');
    await pagina.fill('#campoBusca', '');
    await pagina.waitForTimeout(300);
  });

  console.log('\n== Abas');
  await teste('currículos e importações (setas do teclado)', async () => {
    await pagina.focus('#aba-disciplinas');
    await pagina.keyboard.press('ArrowRight');
    verdade(!(await pagina.isHidden('#painel-curriculos')), 'currículos visível');
    const txt = await pagina.textContent('#listaCurriculos');
    verdade(/Bacharelado/.test(txt) && /AAC exigida: 60 h/.test(txt), txt.slice(0, 200));
    await pagina.screenshot({ path: path.join(SAIDA, '07-curriculos-csv.png'), fullPage: true });
    await pagina.keyboard.press('ArrowRight');
    verdade(/Carga inicial/.test(await pagina.textContent('#listaImportacoes')) || /Ver mudanças/.test(await pagina.textContent('#listaImportacoes')), 'histórico');
    await pagina.keyboard.press('Home');
  });

  console.log('\n== Revisão paginada e alerta de planilha desatualizada');
  await teste('revisão de 1.102 valores: 12 páginas; "Gravar" e a caixa bloqueados até abrir todas; caixa forçada pelo DOM → servidor recusa; com as 12 páginas → grava', async () => {
    const par = parSintetico(pacotePdfModelo(), 551);
    const amb2 = criarAmbiente({ dirSrc: DIR_SRC });
    amb2.ctx.obterDadosPainel();
    const pc = amb2.ctx.prepararImportacao(par.csv);
    verdade(amb2.ctx.confirmarImportacao(par.csv, pc.dados.assinatura, { operacao: pc.dados.operacao }).ok, 'CSV sintético');
    const prepOriginal = amb2.ctx.prepararImportacao;
    amb2.ctx.prepararImportacao = function (pac) {
      const r = prepOriginal.apply(this, arguments);
      if (r.ok) amb2.__ultimaPrevia = { pacote: pac, assinatura: r.dados.assinatura, operacao: r.dados.operacao };
      return r;
    };
    const { pagina: pg, errosPagina: erros2, chamadas: ch2, contexto: cx2 } = await abrirPainel(nav, { amb: amb2, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pg);
    await pg.evaluate((pac) => { window.Importacao.abrirComPacote(pac); }, par.pdfOcr);
    await pg.click('[data-imp="previa"]');
    await pg.waitForSelector('#revisaoLista .paginacaoRevisao');
    // Assinatura e operação da prévia mostrada (para a chamada direta abaixo).
    await pg.evaluate((dados) => { window.__previaTeste = dados; }, amb2.__ultimaPrevia);
    const resumo = await pg.textContent('#revisaoResumo');
    verdade(/Todos os 1\.102 valores/.test(resumo) && /12 páginas de até 100/.test(resumo) && /iguais a 0/.test(resumo), resumo);
    verdade(/Página 1 de 12 · itens 1–100 de 1\.102/.test(await pg.textContent('#revisaoLista')), 'indicação de página');
    verdade(await pg.isDisabled('#confirmarRevisao') && await pg.isDisabled('[data-imp="gravar"]'), 'bloqueado com 1 de 12 páginas');
    verdade(/faltam 11/.test(await pg.textContent('#revisaoProgresso')), 'progresso');
    await pg.evaluate(() => document.getElementById('revisaoTitulo').scrollIntoView());
    await pg.screenshot({ path: path.join(SAIDA, '13-revisao-paginada.png') });
    // Burlar a interface: habilitar a caixa e o botão pelo DOM.
    await pg.evaluate(() => { const c = document.getElementById('confirmarRevisao'); c.disabled = false; c.checked = true; document.querySelector('[data-imp="gravar"]').disabled = false; });
    await pg.click('[data-imp="gravar"]');
    await pg.waitForSelector('#importacaoCorpo .alerta--erro');
    const recusa = await pg.textContent('#importacaoCorpo .alerta--erro');
    verdade(/marque a confirmação da revisão/.test(recusa), 'a interface não declara revisão com páginas faltando: ' + recusa);
    // Chamada direta ao servidor, como um cliente que ignorasse a interface.
    const direta = await pg.evaluate(() => new Promise((ok) => {
      const pv = window.__previaTeste;
      google.script.run.withSuccessHandler(ok).withFailureHandler((e) => ok({ falha: String(e) })).confirmarImportacao(pv.pacote, pv.assinatura, { operacao: pv.operacao, revisaoPdf: true });
    }));
    verdade(direta && direta.ok === false && direta.codigo === 'REVISAO_INCOMPLETA' && /11 de 12 páginas/.test(direta.erro), JSON.stringify(direta));
    igual(amb2.ctx.obterDadosPainel().dados.importacoes.length, 1, 'nada gravado');
    // Navegar por todas as páginas.
    for (let k = 2; k <= 12; k++) {
      await pg.click('#revisaoLista nav:first-of-type [data-imp="rev-proxima"]');
      await pg.waitForFunction((n) => new RegExp('Página ' + n + ' de 12').test(document.getElementById('revisaoLista').textContent) && !/Carregando/.test(document.getElementById('revisaoLista').textContent), k);
    }
    const ultima = await pg.textContent('#revisaoLista');
    verdade(/itens 1\.101–1\.102 de 1\.102/.test(ultima) && /EXT = 0/.test(ultima), 'última página com os EXT = 0');
    verdade(/Todas as 12 páginas foram abertas/.test(await pg.textContent('#revisaoProgresso')), 'progresso completo');
    verdade(await pg.isEnabled('#confirmarRevisao') && await pg.isDisabled('[data-imp="gravar"]'), 'caixa liberada; gravar espera a caixa');
    await pg.click('#revisaoLista nav:first-of-type [data-imp="rev-anterior"]');
    await pg.waitForFunction(() => /Página 11 de 12/.test(document.getElementById('revisaoLista').textContent));
    await pg.check('#confirmarRevisao');
    verdade(await pg.isEnabled('[data-imp="gravar"]'), 'gravar liberado');
    await pg.click('[data-imp="gravar"]');
    await pg.waitForSelector('[data-imp="concluir"]');
    verdade(/Importação gravada/.test(await pg.textContent('#importacaoCorpo')), 'gravada');
    igual(ch2.filter((c) => c === 'obterPaginaRevisao').length, 11, 'páginas pedidas ao servidor (a 11 não é pedida de novo)');
    const d = amb2.ctx.obterDadosPainel().dados;
    igual([d.importacoes.length, d.base.disciplinas.filter((x) => x.ext !== '' && x.ext != null).length], [2, 551]);
    igual(erros2, []);
    await cx2.close();
  });

  await teste('arrumação falha ao gravar: tela diz "gravada" + alerta; leitor vê o alerta no painel; admin reabre → corrigido e alerta some', async () => {
    const amb3 = criarAmbiente({ dirSrc: DIR_SRC });
    amb3.ctx.obterDadosPainel();
    const csv = JSON.parse(JSON.stringify(pacote));
    const p0 = amb3.ctx.prepararImportacao(csv);
    verdade(amb3.ctx.confirmarImportacao(csv, p0.dados.assinatura, { operacao: p0.dados.operacao }).ok);
    const alterado = JSON.parse(JSON.stringify(pacote));
    alterado.disciplinas.find((x) => x.codigo === 'PSC1322').nome = 'Introdução à Psicopatologia (nova ementa)';
    const { pagina: pg, errosPagina: erros3, contexto: cx3 } = await abrirPainel(nav, { amb: amb3, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pg);
    await pg.evaluate((pac) => { window.Importacao.abrirComPacote(pac); }, alterado);
    await pg.click('[data-imp="previa"]');
    await pg.waitForSelector('[data-imp="gravar"]:not([disabled])');
    let armado = false;
    const f = amb3.injetarFalha((e) => { if (e.tipo === 'metadado' && e.chave === 'estruturaCurricular.ativa') { armado = true; return false; } return armado && e.tipo === 'setName'; }, 1000);
    await pg.click('[data-imp="gravar"]');
    await pg.waitForSelector('[data-imp="concluir"]');
    const tela = await pg.textContent('#importacaoCorpo');
    verdade(/Importação gravada/.test(tela) && /A planilha ainda mostra a versão anterior/.test(tela) && /"Disciplinas"/.test(tela), tela.slice(0, 600));
    await pg.screenshot({ path: path.join(SAIDA, '14-gravada-planilha-desatualizada.png') });
    // "Ver a estrutura": o admin recarrega, mas a falha continua → alerta no painel.
    await pg.click('[data-imp="concluir"]');
    await esperarCarregado(pg);
    const aviso = await pg.textContent('#estadoBase');
    verdade(/A planilha ainda não mostra a versão em uso/.test(aviso) && /não conseguiu terminar/.test(aviso), aviso);
    await cx3.close();
    // Leitor: vê o alerta; nada muda na planilha.
    amb3.permitir('leitor@unidade.example', 'LEITOR');
    amb3.trocarUsuario('leitor@unidade.example');
    const { pagina: pl, contexto: cxl, errosPagina: errosL } = await abrirPainel(nav, { amb: amb3, largura: 390, altura: 800, latencia: 0 });
    await esperarCarregado(pl);
    const avisoL = await pl.textContent('#estadoBase');
    verdade(/A planilha ainda não mostra a versão em uso/.test(avisoL) && /próxima vez que a equipe responsável abrir o painel/.test(avisoL), avisoL);
    await pl.screenshot({ path: path.join(SAIDA, '15-leitor-alerta-planilha.png') });
    igual(errosL, []);
    await cxl.close();
    // Admin reabre sem a falha: corrigido.
    amb3.limparFalhas();
    amb3.trocarUsuario('dono@unidade.example');
    const { pagina: pa, contexto: cxa, errosPagina: errosA } = await abrirPainel(nav, { amb: amb3, largura: 1280, altura: 900, latencia: 0 });
    await esperarCarregado(pa);
    const avisoA = await pa.textContent('#estadoBase');
    verdade(!/A planilha ainda não mostra/.test(avisoA) && /foram concluídos agora/.test(avisoA), avisoA);
    const ss = amb3.estrutura();
    const m = JSON.parse(ss.getDeveloperMetadata().find((x) => x.getKey() === 'estruturaCurricular.ativa').getValue());
    igual(['Disciplinas', 'Disciplinas por habilitação', 'Requisitos', 'Currículos'].map((n) => ss.getSheetByName(n).getSheetId()), ['Disciplinas', 'Disciplinas por habilitação', 'Requisitos', 'Currículos'].map((n) => m.abas[n]), 'abas visíveis = manifesto');
    verdade(f.disparos > 0, 'falha disparada');
    igual(erros3.concat(errosA), []);
    await cxa.close();
  });

  if (SEM_OCR) {
    pulados.push('lê o PDF por OCR, confere e complementa a base — opção --sem-ocr');
    pulados.push('ficha mostra versão, EXT e requisitos "ou" vindos do PDF — depende do teste de OCR');
  }
  if (!SEM_OCR) {
    console.log('\n== PDF sem texto: leitura por OCR no navegador');
    await teste('lê o PDF por OCR, confere e complementa a base', async () => {
      await pagina.click('[data-abrir-importacao]');
      await pagina.waitForSelector('#entradaArquivo', { state: 'attached' });
      const t0 = Date.now();
      await pagina.setInputFiles('#entradaArquivo', pdfPath);
      await pagina.waitForSelector('#barraLeitura');
      await pagina.waitForTimeout(20000);
      await pagina.screenshot({ path: path.join(SAIDA, '08-lendo-ocr.png') });
      await pagina.waitForSelector('[data-imp="previa"]', { timeout: 15 * 60 * 1000 });
      console.log('      OCR concluído em', Math.round((Date.now() - t0) / 1000), 's');
      const txt = await pagina.textContent('#importacaoCorpo');
      console.log('      ', (txt.match(/Coerência aritmética:[^)]*\)[^)]*\)/) || [txt.slice(0, 400)])[0]);
      await pagina.screenshot({ path: path.join(SAIDA, '09-conferencia-pdf.png'), fullPage: true });
      verdade(/PDF sem texto, lido por OCR/.test(txt), 'modo OCR');
      await pagina.click('[data-imp="previa"]');
      await pagina.waitForSelector('[data-imp="gravar"]');
      const prev = await pagina.textContent('#importacaoCorpo');
      await pagina.screenshot({ path: path.join(SAIDA, '10-previa-pdf.png'), fullPage: true });
      verdade(/complemento/.test(prev), 'modo complemento');
      verdade(/Conferência do PDF/.test(prev) && /Concordância com a base \(CSV\)/.test(prev) && /1\.098 de 1\.098 números/.test(prev), 'categorias da conferência');
      verdade(/Valores só do PDF que serão gravados/.test(prev), 'lista de revisão');
      verdade(!(await pagina.isEnabled('[data-imp="gravar"]')), 'gravar exige a revisão');
      verdade(await pagina.isDisabled('#confirmarRevisao'), 'caixa bloqueada até abrir as 4 páginas');
      for (let k = 2; k <= 4; k++) {
        await pagina.click('#revisaoLista nav:first-of-type [data-imp="rev-proxima"]');
        await pagina.waitForFunction((n) => new RegExp('Página ' + n + ' de 4').test(document.getElementById('revisaoLista').textContent) && !/Carregando/.test(document.getElementById('revisaoLista').textContent), k);
      }
      verdade(/itens 301–386 de 386/.test(await pagina.textContent('#revisaoLista')), 'última página');
      await pagina.check('#confirmarRevisao');
      verdade(await pagina.isEnabled('[data-imp="gravar"]'), 'pode gravar depois de marcar a revisão: ' + prev.slice(0, 500));
      await pagina.click('[data-imp="gravar"]');
      await pagina.waitForSelector('[data-imp="concluir"]');
      await pagina.click('[data-imp="concluir"]');
      await esperarCarregado(pagina);
    });
    await teste('ficha mostra versão, EXT e requisitos "ou" vindos do PDF', async () => {
      await pagina.fill('#campoBusca', 'PSE2355');
      await pagina.waitForTimeout(300);
      await pagina.click('#corpoTabela [data-abrir-ficha="PSE2355"]');
      await pagina.waitForSelector('#modalDisciplina:not([hidden])');
      const txt = await pagina.textContent('#modalDisciplinaCorpo');
      verdade(/Basta um destes:/.test(txt), 'grupo ou');
      verdade(/versão 2/.test(await pagina.textContent('#modalDisciplinaCodigo')), 'versão');
      await pagina.screenshot({ path: path.join(SAIDA, '11-ficha-pdf.png'), fullPage: true });
      await pagina.click('#modalDisciplina .modal__fechar');
      await pagina.fill('#campoBusca', 'PSC1322');
      await pagina.waitForTimeout(300);
      await pagina.click('#corpoTabela [data-abrir-ficha="PSC1322"]');
      const t2 = await pagina.textContent('#modalDisciplinaCorpo');
      verdade(/10 h de atividade extensionista/.test(t2), 'EXT 10');
      verdade(/e também/.test(t2), 'requisitos "e"');
      await pagina.click('#modalDisciplina .modal__fechar');
      await pagina.fill('#campoBusca', '');
      await pagina.waitForTimeout(300);
      await pagina.check('[data-filtro="comExtensao"]');
      igual(await contagem(), 24);
      await limpar();
      await pagina.click('#aba-curriculos');
      const c = await pagina.textContent('#listaCurriculos');
      verdade(/Ativo desde 15\/07\/2026/.test(c) && /Total em disciplinas/.test(c), 'informações do currículo');
      await pagina.screenshot({ path: path.join(SAIDA, '12-curriculos-pdf.png'), fullPage: true });
      await pagina.click('#aba-disciplinas');
    });
  }

  await teste('versão implantada aparece no fim da página', async () => {
    const versao = (await pagina.textContent('#versaoSistema')).trim();
    const esperada = /var VERSAO_SISTEMA = '([^']+)'/.exec(fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8'))[1];
    igual(versao, 'Estrutura Curricular · versão ' + esperada);
  });

  await teste('nenhum erro de JavaScript na página', async () => {
    igual(errosPagina, []);
  });
  console.log('   chamadas ao servidor:', chamadas.join(', '));
  fs.writeFileSync(path.join(SAIDA, 'estado-planilha.json'), JSON.stringify({ versaoBase: amb.estrutura().getDeveloperMetadata().map((m) => [m.getKey(), m.getValue()]) }));
  await nav.close();
  console.log(`\nExecutados: ${ok + falhas} (${ok} ok, ${falhas} falha(s)); pulados: ${pulados.length}`);
  pulados.forEach((p) => console.log('Pulado (não conta como aprovado): ' + p));
  if (falhas) { console.log('Falharam:', falhou.join(' | ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });

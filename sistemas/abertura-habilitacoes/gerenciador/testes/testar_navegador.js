// Testes de navegador do Gerenciador de Abertura de Habilitações 2.0
// (Chromium real via Playwright). google.script.run é simulado com dados
// sintéticos (nenhum dado real, nenhum servidor). Confere: tema e marcas,
// menu lateral x abas, teclado, carregamento sob demanda, estados de
// carregando/vazio/erro, resposta nula ou malformada, texto da planilha
// tratado como texto (nunca HTML), detalhe e salvamento (confirmação,
// reenvio, e-mail que falhou, conflito de versão, clique duplo), pedido
// sem identificador, histórico, relatórios, perfil LEITOR, Central de
// Ajuda, contraste WCAG, larguras de 360 a 1280 px e a página sem acesso.
// Uso: node testar_navegador.js   (EVIDENCIAS=<pasta> grava as capturas lá)
'use strict';
const fs = require('fs');
const path = require('path');
function carregarPlaywright() { try { return require('playwright'); } catch (e) { return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } }
const { chromium } = carregarPlaywright();
const SRC = path.join(__dirname, '..', 'src') + '/';
const SAIDA = process.env.EVIDENCIAS ? path.resolve(process.env.EVIDENCIAS) + '/' : path.join(require('os').tmpdir(), 'abertura-habilitacoes-');

function incluir(h) {
  for (let k = 0; k < 4; k++) h = h.replace(/<\?!= include_\('(\w+)'\); \?>/g, (_, n) => fs.readFileSync(SRC + n + '.html', 'utf8'));
  return h;
}
function montarPagina(perfil, homologacao) {
  let h = incluir(fs.readFileSync(SRC + 'GerenciadorApp.html', 'utf8'));
  h = h.replace('<?!= JSON.stringify({ perfil: perfil, versao: versao, homologacao: homologacao }) ?>', JSON.stringify({ perfil, versao: '2.0', homologacao }));
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}
function montarSemAcesso(titulo, mensagem) {
  const h = incluir(fs.readFileSync(SRC + 'GerenciadorSemAcesso.html', 'utf8')).replace('<?= titulo ?>', titulo).replace('<?= mensagem ?>', mensagem);
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}

const ID = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const PENDENTES = [
  { registroId: ID(2), versao: 3, nome: 'Álvaro Fictício', nUsp: '9000002', email: 'alvaro@exemplo.invalid', habilitacao: 'Licenciatura em Psicologia', carimbo: '10/02/2026 09:00', observacoes: 'Aguardando documento', inconsistencia: '' },
  { registroId: ID(1), versao: 1, nome: 'Bruna Exemplo', nUsp: '9000001', email: 'bruna@exemplo.invalid', habilitacao: 'Bacharelado em Psicologia', carimbo: '02/03/2026 10:00', observacoes: '', inconsistencia: '' },
  { registroId: '', versao: 1, nome: 'Elisa Sem Identificador', nUsp: '9000005', email: 'elisa@exemplo.invalid', habilitacao: 'Bacharelado em Psicologia', carimbo: '05/05/2026 09:00', observacoes: '', inconsistencia: 'SEM_IDENTIFICADOR', referencia: { linha: 6, carimbo: 1777982400000, nUsp: '9000005' } },
  { registroId: '', versao: 1, nome: 'Fábio Repetido', nUsp: '9000006', email: 'fabio@exemplo.invalid', habilitacao: 'Bacharelado em Psicologia', carimbo: '03/01/2026 09:00', observacoes: '', inconsistencia: 'IDENTIFICADOR_REPETIDO' },
  { registroId: ID(9), versao: 1, nome: '<img src=x onerror="window.__xss=1">Teste', nUsp: '9000009', email: 'xss@exemplo.invalid', habilitacao: '<b>negrito</b>', carimbo: '', observacoes: '', inconsistencia: '' }
];
const CONCLUIDOS = [
  { registroId: ID(3), versao: 2, nome: 'Carla Modelo', nUsp: '9000003', email: 'carla@exemplo.invalid', habilitacao: 'Bacharelado em Psicologia, Licenciatura em Psicologia', carimbo: '20/03/2026 09:00', observacoes: '', inconsistencia: '', dataConclusao: '01/04/2026 15:00', emailEnviado: '01/04/2026 15:05', envioReservado: false },
  { registroId: ID(4), versao: 1, nome: 'Daniel Teste', nUsp: '9000004', email: 'daniel@exemplo.invalid', habilitacao: 'Bacharelado em Psicologia', carimbo: '15/01/2026 09:30:00', observacoes: '', inconsistencia: '', dataConclusao: '15/01/2026 09:30:00', emailEnviado: '', envioReservado: true }
];
const BUSCA = [
  { origem: 'Atual', registroId: ID(1), nome: 'Bruna Exemplo', nUsp: '9000001', email: 'bruna@exemplo.invalid', habilitacao: 'Bacharelado em Psicologia', carimbo: '02/03/2026 10:00', situacao: 'Pendente' },
  { origem: 'Histórico (2021-2022)', registroId: '', nome: 'Bruna Exemplo', nUsp: '9000001', email: 'bruna@exemplo.invalid', habilitacao: 'Licenciatura em Psicologia', carimbo: '10/05/2021 14:00:00', situacao: 'Concluído' }
];
const RELATORIO = {
  total: 14, semData: 1, fontes: { atual: 10, historico: 4 },
  porHabilitacao: [{ chave: 'Bacharelado em Psicologia', quantidade: 11 }, { chave: 'Licenciatura em Psicologia', quantidade: 4 }, { chave: 'Outro / não identificado', quantidade: 1 }],
  porAno: [{ chave: '2026', quantidade: 9 }, { chave: '2025', quantidade: 1 }, { chave: '2022', quantidade: 2 }, { chave: '2021', quantidade: 1 }],
  porMes: [{ chave: '2026-05', quantidade: 1 }, { chave: '2026-04', quantidade: 2 }, { chave: '2026-03', quantidade: 3 }, { chave: '2026-02', quantidade: 2 }, { chave: '2026-01', quantidade: 5 }]
};
const NOMES_SINTETICOS = ['Álvaro', 'Bruna', 'Elisa', 'Carla', '9000001', 'exemplo.invalid'];

// API simulada. window.__roteiro[nome] = lista de respostas a usar antes
// do padrão: {valor}, {erro:'CODIGO: msg'}, {atraso:ms}.
const stub = () => `(function(){
var P=${JSON.stringify(PENDENTES)},C=${JSON.stringify(CONCLUIDOS)},B=${JSON.stringify(BUSCA)},R=${JSON.stringify(RELATORIO)};
window.__chamadas=[];window.__roteiro={};
function detalhe(id){var p=P.concat(C).filter(function(x){return x.registroId===id})[0];if(!p)throw new Error('NAO_ENCONTRADO: Esse pedido não foi encontrado.');
 var c=C.indexOf(p)!==-1;return {registroId:id,versao:p.versao,nome:p.nome,nUsp:p.nUsp,email:p.email,emailFormulario:'',anoIngresso:'2024',trancamento:'Não',habilitacao:p.habilitacao,carimbo:p.carimbo,situacao:c?'Concluído':'',concluido:c,observacoes:p.observacoes,dataConclusao:c?p.dataConclusao:'',emailEnviado:c?p.emailEnviado:'',envioReservado:!!p.envioReservado,envioInterrompido:false}}
var API={
 obterPendentes:function(){return JSON.parse(JSON.stringify(P))},
 obterConcluidosRecentes:function(){return JSON.parse(JSON.stringify(C))},
 obterDetalhe:detalhe,
 buscarHistorico:function(t){return JSON.parse(JSON.stringify(B.filter(function(x){return x.nome.toLowerCase().indexOf(String(t).toLowerCase())!==-1})))},
 obterRelatorio:function(){return JSON.parse(JSON.stringify(R))},
 salvarPedido:function(id,v,d){var x=detalhe(id);return {resultado:'SALVO',registroId:id,versao:v+(d.avisarAluno?2:1),situacao:d.concluirSolicitacao?'Concluído':'pendente',concluido:!!d.concluirSolicitacao,dataConclusao:d.concluirSolicitacao?'21/10/2026 10:00':'',emailEnviado:d.avisarAluno?'21/10/2026 10:00':x.emailEnviado,email:d.avisarAluno?'ENVIADO':'NAO_SOLICITADO'}},
 atribuirIdentificador:function(r){return {registroId:ID9(),versao:1}}
};
function ID9(){return '00000000-0000-4000-8000-000000000777'}
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(){var args=[].slice.call(arguments);window.__chamadas.push({nome:n,args:JSON.parse(JSON.stringify(args))});
  var passo=(window.__roteiro[n]||[]).shift()||{};
  setTimeout(function(){try{if('erro' in passo)f(new Error(passo.erro));else if('valor' in passo)s(passo.valor);else s(API[n].apply(null,args))}catch(e){f(e)}},passo.atraso||30)}});return o}
window.google={script:{get run(){return runner()}}};})();`;

function lum(c) { const m = c.match(/[\d.]+/g).map(Number); const a = m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const BG = `function bg(el){while(el){const c=getComputedStyle(el).backgroundColor;if(c&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c))return c;el=el.parentElement}return getComputedStyle(document.body).backgroundColor}`;

let ok = 0, falhas = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; console.log('ok   ', n, extra); } else { falhas++; console.log('FALHA', n, extra); } };
async function contraste(p, rotulo, seletores) {
  const pares = await p.evaluate(([sel, bgsrc]) => { const bg = eval('(' + bgsrc + ')'); return sel.map(s => { const e = [...document.querySelectorAll(s)].find(x => x.offsetParent || x.getClientRects().length); if (!e) return [s, null, null]; return [s, getComputedStyle(e).color, bg(e)]; }); }, [seletores, BG]);
  for (const [s, c, b] of pares) { if (!c) { chk(`${rotulo} existe ${s}`, false); continue; } const r = cr(c, b); chk(`${rotulo} contraste ${s}`, r >= 4.5, r.toFixed(2)); }
}

async function abrir(ctx, { perfil = 'ADMINISTRADOR', homologacao = false, antes = '' } = {}) {
  const p = await ctx.newPage();
  const erros = [], consoleTexto = [];
  p.on('pageerror', e => erros.push(e.message));
  p.on('console', m => { consoleTexto.push(m.text()); if (m.type() === 'error') erros.push(m.text()); });
  const pagina = montarPagina(perfil, homologacao).replace('<head>', '<head><script>' + stub() + antes + '</script>');
  await p.route('http://gerenciador.teste/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: pagina }));
  await p.route('https://datagrad.sistemas.ip.usp.br/**', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"><rect width="240" height="97" fill="#00509d"/></svg>' }));
  await p.goto('http://gerenciador.teste/');
  p.erros = erros; p.consoleTexto = consoleTexto;
  return p;
}
const chamadas = (p, nome) => p.evaluate(n => window.__chamadas.filter(c => c.nome === n), nome);
const esperarLista = (p, sel, n) => p.waitForFunction(([s, k]) => document.querySelectorAll(s + ' > li').length === k, [sel, n], { timeout: 5000 }).then(() => true, () => false);
const focoNaSecao = (p, id) => p.waitForFunction(id => { const o = document.querySelector('[data-gradip-help-overlay]'); const s = document.activeElement && document.activeElement.closest('section'); return o && !o.hidden && s && s.id === id; }, id, { timeout: 5000 }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch();

  for (const scheme of ['light', 'dark']) {
    const T = `[${scheme}]`;
    const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    const p = await abrir(ctx);

    /*---------- abertura ----------*/
    chk(`${T} tema Sistema resolvido`, await p.evaluate(s => document.documentElement.dataset.theme === s && document.documentElement.dataset.themePreference === 'system', scheme));
    chk(`${T} marca certa no cabeçalho`, await p.evaluate(s => { const o = s === 'light' ? 'dark' : 'light'; return [...document.querySelectorAll('.gradip-logo-' + s)].every(e => getComputedStyle(e).display !== 'none') && [...document.querySelectorAll('.gradip-logo-' + o)].every(e => getComputedStyle(e).display === 'none'); }, scheme));
    chk(`${T} abre no menu lateral, Pendentes atual`, await p.evaluate(() => document.getElementById('layout').dataset.navegacao === 'sidebar' && document.getElementById('navPendentes').getAttribute('aria-current') === 'page'));
    chk(`${T} ícones injetados`, await p.$$eval('[data-icone] svg', e => e.length) >= 12);
    chk(`${T} administrador sem aviso de consulta e sem faixa de homologação`, await p.evaluate(() => document.getElementById('avisoSomenteLeitura').hidden && document.getElementById('faixaHomologacao').hidden));
    chk(`${T} versão no rodapé`, (await p.textContent('#versaoSistema')) === '2.0');
    chk(`${T} pendentes carregados`, await esperarLista(p, '#listaPendentes', 5));
    chk(`${T} contador e menu com o total`, (await p.textContent('#contadorPendentes')) === '5' && (await p.textContent('#navContagemPendentes')) === '5');
    chk(`${T} status anuncia pedidos que precisam de conferência`, /5 pedidos pendentes\. 2 pedidos precisam de conferência/.test(await p.textContent('#statusPendentes')));
    chk(`${T} só uma chamada na abertura (Concluídos e Relatórios sob demanda)`, await p.evaluate(() => window.__chamadas.map(c => c.nome).join() === 'obterPendentes'));

    /*---------- texto da planilha nunca vira HTML ----------*/
    chk(`${T} nome com HTML aparece como texto`, await p.evaluate(() => !window.__xss && !document.querySelector('#listaPendentes img') && !document.querySelector('#listaPendentes b') && [...document.querySelectorAll('.cartaoPedido__nome')].some(e => e.textContent.startsWith('<img'))));

    /*---------- cartões ----------*/
    chk(`${T} sem identificador: cartão sem ação, com selo e ajuda`, await p.evaluate(() => { const c = [...document.querySelectorAll('#listaPendentes .cartaoPedido')].find(e => e.textContent.includes('Elisa')); return c.tagName === 'DIV' && c.textContent.includes('Sem identificador') && !!c.querySelector('[data-gradip-help-open="ajuda-sem-identificador"]'); }));
    chk(`${T} administrador vê "Preparar pedido" só no sem identificador`, await p.$$eval('#listaPendentes button.botaoSecundario', e => e.filter(x => x.textContent === 'Preparar pedido').length) === 1);
    chk(`${T} ID repetido: sem ação e sem "Preparar"`, await p.evaluate(() => { const c = [...document.querySelectorAll('#listaPendentes .cartaoPedido')].find(e => e.textContent.includes('Fábio')); return c.tagName === 'DIV' && c.textContent.includes('Identificador repetido') && !c.textContent.includes('Preparar'); }));
    chk(`${T} pedido normal é botão`, await p.$$eval('#listaPendentes button.cartaoPedido', e => e.length) === 3);

    /*---------- busca nos pendentes ----------*/
    await p.fill('#buscaPendentes', 'alvaro');
    chk(`${T} busca sem acento filtra`, (await p.$$eval('#listaPendentes > li', e => e.length)) === 1 && /1 de 5/.test(await p.textContent('#statusPendentes')));
    await p.fill('#buscaPendentes', '9000001');
    chk(`${T} busca por Nº USP`, (await p.textContent('#listaPendentes')).includes('Bruna'));
    await p.fill('#buscaPendentes', 'zzzz');
    chk(`${T} busca sem resultado mostra estado vazio`, (await p.textContent('#estadoPendentes')).includes('Nenhum pedido pendente corresponde'));
    await p.fill('#buscaPendentes', '');
    chk(`${T} limpar a busca devolve a lista`, await esperarLista(p, '#listaPendentes', 5));

    await contraste(p, T, ['.tituloSistema', '.subtituloSistema', '.cardResumo h1', '.cardResumo p', '.contador', '#buscaPendentes', '.campoBusca label', '.statusLista', '.cartaoPedido__nome', '.cartaoPedido__meta', '.cartaoPedido__email', '.selo--pendente', '.selo--problema', '.linkAjudaContextual', '.botaoSecundario', '.navItem[aria-current="page"]', '.navItem:not([aria-current])', '.navContagem', '.botaoModo[aria-pressed="true"]', '.botaoModo[aria-pressed="false"]', '.botaoAjuda', '.rodape', '.gradip-theme-control__select', '.sidebar__titulo']);
    await p.screenshot({ path: SAIDA + `pendentes-${scheme}.png`, fullPage: true });

    /*---------- detalhe ----------*/
    const cartaoBruna = '#listaPendentes button.cartaoPedido >> text=Bruna Exemplo';
    await p.click(cartaoBruna);
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    chk(`${T} detalhe aberto com dados e foco no diálogo`, await p.evaluate(() => !document.getElementById('modalDetalhe').hidden && document.getElementById('detalheNome').textContent === 'Bruna Exemplo' && document.getElementById('infoNUsp').textContent === '9000001' && document.querySelector('#modalDetalhe').contains(document.activeElement)));
    chk(`${T} pendente abre com concluir e avisar marcados (padrão da 1.0)`, await p.evaluate(() => document.getElementById('checkConcluir').checked && document.getElementById('checkAvisar').checked && document.getElementById('botaoSalvar').textContent.includes('avisar')));
    chk(`${T} rolagem da página travada com o diálogo`, await p.evaluate(() => document.body.style.overflow === 'hidden'));
    await contraste(p, T + ' detalhe', ['#detalheNome', '.modalEyebrow', '.listaDados dt', '.listaDados dd', '#infoSituacao', '#campoObservacoes', '.ajudaCampo', '.opcao label', '.opcao__dica', '#botaoSalvar']);
    await p.screenshot({ path: SAIDA + `detalhe-${scheme}.png` });
    // Tab fica preso no diálogo
    for (let i = 0; i < 25; i++) await p.keyboard.press('Tab');
    chk(`${T} Tab não sai do diálogo`, await p.evaluate(() => document.querySelector('#modalDetalhe').contains(document.activeElement)));
    // ajuda por cima do diálogo: Esc fecha só a ajuda
    await p.click('[data-gradip-help-open="ajuda-email"]');
    chk(`${T} ajuda contextual abre por cima do detalhe`, await focoNaSecao(p, 'ajuda-email'));
    await p.keyboard.press('Escape');
    chk(`${T} Esc fecha só a ajuda`, await p.evaluate(() => document.querySelector('[data-gradip-help-overlay]').hidden && !document.getElementById('modalDetalhe').hidden));
    await p.keyboard.press('Escape');
    chk(`${T} Esc fecha o detalhe e devolve o foco ao cartão`, await p.waitForFunction(() => document.getElementById('modalDetalhe').hidden && document.activeElement && document.activeElement.textContent.includes('Bruna Exemplo'), null, { timeout: 3000 }).then(() => true, () => false));
    chk(`${T} rolagem liberada`, await p.evaluate(() => document.body.style.overflow === ''));

    /*---------- salvar com aviso ----------*/
    await p.click(cartaoBruna);
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    await p.fill('#campoObservacoes', 'Documento conferido');
    await p.click('#botaoSalvar');
    await p.waitForSelector('#modalConfirmacao:not([hidden])');
    chk(`${T} confirmação antes do e-mail, foco em Cancelar`, await p.evaluate(() => document.getElementById('confirmacaoTexto').textContent.includes('Bruna Exemplo vai receber um e-mail') && document.activeElement.id === 'confirmacaoCancelar'));
    await p.screenshot({ path: SAIDA + `confirmacao-${scheme}.png` });
    await p.keyboard.press('Escape');
    chk(`${T} cancelar não chama o servidor`, (await chamadas(p, 'salvarPedido')).length === 0 && await p.evaluate(() => !document.getElementById('modalDetalhe').hidden));
    await p.click('#botaoSalvar');
    await p.click('#confirmacaoOk');
    await p.waitForSelector('#modalDetalhe', { state: 'hidden' });
    const s1 = await chamadas(p, 'salvarPedido');
    chk(`${T} salvarPedido com ID, versão e opções`, s1.length === 1 && JSON.stringify(s1[0].args) === JSON.stringify([ID(1), 1, { observacoes: 'Documento conferido', concluirSolicitacao: true, avisarAluno: true, reenviar: false }]), JSON.stringify(s1[0] && s1[0].args));
    chk(`${T} aviso de sucesso e lista recarregada`, (await p.textContent('#avisoGeral')).includes('aluno avisado') && (await chamadas(p, 'obterPendentes')).length === 2);

    /*---------- reenvio ----------*/
    await p.evaluate(() => { window.__roteiro.salvarPedido = [{ valor: { resultado: 'REENVIO_NECESSARIO', motivo: 'JA_AVISADO', versao: 1, mensagem: 'Esse aluno já foi avisado sobre esse pedido (01/04/2026 15:05).' } }]; });
    await p.click(cartaoBruna);
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    await p.click('#botaoSalvar'); await p.click('#confirmacaoOk');
    await p.waitForFunction(() => document.getElementById('confirmacaoTitulo').textContent === 'Confirmar reenvio?' && !document.getElementById('modalConfirmacao').hidden);
    chk(`${T} reenvio pede confirmação com a data anterior`, (await p.textContent('#confirmacaoTexto')).includes('01/04/2026 15:05'));
    await p.click('#confirmacaoOk');
    await p.waitForSelector('#modalDetalhe', { state: 'hidden' });
    const s2 = (await chamadas(p, 'salvarPedido')).slice(1);
    chk(`${T} segunda chamada com reenviar=true`, s2.length === 2 && s2[0].args[2].reenviar === false && s2[1].args[2].reenviar === true);

    /*---------- e-mail falhou: modal fica, versão nova ----------*/
    await p.evaluate(() => { window.__roteiro.salvarPedido = [{ valor: { resultado: 'SALVO', registroId: '00000000-0000-4000-8000-000000000001', versao: 2, situacao: 'Concluído', concluido: true, dataConclusao: '21/10/2026 10:00', emailEnviado: '', email: 'FALHOU', mensagem: 'O pedido foi salvo, mas o e-mail não pôde ser enviado.' } }]; });
    await p.click(cartaoBruna);
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    await p.fill('#campoObservacoes', 'texto mantido');
    await p.click('#botaoSalvar'); await p.click('#confirmacaoOk');
    await p.waitForSelector('#mensagemDetalhe:not([hidden])');
    chk(`${T} falha do e-mail: diálogo continua aberto com aviso`, await p.evaluate(() => !document.getElementById('modalDetalhe').hidden && document.getElementById('mensagemDetalhe').textContent.includes('foi salvo, mas o e-mail não foi enviado') && document.getElementById('campoObservacoes').value === 'texto mantido' && document.getElementById('infoSituacao').textContent === 'Concluído'));
    await p.screenshot({ path: SAIDA + `email-falhou-${scheme}.png` });
    await p.click('#botaoSalvar'); await p.click('#confirmacaoOk');
    await p.waitForSelector('#modalDetalhe', { state: 'hidden' });
    const s3 = (await chamadas(p, 'salvarPedido')).pop();
    chk(`${T} nova tentativa usa a versão devolvida`, s3.args[1] === 2);

    /*---------- conflito de versão ----------*/
    await p.evaluate(() => { window.__roteiro.salvarPedido = [{ erro: 'CONFLITO_VERSAO: Este pedido foi alterado em outra sessão depois que você o abriu.' }]; window.__roteiro.obterDetalhe = [{}, { valor: { registroId: '00000000-0000-4000-8000-000000000002', versao: 4, nome: 'Álvaro Fictício', nUsp: '9000002', email: 'alvaro@exemplo.invalid', emailFormulario: '', anoIngresso: '2024', trancamento: 'Não', habilitacao: 'Licenciatura em Psicologia', carimbo: '', situacao: 'pendente', concluido: false, observacoes: 'Texto gravado por outra pessoa', dataConclusao: '', emailEnviado: '', envioReservado: false, envioInterrompido: false } }]; });
    await p.click('#listaPendentes button.cartaoPedido >> text=Álvaro');
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    await p.uncheck('#checkAvisar');
    await p.fill('#campoObservacoes', 'Meu texto');
    await p.click('#botaoSalvar');
    await p.waitForSelector('#mensagemDetalhe:not([hidden])');
    chk(`${T} conflito: aviso, texto digitado mantido`, (await p.textContent('#mensagemDetalhe')).includes('mudou em outra sessão') && (await p.inputValue('#campoObservacoes')) === 'Meu texto');
    await p.click('#mensagemDetalhe >> text=Recarregar pedido');
    await p.waitForSelector('#observacoesAtuais:not([hidden])');
    chk(`${T} recarregar mostra o texto da planilha sem apagar o digitado`, (await p.textContent('#observacoesAtuais')).includes('Texto gravado por outra pessoa') && (await p.inputValue('#campoObservacoes')) === 'Meu texto');
    await p.screenshot({ path: SAIDA + `conflito-${scheme}.png` });
    // clique duplo: uma chamada só
    await p.evaluate(() => { window.__roteiro.salvarPedido = [{ atraso: 400 }]; });
    const antesDuplo = (await chamadas(p, 'salvarPedido')).length;
    await p.dblclick('#botaoSalvar');
    chk(`${T} durante o salvamento, botões desativados`, await p.evaluate(() => document.getElementById('botaoSalvar').disabled && document.getElementById('statusSalvamento').textContent.includes('Salvando')));
    await p.waitForSelector('#modalDetalhe', { state: 'hidden' });
    const duplo = (await chamadas(p, 'salvarPedido')).slice(antesDuplo);
    chk(`${T} clique duplo gera uma única gravação, com a versão recarregada`, duplo.length === 1 && duplo[0].args[1] === 4);

    /*---------- reabrir pede confirmação ----------*/
    /*---------- erros de servidor e respostas inválidas ----------*/
    await p.evaluate(() => { window.__roteiro.obterPendentes = [{ valor: null }]; });
    await p.click('[data-atualizar="pendentes"]');
    await p.waitForSelector('#estadoPendentes .alerta--erro');
    chk(`${T} resposta nula vira erro visível (não "lista vazia")`, (await p.textContent('#estadoPendentes')).includes('resposta vazia ou incompleta') && !(await p.textContent('#estadoPendentes')).includes('Nenhum pedido'));
    chk(`${T} lista anterior continua na tela`, (await p.$$eval('#listaPendentes > li', e => e.length)) === 5);
    await p.evaluate(() => { window.__roteiro.obterPendentes = [{ valor: { nome: 'não é lista' } }]; });
    await p.click('#estadoPendentes >> text=Tentar de novo');
    await p.waitForFunction(() => document.querySelectorAll('#estadoPendentes .alerta--erro').length === 1 && window.__chamadas.filter(c => c.nome === 'obterPendentes').length >= 5);
    chk(`${T} resposta malformada vira erro`, (await p.textContent('#estadoPendentes')).includes('resposta vazia ou incompleta'));
    await p.evaluate(() => { window.__roteiro.obterPendentes = [{ erro: 'CONFIGURACAO: A chave ABERTURA_HABILITACOES não foi encontrada na planilha ID_INDEX.' }]; });
    await p.click('[data-atualizar="pendentes"]');
    await p.waitForFunction(() => document.getElementById('estadoPendentes').textContent.includes('sem configuração válida'));
    chk(`${T} erro de configuração mostra mensagem genérica, sem detalhes internos`, !(await p.textContent('#estadoPendentes')).includes('ID_INDEX') && !!(await p.$('#estadoPendentes [data-gradip-help-open="ajuda-acesso"]')));
    await p.evaluate(() => { window.__roteiro.obterPendentes = [{ erro: 'TypeError: Cannot read properties of undefined' }]; });
    await p.click('[data-atualizar="pendentes"]');
    await p.waitForFunction(() => document.getElementById('estadoPendentes').textContent.includes('Algo deu errado'));
    chk(`${T} erro sem código: mensagem genérica`, !(await p.textContent('#estadoPendentes')).includes('TypeError'));
    // respostas fora de ordem: vale a última pedida
    await p.evaluate(() => { const velho = JSON.parse(JSON.stringify(window.__chamadas.length)); window.__roteiro.obterPendentes = [{ atraso: 500, valor: [] }, { atraso: 20 }]; });
    await p.click('[data-atualizar="pendentes"]');
    await p.evaluate(() => { document.querySelector('[data-atualizar="pendentes"]').disabled = false; });
    await p.click('[data-atualizar="pendentes"]');
    await p.waitForTimeout(700);
    chk(`${T} resposta atrasada não sobrescreve a mais nova`, (await p.$$eval('#listaPendentes > li', e => e.length)) === 5 && (await p.textContent('#estadoPendentes')) === '');
    // carregando
    await p.evaluate(() => { window.__roteiro.obterPendentes = [{ atraso: 600 }]; });
    await p.click('[data-atualizar="pendentes"]');
    chk(`${T} Atualizar fica desativado enquanto carrega`, await p.evaluate(() => document.querySelector('[data-atualizar="pendentes"]').disabled && document.querySelector('[data-atualizar="pendentes"]').getAttribute('aria-busy') === 'true'));
    await p.waitForFunction(() => !document.querySelector('[data-atualizar="pendentes"]').disabled);

    /*---------- preparar pedido sem identificador ----------*/
    await p.click('#listaPendentes >> text=Preparar pedido');
    await p.waitForSelector('#modalConfirmacao:not([hidden])');
    await p.click('#confirmacaoOk');
    await p.waitForFunction(() => window.__chamadas.some(c => c.nome === 'atribuirIdentificador'));
    const prep = await chamadas(p, 'atribuirIdentificador');
    chk(`${T} preparar envia a referência da linha`, JSON.stringify(prep[0].args[0]) === JSON.stringify(PENDENTES[2].referencia));
    await p.waitForFunction(() => document.getElementById('avisoGeral').textContent.includes('Pedido preparado'));

    /*---------- concluídos e histórico ----------*/
    const antesConcl = (await chamadas(p, 'obterConcluidosRecentes')).length;
    await p.click('#navConcluidos');
    chk(`${T} Concluídos só carrega quando aberto`, antesConcl === 0 && await esperarLista(p, '#listaConcluidos', 2));
    chk(`${T} concluídos mostram aviso e envio sem confirmação`, (await p.textContent('#listaConcluidos')).includes('Aluno avisado em 01/04/2026 15:05') && (await p.textContent('#listaConcluidos')).includes('sem confirmação de envio'));
    await contraste(p, T + ' concluídos', ['.selo--concluido', '#listaConcluidos .cartaoPedido__meta', '#buscaHistorico', '.botaoPrimario']);
    await p.click('#navPendentes'); await p.click('#navConcluidos');
    chk(`${T} voltar à área reaproveita os dados (sem nova chamada)`, (await chamadas(p, 'obterConcluidosRecentes')).length === 1);
    // reabrir pede confirmação
    await p.click('#listaConcluidos button.cartaoPedido >> text=Carla');
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    chk(`${T} concluído abre com concluir marcado e sem aviso`, await p.evaluate(() => document.getElementById('checkConcluir').checked && !document.getElementById('checkAvisar').checked && document.getElementById('dicaAvisar').textContent.includes('já foi avisado')));
    await p.uncheck('#checkConcluir'); await p.click('#botaoSalvar');
    await p.waitForSelector('#modalConfirmacao:not([hidden])');
    chk(`${T} reabrir pede confirmação`, (await p.textContent('#confirmacaoTitulo')) === 'Reabrir este pedido?');
    await p.click('#confirmacaoCancelar');
    await p.click('#modalDetalhe [data-fechar-modal] >> nth=1');
    // busca
    await p.fill('#buscaHistorico', 'b');
    await p.click('#botaoBuscarHistorico');
    chk(`${T} busca curta é recusada na página`, (await p.textContent('#statusConcluidos')).includes('ao menos 2') && (await chamadas(p, 'buscarHistorico')).length === 0);
    await p.fill('#buscaHistorico', 'Bruna');
    await p.press('#buscaHistorico', 'Enter');
    chk(`${T} busca mostra as duas origens`, await esperarLista(p, '#listaConcluidos', 2) && (await p.textContent('#listaConcluidos')).includes('Histórico 2021–2022') && (await p.textContent('#tituloConcluidos')) === 'Resultado da busca');
    chk(`${T} histórico é somente consulta (sem botão)`, await p.evaluate(() => { const l = [...document.querySelectorAll('#listaConcluidos .cartaoPedido')]; return l[0].tagName === 'BUTTON' && l[1].tagName === 'DIV' && l[1].textContent.includes('Somente consulta'); }));
    await contraste(p, T + ' histórico', ['.selo--origem', '#tituloConcluidos']);
    await p.screenshot({ path: SAIDA + `historico-${scheme}.png`, fullPage: true });
    await p.click('#botaoLimparBusca');
    chk(`${T} voltar aos 10 mais recentes`, await esperarLista(p, '#listaConcluidos', 2) && (await p.textContent('#tituloConcluidos')) === 'Últimos concluídos');

    /*---------- relatórios ----------*/
    await p.click('#navRelatorios');
    await p.waitForSelector('.blocoRelatorio');
    chk(`${T} relatórios: total, fontes e barras`, (await p.textContent('.totalGrande')) === '14' && (await p.textContent('#gradeRelatorios')).includes('10 pedidos da planilha atual e 4 pedidos do histórico') && (await p.$$eval('.linhaBarra', e => e.length)) === 12 && (await p.textContent('#gradeRelatorios')).includes('05/2026'));
    await contraste(p, T + ' relatórios', ['.blocoRelatorio h2', '.totalGrande', '.blocoRelatorio p', '.linhaBarra__rotulo span']);
    await p.screenshot({ path: SAIDA + `relatorios-${scheme}.png`, fullPage: true });

    /*---------- abas ----------*/
    await p.click('.botaoModo[data-modo="abas"]');
    chk(`${T} modo abas com papéis ARIA`, await p.evaluate(() => document.getElementById('layout').dataset.navegacao === 'abas' && document.getElementById('menuAreas').getAttribute('role') === 'tablist' && document.getElementById('navRelatorios').getAttribute('aria-selected') === 'true' && document.getElementById('conteudo').getAttribute('aria-labelledby') === 'navRelatorios' && document.getElementById('modoStatus').textContent.includes('abas')));
    await p.focus('#navRelatorios'); await p.keyboard.press('ArrowRight');
    chk(`${T} seta move o foco entre as abas (circular)`, await p.evaluate(() => document.activeElement.id === 'navPendentes'));
    await p.keyboard.press('Enter');
    chk(`${T} Enter abre a aba`, await p.evaluate(() => !document.getElementById('areaPendentes').hidden && document.getElementById('navPendentes').getAttribute('aria-selected') === 'true'));
    await p.screenshot({ path: SAIDA + `abas-${scheme}.png` });
    await p.click('.botaoModo[data-modo="sidebar"]');
    chk(`${T} volta ao menu lateral`, await p.evaluate(() => document.getElementById('menuAreas').getAttribute('role') === null && document.getElementById('navPendentes').getAttribute('aria-current') === 'page'));

    /*---------- Central de Ajuda ----------*/
    await p.click('.botaoAjuda');
    chk(`${T} ajuda abre em Comece aqui`, await focoNaSecao(p, 'ajuda-inicio'));
    await contraste(p, T + ' ajuda', ['#gradip-help-title', '.gradip-help-card h4', '.gradip-help-card p', '.ajudaLink', '.gradip-help-nav button']);
    await p.screenshot({ path: SAIDA + `ajuda-${scheme}.png` });
    await p.fill('[data-gradip-help-search]', 'reenviar');
    chk(`${T} busca na ajuda`, /resultado/.test(await p.textContent('[data-gradip-help-search-status]')) && await p.evaluate(() => !document.getElementById('ajuda-reenvio').hidden));
    await p.fill('[data-gradip-help-search]', '');
    await p.click('[data-gradip-help-target="ajuda-faq"]');
    await p.click('[aria-controls="hab-faq-duas"]');
    chk(`${T} pergunta frequente expande`, await p.evaluate(() => !document.getElementById('hab-faq-duas').hidden));
    await p.keyboard.press('Escape');
    await p.click('#areaPendentes [data-gradip-help-open="ajuda-pendentes"]');
    chk(`${T} ajuda contextual vai à seção`, await focoNaSecao(p, 'ajuda-pendentes'));
    await p.keyboard.press('Escape');
    const semSecao = await p.evaluate(() => [...document.querySelectorAll('[data-gradip-help-open],[data-gradip-help-target]')]
      .map(b => b.getAttribute('data-gradip-help-open') || b.getAttribute('data-gradip-help-target'))
      .filter(id => { const s = document.getElementById(id); return !s || !s.matches('[data-gradip-help-section]') || !s.querySelector('h3'); }));
    chk(`${T} todo gatilho da ajuda aponta para seção com título`, semSecao.length === 0, semSecao.join(', '));
    // Seções citadas só pelo script (links "Saiba mais" das mensagens de erro).
    const citadasNoScript = [...new Set(fs.readFileSync(SRC + 'GerenciadorAppUI.html', 'utf8').match(/'ajuda-[a-z-]+'/g).map(s => s.slice(1, -1)))];
    const inexistentes = await p.evaluate(ids => ids.filter(id => !document.getElementById(id)), citadasNoScript);
    chk(`${T} seções de ajuda citadas pelo script existem (${citadasNoScript.length})`, inexistentes.length === 0, inexistentes.join(', '));
    // Toda marca de inconsistência que o servidor produz tem rótulo na tela;
    // VERSAO_INVALIDA mostra a mensagem do servidor e leva à ajuda.
    const ui = fs.readFileSync(SRC + 'GerenciadorAppUI.html', 'utf8');
    const marcas = [...new Set((fs.readFileSync(SRC + 'Pedidos.gs', 'utf8').match(/inconsistencia = "[A-Z_]+"/g) || []).map(x => x.split('"')[1]))];
    const rotulos = ui.slice(ui.indexOf('var ROTULO_INCONSISTENCIA'), ui.indexOf('};', ui.indexOf('var ROTULO_INCONSISTENCIA')));
    chk(`${T} toda inconsistência do servidor tem rótulo (${marcas.length})`, marcas.length >= 4 && marcas.every(c => rotulos.includes(c + ':')), marcas.join(', '));
    chk(`${T} VERSAO_INVALIDA: mensagem do servidor e ajuda`, /CODIGOS_COM_MENSAGEM = \[[^\]]*'VERSAO_INVALIDA'/.test(ui) && /VERSAO_INVALIDA: 'ajuda-sem-identificador'/.test(ui));
    chk(`${T} ajuda não chama o servidor`, await p.evaluate(() => !window.__chamadas.some(c => /ajuda/i.test(c.nome))));

    /*---------- nada de dados no console ----------*/
    chk(`${T} sem erros na página`, p.erros.length === 0, p.erros.join(' | '));
    chk(`${T} console sem dados pessoais`, !p.consoleTexto.some(t => NOMES_SINTETICOS.some(n => t.includes(n))));
    await ctx.close();
  }

  /*---------- LEITOR ----------*/
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await abrir(ctx, { perfil: 'LEITOR' });
    await esperarLista(p, '#listaPendentes', 5);
    chk('[leitor] aviso de somente consulta', await p.evaluate(() => !document.getElementById('avisoSomenteLeitura').hidden));
    chk('[leitor] sem "Preparar pedido"', !(await p.textContent('#listaPendentes')).includes('Preparar'));
    await p.click('#listaPendentes button.cartaoPedido >> text=Bruna');
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    chk('[leitor] ações desativadas e aviso no detalhe', await p.evaluate(() => document.getElementById('botaoSalvar').disabled && document.getElementById('checkConcluir').disabled && document.getElementById('checkAvisar').disabled && document.getElementById('campoObservacoes').disabled && !document.getElementById('avisoLeitorDetalhe').hidden));
    await p.screenshot({ path: SAIDA + 'leitor-detalhe.png' });
    await p.evaluate(() => { document.getElementById('botaoSalvar').disabled = false; document.getElementById('botaoSalvar').click(); });
    chk('[leitor] botão reativado à força não chama o servidor', (await chamadas(p, 'salvarPedido')).length === 0);
    await ctx.close();
  }

  /*---------- homologação, persistência do tema ----------*/
  {
    const ctx = await b.newContext({ colorScheme: 'light', viewport: { width: 1280, height: 900 } });
    const p = await abrir(ctx, { homologacao: true });
    chk('[homologação] faixa visível', await p.evaluate(() => !document.getElementById('faixaHomologacao').hidden));
    await contraste(p, '[homologação]', ['.faixaAviso--homologacao']);
    await p.selectOption('.gradip-theme-control__select', 'dark');
    chk('[tema] Escuro aplicado e guardado', await p.evaluate(() => document.documentElement.dataset.theme === 'dark' && localStorage.getItem('gradip-theme') === 'dark'));
    await p.reload(); await esperarLista(p, '#listaPendentes', 5);
    chk('[tema] Escuro persiste após recarregar; navegação volta ao menu lateral', await p.evaluate(() => document.documentElement.dataset.theme === 'dark' && document.getElementById('layout').dataset.navegacao === 'sidebar'));
    await p.selectOption('.gradip-theme-control__select', 'system');
    chk('[tema] Sistema segue o claro', await p.evaluate(() => document.documentElement.dataset.theme === 'light'));
    await ctx.close();
  }

  /*---------- larguras ----------*/
  for (const w of [360, 390, 480, 768, 1024]) {
    const T = `[${w}px]`;
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, colorScheme: w === 390 ? 'dark' : 'light' });
    const p = await abrir(ctx);
    await esperarLista(p, '#listaPendentes', 5);
    const sobra = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    chk(`${T} sem rolagem horizontal`, (await sobra()) <= 0, String(await sobra()));
    chk(`${T} menu recolhido em tela estreita`, await p.evaluate(w => document.getElementById('sidebar').dataset.recolhido === String(w <= 900), w));
    const pequenos = await p.evaluate(() => [...document.querySelectorAll('.botaoAjuda,.gradip-theme-control__select,.botaoModo,.menuMovel,.navItem,.botaoSecundario,.botaoPrimario,button.cartaoPedido')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.className, Math.round(r.width), Math.round(r.height)]; }).filter(([, a, h]) => h < 43.5 || a < 43.5));
    chk(`${T} alvos de toque com 44 px`, pequenos.length === 0, JSON.stringify(pequenos));
    if (w <= 900) {
      await p.click('#menuMovel');
      await p.click('#navConcluidos');
      chk(`${T} menu abre e recolhe ao escolher a área`, await p.evaluate(() => !document.getElementById('areaConcluidos').hidden && document.getElementById('sidebar').dataset.recolhido === 'true'));
      await p.click('#menuMovel'); await p.click('#navPendentes');
    }
    await p.screenshot({ path: SAIDA + `largura-${w}.png`, fullPage: true });
    await p.click('#listaPendentes button.cartaoPedido >> text=Bruna');
    await p.waitForSelector('#detalheConteudo:not([hidden])');
    chk(`${T} detalhe cabe na tela`, await p.evaluate(() => { const r = document.querySelector('#modalDetalhe .modalPainel').getBoundingClientRect(); return r.left >= -0.5 && r.right <= window.innerWidth + 0.5; }) && (await sobra()) <= 0);
    await p.screenshot({ path: SAIDA + `largura-${w}-detalhe.png` });
    await p.keyboard.press('Escape');
    await p.click('.botaoAjuda');
    await focoNaSecao(p, 'ajuda-inicio');
    chk(`${T} ajuda sem rolagem horizontal`, await p.evaluate(() => { const d = document.querySelector('[data-gradip-help-dialog]'); const m = d.querySelector('.gradip-help-main'); return d.getBoundingClientRect().right <= window.innerWidth + 0.5 && m.scrollWidth <= m.clientWidth + 1; }));
    chk(`${T} sem erros na página`, p.erros.length === 0, p.erros.join(' | '));
    await ctx.close();
  }

  /*---------- página sem acesso ----------*/
  for (const [scheme, w] of [['light', 360], ['dark', 1280]]) {
    const T = `[sem acesso ${scheme} ${w}px]`;
    const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: w, height: 700 } });
    const p = await ctx.newPage();
    const pagina = montarSemAcesso('Sem acesso a este gerenciador', 'A sua conta não tem acesso ao Gerenciador de Abertura de Habilitações. Se você precisa usá-lo, peça acesso ao responsável pelo Serviço de Graduação.');
    await p.route('http://gerenciador.teste/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: pagina }));
    await p.route('https://datagrad.sistemas.ip.usp.br/**', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"/>' }));
    await p.goto('http://gerenciador.teste/');
    chk(`${T} título e mensagem, sem scripts do gerenciador`, (await p.textContent('h1')).includes('Sem acesso') && await p.evaluate(() => !window.google && !document.querySelector('#listaPendentes')));
    chk(`${T} sem rolagem horizontal`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    await contraste(p, T, ['.tituloSistema', '.cartaoSemAcesso h1', '.cartaoSemAcesso p', '.cartaoSemAcesso a']);
    await p.screenshot({ path: SAIDA + `sem-acesso-${scheme}.png` });
    await ctx.close();
  }

  await b.close();
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

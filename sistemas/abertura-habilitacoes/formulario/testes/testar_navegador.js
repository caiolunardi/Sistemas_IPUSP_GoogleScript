// Testes de navegador do formulário de Pedido de Abertura de Habilitação
// (Chromium real via Playwright). Monta a página com os include_ resolvidos,
// simula google.script.run com dados 100% fictícios e confere carga,
// período fechado, validação, pedido pendente por programa, envio, recibo,
// tema (Sistema/Claro/Escuro), contraste, teclado, Central de Ajuda e
// larguras de 360/390/480/768/1280 px.
// Uso: node testar_navegador.js [pasta-para-capturas]
'use strict';
const fs = require('fs'), path = require('path');
function carregarPlaywright() { try { return require('playwright'); } catch (e) { return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } }
const { chromium } = carregarPlaywright();
const SRC = path.join(__dirname, '..', 'src') + '/';
const CAPTURAS = process.argv[2] || null;
if (CAPTURAS) fs.mkdirSync(CAPTURAS, { recursive: true });
const MARCA_USP_OFFLINE = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'assets', 'usp', 'logo-usp-preto.svg'), 'utf8');
function build(homologacao = false) {
  let h = fs.readFileSync(SRC + 'HabilitacaoFormApp.html', 'utf8');
  h = h.replace(/<\? if \(homologacao\) \{ \?>([\s\S]*?)<\? \} \?>/, (_, c) => homologacao ? c : '');
  for (let k = 0; k < 3; k++) h = h.replace(/<\?!= include_\('(\w+)'\) \?>/g, (_, n) => fs.readFileSync(SRC + n + '.html', 'utf8'));
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}
const html = build(), htmlHomologacao = build(true);

const BASE = { autenticado: true, periodoOk: true, encontrado: true, email: 'ana@usp.br', nUsp: '9900001', nome: 'Aluna Teste Ficticia', anoIngresso: '2023', historico: [] };
const ENVIO = { sucesso: true, reciboEnviado: true, programas: 'Bacharelado em Psicologia' };
const CENARIOS = {
  normal: { dados: BASE, envio: ENVIO },
  pendente: { dados: Object.assign({}, BASE, { historico: [
    { carimbo: '01/08/2025 10:00', programa: 'Licenciatura em Psicologia', programas: ['lic'], situacao: 'Concluído', pendente: false },
    { carimbo: '02/03/2026 09:30', programa: 'Bacharelado em Psicologia', programas: ['bach'], situacao: 'Em análise', pendente: true }] }), envio: ENVIO },
  maiusculas: { dados: Object.assign({}, BASE, { nome: 'MARIA TESTE FICTICIA' }), envio: ENVIO },
  naoEncontrado: { dados: Object.assign({}, BASE, { encontrado: false, nUsp: '', nome: '', anoIngresso: '' }), envio: { sucesso: true, reciboEnviado: false, programas: 'Licenciatura em Psicologia' } },
  servidorPendente: { dados: BASE, erroEnvio: 'Error: PEDIDO_PENDENTE: Você já tem um pedido pendente para Bacharelado em Psicologia, enviado em 15/10/2026 10:00.' },
  foraNoEnvio: { dados: BASE, erroEnvio: 'Error: FORA_DO_PERIODO: Este formulário não está mais dentro do período de abertura.', semConfirmacao: true },
  semLogin: { dados: { autenticado: false } },
  fechado: { dados: { autenticado: true, periodoOk: false, janelas: [{ inicioTexto: '01/02/2026 às 08:00', fimTexto: '10/02/2026 às 18:00' }, { inicioTexto: '01/08/2026 às 08:00', fimTexto: '10/08/2026 às 18:00' }] } },
  periodoErro: { dados: { autenticado: true, periodoOk: false, periodoErro: true } },
  erroCarga: { erroCarga: 'Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID.' }
};
const stub = c => `(function(){var C=${JSON.stringify(c)};window.__chamadas=[];
var API={obterDadosIniciais:function(){if(C.erroCarga)throw new Error(C.erroCarga);return C.dados},
 registrarSolicitacao:function(d){if(C.erroEnvio&&(C.semConfirmacao||!d.confirmarNovoPedido))throw new Error(C.erroEnvio);return C.envio||{sucesso:true,reciboEnviado:true}}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push([n,JSON.parse(JSON.stringify(arg===undefined?null:arg))]);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},40)}});return o}
window.google={script:{get run(){return runner()}}};})();`;
function lum(c) { const m = c.match(/[\d.]+/g).map(Number); const a = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
async function abrir(ctx, cen, pagina = html) {
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', e => p.__errs.push(e.message));
  await p.route('https://form.teste/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: pagina.replace('<head>', '<head><script>' + stub(CENARIOS[cen]) + '</script>') }));
  await p.route('https://datagrad.sistemas.ip.usp.br/**', r => r.fulfill({ contentType: 'image/svg+xml', body: MARCA_USP_OFFLINE }));
  await p.route('https://uspdigital.usp.br/**', r => r.fulfill({ body: 'x' }));
  await p.goto('https://form.teste/'); await p.waitForFunction(() => document.getElementById('loadingOverlay').hidden);
  return p;
}
let ok = 0, fail = 0; const chk = (n, c, extra = '') => { if (c) { ok++; console.log('ok', n, extra); } else { fail++; console.log('FALHA', n, extra); } };
const chamadas = p => p.evaluate(() => window.__chamadas.filter(c => c[0] === 'registrarSolicitacao'));
const visivel = (p, s) => p.$eval(s, e => !e.hidden && e.offsetParent !== null).catch(() => false);
async function preencherValido(p) {
  await p.check('#campoDeclaracao'); await p.check('input[name="trancamento"][value="Não"]'); await p.check('#campoProgBach');
}

(async () => {
  const b = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    let p = await abrir(ctx, 'normal'); const T = `[${scheme}]`;
    chk(`${T} tema Sistema resolvido`, await p.evaluate(s => document.documentElement.dataset.theme === s && document.documentElement.dataset.themePreference === 'system', scheme));
    chk(`${T} seletor mostra Sistema`, await p.$eval('[data-gradip-theme-select]', e => e.value === 'system'));
    chk(`${T} marca certa`, await p.evaluate(s => { const l = document.querySelector('.marcaIpuspSvg.gradip-logo-light'), d = document.querySelector('.marcaIpuspSvg.gradip-logo-dark'); return s === 'dark' ? getComputedStyle(l).display === 'none' && getComputedStyle(d).display !== 'none' : getComputedStyle(d).display === 'none' && getComputedStyle(l).display !== 'none'; }, scheme));
    chk(`${T} pré-preenchido e e-mail só leitura`, await p.$eval('#campoNome', e => e.value) === 'Aluna Teste Ficticia' && await p.$eval('#campoEmail', e => e.value === 'ana@usp.br' && e.readOnly) && await visivel(p, '#avisoNome'));
    chk(`${T} saudação com o primeiro nome do cadastro`, await p.evaluate(() => { const h = new Date().getHours(); const per = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; return document.getElementById('saudacaoUsuario').textContent === per + ', Aluna'; }));
    chk(`${T} texto da seção 1 preservado`, (await p.textContent('.textoInformativo')).includes('15 semestres') && (await p.$$eval('.textoInformativo a', a => a.length)) === 2);
    chk(`${T} rótulos dos campos ligados`, await p.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),textarea')].filter(e => !e.closest('[data-gradip-help-overlay]') && e.id !== 'gradip-help-search').every(e => document.querySelector(`label[for="${e.id}"]`))));
    const pares = await p.evaluate(() => {
      const cs = e => getComputedStyle(document.querySelector(e)); const bg = e => cs(e).backgroundColor;
      const card = bg('.cartaoPrincipal'), pag = getComputedStyle(document.body).backgroundColor;
      return { texto: [cs('.textoInformativo p').color, card], muted: [cs('.ajudaCampo').color, card], link: [cs('.textoInformativo a').color, card], titulo: [cs('.secao h3').color, card],
        ok: [cs('.avisoPreenchido').color, card], botao: [cs('#btnEnviar').color, bg('#btnEnviar')], cabecalho: [cs('.cabecalho p').color, bg('.cabecalho')], rodape: [cs('.rodape').color, pag],
        somenteLeitura: [cs('#campoEmail').color, bg('#campoEmail')], contador: [cs('#contadorObservacoes').color, card],
        borda: [cs('#campoNome').borderTopColor, cs('#campoNome').backgroundColor], bordaOpcoes: [cs('#caixaProgramas').borderTopColor, card], ajuda: [cs('.botaoAjuda').color, bg('.botaoAjuda')] };
    });
    for (const [k, [c, f]] of Object.entries(pares)) { const r = cr(c, f); const alvo = k.startsWith('borda') ? 3 : 4.5; chk(`${T} contraste ${k} ≥ ${alvo}`, r >= alvo, r.toFixed(2)); }
    // validação vazia
    for (const s of ['#campoNome', '#campoNUsp', '#campoAnoIngresso']) await p.fill(s, '');
    await p.click('#btnEnviar');
    chk(`${T} campo editado perde o aviso automático`, !(await visivel(p, '#avisoNome')));
    chk(`${T} validação: nada enviado`, (await chamadas(p)).length === 0);
    chk(`${T} validação: 6 campos marcados`, await p.$$eval('[aria-invalid="true"]', e => e.length) === 6);
    chk(`${T} validação: foco na declaração`, await p.evaluate(() => document.activeElement.id === 'campoDeclaracao'));
    chk(`${T} validação: resumo`, await visivel(p, '#resumoErros') && (await p.textContent('#resumoErros')).includes('Corrija 6 itens'));
    const erroCor = await p.$eval('#erroNome', e => [getComputedStyle(e).color, getComputedStyle(document.querySelector('.cartaoPrincipal')).backgroundColor]); chk(`${T} contraste erro ≥ 4.5`, cr(...erroCor) >= 4.5, cr(...erroCor).toFixed(2));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `erros-${scheme}.png`), fullPage: true });
    await p.fill('#campoNome', 'Aluna Teste Ficticia'); await p.fill('#campoNUsp', '99.000-01'); await p.fill('#campoAnoIngresso', '1999');
    await preencherValido(p); await p.click('#btnEnviar');
    chk(`${T} ano fora da faixa barrado`, (await p.textContent('#erroAno')).includes('entre 2000') && (await chamadas(p)).length === 0);
    await p.fill('#campoAnoIngresso', '2023');
    await p.fill('#campoObservacoes', 'a'.repeat(1850));
    chk(`${T} contador`, (await p.textContent('#contadorObservacoes')) === '1.850 de 2.000 caracteres' && await p.$eval('#contadorObservacoes', e => e.classList.contains('perto')));
    await p.fill('#campoObservacoes', 'Comentário fictício');
    await p.check('#campoProgLic');
    // teclado: Enter no campo envia o formulário
    await p.focus('#campoAnoIngresso'); await p.keyboard.press('Enter'); await p.waitForSelector('#telaConfirmacao:not([hidden])');
    const env = await chamadas(p);
    chk(`${T} envio com os dados certos`, env.length === 1 && env[0][1].declaracao === true && env[0][1].trancamento === 'Não' && JSON.stringify(env[0][1].programas) === '["bach","lic"]' && env[0][1].observacoes === 'Comentário fictício' && env[0][1].confirmarNovoPedido === false && env[0][1].nUsp === '99.000-01' && !('email' in env[0][1]));
    chk(`${T} tela de sucesso com recibo e programas`, (await p.textContent('#textoRecibo')).includes('ana@usp.br') && (await p.textContent('#textoProgramasEnviados')).includes('Bacharelado') && !(await visivel(p, '#conteudo')));
    chk(`${T} foco na confirmação`, await p.evaluate(() => document.activeElement.id === 'telaConfirmacao'));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `enviado-${scheme}.png`) });
    await p.close();

    // pedido pendente por programa (vindo da carga)
    p = await abrir(ctx, 'pendente');
    chk(`${T} histórico com selos e programa`, (await p.$$eval('.seloSituacao', e => e.map(x => x.textContent))).join() === 'Concluído,Pendente' && (await p.textContent('#avisos')).includes('Bacharelado em Psicologia — Em análise'));
    await preencherValido(p); await p.uncheck('#campoProgBach'); await p.check('#campoProgLic');
    chk(`${T} outro programa: sem bloco de pendente`, !(await visivel(p, '#blocoPendente')));
    await p.check('#campoProgBach');
    chk(`${T} mesmo programa: bloco com data`, await visivel(p, '#blocoPendente') && (await p.textContent('#textoPendente')).includes('02/03/2026 09:30') && (await p.textContent('#textoPendente')).includes('Bacharelado'));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `pendente-${scheme}.png`), fullPage: true });
    await p.click('#btnEnviar');
    chk(`${T} pendente exige caixa`, (await chamadas(p)).length === 0 && await p.evaluate(() => document.activeElement.id === 'checkNovoPedido'));
    await p.check('#checkNovoPedido'); await p.click('#btnEnviar'); await p.waitForSelector('#telaConfirmacao:not([hidden])');
    chk(`${T} pendente confirmado enviado`, (await chamadas(p))[0][1].confirmarNovoPedido === true);
    await p.close();

    // pendente descoberto só no servidor
    p = await abrir(ctx, 'servidorPendente'); await preencherValido(p); await p.click('#btnEnviar');
    await p.waitForFunction(() => !document.getElementById('blocoPendente').hidden);
    chk(`${T} PEDIDO_PENDENTE do servidor mostra o bloco`, (await p.textContent('#textoPendente')).includes('15/10/2026 10:00') && !(await p.$eval('#btnEnviar', e => e.disabled)));
    await p.check('#checkNovoPedido'); await p.click('#btnEnviar'); await p.waitForSelector('#telaConfirmacao:not([hidden])');
    chk(`${T} reenvio com confirmação`, (await chamadas(p)).length === 2);
    await p.close();

    // período terminou com a página aberta
    p = await abrir(ctx, 'foraNoEnvio'); await preencherValido(p); await p.click('#btnEnviar');
    await p.waitForFunction(() => !document.getElementById('resumoErros').hidden);
    chk(`${T} fim do período no envio avisado`, (await p.textContent('#resumoErros')).includes('período de abertura terminou'));
    await p.close();

    // não encontrado + recibo falhou
    p = await abrir(ctx, 'naoEncontrado');
    chk(`${T} sem cadastro: saudação só com o período`, /^(Bom dia|Boa tarde|Boa noite)$/.test(await p.textContent('#saudacaoUsuario')));
    chk(`${T} aviso de não encontrado`, (await p.textContent('#avisos')).includes('Não encontramos'));
    await p.fill('#campoNome', 'Bruno Teste'); await p.fill('#campoNUsp', '9900002'); await p.fill('#campoAnoIngresso', '2024'); await preencherValido(p);
    await p.click('#btnEnviar'); await p.waitForSelector('#telaConfirmacao:not([hidden])');
    chk(`${T} recibo não enviado avisado`, (await p.textContent('#textoRecibo')).includes('foi registrado'));
    await p.close();

    p = await abrir(ctx, 'maiusculas');
    chk(`${T} nome em maiúsculas vira "Maria"`, (await p.textContent('#saudacaoUsuario')).endsWith(', Maria'));
    await p.close();

    // bloqueios
    p = await abrir(ctx, 'semLogin');
    chk(`${T} sem login: sem saudação`, (await p.textContent('#saudacaoUsuario')) === '' && !(await visivel(p, '#saudacaoUsuario')));
    chk(`${T} sem login bloqueia`, await visivel(p, '#telaBloqueada') && (await p.textContent('#tituloBloqueio')) === 'Login necessário' && !(await visivel(p, '#conteudo')));
    await p.close();
    p = await abrir(ctx, 'fechado');
    chk(`${T} fora do período mostra as janelas`, (await p.textContent('#tituloBloqueio')).includes('fora do período') && (await p.$$eval('#janelasBloqueio li', e => e.map(x => x.textContent))).join('|') === 'De 01/02/2026 às 08:00 até 10/02/2026 às 18:00|De 01/08/2026 às 08:00 até 10/08/2026 às 18:00' && !(await visivel(p, '#conteudo')));
    chk(`${T} fora do período: ajuda leva a "Quando posso pedir"`, await p.$eval('#ajudaBloqueio', e => e.getAttribute('data-gradip-help-open')) === 'ajuda-quando');
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `fora-do-periodo-${scheme}.png`) });
    await p.close();
    p = await abrir(ctx, 'periodoErro');
    chk(`${T} período não verificado bloqueia`, (await p.textContent('#tituloBloqueio')).includes('Não foi possível verificar') && !(await visivel(p, '#janelasBloqueio')));
    await p.close();
    p = await abrir(ctx, 'erroCarga');
    chk(`${T} erro de carga sem detalhe técnico`, (await p.textContent('#tituloBloqueio')) === 'Erro ao carregar' && !(await p.textContent('#textoBloqueio')).includes('ID_INDEX'));
    await p.close();

    // Central de Ajuda
    p = await abrir(ctx, 'normal');
    await p.click('.botaoAjuda'); await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])');
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    chk(`${T} ajuda abre com scroll lock`, await p.evaluate(() => document.body.style.overflow === 'hidden'));
    await p.fill('[data-gradip-help-search]', 'licenciatura');
    chk(`${T} busca`, await p.waitForFunction(() => /^\d+ resultados?$/.test(document.querySelector('[data-gradip-help-search-status]').textContent), null, { timeout: 5000 }).then(() => true, () => false));
    await p.fill('[data-gradip-help-search]', 'periodo');
    chk(`${T} busca sem acento`, await p.waitForFunction(() => document.querySelectorAll('#ajuda-quando [data-gradip-help-search-item]:not([hidden])').length >= 1, null, { timeout: 5000 }).then(() => true, () => false));
    await p.fill('[data-gradip-help-search]', '');
    const faq = await p.$('#ajuda-faq .gradip-help-faq-toggle'); await faq.click();
    chk(`${T} FAQ expande`, await faq.getAttribute('aria-expanded') === 'true' && await visivel(p, '#faq-automatico'));
    await p.keyboard.press('Escape');
    chk(`${T} ESC fecha e devolve foco`, await p.evaluate(() => document.querySelector('[data-gradip-help-overlay]').hidden && document.activeElement.classList.contains('botaoAjuda') && document.body.style.overflow === ''));
    await p.click('[data-gradip-help-open="ajuda-quando"]'); await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])'); await p.waitForTimeout(100);
    chk(`${T} gatilho contextual abre na seção`, await p.evaluate(() => document.activeElement && document.activeElement.closest('#ajuda-quando') !== null));
    const alvos = await p.$$eval('[data-gradip-help-open]', e => e.map(x => x.getAttribute('data-gradip-help-open')));
    chk(`${T} todos os gatilhos têm seção`, await p.evaluate(a => a.every(id => document.getElementById(id)), alvos.concat(['ajuda-quando', 'ajuda-problemas'])));
    const helpC = await p.evaluate(() => { const c = document.querySelector('.gradip-help-card p'); return [getComputedStyle(c).color, getComputedStyle(c.closest('.gradip-help-card')).backgroundColor]; }); chk(`${T} contraste ajuda`, cr(...helpC) >= 4.5, cr(...helpC).toFixed(2));
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `ajuda-${scheme}.png`) });
    await p.keyboard.press('Escape');
    chk(`${T} sem erros de JS`, p.__errs.length === 0, p.__errs.join('|'));
    await p.close(); await ctx.close();
  }

  // tema manual: persistência e mudança do sistema com a página aberta
  {
    const ctx = await b.newContext({ colorScheme: 'light' }); const p = await abrir(ctx, 'normal');
    await p.selectOption('[data-gradip-theme-select]', 'dark');
    chk('manual Escuro aplica', await p.evaluate(() => document.documentElement.dataset.theme === 'dark' && localStorage.getItem('gradip-theme') === 'dark'));
    await p.reload(); await p.waitForFunction(() => document.getElementById('loadingOverlay').hidden);
    chk('Escuro persiste após recarregar', await p.evaluate(() => document.documentElement.dataset.theme === 'dark') && await p.$eval('[data-gradip-theme-select]', e => e.value === 'dark'));
    await p.emulateMedia({ colorScheme: 'light' });
    chk('manual ignora mudança do sistema', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
    await p.selectOption('[data-gradip-theme-select]', 'light');
    chk('manual Claro aplica', await p.evaluate(() => document.documentElement.dataset.theme === 'light' && localStorage.getItem('gradip-theme') === 'light'));
    await p.selectOption('[data-gradip-theme-select]', 'system'); await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(50);
    chk('Sistema acompanha mudança com a página aberta', await p.evaluate(() => document.documentElement.dataset.theme === 'dark' && document.documentElement.dataset.themePreference === 'system'));
    await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(50);
    chk('Sistema volta para Claro', await p.evaluate(() => document.documentElement.dataset.theme === 'light'));
    await ctx.close();
  }

  // larguras
  for (const w of [360, 390, 480, 768, 1280]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: w, height: 800 }, hasTouch: w < 1000 }); const p = await abrir(ctx, 'pendente');
      await p.check('#campoProgBach');
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      chk(`${w}px ${scheme} sem rolagem horizontal`, ov <= 0, ov);
      const pequenos = await p.$$eval('#btnEnviar,.botaoAjuda,[data-gradip-theme-select],.itemOpcao,#campoNome,#campoAnoIngresso,#campoNUsp', e => e.filter(x => { const r = x.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(x => x.id || x.className));
      chk(`${w}px ${scheme} alvos ≥ 44 px`, pequenos.length === 0, pequenos.join());
      const cab = await p.evaluate(() => [...document.querySelectorAll('.cabecalho *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > window.innerWidth + 0.5 || r.left < -0.5); }).length);
      chk(`${w}px ${scheme} cabeçalho dentro da tela`, cab === 0, cab);
      if (scheme === 'light' || w === 360) {
        await p.click('.botaoAjuda'); await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])');
        chk(`${w}px ${scheme} ajuda: fechar visível`, await p.$eval('.gradip-help-close', e => { const r = e.getBoundingClientRect(); return r.right <= window.innerWidth && r.top >= 0; }));
        const ov2 = await p.evaluate(() => { const d = document.querySelector('[data-gradip-help-dialog]'); return d.scrollWidth - d.clientWidth; }); chk(`${w}px ${scheme} ajuda sem rolagem horizontal`, ov2 <= 0, ov2);
        if (CAPTURAS && w === 360) await p.screenshot({ path: path.join(CAPTURAS, `ajuda-360-${scheme}.png`) });
        await p.keyboard.press('Escape');
      }
      if (CAPTURAS && (w === 360 || w === 768)) await p.screenshot({ path: path.join(CAPTURAS, `form-${w}-${scheme}.png`), fullPage: true });
      await ctx.close();
    }
  }

  // Faixa do ambiente de homologação
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: 360, height: 800 } }); const T = `[${scheme}]`;
    let p = await abrir(ctx, 'normal'); chk(`${T} produção sem faixa de homologação`, (await p.$('.faixaHomologacao')) === null); await p.close();
    p = await abrir(ctx, 'normal', htmlHomologacao);
    chk(`${T} homologação mostra a faixa`, await visivel(p, '.faixaHomologacao') && (await p.textContent('.faixaHomologacao')).includes('Ambiente de homologação'));
    const [ct, cf, fundo] = await p.$eval('.faixaHomologacao', e => { const s = getComputedStyle(e); return [s.color, getComputedStyle(e.querySelector('strong')).color, s.backgroundColor]; });
    chk(`${T} faixa com contraste AA`, cr(ct, fundo) >= 4.5 && cr(cf, fundo) >= 4.5, `${cr(ct, fundo).toFixed(2)} / ${cr(cf, fundo).toFixed(2)}`);
    chk(`${T} faixa sem rolagem lateral em 360 px`, await p.evaluate(() => document.documentElement.scrollWidth <= 360));
    chk(`${T} homologação sem erro de script`, p.__errs.length === 0, p.__errs.join());
    if (CAPTURAS) await p.screenshot({ path: path.join(CAPTURAS, `homologacao-360-${scheme}.png`) });
    await ctx.close();
  }
  await b.close(); console.log(`\n${ok} ok, ${fail} falha(s)`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

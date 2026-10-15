// Testes de navegador do Painel de Solicitações (Chromium real via Playwright).
// A página é montada com os include_ e scriptlets resolvidos pelo próprio
// Codigo.gs (ver pagina.js) e google.script.run simulado com dados
// fictícios. Confere: menu lateral (padrão) x abas, categorias, busca em
// todas as categorias, cards por teclado, Central de Ajuda, contagem de
// créditos (janela, teclado, cálculo, resultado), tema claro/escuro,
// contraste e larguras de 360 a 1280 px. Uso: node testar_navegador.js
const path = require('path');
const vm = require('vm');
const { carregarCodigo, montarHtml, stubScript } = require('./pagina.js');
const D = require('./dados_ficticios.js');
function carregarPlaywright() { try { return require('playwright'); } catch (e) { return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } }
const { chromium } = carregarPlaywright();
const SAIDA = path.join(require('os').tmpdir(), 'painel-solicitacoes-');

const codigo = carregarCodigo({ planilhas: D.PLANILHAS, propriedades: D.PROPRIEDADES });
const sistemas = JSON.stringify(vm.runInContext('obterSistemas()', codigo));
const curriculos = JSON.stringify(vm.runInContext('obterCurriculosContagem()', codigo));
const html = montarHtml(codigo);
const stub = stubScript({
  obterSistemas: new Function('return ' + sistemas),
  obterCurriculosContagem: new Function('if (window.__falharContagem) { window.__falharContagem = false; throw new Error("x"); } return ' + curriculos)
});

function lum(c) { const m = c.match(/[\d.]+/g).map(Number); const a = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
const BG = `function bg(el){while(el){const c=getComputedStyle(el).backgroundColor;if(c&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c))return c;el=el.parentElement}return getComputedStyle(document.body).backgroundColor}`;

let ok = 0, fail = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; console.log('ok', n, extra); } else { fail++; console.log('FALHA', n, extra); } };

async function load(p, falharContagem) {
  await p.route('http://painel.teste/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html.replace('<head>', '<head><script>' + stub + (falharContagem ? 'window.__falharContagem=true;' : '') + '</script>') }));
  await p.route(/^https:\/\//, r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"><rect width="240" height="97" fill="#00509d"/></svg>' }));
  await p.goto('http://painel.teste/');
  await p.waitForSelector('#listaSistemasContainer .cardSistema');
  await p.waitForTimeout(250);
}
async function contraste(p, scheme, seletores, rotulo = '') {
  const pares = await p.evaluate(([sel, bgsrc]) => { const bg = eval('(' + bgsrc + ')'); return sel.map(s => { const e = document.querySelector(s); if (!e) return [s, null, null]; return [s, getComputedStyle(e).color, bg(e)]; }); }, [seletores, BG]);
  for (const [s, c, b] of pares) { if (!c) { chk(`[${scheme}]${rotulo} existe ${s}`, false); continue; } const r = cr(c, b); chk(`[${scheme}]${rotulo} contraste ${s}`, r >= 4.5, r.toFixed(2)); }
}
const visiveis = p => p.$$eval('#listaSistemasContainer .cardSistema', e => e.map(c => c.querySelector('strong').textContent));

(async () => {
  const b = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const T = `[${scheme}]`;
    const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await load(p);

    chk(`${T} tema Sistema resolvido`, await p.evaluate(s => document.documentElement.dataset.theme === s, scheme));
    chk(`${T} abre no menu lateral`, await p.evaluate(() => document.getElementById('painelLayout').dataset.navegacao === 'sidebar' && document.querySelector('[data-painel-modo="sidebar"]').getAttribute('aria-pressed') === 'true'));
    chk(`${T} um item de menu por categoria, na ordem`, (await p.$$eval('#painelMenu [data-pagina]', e => e.map(x => x.getAttribute('data-pagina')).join())) === 'matricula-disciplinas,formacao-conclusao,beneficios-servicos,intercambistas');
    chk(`${T} ícones no menu`, await p.$$eval('.painelNavIcone svg', e => e.length) === 8);
    chk(`${T} primeira categoria aberta e marcada`, await p.getAttribute('#navCategoria-matricula-disciplinas', 'aria-current') === 'page' && (await p.textContent('.tituloArea h1')) === 'Matrícula e disciplinas');
    chk(`${T} cards da categoria`, (await visiveis(p)).length === 4);

    // grade horária: card de consulta e atalho no menu, ambos em nova aba e sem AccountChooser
    const grade = await p.evaluate(() => { const c = [...document.querySelectorAll('#listaSistemasContainer .cardSistema')].pop(); return c && { tag: c.tagName, nome: c.querySelector('strong').textContent, href: c.getAttribute('href'), target: c.target, rel: c.rel, selo: c.querySelector('.badgeStatusForm').textContent, aviso: c.textContent.includes('(abre em nova aba)') }; });
    chk(`${T} card da grade horária no fim de Matrícula`, grade && grade.tag === 'A' && grade.nome === 'Grade horária' && grade.selo === 'Consulta' && grade.aviso, JSON.stringify(grade));
    chk(`${T} card da grade abre em nova aba sem AccountChooser`, grade && grade.target === '_blank' && /noopener/.test(grade.rel) && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(grade.href));
    const atalho = await p.evaluate(() => { const a = document.getElementById('navAtalho-grade-horaria'); return a && { pai: a.parentNode.className, proximo: a.nextElementSibling && a.nextElementSibling.id, target: a.target, rel: a.rel, href: a.getAttribute('href'), icone: !!a.querySelector('.painelNavIcone svg'), nome: a.querySelector('.painelNavTexto').textContent }; });
    chk(`${T} atalho da grade no rodapé do menu, acima da Ajuda`, atalho && atalho.pai === 'painelSidebar__apoio' && atalho.proximo === 'navAjuda' && atalho.icone && atalho.nome === 'Grade horária', JSON.stringify(atalho));
    chk(`${T} atalho abre em nova aba com o mesmo link do card`, atalho && atalho.target === '_blank' && /noopener/.test(atalho.rel) && grade && atalho.href === grade.href);

    await p.click('#navCategoria-formacao-conclusao');
    const formacao = await visiveis(p);
    chk(`${T} Formação e conclusão tem os 2 formulários e a contagem`, formacao.join('|') === 'Pedido de Abertura de Habilitação|Pedido de Colação de Grau|Contagem de créditos', formacao.join('|'));
    chk(`${T} marca muda no menu`, await p.getAttribute('#navCategoria-formacao-conclusao', 'aria-current') === 'page' && await p.getAttribute('#navCategoria-matricula-disciplinas', 'aria-current') === null);
    chk(`${T} card aberto passa pelo AccountChooser`, (await p.getAttribute('#listaSistemasContainer a.cardSistema', 'href')).startsWith('https://accounts.google.com/AccountChooser?continue='));

    await p.click('#navCategoria-intercambistas');
    chk(`${T} linha em inglês de Intercambistas`, (await p.textContent('.tituloArea')).includes('Enrollment requests for exchange students.'));

    // busca
    await p.fill('#caixaBusca', 'disciplinas');
    chk(`${T} busca em todas as categorias`, (await p.$$eval('.grupoBusca h2', e => e.length)) === 2 && (await visiveis(p)).length === 5);
    chk(`${T} nenhuma categoria marcada durante a busca`, await p.$$eval('#painelMenu [aria-current]', e => e.length) === 0);
    chk(`${T} status anuncia resultados`, (await p.textContent('#statusBusca')) === '5 resultados encontrados.');
    await p.fill('#caixaBusca', 'horário');
    chk(`${T} busca "horário" acha a grade`, (await visiveis(p)).join('|') === 'Grade horária', (await visiveis(p)).join('|'));
    await p.fill('#caixaBusca', 'disciplinas');
    await p.fill('#caixaBusca', 'colacao');
    chk(`${T} busca sem acento`, (await visiveis(p)).join() === 'Pedido de Colação de Grau');
    await p.fill('#caixaBusca', 'quantos creditos faltam');
    chk(`${T} busca sem resultado`, (await p.textContent('#listaSistemasContainer')).includes('Nenhum formulário encontrado'));
    await p.fill('#caixaBusca', 'formar');
    chk(`${T} busca acha a contagem pelas palavras-chave`, (await visiveis(p)).join() === 'Contagem de créditos');
    await p.fill('#caixaBusca', ''); await p.dispatchEvent('#caixaBusca', 'input');
    chk(`${T} limpar a busca volta à categoria`, (await p.textContent('.tituloArea h1')) === 'Intercambistas / Exchange Students' && await p.getAttribute('#navCategoria-intercambistas', 'aria-current') === 'page');
    await p.fill('#caixaBusca', 'busp'); await p.click('#navCategoria-beneficios-servicos');
    chk(`${T} escolher categoria encerra a busca`, (await p.inputValue('#caixaBusca')) === '' && (await p.textContent('.tituloArea h1')) === 'Benefícios e serviços');

    // card fechado por teclado
    await p.click('#navCategoria-matricula-disciplinas');
    let alerta = '';
    p.once('dialog', d => { alerta = d.message(); d.dismiss(); });
    await p.focus('#listaSistemasContainer .cardSistema.fechado'); await p.keyboard.press('Enter');
    await p.waitForTimeout(100);
    chk(`${T} card fechado avisa pelo teclado`, alerta.includes('fechado para respostas'), alerta);

    await contraste(p, scheme, ['.tituloSistema', '.tituloArea h1', '.tituloArea p', '.caixaBusca', '.linkAjudaContextual', '.infoSistema strong', '.infoSistema div', '.badgeStatusForm.aberto', '.badgeStatusForm.fechado', '.avisoReabertura', '.painelSidebar__titulo', '#navCategoria-matricula-disciplinas', '#navCategoria-formacao-conclusao', '.painelModo[aria-pressed="true"]', '.painelModo[aria-pressed="false"]']);
    await p.screenshot({ path: SAIDA + `menu-${scheme}.png`, fullPage: true });

    // abas
    await p.click('[data-painel-modo="abas"]');
    chk(`${T} abas: tablist/tab/tabpanel`, await p.evaluate(() => document.getElementById('painelMenu').getAttribute('role') === 'tablist' && document.querySelectorAll('[role="tab"]').length === 4 && document.getElementById('conteudo').getAttribute('role') === 'tabpanel' && document.getElementById('conteudo').getAttribute('aria-labelledby') === 'navCategoria-matricula-disciplinas'));
    await p.focus('#navCategoria-matricula-disciplinas'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
    chk(`${T} abas: seta + Enter abre a próxima`, (await p.textContent('.tituloArea h1')) === 'Formação e conclusão' && await p.getAttribute('#navCategoria-formacao-conclusao', 'aria-selected') === 'true');
    await p.keyboard.press('End');
    chk(`${T} abas: End vai para a última`, await p.evaluate(() => document.activeElement.id === 'navCategoria-intercambistas'));
    await contraste(p, scheme, ['#navCategoria-formacao-conclusao', '#navCategoria-matricula-disciplinas'], ' abas');
    await p.screenshot({ path: SAIDA + `abas-${scheme}.png`, fullPage: true });
    await p.click('[data-painel-modo="sidebar"]');
    chk(`${T} volta ao menu lateral`, await p.evaluate(() => !document.getElementById('painelMenu').hasAttribute('role')) && await p.getAttribute('#navCategoria-formacao-conclusao', 'aria-current') === 'page');

    // ajuda pelo menu
    await p.click('#navAjuda');
    chk(`${T} item Ajuda abre a Central`, await p.evaluate(() => !document.getElementById('painelAjudaOverlay').hidden));
    await p.keyboard.press('Escape');
    chk(`${T} ESC fecha a Central`, await p.evaluate(() => document.getElementById('painelAjudaOverlay').hidden));

    // contagem de créditos
    await p.click('button.cardSistema');
    await p.waitForSelector('input[data-habilitacao]');
    chk(`${T} janela da contagem abre com foco no fechar`, await p.evaluate(() => !document.getElementById('contagemOverlay').hidden && document.activeElement.id === 'contagemFechar' && document.body.style.overflow === 'hidden'));
    chk(`${T} habilitações dos currículos ativos, sem repetir`, (await p.$$eval('input[data-habilitacao]', e => e.map(i => i.parentElement.textContent).join('|'))) === 'Habilitação Fictícia A|Habilitação Fictícia B|Habilitação Fictícia C');
    chk(`${T} nada marcado: pede uma habilitação`, (await p.textContent('#contagemBlocos')).includes('Marque pelo menos uma habilitação'));
    await p.check('input[data-habilitacao="99999|200"]');
    chk(`${T} B: estrutura única já escolhida, campos aparecem`, await p.$$eval('#contagemBlocos select', e => e.length) === 0 && await p.$$eval('#contagemBloco-RS-B-V1 input[data-requisito]', e => e.length) === 2);
    await p.check('input[data-habilitacao="99999|100"]');
    chk(`${T} A: duas estruturas pedem escolha`, await p.$$eval('select[data-estrutura]', e => e.length) === 1 && !(await p.$('#contagemBloco-RS-A-V2')));
    chk(`${T} blocos na ordem das habilitações`, (await p.$$eval('.contagemHabilitacao h3', e => e.map(x => x.textContent).join('|'))) === 'Habilitação Fictícia A|Habilitação Fictícia B');
    await p.click('.contagemBotao--principal');
    chk(`${T} sem estrutura escolhida: avisa`, (await p.textContent('.contagemResumo h3')).includes('Escolha a estrutura curricular de: Habilitação Fictícia A'));
    await p.selectOption('select[data-estrutura="99999|100"]', 'RS-A-V2');
    chk(`${T} campos do currículo A`, await p.$$eval('#contagemBloco-RS-A-V2 input[data-requisito]', e => e.length) === 4 && await p.$$eval('#contagemBloco-RS-A-V2 input[data-sigla]', e => e.length) === 5 && await p.$$eval('#contagemBloco-RS-A-V2 input[data-grupo]', e => e.length) === 1);
    chk(`${T} rótulos ligados aos campos`, await p.evaluate(() => [...document.querySelectorAll('#contagemOverlay input[data-requisito],#contagemOverlay input[data-grupo]')].every(i => document.querySelector(`label[for="${i.id}"]`))));
    chk(`${T} ids únicos`, await p.evaluate(() => { const ids = [...document.querySelectorAll('#contagemOverlay [id]')].map(e => e.id); return ids.length === new Set(ids).size; }));
    const A = '#contagemReq-RS-A-V2-', B = '#contagemReq-RS-B-V1-';
    await p.fill(A + 'R1', '138'); await p.fill(A + 'R2', '20'); await p.fill(A + 'R3', '44'); await p.fill(A + 'R4', '400');
    await p.fill(B + 'R6', '20'); await p.fill(B + 'R7', '10');
    await p.check('#contagemBloco-RS-A-V2 input[data-sigla="TST0001"]');
    chk(`${T} mesma disciplina marcada nas duas habilitações`, await p.isChecked('#contagemBloco-RS-B-V1 input[data-sigla="TST0001"]'));
    await p.click('.contagemBotao--principal');
    chk(`${T} resultado aparece com foco`, await p.evaluate(() => document.activeElement.id === 'contagemResultadoTitulo'));
    const res = await p.textContent('#contagemResultado');
    chk(`${T} resultado por habilitação`, res.includes('Habilitação Fictícia A: faltam 4 itens') && res.includes('Habilitação Fictícia B: cumprido') && res.includes('Faltam 100 horas') && res.includes('Cumprido com compensação') && res.includes('vieram da sobra de "Créditos eletivos"') && res.includes('TST0002'), res.slice(0, 300));
    await contraste(p, scheme, ['.contagemIntro', '.contagemHabilitacao h3', 'select[data-estrutura]', '.contagemRotulo', '.contagemExigido', '.contagemNumero', '.contagemBotao--principal', '.contagemResumo h3', '.contagemStatus--ok', '.contagemStatus--falta', '.contagemDetalhe', '.contagemSelo', '.contagemSubtitulo--hab'], ' contagem');
    await p.evaluate(() => { document.getElementById('contagemOverlay').scrollTop = 0; });
    await p.screenshot({ path: SAIDA + `contagem-${scheme}.png` });
    // trocar de estrutura e voltar guarda o que foi digitado
    await p.selectOption('select[data-estrutura="99999|100"]', 'RS-A2-V1');
    chk(`${T} trocar de estrutura troca os campos`, await p.$$eval('#contagemBloco-RS-A2-V1 input[data-requisito]', e => e.length) === 1);
    await p.selectOption('select[data-estrutura="99999|100"]', 'RS-A-V2');
    chk(`${T} valores ficam ao trocar de estrutura`, (await p.inputValue(A + 'R4')) === '400' && await p.isChecked('#contagemBloco-RS-A-V2 input[data-sigla="TST0001"]'));
    await p.uncheck('input[data-habilitacao="99999|200"]'); await p.check('input[data-habilitacao="99999|200"]');
    chk(`${T} desmarcar e marcar guarda os valores`, (await p.inputValue(B + 'R6')) === '20');
    await p.click('.contagemAcoes .contagemBotao:not(.contagemBotao--principal)');
    chk(`${T} Limpar zera os números e as disciplinas`, (await p.inputValue(A + 'R1')) === '' && !(await p.isChecked('input[data-sigla="TST0001"]')) && (await p.textContent('#contagemResultado')) === '' && await p.isChecked('input[data-habilitacao="99999|100"]'));
    await p.uncheck('input[data-habilitacao="99999|200"]');
    for (const [k, v] of [['R1', '140'], ['R2', '15'], ['R3', '47'], ['R4', '500']]) await p.fill(A + k, v);
    for (const s of ['TST0001', 'TST0002', 'TST0010', 'TST0012']) await p.check(`#contagemBloco-RS-A-V2 input[data-sigla="${s}"]`);
    await p.fill('#contagemGrupo-RS-A-V2-G2', '8');
    await p.keyboard.press('Enter');
    chk(`${T} Enter calcula e tudo cumprido`, (await p.textContent('.contagemResumo h3')).includes('você cumpre o que esta habilitação exige'));
    // ajuda contextual por cima e ESC fecha só a ajuda
    await p.click('#contagemAjuda');
    chk(`${T} ajuda da contagem abre na seção certa`, await p.evaluate(() => !document.getElementById('painelAjudaOverlay').hidden && !document.getElementById('painelAjudaSecao-contagem-creditos').hidden));
    await p.keyboard.press('Escape');
    chk(`${T} ESC fecha só a ajuda`, await p.evaluate(() => document.getElementById('painelAjudaOverlay').hidden && !document.getElementById('contagemOverlay').hidden));
    // foco preso
    await p.focus('#contagemFechar'); await p.keyboard.press('Shift+Tab');
    chk(`${T} foco preso na janela`, await p.evaluate(() => document.getElementById('contagemOverlay').contains(document.activeElement)));
    await p.keyboard.press('Escape');
    chk(`${T} ESC fecha a contagem e devolve o foco`, await p.evaluate(() => document.getElementById('contagemOverlay').hidden && document.activeElement.matches('button.cardSistema') && document.body.style.overflow === ''));
    chk(`${T} servidor chamado uma vez só`, await p.evaluate(() => window.__chamadas.filter(n => n === 'obterCurriculosContagem').length === 1));

    chk(`${T} sem erros de JavaScript`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // falha ao carregar e "Tentar de novo"
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await load(p, true);
    await p.evaluate(() => window.PainelNavegacao.irPara('formacao-conclusao'));
    await p.click('button.cardSistema');
    await p.waitForSelector('.contagemErro button');
    chk('erro de carga mostra Tentar de novo', (await p.textContent('.contagemErro')).includes('Não foi possível carregar'));
    await p.click('.contagemErro button'); await p.waitForSelector('input[data-habilitacao]');
    chk('Tentar de novo carrega', true);
    await ctx.close();
  }

  // larguras
  for (const w of [360, 390, 480, 768, 1024]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    const p = await ctx.newPage();
    await load(p);
    const semRolagem = () => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    chk(`${w}px sem rolagem horizontal`, await semRolagem());
    if (w <= 900) {
      chk(`${w}px menu começa recolhido`, await p.evaluate(() => document.getElementById('painelSidebar').dataset.recolhido === 'true' && getComputedStyle(document.getElementById('painelMenu')).display === 'none'));
      await p.click('#painelMenuMovel');
      await p.click('#navCategoria-formacao-conclusao');
      chk(`${w}px escolher categoria recolhe o menu`, await p.evaluate(() => document.getElementById('painelSidebar').dataset.recolhido === 'true') && (await p.textContent('.tituloArea h1')) === 'Formação e conclusão');
    } else {
      await p.click('#navCategoria-formacao-conclusao');
    }
    const pequenos = await p.evaluate(() => [...document.querySelectorAll('.painelNavItem,.painelModo,.painelMenuMovel,.botaoAjuda')].filter(e => e.getClientRects().length && (e.getBoundingClientRect().height < 43.5)).map(e => e.textContent.trim()));
    chk(`${w}px alvos ≥ 44 px`, pequenos.length === 0, pequenos.join('|'));
    await p.click('button.cardSistema'); await p.waitForSelector('input[data-habilitacao]');
    await p.check('input[data-habilitacao="99999|100"]'); await p.check('input[data-habilitacao="99999|200"]');
    await p.selectOption('select[data-estrutura="99999|100"]', 'RS-A-V2'); await p.click('.contagemBotao--principal');
    chk(`${w}px contagem sem rolagem horizontal`, await p.evaluate(() => { const m = document.querySelector('.contagemModal'); return m.scrollWidth <= m.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth; }));
    if (w === 360) { await p.evaluate(() => { document.getElementById('contagemOverlay').scrollTop = 0; }); await p.screenshot({ path: SAIDA + 'contagem-360.png' }); }
    await ctx.close();
  }

  // movimento reduzido
  {
    const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await load(p);
    chk('movimento reduzido sem transição', await p.evaluate(() => getComputedStyle(document.querySelector('.painelNavItem')).transitionDuration.split(',').every(v => parseFloat(v) < 0.01)));
    await ctx.close();
  }

  await b.close();
  console.log(`\n${ok} ok, ${fail} falha(s). Capturas em ${SAIDA}*.png`);
  process.exit(fail ? 1 : 0);
})();

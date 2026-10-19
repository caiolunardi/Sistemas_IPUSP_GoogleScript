// 1.10.0: interface real + servidor real no simulador. Somente dados sintéticos.
// Testa preservação de estado/DOM, perfis, teclado, temas e layouts responsivos.
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { abrirNavegador, abrirPainel, esperarCarregado, criarAmbiente, DIR_SRC } = require('./ambiente_navegador');
const { parSintetico } = require('./pacotes_sinteticos');
const SAIDA = path.join(__dirname, 'saida', 'navegacao-1_10_0');
fs.mkdirSync(SAIDA, { recursive: true });
const ADMIN = 'admin@unidade.example', LEITOR = 'leitor@unidade.example';
const modelo = { versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' }, curriculos: [{ codigo: '470120000262', habilitacao: '0', habilitacaoNome: 'Psicólogo', ano: 2026, semestre: 2, situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null }] };
const pedir = r => { assert.equal(r.ok, true, r.codigo + ': ' + r.erro); return r.dados; };
let browser, ok = 0, falhas = 0;
async function teste(nome, fn) {
  try { await fn(); ok++; console.log('✓ ' + nome); }
  catch (e) { falhas++; console.log('✗ ' + nome + '\n' + String(e.stack || e)); }
}
async function montar(op = {}) {
  const original = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(original.ctx.obterDadosPainel());
  if (!op.vazia) {
    const pacote = parSintetico(modelo, 12).csv;
    const pre = pedir(original.ctx.prepararImportacao(pacote));
    pedir(original.ctx.confirmarImportacao(pacote, pre.assinatura, { operacao: pre.operacao, previa: pre.impressao }));
    pedir(original.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'SIN0002' }]));
    pedir(original.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST2001', nome: 'Disciplina fictícia para outros cursos', oferecimento: '1' } }));
  }
  if (op.grade) original.criarPlanilhaGrade();
  const amb = op.leitor ? criarAmbiente({ dirSrc: DIR_SRC, reusar: original, usuario: LEITOR, dono: ADMIN }) : original;
  const c = await abrirPainel(browser, { amb, largura: op.largura || 1440, altura: 1000, latencia: 0,
    portao: op.falhar ? nome => nome === 'obterDadosPainel' ? Promise.resolve({ falhar: 'Falha sintética de transporte' }) : null : undefined });
  await esperarCarregado(c.pagina);
  c.fim = async () => { assert.deepEqual(c.errosPagina, []); await c.contexto.close(); };
  return c;
}
async function selecionar(p, id) { await p.click('#' + id); }
async function overflow(p) { return p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
async function semReferenciasQuebradas(p) {
  return p.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]'), el => el.id);
    const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
    const quebrados = Array.from(document.querySelectorAll('[aria-controls]')).flatMap(el => el.getAttribute('aria-controls').split(/\s+/).filter(id => !document.getElementById(id)));
    return { repetidos, quebrados, mains: document.querySelectorAll('main').length };
  });
}
(async () => {
  browser = await abrirNavegador();
  await teste('Sidebar padrão, IDs únicos, alvos ARIA e ícones decorativos em todas as opções fixas', async () => {
    const c = await montar(), p = c.pagina;
    assert.deepEqual(await semReferenciasQuebradas(p), { repetidos: [], quebrados: [], mains: 1 });
    assert.deepEqual(await p.evaluate(() => ({ modo: EstruturaNavegacao.getModo(), vertical: document.getElementById('etapas').getAttribute('aria-orientation'), grupos: Array.from(document.querySelectorAll('.estruturaSidebar__grupo'), el => el.hidden), icones: document.querySelectorAll('.estruturaIcone svg:not([aria-hidden="true"]), .estruturaIcone svg:not([focusable="false"])').length })), { modo: 'sidebar', vertical: 'vertical', grupos: [false, true, false, false], icones: 0 });
    assert.equal(await p.locator('#visoes [role=tab] .estruturaIcone, #etapas [role=tab] .estruturaIcone, #abasEstrutura [role=tab] .estruturaIcone').count(), 9);
    await c.fim();
  });
  await teste('Alternar 20 vezes conserva os mesmos nós, listeners, filtros, seleção e não chama servidor/storage', async () => {
    const c = await montar(), p = c.pagina;
    await p.fill('#campoBusca', 'Sintética 2');
    await p.evaluate(() => { window.__navegacaoAntes = { input: document.getElementById('campoBusca'), navs: ['visoes', 'etapas', 'abasEstrutura'].map(id => document.getElementById(id)), dados: Painel.estado.dados, etapa: Painel.estado.etapa }; });
    const n = c.chamadas.length;
    await p.evaluate(() => {
      window.__gravaStorage = 0;
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { window.__gravaStorage++; return set.apply(this, arguments); };
      for (let i = 0; i < 20; i++) EstruturaNavegacao.setModo(i % 2 ? 'sidebar' : 'abas');
    });
    assert.deepEqual(await p.evaluate(() => ({ input: __navegacaoAntes.input === document.getElementById('campoBusca'), navs: __navegacaoAntes.navs.every(el => document.getElementById(el.id) === el), dados: __navegacaoAntes.dados === Painel.estado.dados, busca: document.getElementById('campoBusca').value, etapa: Painel.estado.etapa, storage: __gravaStorage })), { input: true, navs: true, dados: true, busca: 'Sintética 2', etapa: 1, storage: 0 });
    assert.equal(c.chamadas.length, n);
    await selecionar(p, 'estruturaModoAbas');
    await selecionar(p, 'aba-curriculos');
    assert.equal(await p.locator('#painel-curriculos').isVisible(), true);
    await selecionar(p, 'estruturaModoSidebar');
    assert.equal(await p.getAttribute('#aba-curriculos', 'aria-selected'), 'true');
    assert.equal(await p.locator('#painel-curriculos').isVisible(), true);
    await c.fim();
  });
  await teste('Etapas e consultas permanecem restritas à seção/painel original; prévia recebe ícones', async () => {
    const c = await montar({ grade: true }), p = c.pagina;
    for (const modo of ['sidebar', 'abas']) {
      await selecionar(p, modo === 'sidebar' ? 'estruturaModoSidebar' : 'estruturaModoAbas');
      for (let i = 2; i <= 4; i++) {
        await selecionar(p, 'etapa-' + i);
        assert.equal(await p.locator('#etapaPainel-' + i).isVisible(), true);
        assert.equal(await p.locator('#abasEstrutura').isVisible(), false);
      }
      assert.ok(await p.locator('#previaAbas [role=tab] .estruturaIcone').count() > 0);
      await selecionar(p, 'etapa-1');
      assert.equal(await p.locator('#abasEstrutura').isVisible(), true);
      await selecionar(p, 'visao-auditoria');
      assert.equal(await p.locator('#visaoAuditoria').isVisible(), true);
      assert.equal(await p.locator('#etapas').isVisible(), false);
      assert.equal(await p.locator('#abasEstrutura').isVisible(), false);
      await selecionar(p, 'visao-estrutura');
    }
    await c.fim();
  });
  await teste('Teclado vertical/horizontal, Home/End e foco continuam ativando os painéis corretos', async () => {
    const c = await montar(), p = c.pagina;
    await p.focus('#etapa-1');
    await p.keyboard.press('ArrowDown');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'etapa-2');
    await p.keyboard.press('ArrowUp');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'etapa-1');
    await p.keyboard.press('End');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'etapa-4');
    await p.keyboard.press('Home');
    await selecionar(p, 'estruturaModoAbas');
    await p.focus('#etapa-1');
    await p.keyboard.press('ArrowRight');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'etapa-2');
    await p.evaluate(() => EstruturaNavegacao.setModo('sidebar'));
    assert.equal(await p.evaluate(() => document.activeElement.id), 'etapa-2');
    await c.fim();
  });
  await teste('Ficha aberta e rascunho preservados durante troca de apresentação', async () => {
    const c = await montar(), p = c.pagina;
    await p.click('#corpoTabela tr[data-id="SIN0002"] td:nth-child(2)');
    await p.waitForSelector('#modalDisciplina:not([hidden])');
    await p.fill('#fichaCampo-nome', 'Rascunho visual sintético');
    const n = c.chamadas.length;
    await p.evaluate(() => { EstruturaNavegacao.setModo('abas'); EstruturaNavegacao.setModo('sidebar'); });
    assert.equal(await p.inputValue('#fichaCampo-nome'), 'Rascunho visual sintético');
    assert.equal(await p.locator('#modalDisciplina').isVisible(), true);
    assert.equal(c.chamadas.length, n);
    await c.fim();
  });
  await teste('Leitor, base vazia e falha de carga mantêm as restrições e a Central de Ajuda', async () => {
    for (const op of [{ leitor: true }, { vazia: true }, { falhar: true }]) {
      const c = await montar(op), p = c.pagina;
      for (const modo of ['sidebar', 'abas']) {
        await selecionar(p, modo === 'sidebar' ? 'estruturaModoSidebar' : 'estruturaModoAbas');
        assert.equal(await p.locator('#etapas').isVisible(), false);
        if (op.leitor) assert.equal(await p.locator('#aba-disciplinas').isVisible(), true);
        await p.click('#botaoAjuda');
        assert.equal(await p.locator('#centralAjuda').isVisible(), true);
        await p.keyboard.press('Escape');
      }
      await c.fim();
    }
  });
  await teste('Tema Sistema acompanha SO; preferência explícita persiste; reload volta à sidebar', async () => {
    const c = await montar(), p = c.pagina;
    assert.equal(await p.getAttribute('html', 'data-theme-preference'), 'system');
    await p.emulateMedia({ colorScheme: 'dark' });
    await p.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await p.evaluate(() => GradipTheme.setPreference('light'));
    await p.emulateMedia({ colorScheme: 'light' });
    await p.emulateMedia({ colorScheme: 'dark' });
    assert.equal(await p.getAttribute('html', 'data-theme'), 'light');
    await selecionar(p, 'estruturaModoAbas');
    await p.reload(); await esperarCarregado(p);
    assert.equal(await p.evaluate(() => EstruturaNavegacao.getModo()), 'sidebar');
    assert.equal(await p.getAttribute('html', 'data-theme'), 'light');
    assert.equal(await p.evaluate(() => localStorage.getItem('gradip-theme')), 'light');
    await c.fim();
  });
  await teste('Hover, foco visível e movimento reduzido', async () => {
    const c = await montar(), p = c.pagina;
    await p.hover('#visao-auditoria'); await p.waitForTimeout(220);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('visao-auditoria')).transform), 'matrix(1, 0, 0, 1, 0, -3)');
    await p.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('visao-auditoria')).transform), 'none');
    await p.keyboard.press('Tab'); await p.focus('#aba-disciplinas');
    assert.ok(await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('aba-disciplinas')).outlineWidth) >= 3));
    await selecionar(p, 'estruturaModoAbas');
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('estruturaConteudo')).animationName), 'none');
    await c.fim();
  });
  for (const largura of [360, 390, 480, 768, 1440]) {
    for (const tema of ['light', 'dark']) {
      await teste('Layout ' + largura + 'px / ' + tema + ': sidebar, abas, alvos de toque e sem overflow global', async () => {
        const c = await montar({ largura }), p = c.pagina;
        await p.evaluate(t => GradipTheme.setPreference(t), tema);
        for (const modo of ['sidebar', 'abas']) {
          await selecionar(p, modo === 'sidebar' ? 'estruturaModoSidebar' : 'estruturaModoAbas');
          await p.waitForFunction(() => !document.getElementById('estruturaConteudo').classList.contains('estruturaConteudo--transicao'));
          assert.ok(await overflow(p) <= 1, 'overflow global ' + await overflow(p));
          const pequenos = await p.evaluate(() => Array.from(document.querySelectorAll('.estruturaModo, #visoes [role=tab], #etapas [role=tab], #abasEstrutura [role=tab]')).filter(el => el.getClientRects().length && (el.getBoundingClientRect().height < 43.99 || el.getBoundingClientRect().width < 43.99)).map(el => ({ id: el.id, retangulo: el.getBoundingClientRect().toJSON() })));
          assert.deepEqual(pequenos, []);
          await p.screenshot({ path: path.join(SAIDA, largura + '-' + tema + '-' + modo + '.png'), fullPage: true });
        }
        await c.fim();
      });
    }
  }
  await teste('Menu móvel recolhe/expande sem overlay e se reabre na largura de desktop', async () => {
    const c = await montar({ largura: 390 }), p = c.pagina;
    await selecionar(p, 'estruturaMenuMovel');
    assert.equal(await p.getAttribute('#estruturaMenuMovel', 'aria-expanded'), 'false');
    assert.equal(await p.locator('#estruturaSidebarConteudo').isVisible(), false);
    await p.fill('#campoBusca', 'Sintética');
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.waitForFunction(() => !document.getElementById('estruturaSidebarConteudo').hidden);
    assert.equal(await p.inputValue('#campoBusca'), 'Sintética');
    await c.fim();
  });
  await teste('Contraste do texto da navegação nos dois modos/temas (mínimo 4,5:1)', async () => {
    const c = await montar(), p = c.pagina, medidas = [];
    function luminancia(rgb) {
      const canais = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return canais[0] * .2126 + canais[1] * .7152 + canais[2] * .0722;
    }
    for (const tema of ['light', 'dark']) for (const modo of ['sidebar', 'abas']) {
      await p.evaluate(t => GradipTheme.setPreference(t), tema);
      await selecionar(p, modo === 'sidebar' ? 'estruturaModoSidebar' : 'estruturaModoAbas');
      await p.mouse.move(1400, 980); await p.waitForTimeout(220);
      const cores = await p.evaluate(() => Array.from(document.querySelectorAll('.estruturaModo, .estruturaSidebar__rotulo, #visoes [role=tab], #etapas [role=tab], #abasEstrutura [role=tab]')).filter(el => el.getClientRects().length).map(el => {
        let fundo = el, bg;
        while (fundo) { bg = getComputedStyle(fundo).backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') break; fundo = fundo.parentElement; }
        return { id: el.id, texto: getComputedStyle(el).color, fundo: bg };
      }));
      for (const cor of cores) {
        const a = luminancia(cor.texto), b = luminancia(cor.fundo), contraste = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        medidas.push({ tema, modo, ...cor, contraste: +contraste.toFixed(2) });
        assert.ok(contraste >= 4.5, cor.id + ': ' + contraste);
      }
    }
    fs.writeFileSync(path.join(SAIDA, 'contraste.json'), JSON.stringify(medidas, null, 2) + '\n');
    await c.fim();
  });
  await teste('Pointer de toque não aplica elevação de hover', async () => {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await contexto.newPage();
    const html = ['GradipTema.html', 'PainelEstilos.html', 'EstruturaNavegacaoEstilos.html'].map(f => fs.readFileSync(path.join(DIR_SRC, f), 'utf8')).join('\n');
    await p.setContent('<!DOCTYPE html><html lang="pt-BR"><body>' + html + '<div id="estruturaLayout" data-navegacao="sidebar"><button class="visoes__botao" id="toque">Opção de navegação</button></div></body></html>');
    await p.tap('#toque');
    assert.deepEqual(await p.evaluate(() => ({ hover: matchMedia('(hover: hover) and (pointer: fine)').matches, transform: getComputedStyle(document.getElementById('toque')).transform })), { hover: false, transform: 'none' });
    await contexto.close();
  });
  await browser.close();
  console.log('\n' + ok + ' ok, ' + falhas + ' falha(s).');
  console.log('Alcance: Chromium local, backend em simulador, dados sintéticos; não homologa Google Workspace.');
  process.exitCode = falhas ? 1 : 0;
})().catch(async e => { console.error('ERRO DE INFRAESTRUTURA:', e); if (browser) await browser.close(); process.exitCode = 3; });

// Testes de navegador da Grade Horária visual (Chromium real via Playwright).
// Simula google.script.run com grades sintéticas (nenhum dado real) e
// substitui html2canvas/jsPDF e o PNG da marca USP por versões locais,
// para não depender da rede. Uso: node testar_navegador.js
const fs = require('fs'), path = require('path'), os = require('os');
function carregarPlaywright() { try { return require('playwright'); } catch (e) { return require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } }
const { chromium } = carregarPlaywright();
const SRC = path.join(__dirname, '..', 'src') + '/';
function montar() {
  let h = fs.readFileSync(SRC + 'GradeGrid.html', 'utf8');
  for (let k = 0; k < 3; k++) h = h.replace(/<\?!= include_\('(\w+)'\) \?>/g, (_, n) => fs.readFileSync(SRC + n + '.html', 'utf8'));
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}
const html = montar();

const D = (codigo, nome, tipo, semestre, dia, inicio, fim, extra = {}) =>
  Object.assign({ codigo, nome, tipo, docentes: 'Docente Teste A, Docente Teste B', semestre, creditos: '2', dia, inicio, fim, sala: '', aba: 'PSA' }, extra);
const GRADES = {
  '': { semestre: '2027/1', rotulo: '2027 - 1º Semestre', atual: true, semestresIdeais: [1, 3, 4, 5, 7, 9], lidaEm: '13/10/2026 às 19:40', disciplinas: [
    D('PSA1001', 'Disciplina Um', 'Obrigatória', 1, 'Segunda-Feira', '08:00', '10:00', { sala: 'Sala 1' }),
    D('PSA1002', 'Eletiva <img src=x onerror=window.__xss=1>', 'Eletiva', 1, 'Segunda-Feira', '08:00', '12:00'),
    D('PSA1003', 'Livre', 'Livre', 1, 'Segunda-Feira', '09:00', '11:00'),
    D('MAE0116', 'Estatística', 'Obrigatória', 1, 'Quinta-Feira', '13:30', '17:30', { docentes: '' }),
    D('PSA1009', 'Fora da grade', 'Livre', 1, 'Sexta-Feira', '18:00', '20:00'),
    D('PSA3001', 'Do terceiro', 'Obrigatória', 3, 'Terça-Feira', '14:00', '18:00'),
    D('PSA4001', 'Do quarto extra', 'Livre', 4, 'Quarta-Feira', '10:00', '12:00')] },
  '2026/2': { semestre: '2026/2', rotulo: '2026 - 2º Semestre', atual: false, semestresIdeais: [2, 3, 4, 6, 8, 10], lidaEm: '13/10/2026 às 19:41', disciplinas: [
    D('PSA2001', 'Antiga do segundo', 'Obrigatória', 2, 'Segunda-Feira', '08:00', '10:00'),
    D('PSA3002', 'Antiga do terceiro', 'Eletiva', 3, 'Sexta-Feira', '16:00', '18:00')] },
  '2026/1': 'ERRO'
};
const CONFIG = { atual: { semestre: '2027/1', rotulo: '2027 - 1º Semestre' }, anteriores: [
  { semestre: '2026/2', rotulo: '2026 - 2º Semestre' }, { semestre: '2026/1', rotulo: '2026 - 1º Semestre' }], avisoAnteriores: '' };

const stub = (modo) => `(function(){var G=${JSON.stringify(GRADES)};var C=${JSON.stringify(CONFIG)};var MODO=${JSON.stringify(modo)};window.__chamadas=[];
var API={obterConfiguracaoGrade:function(){if(MODO==='semAnteriores')return {atual:C.atual,anteriores:[],avisoAnteriores:'Não foi possível carregar a lista de grades anteriores agora.'};return C},
 obterGrade:function(s){if(MODO==='erro')throw new Error('Não foi possível abrir a grade atual.');var g=G[s||''];if(g==='ERRO')throw new Error('Não foi possível abrir a grade de 2026 - 1º Semestre.');if(!g)throw new Error('Semestre inválido.');return JSON.parse(JSON.stringify(g))}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push([n,arg===undefined?null:arg]);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},60)}});return o}
window.google={script:{get run(){return runner()}}};})();`;

// html2canvas e jsPDF locais: registram as páginas e o nome do arquivo.
const LIBS = {
  html2canvas: 'window.html2canvas=function(el){window.__capturas=(window.__capturas||[]).concat([el.querySelectorAll(".postit").length]);var c=document.createElement("canvas");c.width=1800;c.height=1000;return Promise.resolve(c)};',
  jspdf: 'window.jspdf={jsPDF:function(){var p={pages:1,textos:[],internal:{pageSize:{getWidth:function(){return 842},getHeight:function(){return 595}}},addPage:function(){p.pages++},setFontSize:function(){},setFont:function(){},text:function(t){p.textos.push(t)},addImage:function(){},save:function(n){window.__pdf={nome:n,paginas:p.pages,textos:p.textos}}};return p}};'
};

function lum(c) { const m = c.match(/[\d.]+/g).map(Number); const a = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
async function abrir(p, modo) {
  await p.route('http://grade.teste/**', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html.replace('<head>', '<head><script>' + stub(modo) + '</script>') }));
  await p.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ contentType: 'application/javascript', body: /html2canvas/.test(r.request().url()) ? LIBS.html2canvas : LIBS.jspdf }));
  await p.route('https://datagrad.sistemas.ip.usp.br/**', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"><rect width="240" height="97" fill="#00509d"/></svg>' }));
  await p.goto('http://grade.teste/');
}
const esperarCarga = p => p.waitForFunction(() => document.getElementById('loadingOverlay').style.display === 'none' && document.querySelectorAll('.botaoSemestre').length > 0);

let ok = 0, falhas = 0;
const chk = (n, c, extra = '') => { if (c) { ok++; console.log('ok', n, extra); } else { falhas++; console.log('FALHA', n, extra); } };

(async () => {
  const b = await chromium.launch();

  for (const esquema of ['light', 'dark']) {
    const ctx = await b.newContext({ colorScheme: esquema, viewport: { width: 1366, height: 900 } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await abrir(p, 'ok'); await esperarCarga(p);
    const E = `[${esquema}]`;

    chk(`${E} tema Sistema resolvido`, await p.evaluate(s => document.documentElement.dataset.theme === s && document.documentElement.dataset.themePreference === 'system', esquema));
    chk(`${E} abre na grade atual`, await p.evaluate(() => window.__chamadas.some(c => c[0] === 'obterGrade' && c[1] === '')));
    const titulo = await p.textContent('#tituloGradeExibida');
    chk(`${E} faixa diz qual grade`, titulo.includes('2027 - 1º Semestre') && titulo.includes('Grade atual') && titulo.includes('13/10/2026 às 19:40'), titulo);
    const botoes = await p.$$eval('.botaoSemestre', e => e.map(x => x.textContent.trim()));
    chk(`${E} botões ímpares + 4º extra`, botoes.join('|') === '1º Semestre|3º Semestre|4º Semestre|5º Semestre|7º Semestre|9º Semestre', botoes.join('|'));
    const opcoes = await p.$$eval('#seletorGrade option', o => o.map(x => [x.value, x.textContent]));
    chk(`${E} seletor: atual primeiro e anteriores em ordem`, JSON.stringify(opcoes) === JSON.stringify([['', 'Grade atual (2027 - 1º Semestre)'], ['2026/2', '2026 - 2º Semestre'], ['2026/1', '2026 - 1º Semestre']]), JSON.stringify(opcoes));
    chk(`${E} rótulo "Consultar Grades Anteriores" no cabeçalho`, await p.evaluate(() => document.querySelector('#headerSistema .seletorGrade__rotulo').textContent === 'Consultar Grades Anteriores' && document.querySelector('label[for="seletorGrade"]') !== null));

    chk(`${E} 4 post-its no 1º (o fora da grade não)`, await p.$$eval('#grade > #camadaDisciplinas .postit', e => e.length) === 4);
    chk(`${E} aviso do horário fora da grade`, (await p.textContent('#avisoGrade')).includes('1 disciplina deste semestre começa fora dos horários'));
    chk(`${E} nome escapado (sem XSS)`, await p.evaluate(() => !window.__xss && !document.querySelector('.postit img') && [...document.querySelectorAll('.postitNome')].some(e => e.textContent.includes('<img'))));
    chk(`${E} cores por tipo`, JSON.stringify(await p.$$eval('#camadaDisciplinas .postit', e => e.map(x => x.style.background))) .includes('rgb(46, 125, 50)') && (await p.$$eval('#camadaDisciplinas .postit', e => e.map(x => x.style.background))).includes('rgb(25, 118, 210)') && (await p.$$eval('#camadaDisciplinas .postit', e => e.map(x => x.style.background))).includes('rgb(194, 24, 91)'));
    const desloc = await p.$$eval('#camadaDisciplinas .postit', e => e.map(x => [x.style.left, x.style.top]));
    chk(`${E} conflito em escada`, new Set(desloc.map(x => x.join())).size === desloc.length);

    // troca de semestre ideal: sem servidor
    const nChamadas = await p.evaluate(() => window.__chamadas.length);
    await p.click('.botaoSemestre:text-is("3º Semestre")');
    chk(`${E} trocar semestre filtra no navegador`, await p.evaluate(() => window.__chamadas.length) === nChamadas && await p.$$eval('#camadaDisciplinas .postit', e => e.length) === 1 && await p.evaluate(() => document.querySelector('.botaoSemestre.ativo').getAttribute('aria-pressed') === 'true'));
    chk(`${E} aviso some sem problema`, await p.$eval('#avisoGrade', e => e.hidden));
    await p.click('.botaoSemestre:text-is("5º Semestre")');
    chk(`${E} semestre vazio avisa`, (await p.textContent('#avisoGrade')).includes('Nenhuma disciplina com dia e horário definidos no 5º semestre'));
    await p.click('.botaoSemestre:text-is("1º Semestre")');

    // contraste
    const pares = await p.evaluate(() => {
      function fundo(el) { while (el) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; el = el.parentElement; } return 'rgb(255,255,255)'; }
      return ['.tituloSistema', '.subtituloSistema', '.seletorGrade__rotulo', '.seletorGrade__select', '.gradip-theme-control__select', '.botaoAjuda', '#tituloGradeExibida', '#tituloGradeExibida .detalheGrade', '.etiquetaGrade', '#legendaTipos', '.linkAjudaContextual', '#avisoGrade', '.botaoSemestre', '.botaoSemestre.ativo', '.cabecalho', '.hora', '#rodapeSistema']
        .map(s => { const e = document.querySelector(s); return [s, getComputedStyle(e).color, fundo(e)]; });
    });
    for (const [s, c, f] of pares) { const r = cr(c, f); chk(`${E} contraste ${s}`, r >= 4.5, r.toFixed(2)); }
    const brancoPost = await p.$$eval('#camadaDisciplinas .postit', e => e.map(x => [getComputedStyle(x).color, x.style.background]));
    for (const [c, f] of brancoPost) chk(`${E} contraste texto do post-it`, cr(c, f) >= 4.5, cr(c, f).toFixed(2));
    chk(`${E} marca certa no tema`, await p.evaluate(s => { const o = s === 'light' ? 'dark' : 'light'; return [...document.querySelectorAll('#headerSistema .gradip-logo-' + s)].every(e => getComputedStyle(e).display !== 'none') && [...document.querySelectorAll('#headerSistema .gradip-logo-' + o)].every(e => getComputedStyle(e).display === 'none'); }, esquema));
    await p.screenshot({ path: path.join(os.tmpdir(), `grade-desk-${esquema}.png`) });

    // ficha
    await p.click('#camadaDisciplinas .postit[aria-label^="PSA1001"]', { position: { x: 20, y: 8 } });
    chk(`${E} ficha abre com foco no ×`, await p.evaluate(() => document.getElementById('overlayPopup').style.display === 'flex' && document.activeElement.id === 'popupFechar'));
    const ficha = await p.evaluate(() => ({ cod: document.getElementById('popupCodigo').textContent, dep: document.getElementById('popupDepartamento').textContent, doc: document.getElementById('popupDocente').innerHTML, sala: document.getElementById('popupSala').textContent, tipo: document.getElementById('popupTipo').textContent, classe: document.getElementById('popupCabecalho').className }));
    chk(`${E} ficha preenchida`, ficha.cod === 'PSA1001' && /Aprendizagem/.test(ficha.dep) && ficha.doc === 'Docente Teste A<br>Docente Teste B' && ficha.sala === 'Sala 1' && ficha.tipo === 'Obrigatória' && /popup-obrigatoria/.test(ficha.classe), JSON.stringify(ficha));
    await p.screenshot({ path: path.join(os.tmpdir(), `grade-ficha-${esquema}.png`) });
    await p.keyboard.press('Tab');
    chk(`${E} Tab fica na ficha`, await p.evaluate(() => document.activeElement.id === 'popupFechar'));
    await p.keyboard.press('Escape');
    chk(`${E} Esc fecha e devolve o foco ao post-it`, await p.evaluate(() => document.getElementById('overlayPopup').style.display === 'none' && document.activeElement.classList.contains('postit')));
    await p.keyboard.press('Enter');
    chk(`${E} Enter no post-it abre a ficha`, await p.evaluate(() => document.getElementById('overlayPopup').style.display === 'flex'));
    await p.click('#popupFechar');
    chk(`${E} × fecha`, await p.evaluate(() => document.getElementById('overlayPopup').style.display === 'none'));
    await p.click('.postitNome:has-text("Estatística")');
    chk(`${E} sem docente/sala: "A definir" e outra unidade`, await p.evaluate(() => document.getElementById('popupDocente').textContent === 'A definir' && document.getElementById('popupSala').textContent === 'A definir' && /Estatística/.test(document.getElementById('popupDepartamento').textContent)));
    await p.mouse.click(5, 5);
    chk(`${E} clique fora fecha`, await p.evaluate(() => document.getElementById('overlayPopup').style.display === 'none'));

    // PDF
    await p.click('#btnExportar');
    await p.waitForFunction(() => window.__pdf, null, { timeout: 15000 });
    const pdf = await p.evaluate(() => window.__pdf);
    chk(`${E} PDF: uma página por semestre, nome com o semestre`, pdf.paginas === 6 && pdf.nome === 'Grade_Horaria_2027-1.pdf' && pdf.textos[0] === '1º Semestre — Grade Horária — 2027 - 1º Semestre', JSON.stringify(pdf));
    chk(`${E} PDF não mexe na grade da tela`, await p.$$eval('#grade > #camadaDisciplinas .postit', e => e.length) === 4);
    chk(`${E} capturas com os post-its de cada semestre`, JSON.stringify(await p.evaluate(() => window.__capturas)) === JSON.stringify([4, 1, 1, 0, 0, 0]), JSON.stringify(await p.evaluate(() => window.__capturas)));

    // grade anterior
    await p.click('.botaoSemestre:text-is("3º Semestre")');
    await p.selectOption('#seletorGrade', '2026/2'); await esperarCarga(p);
    const t2 = await p.textContent('#tituloGradeExibida');
    chk(`${E} grade anterior carregada`, t2.includes('2026 - 2º Semestre') && t2.includes('Grade anterior') && await p.evaluate(() => window.__chamadas.some(c => c[0] === 'obterGrade' && c[1] === '2026/2')), t2);
    chk(`${E} mantém o semestre do curso escolhido (3º)`, (await p.textContent('.botaoSemestre.ativo')).trim() === '3º Semestre' && (await p.textContent('#camadaDisciplinas')).includes('PSA3002'));
    chk(`${E} botões da grade anterior`, (await p.$$eval('.botaoSemestre', e => e.map(x => x.textContent.trim()))).join(',') === '2º Semestre,3º Semestre,4º Semestre,6º Semestre,8º Semestre,10º Semestre');
    await p.screenshot({ path: path.join(os.tmpdir(), `grade-anterior-${esquema}.png`) });
    await p.selectOption('#seletorGrade', '2026/1');
    await p.waitForFunction(() => !document.getElementById('avisoGrade').hidden && document.getElementById('loadingOverlay').style.display === 'none');
    chk(`${E} falha ao abrir anterior: erro e grade de antes na tela`, (await p.textContent('#avisoGrade')).includes('Não foi possível carregar a grade: Não foi possível abrir a grade de 2026 - 1º Semestre.') && await p.$eval('#seletorGrade', s => s.value) === '2026/2' && (await p.textContent('#tituloGradeExibida')).includes('2026 - 2º Semestre') && await p.$eval('#avisoGrade', e => e.getAttribute('role') === 'alert'));
    const avErro = await p.evaluate(() => { const e = document.getElementById('avisoGrade'); return [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]; });
    chk(`${E} contraste do aviso de erro`, cr(...avErro) >= 4.5, cr(...avErro).toFixed(2));
    await p.selectOption('#seletorGrade', ''); await esperarCarga(p);
    chk(`${E} volta para a grade atual`, (await p.textContent('#tituloGradeExibida')).includes('Grade atual'));

    // ajuda
    await p.click('text=Como ler a grade?'); await p.waitForTimeout(150);
    chk(`${E} ajuda contextual abre a seção`, await p.evaluate(() => !document.querySelector('[data-gradip-help-overlay]').hidden && document.activeElement.closest('section').id === 'ajuda-ler-grade'));
    await p.fill('#gradip-help-search', 'sala a definir'); await p.waitForTimeout(100);
    chk(`${E} busca da ajuda sem acento`, !(await p.textContent('[data-gradip-help-search-status]')).startsWith('0'));
    await p.fill('#gradip-help-search', ''); await p.dispatchEvent('#gradip-help-search', 'input');
    await p.click('[aria-controls="grade-faq-oficial"]');
    chk(`${E} FAQ abre com aria-expanded`, await p.evaluate(() => document.querySelector('[aria-controls="grade-faq-oficial"]').getAttribute('aria-expanded') === 'true' && !document.getElementById('grade-faq-oficial').hidden));
    await p.screenshot({ path: path.join(os.tmpdir(), `grade-ajuda-${esquema}.png`) });
    await p.keyboard.press('Escape');
    chk(`${E} Esc fecha a ajuda e devolve o foco`, await p.evaluate(() => document.querySelector('[data-gradip-help-overlay]').hidden && document.activeElement.textContent === 'Como ler a grade?'));
    await p.click('#headerSistema .botaoAjuda');
    chk(`${E} botão Ajuda abre no início`, await p.evaluate(() => !document.querySelector('[data-gradip-help-overlay]').hidden));
    await p.keyboard.press('Escape');
    const alvosInternos = await p.$$eval('.linkAjudaInterno', e => e.map(x => x.dataset.gradipHelpTarget));
    chk(`${E} links internos da ajuda apontam para seções existentes`, await p.evaluate(ids => ids.every(i => document.getElementById(i)), alvosInternos));

    chk(`${E} sem erros de JavaScript`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // ---------- tema: persistência e mudança com a página aberta ----------
  {
    const ctx = await b.newContext({ colorScheme: 'light' }); const p = await ctx.newPage();
    await abrir(p, 'ok'); await esperarCarga(p);
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(100);
    chk('Sistema acompanha a mudança com a página aberta', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
    await p.selectOption('[data-gradip-theme-select]', 'light');
    await p.reload(); await esperarCarga(p);
    chk('preferência Claro persiste (gradip-theme)', await p.evaluate(() => localStorage.getItem('gradip-theme') === 'light' && document.documentElement.dataset.theme === 'light' && document.querySelector('[data-gradip-theme-select]').value === 'light'));
    await ctx.close();
  }

  // ---------- erros e lista vazia ----------
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    await abrir(p, 'erro');
    await p.waitForFunction(() => !document.getElementById('avisoGrade').hidden);
    chk('falha da grade atual: mensagem clara, sem loading preso', (await p.textContent('#avisoGrade')).includes('Não foi possível abrir a grade atual.') && await p.evaluate(() => document.getElementById('loadingOverlay').style.display === 'none' && document.getElementById('btnExportar').disabled));
    await ctx.close();
    const ctx2 = await b.newContext(); const p2 = await ctx2.newPage();
    await abrir(p2, 'semAnteriores'); await esperarCarga(p2);
    chk('sem grades anteriores: seletor desativado com explicação', await p2.evaluate(() => { const s = document.getElementById('seletorGrade'); return s.disabled && /grades anteriores/.test(s.title); }));
    await ctx2.close();
  }

  // ---------- larguras ----------
  for (const largura of [360, 390, 480, 768, 1024, 1280]) {
    for (const esquema of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: largura, height: 800 }, colorScheme: esquema }); const p = await ctx.newPage();
      await abrir(p, 'ok'); await esperarCarga(p);
      const m = await p.evaluate(() => ({ pag: document.documentElement.scrollWidth, vw: innerWidth,
        pequenos: [...document.querySelectorAll('#headerSistema select, #headerSistema button, .botaoSemestre, #btnExportar, .linkAjudaContextual')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.className || e.id),
        quadroRola: document.getElementById('containerGrade').scrollWidth >= document.getElementById('containerGrade').clientWidth }));
      chk(`${largura}px ${esquema}: sem rolagem horizontal da página`, m.pag <= m.vw, `${m.pag}>${m.vw}`);
      chk(`${largura}px ${esquema}: alvos ≥ 44 px`, m.pequenos.length === 0, m.pequenos.join(','));
      if (esquema === 'light' || largura === 390) await p.screenshot({ path: path.join(os.tmpdir(), `grade-${largura}-${esquema}.png`), fullPage: false });
      await ctx.close();
    }
  }

  await b.close();
  console.log(`\n${ok} ok · ${falhas} falhas`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(3); });

// Testes de navegador do Painel dos servidores (Chromium real via Playwright).
// Simula google.script.run com dados sintéticos (nenhum dado real) e confere:
// tema (Sistema/Claro/Escuro, persistência, mudança do sistema com a página
// aberta), contraste WCAG, menu lateral x abas, teclado, card "Pessoas do
// IPUSP", Central de Ajuda, modais de Formulários, lista de Regras
// Curriculares e larguras de 360/390/480/768 px. Uso: node testar_navegador.js
const fs = require('fs');
const path = require('path');
function carregarPlaywright(){try{return require('playwright')}catch(e){return require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')}}
const {chromium} = carregarPlaywright();
const SRC = path.join(__dirname, '..', 'src') + '/';
const SAIDA = path.join(require('os').tmpdir(), 'painel-servidores-');

function build(){
  let h = fs.readFileSync(SRC + 'Painel.html', 'utf8');
  for (let k = 0; k < 4; k++) h = h.replace(/<\?!= include_\('(\w+)'\); \?>/g, (_, n) => fs.readFileSync(SRC + n + '.html', 'utf8'));
  if (/<\?/.test(h)) throw new Error('scriptlet sobrando');
  return h;
}
const html = build();

const FORMULARIOS = [
  {indicador:'Formulário de Teste Sazonal', tipo:'sazonal', sem1AberturaData:'2026-02-01', sem1AberturaHora:'08:00', sem1FechamentoData:'2026-02-20', sem1FechamentoHora:'18:00'},
  {indicador:'Formulário de Teste Contínuo', tipo:'continuo'},
  {indicador:'Pedido de Colação de Grau', tipo:'sazonal', semestreColacao:'2026/1'},
  {indicador:'Formulário de Exclusão de Disciplinas', tipo:'sazonal'}
];
const RULESETS = [
  {ruleset_id:'RS-TESTE-A-V1', curso_codigo:'99999', habilitacao_codigo:'1', habilitacao_nome:'Habilitação Fictícia A', versao:1, revisao:1, status:'ATIVO', estrutura_curricular:'Estrutura de teste'},
  {ruleset_id:'RS-TESTE-A-V2', curso_codigo:'99999', habilitacao_codigo:'1', habilitacao_nome:'Habilitação Fictícia A', versao:2, revisao:0, status:'RASCUNHO'},
  {ruleset_id:'RS-TESTE-B-V1', curso_codigo:'99999', habilitacao_codigo:'2', habilitacao_nome:'Habilitação Fictícia B', versao:1, revisao:0, status:'INATIVO'}
];
const stub = `(function(){window.__chamadas=[];window.__abertos=[];window.open=function(u){window.__abertos.push(u);return null};
var F=${JSON.stringify(FORMULARIOS)},R=${JSON.stringify(RULESETS)};
var API={
 obterContadoresPendencias:function(){return {diplomas:3,habilitacoes:1,trancamentoTotal:0,trancamentoParcial:2,busp:1,buspAguardando:4,intercambistasInclusao:1,intercambistasExclusao:0,exclusaoDisciplinas:5}},
 obterFormulariosConfig:function(){return JSON.parse(JSON.stringify(F))},
 salvarConfigFormulario:function(p){return {ok:true}},salvarConfigColacao:function(){return {ok:true}},salvarConfigExclusaoDisciplinas:function(){return {ok:true}},
 listarRulesetsCurriculares:function(){return JSON.parse(JSON.stringify(R))},
 obterDicionarioRegrasCurriculares:function(){return {}},
 obterRulesetCurricular:function(id){throw new Error('editor não simulado neste teste')}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push(n);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},30)}});return o}
window.google={script:{get run(){return runner()}}};})();`;

function lum(c){const m=c.match(/[\d.]+/g).map(Number);const a=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
function cr(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const BG = `function bg(el){while(el){const c=getComputedStyle(el).backgroundColor;if(c&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c))return c;el=el.parentElement}return getComputedStyle(document.body).backgroundColor}`;

async function load(p){
  await p.route('http://painel.teste/**', r => r.fulfill({contentType:'text/html; charset=utf-8', body: html.replace('<head>', '<head><script>'+stub+'</script>')}));
  await p.route('https://datagrad.sistemas.ip.usp.br/**', r => r.fulfill({contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"><rect width="240" height="97" fill="#00509d"/></svg>'}));
  await p.goto('http://painel.teste/');
  await p.waitForSelector('#badge-diplomas:not([style*="none"])');
}
let ok=0, fail=0;
const chk=(n,c,extra='')=>{if(c){ok++;console.log('ok',n,extra)}else{fail++;console.log('FALHA',n,extra)}};
async function contraste(p, scheme, seletores, rotulo=''){
  const pares = await p.evaluate(([sel,bgsrc])=>{const bg=eval('('+bgsrc+')');return sel.map(s=>{const e=document.querySelector(s);if(!e)return [s,null,null];return [s,getComputedStyle(e).color,bg(e)]})},[seletores,BG]);
  for (const [s,c,b] of pares){ if(!c){chk(`[${scheme}]${rotulo} existe ${s}`,false);continue} const r=cr(c,b); chk(`[${scheme}]${rotulo} contraste ${s}`, r>=4.5, r.toFixed(2)); }
}

(async()=>{
 const b = await chromium.launch();
 for (const scheme of ['light','dark']){
  const ctx = await b.newContext({colorScheme:scheme, viewport:{width:1280, height:900}});
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{if(m.type()==='error')errs.push(m.text())});
  await load(p);
  const T = `[${scheme}]`;
  chk(`${T} tema Sistema resolvido`, await p.evaluate(s=>document.documentElement.dataset.theme===s&&document.documentElement.dataset.themePreference==='system', scheme));
  chk(`${T} abre no menu lateral`, await p.evaluate(()=>document.getElementById('painelLayout').dataset.navegacao==='sidebar'&&document.querySelector('[data-painel-modo="sidebar"]').getAttribute('aria-pressed')==='true'));
  chk(`${T} Sistemas marcado como página atual`, await p.getAttribute('#navPainelSistemas','aria-current')==='page');
  chk(`${T} ícones injetados`, await p.$$eval('.painelNavIcone svg', e=>e.length)===7);
  chk(`${T} marca certa no cabeçalho`, await p.evaluate(s=>{const o=s==='light'?'dark':'light';return [...document.querySelectorAll('.gradip-logo-'+s)].every(e=>getComputedStyle(e).display!=='none')&&[...document.querySelectorAll('.gradip-logo-'+o)].every(e=>getComputedStyle(e).display==='none')}, scheme));

  // Pessoas do IPUSP
  const primeiro = await p.evaluate(()=>{const c=document.querySelector('#listaCategorias .cardSistema');return [c.closest('.grupoCategoria').querySelector('.tituloCategoria').textContent.trim(),c.textContent]});
  chk(`${T} Pessoas do IPUSP é o primeiro card`, primeiro[0].includes('Pessoas')&&primeiro[1].includes('Pessoas do IPUSP')&&!primeiro[1].includes('Busca de Alunos'), primeiro[0]);
  await p.click('#listaCategorias .cardSistema >> nth=0');
  chk(`${T} card abre o app de alunos`, (await p.evaluate(()=>window.__abertos[0]||'')).endsWith('/AKfycbzKbGAI31-yuWnBNcR6XYM99vXZiUvY0iO5zjvd1_G-_pgfISJo-IRPUpyzdhVCLqzn/exec'));
  await p.evaluate(()=>{const c=[...document.querySelectorAll('#listaCategorias .cardSistema')].find(c=>c.textContent.includes('Configurações de Grade Horária'));c.click()});
  chk(`${T} card Configurações de Grade Horária abre o link`, (await p.evaluate(()=>window.__abertos.pop()||'')).endsWith('/AKfycbwp1SjW2YQmnS0BYNgTJTlAZmxX_92b21j4y3_lHWrhuGOvTt_MT5u0gcJG6SgpF3O4xA/exec'));
  chk(`${T} card focável como link`, await p.evaluate(()=>{const c=document.querySelector('#listaCategorias .cardSistema');return c.tabIndex===0&&c.getAttribute('role')==='link'}));
  await p.focus('#listaCategorias .cardSistema >> nth=1'); await p.keyboard.press('Enter');
  chk(`${T} Enter abre card`, await p.evaluate(()=>window.__abertos.length===2));
  chk(`${T} contadores aparecem`, (await p.textContent('#badge-diplomas')).includes('3') && (await p.textContent('#badge-buspAguardando')).includes('4'));
  await p.fill('#caixaBusca','diplomas'); chk(`${T} aviso continua na busca`, await p.evaluate(()=>getComputedStyle(document.getElementById('badge-diplomas')).display!=='none'));
  await p.fill('#caixaBusca','pessoas'); chk(`${T} busca acha Pessoas`, await p.evaluate(()=>[...document.querySelectorAll('#listaCategorias .cardSistema')].filter(c=>c.offsetParent).length===1));
  await p.fill('#caixaBusca','');await p.dispatchEvent('#caixaBusca','input');
  chk(`${T} avisos voltam depois da busca`, await p.evaluate(()=>getComputedStyle(document.getElementById('badge-diplomas')).display!=='none'));

  await contraste(p, scheme, ['.tituloSistema','.subtituloSistema','.cardResumo h1','.cardResumo p','.caixaBusca','.linkAjudaContextual','.tituloCategoria','.infoSistema strong','.infoSistema div','#badge-diplomas','#badge-buspAguardando','.rodape','.botaoAjuda','.botaoConfiguracoes','.gradip-theme-control__select','.painelSidebar__titulo','#navPainelSistemas','#navPainelConfiguracoes','.painelModo[aria-pressed="true"]','.painelModo[aria-pressed="false"]','.painelNavegacaoModos__rotulo']);
  await p.screenshot({path:SAIDA+`desk-${scheme}.png`, fullPage:true});

  // Navegação pelo menu lateral
  await p.click('#navPainelConfiguracoes');
  chk(`${T} menu abre Configurações`, await p.evaluate(()=>document.getElementById('telaConfiguracoes').style.display==='block'&&document.getElementById('navPainelConfiguracoes').getAttribute('aria-current')==='page'));
  await p.click('#navPainelFormularios'); await p.waitForSelector('#listaFormulariosConfig .cardSistema');
  chk(`${T} menu abre Formulários`, await p.evaluate(()=>document.getElementById('configFormularios').style.display==='block'&&document.getElementById('navPainelFormularios').getAttribute('aria-current')==='page'));
  chk(`${T} cards de formulário focáveis`, await p.$$eval('#listaFormulariosConfig .cardSistema[role="button"][tabindex="0"]', e=>e.length)===4);
  await contraste(p, scheme, ['#listaFormulariosConfig .infoSistema strong','.badgeTipoFormulario.sazonal','.badgeTipoFormulario.continuo'], ' formulários');
  // modal genérico
  await p.click('#listaFormulariosConfig .cardSistema >> nth=0');
  chk(`${T} modal de formulário abre com dados`, await p.evaluate(()=>document.getElementById('modalConfigFormulario').style.display==='flex'&&document.getElementById('sem1AberturaData').value==='2026-02-01'));
  await contraste(p, scheme, ['#tituloModalConfig','#sem1AberturaData'], ' modal');
  await p.screenshot({path:SAIDA+`modal-${scheme}.png`});
  await p.click('#modalConfigFormulario .ajudaModalConfig button, #modalConfigFormulario [data-gradip-help-open]');
  chk(`${T} ajuda do modal abre por cima`, await p.evaluate(()=>{const o=document.querySelector('[data-gradip-help-overlay]');return !o.hidden&&document.activeElement.closest('section').id==='ajuda-formularios'}));
  await p.keyboard.press('Escape');
  chk(`${T} ESC fecha só a ajuda`, await p.evaluate(()=>document.querySelector('[data-gradip-help-overlay]').hidden&&document.getElementById('modalConfigFormulario').style.display==='flex'));
  await p.evaluate(()=>fecharModalConfigFormulario());
  // modais especiais
  await p.click('#listaFormulariosConfig .cardSistema >> nth=2');
  chk(`${T} modal de colação`, await p.evaluate(()=>document.getElementById('modalConfigColacao').style.display==='flex'&&document.getElementById('colacaoSemestre').value==='2026/1'));
  await contraste(p, scheme, ['#colacaoSemestre'], ' colação');
  await p.evaluate(()=>fecharModalColacao());
  await p.click('#listaFormulariosConfig .cardSistema >> nth=3');
  chk(`${T} modal de exclusão`, await p.evaluate(()=>document.getElementById('modalConfigExclusao').style.display==='flex'));
  await p.evaluate(()=>fecharModalExclusaoDisciplinas());

  await p.click('#navPainelRegras'); await p.waitForSelector('#listaRulesetsCurriculares .cardSistema');
  chk(`${T} menu abre Regras Curriculares`, await p.evaluate(()=>document.getElementById('configRegrasCurriculares').style.display==='block'&&document.getElementById('navPainelRegras').getAttribute('aria-current')==='page'));
  await contraste(p, scheme, ['.cabecalhoGrupoCurso','.subCabecalhoHabilitacao','.badgeStatusRuleset.ativo','.badgeStatusRuleset.rascunho','.badgeStatusRuleset.inativo','.badgeRevisaoRuleset'], ' regras');
  await p.screenshot({path:SAIDA+`regras-${scheme}.png`, fullPage:true});
  // botão Voltar continua sincronizando o menu
  await p.evaluate(()=>fecharTelaConfiguracoes());
  chk(`${T} Voltar sincroniza o menu`, await p.getAttribute('#navPainelSistemas','aria-current')==='page');

  // Abas
  await p.click('[data-painel-modo="abas"]');
  chk(`${T} modo abas: ARIA`, await p.evaluate(()=>{const m=document.getElementById('painelMenu');const t=[...m.querySelectorAll('[role="tab"]')];return m.getAttribute('role')==='tablist'&&t.length===4&&document.getElementById('navPainelSistemas').getAttribute('aria-selected')==='true'&&document.getElementById('conteudo').getAttribute('role')==='tabpanel'&&document.getElementById('conteudo').getAttribute('aria-labelledby')==='navPainelSistemas'}));
  chk(`${T} modo abas anunciado`, (await p.textContent('#painelModoStatus')).includes('abas'));
  await p.focus('#navPainelSistemas'); await p.keyboard.press('ArrowRight');
  chk(`${T} seta move foco`, await p.evaluate(()=>document.activeElement.id==='navPainelConfiguracoes'));
  await p.keyboard.press('End'); chk(`${T} End vai à última aba`, await p.evaluate(()=>document.activeElement.id==='navPainelRegras'));
  await p.keyboard.press('Enter'); await p.waitForSelector('#listaRulesetsCurriculares .cardSistema');
  chk(`${T} Enter abre a aba`, await p.getAttribute('#navPainelRegras','aria-selected')==='true');
  chk(`${T} abas: sidebar não ocupa coluna`, await p.evaluate(()=>getComputedStyle(document.getElementById('painelLayout')).display!=='grid'));
  await contraste(p, scheme, ['#navPainelRegras','#navPainelSistemas'], ' abas');
  await p.screenshot({path:SAIDA+`abas-${scheme}.png`});
  await p.click('[data-painel-modo="sidebar"]');
  chk(`${T} volta ao menu lateral`, await p.evaluate(()=>!document.getElementById('painelMenu').hasAttribute('role')&&document.getElementById('navPainelRegras').getAttribute('aria-current')==='page'));

  // Central de Ajuda
  await p.click('#navPainelSistemas');
  await p.click('.linkAjudaContextual[data-gradip-help-open="ajuda-pendencias"]');
  chk(`${T} ajuda contextual abre seção`, await p.evaluate(()=>!document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.closest('section').id==='ajuda-pendencias'));
  chk(`${T} scroll lock`, await p.evaluate(()=>document.body.style.overflow==='hidden'));
  await contraste(p, scheme, ['.gradip-help-title, [data-gradip-help-dialog] h2','#ajuda-pendencias h3','#ajuda-pendencias p','.painelAjudaTabela th','.painelAjudaTabela td','.painelAjudaAtalhos .painelAjudaLink','#ajuda-pendencias .painelAjudaLink','.painelAjudaBotao'], ' ajuda');
  await p.fill('#gradip-help-search','trancamento'); await p.waitForTimeout(100);
  chk(`${T} busca da ajuda`, !(await p.textContent('[data-gradip-help-search-status]')).startsWith('0'), await p.textContent('[data-gradip-help-search-status]'));
  await p.fill('#gradip-help-search','colacao'); await p.waitForTimeout(100);
  chk(`${T} busca sem acento`, !(await p.textContent('[data-gradip-help-search-status]')).startsWith('0'), await p.textContent('[data-gradip-help-search-status]'));
  await p.fill('#gradip-help-search','xyzxyz'); await p.waitForTimeout(100);
  chk(`${T} busca sem resultado`, await p.evaluate(()=>!document.querySelector('[data-gradip-help-no-results]').hidden));
  await p.fill('#gradip-help-search',''); await p.dispatchEvent('#gradip-help-search','input');
  const faq = await p.$eval('[data-gradip-help-faq-toggle]', e=>e.getAttribute('aria-controls'));
  await p.click(`[aria-controls="${faq}"]`);
  chk(`${T} FAQ aria-expanded`, await p.evaluate(id=>document.querySelector(`[aria-controls="${id}"]`).getAttribute('aria-expanded')==='true'&&!document.getElementById(id).hidden, faq));
  await p.click('.painelAjudaAtalhos [data-gradip-help-target="ajuda-regras"]'); await p.waitForTimeout(100);
  chk(`${T} atalho interno`, await p.evaluate(()=>document.activeElement.closest('section').id==='ajuda-regras'));
  await p.screenshot({path:SAIDA+`ajuda-${scheme}.png`});
  await p.click('#ajuda-regras .painelAjudaBotao[data-painel-abrir-manual-regras="ordem-preenchimento"]'); await p.waitForTimeout(200);
  chk(`${T} botão abre o manual das Regras`, await p.evaluate(()=>document.querySelector('[data-gradip-help-overlay]').hidden&&[...document.querySelectorAll('.telaAjudaOverlay')].some(e=>getComputedStyle(e).display!=='none')));
  await p.evaluate(()=>RegrasCurricularesAjuda.fechar()); // o manual existente fecha pelo botão próprio
  await p.click('.botaoAjuda'); await p.keyboard.press('Escape');
  chk(`${T} ESC fecha e devolve foco`, await p.evaluate(()=>document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.classList.contains('botaoAjuda')&&document.body.style.overflow===''));

  chk(`${T} sem erros de JS`, errs.length===0, errs.join(' | '));
  await ctx.close();
 }

 // Preferência manual, persistência e mudança do sistema com a página aberta
 {
  const ctx = await b.newContext({colorScheme:'light', viewport:{width:1280,height:900}}); const p = await ctx.newPage(); await load(p);
  await p.selectOption('.gradip-theme-control__select','dark');
  chk('preferência Escuro aplicada', await p.evaluate(()=>document.documentElement.dataset.theme==='dark'&&localStorage.getItem('gradip-theme')==='dark'));
  await p.reload(); await p.waitForSelector('#badge-diplomas');
  chk('Escuro persiste após recarregar', await p.evaluate(()=>document.documentElement.dataset.theme==='dark'&&document.querySelector('.gradip-theme-control__select').value==='dark'));
  chk('modo de navegação não persiste (volta ao menu lateral)', await p.evaluate(()=>document.getElementById('painelLayout').dataset.navegacao==='sidebar'));
  await p.emulateMedia({colorScheme:'light'});
  chk('preferência manual ignora o sistema', await p.evaluate(()=>document.documentElement.dataset.theme==='dark'));
  await p.selectOption('.gradip-theme-control__select','system');
  chk('Sistema segue o claro', await p.evaluate(()=>document.documentElement.dataset.theme==='light'&&document.documentElement.dataset.themePreference==='system'));
  await p.emulateMedia({colorScheme:'dark'}); await p.waitForTimeout(100);
  chk('Sistema acompanha mudança com a página aberta', await p.evaluate(()=>document.documentElement.dataset.theme==='dark'));
  await p.selectOption('.gradip-theme-control__select','light');
  chk('preferência Claro aplicada em sistema escuro', await p.evaluate(()=>document.documentElement.dataset.theme==='light'&&localStorage.getItem('gradip-theme')==='light'));
  await ctx.close();
 }

 // Larguras
 for (const w of [360,390,480,768,1024]){
  for (const scheme of ['light','dark']){
   const ctx = await b.newContext({colorScheme:scheme, viewport:{width:w,height:800}, hasTouch:w<1024}); const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   await load(p);
   const T=`[${w}px ${scheme}]`;
   const overflow = async()=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   chk(`${T} sem rolagem horizontal`, (await overflow())<=0, await overflow());
   if (w<=900){
    chk(`${T} menu começa recolhido`, await p.evaluate(()=>document.getElementById('painelSidebar').dataset.recolhido==='true'&&getComputedStyle(document.getElementById('painelMenu')).display==='none'&&document.getElementById('painelMenuMovel').getAttribute('aria-expanded')==='false'));
    await p.click('#painelMenuMovel');
    chk(`${T} Mostrar menu expande`, await p.evaluate(()=>getComputedStyle(document.getElementById('painelMenu')).display!=='none'));
    await p.click('#navPainelFormularios'); await p.waitForSelector('#listaFormulariosConfig .cardSistema');
    chk(`${T} escolher área recolhe o menu`, await p.evaluate(()=>document.getElementById('painelSidebar').dataset.recolhido==='true'));
    chk(`${T} Formulários sem rolagem horizontal`, (await overflow())<=0, await overflow());
    await p.click('#navPainelSistemas >> visible=true').catch(async()=>{await p.click('#painelMenuMovel');await p.click('#navPainelSistemas')});
   }
   const pequenos = await p.evaluate(()=>{const sel='.botaoAjuda,.botaoConfiguracoes,.gradip-theme-control__select,.painelModo,.painelMenuMovel,.painelNavItem,.linkAjudaContextual';return [...document.querySelectorAll(sel)].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [e.className+' '+(e.id||''),Math.round(r.width),Math.round(r.height)]}).filter(([,wd,h])=>h<43.5||wd<43.5)});
   chk(`${T} alvos ≥44 px`, pequenos.length===0, JSON.stringify(pequenos));
   await p.screenshot({path:SAIDA+`${w}-${scheme}.png`, fullPage:true});
   await p.click('[data-painel-modo="abas"]');
   chk(`${T} abas sem rolagem horizontal da página`, (await overflow())<=0, await overflow());
   await p.click('.botaoAjuda');
   chk(`${T} ajuda sem rolagem horizontal`, await p.evaluate(()=>{const d=document.querySelector('[data-gradip-help-dialog]');const m=d.querySelector('.gradip-help-main');return d.getBoundingClientRect().right<=window.innerWidth+0.5&&m.scrollWidth<=m.clientWidth+1}));
   await p.screenshot({path:SAIDA+`${w}-${scheme}-ajuda.png`});
   chk(`${T} sem erros de JS`, errs.length===0, errs.join(' | '));
   await ctx.close();
  }
 }

 // Movimento reduzido
 {
  const ctx = await b.newContext({reducedMotion:'reduce', viewport:{width:1280,height:900}}); const p = await ctx.newPage(); await load(p);
  chk('movimento reduzido desliga transição do menu', await p.evaluate(()=>getComputedStyle(document.getElementById('navPainelSistemas')).transitionDuration.split(',').every(t=>parseFloat(t)<=0.01))); // GradipTema reduz a 0.01ms
  await ctx.close();
 }

 await b.close();
 console.log(`\n${ok} ok, ${fail} falha(s). Capturas em ${SAIDA}*.png`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2)});

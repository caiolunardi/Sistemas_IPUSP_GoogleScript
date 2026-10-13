// Testes de navegador da Busca de Alunos (Chromium real via Playwright).
// Simula google.script.run com 121 alunos sintéticos (nenhum dado real)
// e confere busca, tema (Sistema/Claro/Escuro, persistência, mudança do
// sistema com a página aberta), contraste WCAG, Central de Ajuda e
// larguras de 360/390/480/768 px. Uso: node testar_navegador.js
const fs=require('fs');
function carregarPlaywright(){try{return require('playwright')}catch(e){return require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')}}
const {chromium}=carregarPlaywright();
const SRC=require('path').join(__dirname,'..','src')+'/';
function build(){let h=fs.readFileSync(SRC+'BuscaAlunosApp.html','utf8');
 for(let k=0;k<3;k++)h=h.replace(/<\?!= include_\('(\w+)'\) \?>/g,(_,n)=>fs.readFileSync(SRC+n+'.html','utf8'));
 if(/<\?/.test(h))throw new Error('scriptlet sobrando');return h;}
const html=build();
const nomes=['Ana Paula da Silva','Cláudia Fernandes','João Teste','Luís Exemplo','Maria Ficticia'];
const alunos=[];for(let i=0;i<120;i++)alunos.push({numeroUsp:String(9000000+i),nome:nomes[i%5]+' '+i,email:'aluno'+i+'@exemplo.invalid',emailSecundario:i%3?'':'sec'+i+'@exemplo.invalid'});
alunos.push({numeroUsp:'',nome:'',email:'',emailSecundario:''});
const stub=(modo)=>`window.google={script:{run:(function(){var s,f;var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o},listarAlunosParaBusca:function(){setTimeout(function(){${modo==='erro'?"f(new Error('Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID.'))":"s("+JSON.stringify(alunos)+")"}},50)}};return o})()}};`;
function lum(c){const m=c.match(/[\d.]+/g).map(Number);const a=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
function cr(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
async function load(p,modo){await p.route('http://busca.teste/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html.replace('<head>','<head><script>'+stub(modo)+'</script>')}));await p.route('https://datagrad.sistemas.ip.usp.br/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"><rect width="240" height="97" fill="#00509d"/></svg>'}));await p.goto('http://busca.teste/');}
let ok=0,fail=0;const chk=(n,c,extra='')=>{if(c){ok++;console.log('ok',n,extra)}else{fail++;console.log('FALHA',n,extra)}};
(async()=>{const b=await chromium.launch();
 for(const scheme of ['light','dark']){
  const ctx=await b.newContext({colorScheme:scheme,viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await load(p,'ok');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  chk(`[${scheme}] tema Sistema resolvido`,await p.evaluate(s=>document.documentElement.dataset.theme===s&&document.documentElement.dataset.themePreference==='system',scheme));
  chk(`[${scheme}] info carregados`,(await p.textContent('#infoBusca')).includes('121 alunos carregados'));
  await p.fill('#campoBusca','silva ana');await p.waitForTimeout(300);
  const n=await p.$$eval('.cardAluno',e=>e.length);chk(`[${scheme}] busca nome em qualquer ordem`,n===24,n);
  chk(`[${scheme}] destaque mark`,await p.$$eval('.cardAluno mark',e=>e.length)>0);
  await p.fill('#campoBusca','claudia');await p.waitForTimeout(300);chk(`[${scheme}] sem acento`,await p.$$eval('.cardAluno',e=>e.length)===24);
  await p.fill('#campoBusca','9000');await p.waitForTimeout(300);chk(`[${scheme}] limite 60`,(await p.textContent('#listaResultados')).includes('Mostrando os primeiros 60 de 120'));
  await p.fill('#campoBusca','sec3@');await p.waitForTimeout(300);chk(`[${scheme}] e-mail secundário`,(await p.textContent('#listaResultados')).includes('(secundário)'));
  await p.fill('#campoBusca','zzzz');await p.waitForTimeout(300);chk(`[${scheme}] vazio`,(await p.textContent('#listaResultados')).includes('Nenhum aluno encontrado'));
  // contraste
  await p.fill('#campoBusca','silva');await p.waitForTimeout(300);
  const pares=await p.evaluate(()=>{function bg(el){while(el){const c=getComputedStyle(el).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;el=el.parentElement}return 'rgb(255,255,255)'}
    const sel=['.cabecalho h1','.cabecalho p','.rotuloBusca','#infoBusca','.linkAjudaContextual','.nomeAluno','.detalheAluno','.badgeUsp','.rodape','.botaoAjuda','.cardAluno mark','.gradip-theme-control__select'];
    return sel.map(s=>{const e=document.querySelector(s);return [s,getComputedStyle(e).color,bg(e)]})});
  for(const [s,c,bgc] of pares){const r=cr(c,bgc);chk(`[${scheme}] contraste ${s}`,r>=4.5,r.toFixed(2))}
  const borda=await p.evaluate(()=>{const e=document.getElementById('campoBusca');return [getComputedStyle(e).borderTopColor,getComputedStyle(e).backgroundColor,getComputedStyle(e.closest('.cardBusca')).backgroundColor]});
  chk(`[${scheme}] borda do campo >=3:1`,cr(borda[0],borda[1])>=3&&cr(borda[0],borda[2])>=3,cr(borda[0],borda[1]).toFixed(2));
  chk(`[${scheme}] marca visível certa`,await p.evaluate(s=>{const v=[...document.querySelectorAll('.cabecalho .gradip-logo-'+s)].every(e=>getComputedStyle(e).display!=='none');const o=s==='light'?'dark':'light';return v&&[...document.querySelectorAll('.cabecalho .gradip-logo-'+o)].every(e=>getComputedStyle(e).display==='none')},scheme));
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`desk-${scheme}.png`});
  // ajuda
  await p.click('text=Não encontrou o aluno?');await p.waitForTimeout(200);
  chk(`[${scheme}] ajuda contextual abre seção`,await p.evaluate(()=>!document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.closest('section').id==='ajuda-nao-encontrei'));
  chk(`[${scheme}] scroll lock`,await p.evaluate(()=>document.body.style.overflow==='hidden'));
  await p.fill('#gradip-help-search','acentuacao');await p.waitForTimeout(100);chk(`[${scheme}] busca da ajuda por data-search`,(await p.textContent('[data-gradip-help-search-status]')).includes('1 resultado'));
  await p.fill('#gradip-help-search','GRAFIA');await p.waitForTimeout(100);chk(`[${scheme}] busca da ajuda texto visível`,!(await p.textContent('[data-gradip-help-search-status]')).startsWith('0'));
  await p.fill('#gradip-help-search','');await p.dispatchEvent('#gradip-help-search','input');
  await p.click('[aria-controls="busca-faq-limite"]');chk(`[${scheme}] FAQ aria-expanded`,await p.evaluate(()=>document.querySelector('[aria-controls="busca-faq-limite"]').getAttribute('aria-expanded')==='true'&&!document.getElementById('busca-faq-limite').hidden));
  const faqC=await p.evaluate(()=>{const e=document.querySelector('#busca-faq-limite p');return [getComputedStyle(e).color,getComputedStyle(e.closest('.gradip-help-faq')).backgroundColor]});chk(`[${scheme}] contraste FAQ`,cr(...faqC)>=4.5,cr(...faqC).toFixed(2));
  await p.click('.linkAjudaInterno');await p.waitForTimeout(100);chk(`[${scheme}] link interno`,await p.evaluate(()=>document.activeElement.closest('section').id==='ajuda-faq'));
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`ajuda-${scheme}.png`});
  await p.keyboard.press('Escape');chk(`[${scheme}] ESC fecha e devolve foco`,await p.evaluate(()=>document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.textContent==='Não encontrou o aluno?'&&document.body.style.overflow===''));
  // troca manual e persistência
  const outro=scheme==='light'?'dark':'light';await p.selectOption('[data-gradip-theme-select]',outro);
  chk(`[${scheme}] troca manual`,await p.evaluate(o=>document.documentElement.dataset.theme===o&&localStorage.getItem('gradip-theme')===o,outro));
  await load(p,'ok');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  chk(`[${scheme}] persistência após recarregar`,await p.evaluate(o=>document.documentElement.dataset.theme===o&&document.querySelector('[data-gradip-theme-select]').value===o,outro));
  await p.selectOption('[data-gradip-theme-select]','system');await p.emulateMedia({colorScheme:outro});await p.waitForTimeout(300);
  const est=await p.evaluate(()=>[document.documentElement.dataset.theme,document.documentElement.dataset.themePreference,localStorage.getItem('gradip-theme'),matchMedia('(prefers-color-scheme: dark)').matches]);chk(`[${scheme}] Sistema acompanha mudança com página aberta`,est[0]===outro&&est[1]==='system'&&est[2]===null,JSON.stringify(est));
  chk(`[${scheme}] sem erros JS`,errs.length===0,errs.join('|'));
  await ctx.close();}
 // erro
 {const ctx=await b.newContext({colorScheme:'dark'});const p=await ctx.newPage();await load(p,'erro');await p.waitForSelector('.vazio.erro');
  const t=await p.textContent('.vazio.erro');chk('estado de erro',t.startsWith('Não consegui carregar a lista de alunos'),t);
  const c=await p.evaluate(()=>{const e=document.querySelector('.vazio.erro');return [getComputedStyle(e).color,getComputedStyle(e).backgroundColor]});chk('contraste erro dark',cr(...c)>=4.5,cr(...c).toFixed(2));await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-erro-dark.png')});await ctx.close();}
 // mobile
 for(const w of [360,390,480,768]){for(const scheme of ['light','dark']){const ctx=await b.newContext({colorScheme:scheme,viewport:{width:w,height:800}});const p=await ctx.newPage();await load(p,'ok');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  await p.fill('#campoBusca','sec');await p.waitForTimeout(300);
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] sem overflow horizontal`,ov<=0,ov);
  const alvo=await p.evaluate(()=>['.botaoAjuda','.gradip-theme-control__select','#campoBusca'].map(s=>document.querySelector(s).getBoundingClientRect().height));chk(`[${w} ${scheme}] alvos >=44px`,alvo.every(h=>h>=44),alvo.join(','));
  await p.click('.botaoAjuda');await p.waitForTimeout(150);const ov2=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] ajuda sem overflow`,ov2<=0);
  if(w===390){await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-ajuda-${scheme}.png`});await p.keyboard.press('Escape');await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-${scheme}.png`,fullPage:false});}
  await ctx.close();}}
 await b.close();console.log(`${ok}/${ok+fail}`);process.exit(fail?1:0);})();

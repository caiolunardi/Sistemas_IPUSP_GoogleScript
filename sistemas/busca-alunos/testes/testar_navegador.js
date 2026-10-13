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
const alunos=[];for(let i=0;i<120;i++)alunos.push({linha:i+2,numeroUsp:String(9000000+i),nome:nomes[i%5]+' '+i,ingresso:(2021+i%4)+'/'+(1+(i>>2)%2),email:'aluno'+i+'@exemplo.invalid',emailSecundario:i%3?'':'sec'+i+'@exemplo.invalid'});
alunos.push({linha:122,numeroUsp:'',nome:'',ingresso:'',email:'',emailSecundario:''});
alunos.push({linha:123,numeroUsp:'9999999',nome:'Zeca Sem Ingresso',ingresso:'a definir',email:'zeca@exemplo.invalid',emailSecundario:''});
// Backend simulado no navegador. modo: 'ok' (editor), 'leitor' (sem permissão de editar) ou 'erro'.
const stub=(modo)=>`(function(){var DADOS=${JSON.stringify(alunos)};var MODO=${JSON.stringify(modo)};window.__chamadas=[];
function ficha(a){return {linha:a.linha,podeEditar:MODO==='ok',campos:[{titulo:'Número USP',valor:a.numeroUsp,editavel:true},{titulo:'Nome do Aluno',valor:a.nome,editavel:true},{titulo:'Ingresso',valor:a.ingresso,editavel:true},{titulo:'eMail',valor:a.email,editavel:true},{titulo:'ID da Pasta',valor:'pasta-'+a.linha,editavel:false},{titulo:'eMail Secundario',valor:a.emailSecundario,editavel:true}]}}
var API={listarAlunosParaBusca:function(){if(MODO==='erro')throw new Error('Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID.');return DADOS.map(function(a){return Object.assign({},a)})},
 obterFichaAluno:function(r){var a=DADOS.find(function(x){return x.linha===r.linha});if(!a||a.numeroUsp!==r.numeroUsp)throw new Error('A planilha de alunos mudou');return ficha(a)},
 salvarFichaAluno:function(p){var a=DADOS.find(function(x){return x.linha===p.linha});var M={'Número USP':'numeroUsp','Nome do Aluno':'nome','Ingresso':'ingresso','eMail':'email','eMail Secundario':'emailSecundario'};
  Object.keys(p.novos).forEach(function(k){if(k==='Ingresso'&&!/^\\d{4}\\/[12]$/.test(p.novos[k]))throw new Error('O ingresso deve estar no formato AAAA/S, por exemplo 2024/1 ou 2024/2.');a[M[k]]=p.novos[k]});var f=ficha(a);f.alterados=Object.keys(p.novos).length;f.resumo=Object.assign({},a);return f},
 gerarPdfListaAlunos:function(p){return {nome:p.nomeArquivo+'.pdf',base64:btoa('%PDF-1.4 '+p.linhas.length)}}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push([n,JSON.parse(JSON.stringify(arg===undefined?null:arg))]);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},40)}});return o}
window.google={script:{get run(){return runner()}}};})();`;
function lum(c){const m=c.match(/[\d.]+/g).map(Number);const a=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
function cr(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
async function load(p,modo){await p.route('http://busca.teste/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html.replace('<head>','<head><script>'+stub(modo)+'</script>')}));await p.route('https://datagrad.sistemas.ip.usp.br/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"><rect width="240" height="97" fill="#00509d"/></svg>'}));await p.goto('http://busca.teste/');}
let ok=0,fail=0;const chk=(n,c,extra='')=>{if(c){ok++;console.log('ok',n,extra)}else{fail++;console.log('FALHA',n,extra)}};
(async()=>{const b=await chromium.launch();
 for(const scheme of ['light','dark']){
  const ctx=await b.newContext({colorScheme:scheme,viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await load(p,'ok');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  chk(`[${scheme}] tema Sistema resolvido`,await p.evaluate(s=>document.documentElement.dataset.theme===s&&document.documentElement.dataset.themePreference==='system',scheme));
  chk(`[${scheme}] info carregados`,(await p.textContent('#infoBusca')).includes('122 alunos carregados'));
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
  await p.click('.linkAjudaInterno[data-gradip-help-target="ajuda-faq"]');await p.waitForTimeout(100);chk(`[${scheme}] link interno`,await p.evaluate(()=>document.activeElement.closest('section').id==='ajuda-faq'));
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`ajuda-${scheme}.png`});
  await p.keyboard.press('Escape');chk(`[${scheme}] ESC fecha e devolve foco`,await p.evaluate(()=>document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.textContent==='Não encontrou o aluno?'&&document.body.style.overflow===''));

  // ---------- v1.1: filtro por ingresso ----------
  await p.fill('#campoBusca','');await p.dispatchEvent('#campoBusca','input');await p.waitForTimeout(200);
  const opcoes=await p.$$eval('#filtroAno option',o=>o.map(x=>[x.value,x.textContent]));
  chk(`[${scheme}] combobox com os anos da coluna Ingresso`,JSON.stringify(opcoes)===JSON.stringify([['','Todos os anos'],['2024','2024 (30)'],['2023','2023 (30)'],['2022','2022 (30)'],['2021','2021 (30)']]),JSON.stringify(opcoes));
  chk(`[${scheme}] semestre desabilitado sem ano`,await p.$eval('#filtroSemestre',e=>e.disabled));
  chk(`[${scheme}] exportação desabilitada sem resultado`,await p.$eval('#botaoCsv',e=>e.disabled)&&await p.$eval('#botaoPdf',e=>e.disabled));
  await p.selectOption('#filtroAno','2022');await p.waitForTimeout(150);
  chk(`[${scheme}] ano sozinho lista a turma`,(await p.textContent('#infoBusca')).startsWith('30 resultados encontrados · ingresso 2022'),await p.textContent('#infoBusca'));
  const nomesAno=await p.$$eval('.cardAluno .nomeAluno',e=>e.map(x=>x.firstChild.textContent));
  chk(`[${scheme}] turma em ordem alfabética`,nomesAno.join('|')===[...nomesAno].sort((a,b)=>a.localeCompare(b,'pt-BR')).join('|'));
  chk(`[${scheme}] card mostra ingresso`,(await p.textContent('.cardAluno')).includes('ingresso 2022/'));
  await p.selectOption('#filtroSemestre','2');await p.waitForTimeout(150);
  chk(`[${scheme}] filtro de semestre`,(await p.textContent('#infoBusca')).startsWith('15 resultados encontrados · ingresso 2022 (2º semestre)'),await p.textContent('#infoBusca'));
  await p.fill('#campoBusca','ana');await p.waitForTimeout(300);
  const comb=await p.$$eval('.cardAluno',e=>e.map(x=>x.textContent));
  chk(`[${scheme}] filtro combinado com texto`,comb.length>0&&comb.every(x=>/Ana/.test(x)&&/2022\/2/.test(x)),comb.length);
  // CSV
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#botaoCsv')]);
  const csv=fs.readFileSync(await dl.path(),'utf8');
  chk(`[${scheme}] CSV: nome do arquivo`,dl.suggestedFilename()==='alunos_ingresso-2022-2_busca.csv',dl.suggestedFilename());
  chk(`[${scheme}] CSV: BOM, cabeçalho e linhas`,csv.charCodeAt(0)===0xfeff&&csv.slice(1).startsWith('Nome do Aluno;Número USP;Ingresso;eMail;eMail Secundario\r\n')&&csv.trim().split('\r\n').length===comb.length+1);
  await p.fill('#campoBusca','');await p.dispatchEvent('#campoBusca','input');await p.selectOption('#filtroSemestre','');await p.selectOption('#filtroAno','2024');await p.waitForTimeout(200);
  const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#botaoCsv')]);
  const csv2=fs.readFileSync(await dl2.path(),'utf8');
  chk(`[${scheme}] CSV exporta a turma inteira`,csv2.trim().split('\r\n').length===31&&dl2.suggestedFilename()==='alunos_ingresso-2024.csv');
  // PDF
  const [dl3]=await Promise.all([p.waitForEvent('download'),p.click('#botaoPdf')]);
  const pdf=fs.readFileSync(await dl3.path(),'latin1');
  const chamadaPdf=await p.evaluate(()=>window.__chamadas.filter(c=>c[0]==='gerarPdfListaAlunos').pop()[1]);
  chk(`[${scheme}] PDF baixado com toda a turma`,pdf.startsWith('%PDF')&&chamadaPdf.linhas.length===30&&chamadaPdf.titulo==='Alunos — ingresso 2024'&&dl3.suggestedFilename()==='alunos_ingresso-2024.pdf');
  chk(`[${scheme}] PDF envia só as 5 colunas`,Object.keys(chamadaPdf.linhas[0]).sort().join()==='email,emailSecundario,ingresso,nome,numeroUsp');
  await p.selectOption('#filtroAno','');await p.waitForTimeout(100);
  chk(`[${scheme}] "Todos os anos" volta ao estado inicial`,(await p.$$eval('.cardAluno',e=>e.length))===0&&await p.$eval('#filtroSemestre',e=>e.disabled));
  await p.fill('#campoBusca','zeca');await p.waitForTimeout(250);
  chk(`[${scheme}] ingresso fora do formato só em Todos os anos`,(await p.$$eval('.cardAluno',e=>e.length))===1);
  await p.selectOption('#filtroAno','2021');await p.waitForTimeout(150);
  chk(`[${scheme}] vazio com filtro de ingresso`,(await p.textContent('#listaResultados')).includes('Nenhum aluno encontrado com esse filtro'));
  await p.selectOption('#filtroAno','');

  // ---------- v1.1: ficha do aluno ----------
  await p.fill('#campoBusca','9000005');await p.waitForTimeout(250);
  await p.click('.cardAluno');await p.waitForSelector('#fichaCampos input');
  chk(`[${scheme}] ficha abre com todas as colunas`,(await p.$$eval('#fichaCampos input',e=>e.length))===6&&(await p.textContent('#fichaTitulo'))==='Ana Paula da Silva 5');
  chk(`[${scheme}] ficha trava scroll e foca 1º campo`,await p.evaluate(()=>document.body.style.overflow==='hidden'&&document.activeElement===document.querySelector('#fichaCampos input')));
  chk(`[${scheme}] ID da Pasta somente leitura`,await p.$eval('#fichaCampos label:nth-of-type(5) input',e=>e.readOnly)&&(await p.textContent('#fichaCampos label:nth-of-type(5)')).includes('somente leitura'));
  chk(`[${scheme}] Salvar desabilitado sem alteração`,await p.$eval('#fichaSalvar',e=>e.disabled));
  await p.fill('#fichaCampos label:nth-of-type(4) input','nova5@exemplo.invalid');
  chk(`[${scheme}] campo alterado marcado`,await p.$eval('#fichaCampos label:nth-of-type(4) input',e=>e.classList.contains('alterado'))&&!(await p.$eval('#fichaSalvar',e=>e.disabled))&&(await p.textContent('#fichaStatus')).includes('1 campo alterado'));
  // contraste dos elementos novos
  const novos=await p.evaluate(()=>{function bg(el){while(el){const c=getComputedStyle(el).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;el=el.parentElement}return 'rgb(255,255,255)'}
    return ['#fichaTitulo','.fichaRotuloTopo','.fichaAviso','.fichaCampo span','#fichaCampos input','#fichaCampos label:nth-of-type(5) input','#fichaStatus','#fichaSalvar','#fichaCancelar'].map(s=>{const e=document.querySelector(s);return [s,getComputedStyle(e).color,bg(e)]})});
  for(const [s,c,bgc] of novos){const r=cr(c,bgc);chk(`[${scheme}] contraste ${s}`,r>=4.5,r.toFixed(2))}
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`ficha-${scheme}.png`});
  await p.click('#fichaSalvar');await p.waitForFunction(()=>document.getElementById('fichaStatus').classList.contains('ok'));
  const chamadaSalvar=await p.evaluate(()=>window.__chamadas.filter(c=>c[0]==='salvarFichaAluno').pop()[1]);
  chk(`[${scheme}] salvar envia só o campo alterado + original`,JSON.stringify(chamadaSalvar.novos)==='{"eMail":"nova5@exemplo.invalid"}'&&chamadaSalvar.originais.eMail==='aluno5@exemplo.invalid'&&chamadaSalvar.linha===7&&chamadaSalvar.numeroUsp==='9000005');
  chk(`[${scheme}] lista atualizada após salvar`,(await p.textContent('#listaResultados')).includes('nova5@exemplo.invalid'));
  // erro de validação
  await p.fill('#fichaCampos label:nth-of-type(3) input','2024-1');await p.click('#fichaSalvar');await p.waitForFunction(()=>document.getElementById('fichaStatus').classList.contains('erro'));
  chk(`[${scheme}] erro de validação aparece na ficha`,(await p.textContent('#fichaStatus')).includes('AAAA/S'));
  const cErro=await p.evaluate(()=>{const e=document.getElementById('fichaStatus');return [getComputedStyle(e).color,getComputedStyle(e.closest('.fichaDialogo')).backgroundColor]});chk(`[${scheme}] contraste erro da ficha`,cr(...cErro)>=4.5,cr(...cErro).toFixed(2));
  // focus trap
  await p.focus('#fichaSalvar');await p.keyboard.press('Tab');chk(`[${scheme}] Tab preso na ficha`,await p.evaluate(()=>document.getElementById('fichaDialogo').contains(document.activeElement)));
  // ESC com alteração pendente pede confirmação
  p.once('dialog',d=>d.dismiss());await p.keyboard.press('Escape');await p.waitForTimeout(100);
  chk(`[${scheme}] ESC com pendência pergunta e mantém aberta se cancelar`,await p.evaluate(()=>!document.getElementById('fichaOverlay').hidden));
  p.once('dialog',d=>d.accept());await p.keyboard.press('Escape');await p.waitForTimeout(100);
  chk(`[${scheme}] ESC fecha ficha, restaura scroll e foco`,await p.evaluate(()=>document.getElementById('fichaOverlay').hidden&&document.body.style.overflow===''&&document.activeElement.classList.contains('cardAluno')&&document.activeElement.dataset.linha==='7'));
  await p.keyboard.press('Enter');await p.waitForSelector('#fichaCampos input');
  chk(`[${scheme}] Enter no card abre a ficha (teclado)`,await p.evaluate(()=>!document.getElementById('fichaOverlay').hidden));
  await p.click('#fichaCancelar');
  await p.fill('#campoBusca','');await p.dispatchEvent('#campoBusca','input');
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
 // leitor (sem permissão de editar)
 {const ctx=await b.newContext({colorScheme:'light'});const p=await ctx.newPage();await load(p,'leitor');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  await p.fill('#campoBusca','9000001');await p.waitForTimeout(250);await p.click('.cardAluno');await p.waitForSelector('#fichaCampos input');
  chk('leitor: ficha só consulta',await p.$$eval('#fichaCampos input',e=>e.every(x=>x.readOnly))&&(await p.textContent('.fichaAviso')).includes('não alterar')&&await p.$eval('#fichaSalvar',e=>e.disabled));
  await ctx.close();}

 // mobile
 for(const w of [360,390,480,768]){for(const scheme of ['light','dark']){const ctx=await b.newContext({colorScheme:scheme,viewport:{width:w,height:800}});const p=await ctx.newPage();await load(p,'ok');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  await p.fill('#campoBusca','sec');await p.waitForTimeout(300);
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] sem overflow horizontal`,ov<=0,ov);
  const alvo=await p.evaluate(()=>['.botaoAjuda','.gradip-theme-control__select','#campoBusca'].map(s=>document.querySelector(s).getBoundingClientRect().height));chk(`[${w} ${scheme}] alvos >=44px`,alvo.every(h=>h>=44),alvo.join(','));
  await p.click('.botaoAjuda');await p.waitForTimeout(150);const ov2=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] ajuda sem overflow`,ov2<=0);
  await p.keyboard.press('Escape');
  await p.selectOption('#filtroAno','2023');await p.waitForTimeout(150);
  const ov3=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] filtros sem overflow`,ov3<=0,ov3);
  const alvos2=await p.evaluate(()=>['#filtroAno','#filtroSemestre','#botaoCsv','#botaoPdf'].map(s=>document.querySelector(s).getBoundingClientRect().height));chk(`[${w} ${scheme}] filtros/exportar >=44px`,alvos2.every(h=>h>=44),alvos2.join(','));
  await p.click('.cardAluno');await p.waitForSelector('#fichaCampos input');
  const fichaOv=await p.evaluate(()=>{const d=document.getElementById('fichaDialogo').getBoundingClientRect();return d.width<=innerWidth&&document.documentElement.scrollWidth<=document.documentElement.clientWidth});chk(`[${w} ${scheme}] ficha cabe na tela`,fichaOv);
  if(w===390)await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-ficha-${scheme}.png`});
  await p.click('#fichaCancelar');await p.selectOption('#filtroAno','');
  if(w===390){await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-ajuda-${scheme}.png`});await p.keyboard.press('Escape');await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-${scheme}.png`,fullPage:false});}
  await ctx.close();}}
 await b.close();console.log(`${ok}/${ok+fail}`);process.exit(fail?1:0);})();

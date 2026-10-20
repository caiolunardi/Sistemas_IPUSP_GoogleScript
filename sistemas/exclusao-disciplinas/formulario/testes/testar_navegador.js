// Testes de navegador do Formulário de Exclusão de Disciplinas (Chromium real
// via Playwright). Monta a página com os include_ resolvidos, simula
// google.script.run com dados 100% sintéticos e confere carga, texto do
// requerimento, disciplinas pelo código (cadastro, código antigo, fora do
// cadastro, cadastro fora do ar, já pendente), turma, validação, envio,
// recibo, tema, contraste, Central de Ajuda e larguras de 360 a 1280 px.
// Uso: node testar_navegador.js [pasta-para-capturas]
const fs=require('fs'),path=require('path');
function carregarPlaywright(){try{return require('playwright')}catch(e){return require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')}}
const {chromium}=carregarPlaywright();
const SRC=path.join(__dirname,'..','src')+'/';
const CAPTURAS=process.argv[2]||null;
// Teste sem rede: o PNG da marca USP (tema claro) é servido pelo SVG
// institucional do repositório, para as capturas mostrarem a marca real.
const MARCA_USP_OFFLINE=fs.readFileSync(path.join(__dirname,'..','..','..','..','assets','usp','logo-usp-preto.svg'),'utf8');
function build(homologacao=false){let h=fs.readFileSync(SRC+'ExclusaoApp.html','utf8');
  h=h.replace(/<\? if \(homologacao\) \{ \?>([\s\S]*?)<\? \} \?>/,(_,c)=>homologacao?c:'');
  for(let k=0;k<3;k++)h=h.replace(/<\?!= include_\('(\w+)'\) \?>/g,(_,n)=>fs.readFileSync(SRC+n+'.html','utf8'));
  if(/<\?/.test(h))throw new Error('scriptlet sobrando');return h;}
const html=build(),htmlHomologacao=build(true);

const PERIODO={semestre:2,ano:'2026',dataAbertura:'03/08/2026',horaAbertura:'08:00',dataFechamento:'07/08/2026',horaFechamento:'12:00',retifInicio:'03/08/2026',retifFim:'10/08/2026'};
const BASE={autenticado:true,periodoAberto:true,periodo:PERIODO,encontrado:true,email:'ana@usp.br',nUsp:'9000001',nome:'Ana Teste Ficticia',anoIngresso:'2023',historico:[],maxDisciplinas:6,urlFormulario:'https://form.teste/exec'};
const CATALOGO={disponivel:true,disciplinas:[['TST0101','Psicologia Teste I',4],['TST0202','Psicologia Teste II',2],['TST0303','Disciplina de Nome Bem Comprido para Testar a Quebra de Linha no Celular',6],['EXT0001','Externa Teste',null]],apelidos:{TST9999:'TST0101'}};
const CENARIOS={
  normal:{dados:BASE,catalogo:CATALOGO,envio:{sucesso:true,reciboEnviado:true,disciplinas:['TST0101 - Psicologia Teste I — turma 01','ABC1234 - Optativa Externa — turma 2026201']}},
  historico:{dados:Object.assign({},BASE,{historico:[{carimbo:'01/03/2025 10:00',pendente:false,disciplinas:[{texto:'TST0001 Antiga — turma 2025101',concluida:true}],codigosPendentes:[]},{carimbo:'04/08/2026 09:30',pendente:true,disciplinas:[{texto:'TST0101 - Psicologia Teste I — turma 01',concluida:true},{texto:'TST0202 - Psicologia Teste II — turma 02',concluida:false}],codigosPendentes:['TST0202']}]}),catalogo:CATALOGO},
  semCatalogo:{dados:Object.assign({},BASE,{encontrado:false,nUsp:'',nome:'',anoIngresso:''}),catalogo:{disponivel:false,disciplinas:[],apelidos:{}},envio:{sucesso:true,reciboEnviado:false,disciplinas:['TST0101 - Digitada — turma 01']}},
  catalogoFalha:{dados:BASE,erroCatalogo:'falhou'},
  erroEnvio:{dados:BASE,catalogo:CATALOGO,erroEnvio:'Error: Muitos pedidos sendo gravados ao mesmo tempo. Aguarde alguns segundos e clique em Enviar de novo.'},
  fechado:{dados:{autenticado:true,periodoAberto:false,motivoFechado:'Fora do período de exclusão de disciplinas. Consulte o Serviço de Graduação para mais informações.'}},
  semLogin:{dados:{autenticado:false}},
  erroCarga:{erroCarga:'Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID.'}
};
const stub=c=>`(function(){var C=${JSON.stringify(c)};window.__chamadas=[];
var API={obterDadosIniciais:function(){if(C.erroCarga)throw new Error(C.erroCarga);return C.dados},
 obterCatalogoDisciplinas:function(){if(C.erroCatalogo)throw new Error(C.erroCatalogo);return C.catalogo},
 registrarSolicitacao:function(d){if(C.erroEnvio)throw new Error(C.erroEnvio);return C.envio||{sucesso:true,reciboEnviado:true,disciplinas:[]}}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push([n,JSON.parse(JSON.stringify(arg===undefined?null:arg))]);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},n==='obterCatalogoDisciplinas'?120:40)}});return o}
window.google={script:{get run(){return runner()}}};})();`;
function lum(c){const m=c.match(/[\d.]+/g).map(Number);const a=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
function cr(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
async function abrir(ctx,cen,pagina=html){const p=await ctx.newPage();p.__errs=[];p.on('pageerror',e=>p.__errs.push(e.message));
  await p.route('https://form.teste/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:pagina.replace('<head>','<head><script>'+stub(CENARIOS[cen])+'</script>')}));
  await p.route('https://datagrad.sistemas.ip.usp.br/**',r=>r.fulfill({contentType:'image/svg+xml',body:MARCA_USP_OFFLINE}));
  await p.route('https://leginf.usp.br/**',r=>r.fulfill({body:'x'}));
  await p.goto('https://form.teste/');await p.waitForFunction(()=>document.getElementById('loadingOverlay').hidden);return p;}
const esperarCatalogo=p=>p.waitForFunction(()=>window.__chamadas.some(c=>c[0]==='obterCatalogoDisciplinas')&&typeof catalogo!=='undefined'&&catalogo!==null);
let ok=0,fail=0;const chk=(n,c,extra='')=>{if(c){ok++;console.log('ok',n,extra)}else{fail++;console.log('FALHA',n,extra)}};
const chamadas=p=>p.evaluate(()=>window.__chamadas.filter(c=>c[0]==='registrarSolicitacao'));
const visivel=(p,s)=>p.$eval(s,e=>!e.hidden&&e.offsetParent!==null).catch(()=>false);
const linha=(i)=>`#listaDisciplinas > li:nth-child(${i})`;
async function preencherBasico(p){await p.check('#campoCiencia');await p.check('input[name="curso"][value="Bacharelado"]');await p.check('input[name="concluira"][value="Não"]');}
const turma=(i,v)=>`${linha(i)} .inputTurma`;

(async()=>{const b=await chromium.launch();
 for(const scheme of ['light','dark']){
  const ctx=await b.newContext({colorScheme:scheme,viewport:{width:1280,height:900}});
  let p=await abrir(ctx,'normal');const T=`[${scheme}]`;
  chk(`${T} tema Sistema resolvido`,await p.evaluate(s=>document.documentElement.dataset.theme===s&&document.documentElement.dataset.themePreference==='system',scheme));
  chk(`${T} seletor mostra Sistema`,await p.$eval('[data-gradip-theme-select]',e=>e.value==='system'));
  chk(`${T} marca certa`,await p.evaluate(s=>{const l=document.querySelector('.marcaIpuspSvg.gradip-logo-light'),d=document.querySelector('.marcaIpuspSvg.gradip-logo-dark');return s==='dark'?getComputedStyle(l).display==='none'&&getComputedStyle(d).display!=='none':getComputedStyle(d).display==='none'&&getComputedStyle(l).display!=='none'},scheme));
  chk(`${T} pré-preenchido`,await p.$eval('#campoNome',e=>e.value)==='Ana Teste Ficticia'&&await p.$eval('#campoAno',e=>e.value)==='2023'&&await visivel(p,'#avisoAno')&&await p.$eval('#campoEmail',e=>e.value==='ana@usp.br'&&e.readOnly)&&await visivel(p,'#avisoNome'));
  const intro=(await p.textContent('.textoInformativo')).replace(/\s+/g,' ');
  chk(`${T} texto do requerimento com as datas`,(await p.textContent('#tituloResumo')).includes('2º semestre de 2026')&&intro.includes('EXCLUSÃO DE DISCIPLINA(S) – 2º SEMESTRE DE 2026')&&intro.includes('ocorrerá de 03/08/2026 a 10/08/2026')&&intro.includes('do dia 03/08/2026 até às 12:00 do dia 07/08/2026')&&intro.includes('às 12:00 do dia 10/08/2026')&&!intro.includes(' - '),intro.slice(0,120));
  chk(`${T} uma linha de disciplina, sem Remover`,await p.$$eval('.linhaDisciplina',e=>e.length)===1&&!(await visivel(p,linha(1)+' .botaoRemover')));
  await esperarCatalogo(p);
  chk(`${T} sem aviso de cadastro fora do ar`,!(await visivel(p,'#avisoCatalogo')));
  // código do cadastro
  await p.fill(linha(1)+' .inputCodigo','tst 0101');
  chk(`${T} nome pelo código`,await p.$eval(linha(1)+' .inputNome',e=>e.value==='Psicologia Teste I'&&e.readOnly)&&(await p.textContent(linha(1)+' .statusDisciplina')).includes('4 créditos-aula'));
  // contraste
  const pares=await p.evaluate(()=>{const cs=e=>getComputedStyle(document.querySelector(e));const bg=e=>cs(e).backgroundColor;
    const card=bg('.cartaoPrincipal'),pag=getComputedStyle(document.body).backgroundColor,lin=bg('.linhaDisciplina');
    return {texto:[cs('.textoInformativo p').color,card],muted:[cs('.ajudaCampo').color,card],link:[cs('.textoInformativo a').color,card],titulo:[cs('.secao h3').color,card],
     ok:[cs('.avisoPreenchido').color,card],botao:[cs('#btnEnviar').color,bg('#btnEnviar')],cabecalho:[cs('.cabecalho p').color,bg('.cabecalho')],rodape:[cs('.rodape').color,pag],
     encontrada:[cs('.statusDisciplina').color,lin],tituloDisc:[cs('.tituloDisciplina').color,lin],nomeLeitura:[cs('.inputNome').color,cs('.inputNome').backgroundColor],
     adicionar:[cs('#btnAdicionarDisciplina').color,bg('#btnAdicionarDisciplina')],email:[cs('#campoEmail').color,cs('#campoEmail').backgroundColor],
     borda:[cs('#campoNome').borderTopColor,cs('#campoNome').backgroundColor],bordaCodigo:[cs('.inputCodigo').borderTopColor,cs('.inputCodigo').backgroundColor],bordaOpcoes:[cs('#caixaCurso').borderTopColor,card],turma:[cs('.inputTurma').color,cs('.inputTurma').backgroundColor],ajuda:[cs('.botaoAjuda').color,bg('.botaoAjuda')]}});
  for(const [k,[c,f]] of Object.entries(pares)){const r=cr(c,f);const alvo=k.startsWith('borda')?3:4.5;chk(`${T} contraste ${k} ≥ ${alvo}`,r>=alvo,r.toFixed(2))}
  // código antigo, fora do cadastro, repetida
  await p.click('#btnAdicionarDisciplina');
  chk(`${T} adicionar foca o código novo`,await p.evaluate(()=>document.activeElement.id==='codigoDisc2'));
  await p.fill(linha(2)+' .inputCodigo','TST9999');
  chk(`${T} código antigo avisa o atual`,(await p.textContent(linha(2)+' .statusDisciplina')).includes('mudou para TST0101')&&await p.$eval(linha(2)+' .inputNome',e=>e.value==='Psicologia Teste I'));
  await p.fill(linha(2)+' .inputCodigo','ABC1234');
  chk(`${T} fora do cadastro libera o nome`,await p.$eval(linha(2)+' .inputNome',e=>!e.readOnly&&e.value==='')&&(await p.textContent(linha(2)+' .statusDisciplina')).includes('não está no cadastro'));
  const corAviso=await p.$eval(linha(2)+' .statusDisciplina',e=>[getComputedStyle(e).color,getComputedStyle(e.closest('.linhaDisciplina')).backgroundColor]);chk(`${T} contraste não encontrada ≥ 4.5`,cr(...corAviso)>=4.5,cr(...corAviso).toFixed(2));
  await p.fill(linha(2)+' .inputCodigo','EXT01');
  chk(`${T} código curto não libera antes de sair`,await p.$eval(linha(2)+' .inputNome',e=>e.readOnly));
  await p.focus(linha(1)+' .inputCodigo');
  chk(`${T} código curto libera ao sair`,await p.$eval(linha(2)+' .inputNome',e=>!e.readOnly));
  await p.fill(linha(2)+' .inputCodigo','ABC1234');
  await p.fill(linha(2)+' .inputNome','Optativa Externa');await p.fill(turma(2),'2026201');
  await p.click('#btnAdicionarDisciplina');await p.fill(linha(3)+' .inputCodigo','TST0101');await p.fill(turma(3),'02');
  // validação vazia + repetida
  await p.fill('#campoNome','');
  await p.click('#btnEnviar');
  chk(`${T} validação: nada enviado`,(await chamadas(p)).length===0);
  const marcados=await p.$$eval('[aria-invalid="true"]',e=>e.map(x=>x.id));
  chk(`${T} validação: nome, curso, conclusão, ciência, turma e repetida`,['campoNome','caixaCurso','caixaConcluira','caixaCiencia','turmaDisc1','codigoDisc3'].every(id=>marcados.includes(id))&&marcados.length===6,marcados.join());
  chk(`${T} validação: foco no primeiro`,await p.evaluate(()=>document.activeElement.id==='campoNome'));
  chk(`${T} validação: turma explicada`,(await p.textContent(linha(1)+' .erroCampo')).includes('Informe a turma'));
  chk(`${T} validação: repetida explicada`,(await p.textContent(linha(3)+' .erroCampo')).includes('TST0101 já foi informada'));
  chk(`${T} validação: resumo`,(await p.textContent('#resumoErros')).includes('Corrija 6 itens'));
  const erroCor=await p.$eval('#erroNome',e=>[getComputedStyle(e).color,getComputedStyle(document.querySelector('.cartaoPrincipal')).backgroundColor]);chk(`${T} contraste erro ≥ 4.5`,cr(...erroCor)>=4.5,cr(...erroCor).toFixed(2));
  if(CAPTURAS)await p.screenshot({path:path.join(CAPTURAS,`erros-${scheme}.png`),fullPage:true});
  // remover renumera
  await p.click(linha(3)+' .botaoRemover');
  chk(`${T} remover renumera e foca`,await p.$$eval('.tituloDisciplina',e=>e.map(x=>x.textContent).join('|'))==='Disciplina 1 (obrigatória)|Disciplina 2'&&await p.evaluate(()=>document.activeElement.id==='codigoDisc2'));
  await p.fill('#campoNome','Ana Teste Ficticia');await preencherBasico(p);await p.check('input[name="curso"][value="Licenciatura"]');await p.fill(turma(1),'01');
  await p.fill('#campoAno','');await p.type('#campoAno','20a2');
  chk(`${T} ano só dígitos`,(await p.$eval('#campoAno',e=>e.value))==='202');await p.fill('#campoAno','2023');
  await p.fill('#campoObservacoes','a'.repeat(3700));
  chk(`${T} contador`,(await p.textContent('#contadorObservacoes'))==='3.700 de 4.000 caracteres');
  await p.fill('#campoObservacoes','');
  await p.click('#btnEnviar');await p.waitForSelector('#telaConfirmacao:not([hidden])');
  const env=await chamadas(p);
  chk(`${T} envio`,env.length===1&&JSON.stringify(env[0][1].disciplinas)===JSON.stringify([{codigo:'TST0101',nome:'Psicologia Teste I',turma:'01'},{codigo:'ABC1234',nome:'Optativa Externa',turma:'2026201'}])&&env[0][1].ciencia===true&&env[0][1].anoIngresso==='2023'&&JSON.stringify(env[0][1].cursos)==='["Bacharelado","Licenciatura"]'&&env[0][1].concluira==='Não'&&env[0][1].observacoes===''&&env[0][1].email===undefined,JSON.stringify(env[0]&&env[0][1]));
  chk(`${T} tela de sucesso: disciplinas, recibo, links`,(await p.$$eval('#listaEnviadas li',e=>e.length))===2&&(await p.textContent('#resumoConfirmacao'))==='2 disciplinas registradas para exclusão:'&&(await p.textContent('#textoRecibo')).includes('ana@usp.br')&&await p.$eval('#linkNovoPedido',e=>!e.hidden&&e.href==='https://form.teste/exec'));
  chk(`${T} foco na confirmação`,await p.evaluate(()=>document.activeElement.id==='telaConfirmacao'));
  if(CAPTURAS)await p.screenshot({path:path.join(CAPTURAS,`enviado-${scheme}.png`)});
  await p.close();

  // limite de 6
  p=await abrir(ctx,'normal');for(let i=0;i<7;i++)await p.click('#btnAdicionarDisciplina').catch(()=>{});
  chk(`${T} até 6 disciplinas`,await p.$$eval('.linhaDisciplina',e=>e.length)===6&&!(await visivel(p,'#btnAdicionarDisciplina'))&&(await p.textContent('#limiteDisciplinas')).includes('limite'));
  await p.close();

  // histórico
  p=await abrir(ctx,'historico');
  chk(`${T} histórico com selos e disciplinas`,(await p.$$eval('.seloSituacao',e=>e.map(x=>x.textContent))).join()==='Concluído,Pendente'&&(await p.textContent('#avisos')).includes('TST0101 - Psicologia Teste I — turma 01 (concluída); TST0202 - Psicologia Teste II — turma 02'));
  await esperarCatalogo(p);await p.fill(linha(1)+' .inputCodigo','TST0202');
  chk(`${T} disciplina já pendente avisa sem bloquear`,await visivel(p,linha(1)+' .avisoRepetida')&&(await p.textContent(linha(1)+' .avisoRepetida')).includes('TST0202'));
  const corRep=await p.$eval(linha(1)+' .avisoRepetida',e=>[getComputedStyle(e).color,getComputedStyle(e.closest('.linhaDisciplina')).backgroundColor]);chk(`${T} contraste aviso já pendente ≥ 4.5`,cr(...corRep)>=4.5,cr(...corRep).toFixed(2));
  await p.fill(linha(1)+' .inputCodigo','TST0101');
  chk(`${T} concluída não avisa`,!(await visivel(p,linha(1)+' .avisoRepetida')));
  await preencherBasico(p);await p.fill(linha(1)+' .inputCodigo','TST0202');await p.fill(turma(1),'02');await p.click('#btnEnviar');await p.waitForSelector('#telaConfirmacao:not([hidden])');
  chk(`${T} já pendente envia`,(await chamadas(p)).length===1);
  if(CAPTURAS)await p.screenshot({path:path.join(CAPTURAS,`historico-${scheme}.png`),fullPage:true});
  await p.close();

  // sem cadastro e aluno não encontrado
  p=await abrir(ctx,'semCatalogo');await esperarCatalogo(p);
  chk(`${T} aviso de cadastro fora do ar e aluno não encontrado`,await visivel(p,'#avisoCatalogo')&&(await p.textContent('#avisos')).includes('Não encontramos'));
  await p.fill(linha(1)+' .inputCodigo','TST0101');
  chk(`${T} sem cadastro: nome digitável`,await p.$eval(linha(1)+' .inputNome',e=>!e.readOnly));
  await p.fill('#campoNUsp','9000002');await p.fill('#campoNome','Bruno');await p.fill('#campoAno','2024');await preencherBasico(p);await p.fill(turma(1),'01');
  await p.click('#btnEnviar');
  chk(`${T} sem cadastro: pede o nome`,(await chamadas(p)).length===0&&(await p.textContent(linha(1)+' .erroCampo')).includes('digite o nome'));
  await p.fill(linha(1)+' .inputNome','Digitada');await p.click('#btnEnviar');await p.waitForSelector('#telaConfirmacao:not([hidden])');
  chk(`${T} recibo não enviado avisado`,(await p.textContent('#textoRecibo')).includes('foi registrado')&&(await chamadas(p))[0][1].disciplinas[0].nome==='Digitada');
  await p.close();
  p=await abrir(ctx,'catalogoFalha');await esperarCatalogo(p);
  chk(`${T} cadastro com erro vira aviso`,await visivel(p,'#avisoCatalogo'));
  await p.close();

  // erro do servidor no envio
  p=await abrir(ctx,'erroEnvio');await esperarCatalogo(p);await preencherBasico(p);await p.fill(linha(1)+' .inputCodigo','TST0202');await p.fill(turma(1),'2');await p.click('#btnEnviar');
  await p.waitForFunction(()=>!document.getElementById('resumoErros').hidden);
  chk(`${T} erro do servidor no resumo`,(await p.textContent('#resumoErros')).includes('Aguarde alguns segundos')&&!(await p.$eval('#btnEnviar',e=>e.disabled))&&await p.evaluate(()=>document.activeElement.id==='resumoErros'));
  await p.close();

  // bloqueios
  p=await abrir(ctx,'fechado');
  chk(`${T} fora do período bloqueia`,await visivel(p,'#telaBloqueada')&&(await p.textContent('#tituloBloqueio'))==='Formulário fechado no momento'&&await p.$eval('#ajudaBloqueio',e=>e.getAttribute('data-gradip-help-open')==='ajuda-prazo')&&!(await visivel(p,'#conteudo')));
  chk(`${T} fechado não pede o cadastro`,await p.evaluate(()=>!window.__chamadas.some(c=>c[0]==='obterCatalogoDisciplinas')));
  if(CAPTURAS)await p.screenshot({path:path.join(CAPTURAS,`fechado-${scheme}.png`)});
  await p.close();
  p=await abrir(ctx,'semLogin');
  chk(`${T} sem login bloqueia`,await visivel(p,'#telaBloqueada')&&(await p.textContent('#tituloBloqueio'))==='Login necessário');
  await p.close();
  p=await abrir(ctx,'erroCarga');
  chk(`${T} erro de carga sem detalhe técnico`,(await p.textContent('#tituloBloqueio'))==='Erro ao carregar'&&!(await p.textContent('#textoBloqueio')).includes('ID_INDEX'));
  await p.close();

  // Central de Ajuda
  p=await abrir(ctx,'normal');
  await p.click('.botaoAjuda');await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])');
  // a ajuda abre na seção num requestAnimationFrame que limpa a busca; espera esse quadro antes de digitar
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  chk(`${T} ajuda abre com scroll lock`,await p.evaluate(()=>document.body.style.overflow==='hidden'));
  await p.fill('[data-gradip-help-search]','REVERSIVEL');
  // a busca atualiza depois do input; espera em vez de conferir na hora (evita corrida na CI)
  chk(`${T} busca sem acento`,await p.waitForFunction(()=>/^\d+ resultados?$/.test(document.querySelector('[data-gradip-help-search-status]').textContent)&&document.querySelectorAll('#ajuda-inicio [data-gradip-help-search-item]:not([hidden])').length>=1,null,{timeout:5000}).then(()=>true,()=>false));
  await p.fill('[data-gradip-help-search]','trocar de turma');
  chk(`${T} busca acha troca de turma`,await p.waitForFunction(()=>document.querySelectorAll('#ajuda-faq [data-gradip-help-search-item]:not([hidden])').length===1,null,{timeout:5000}).then(()=>true,()=>false));
  await p.fill('[data-gradip-help-search]','');
  const faq=await p.$('#ajuda-faq .gradip-help-faq-toggle');await faq.click();
  chk(`${T} FAQ expande`,await faq.getAttribute('aria-expanded')==='true'&&await visivel(p,'#faq-na-hora'));
  await p.keyboard.press('Escape');
  chk(`${T} ESC fecha e devolve foco`,await p.evaluate(()=>document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.classList.contains('botaoAjuda')&&document.body.style.overflow===''));
  await p.click('.secao [data-gradip-help-open="ajuda-codigo-nao-encontrado"]');await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])');await p.waitForTimeout(100);
  chk(`${T} gatilho contextual abre na seção`,await p.evaluate(()=>document.activeElement&&document.activeElement.closest('#ajuda-codigo-nao-encontrado')!==null));
  const alvos=await p.$$eval('[data-gradip-help-open]',e=>e.map(x=>x.getAttribute('data-gradip-help-open')).concat(['ajuda-prazo']));
  chk(`${T} todos os gatilhos têm seção`,await p.evaluate(a=>a.every(id=>document.getElementById(id)),alvos));
  const helpC=await p.evaluate(()=>{const c=document.querySelector('.gradip-help-card p');return [getComputedStyle(c).color,getComputedStyle(c.closest('.gradip-help-card')).backgroundColor]});chk(`${T} contraste ajuda`,cr(...helpC)>=4.5,cr(...helpC).toFixed(2));
  if(CAPTURAS)await p.screenshot({path:path.join(CAPTURAS,`ajuda-${scheme}.png`)});
  await p.keyboard.press('Escape');
  chk(`${T} sem erros de JS`,p.__errs.length===0,p.__errs.join('|'));
  await p.close();await ctx.close();
 }

 // tema manual: persistência e mudança do sistema com a página aberta
 {const ctx=await b.newContext({colorScheme:'light'});let p=await abrir(ctx,'normal');
  await p.selectOption('[data-gradip-theme-select]','dark');
  chk('manual Escuro aplica',await p.evaluate(()=>document.documentElement.dataset.theme==='dark'&&localStorage.getItem('gradip-theme')==='dark'));
  await p.reload();await p.waitForFunction(()=>document.getElementById('loadingOverlay').hidden);
  chk('Escuro persiste após recarregar',await p.evaluate(()=>document.documentElement.dataset.theme==='dark')&&await p.$eval('[data-gradip-theme-select]',e=>e.value==='dark'));
  await p.emulateMedia({colorScheme:'light'});
  chk('manual ignora mudança do sistema',await p.evaluate(()=>document.documentElement.dataset.theme==='dark'));
  await p.selectOption('[data-gradip-theme-select]','system');await p.emulateMedia({colorScheme:'dark'});await p.waitForTimeout(50);
  chk('Sistema acompanha mudança com a página aberta',await p.evaluate(()=>document.documentElement.dataset.theme==='dark'&&document.documentElement.dataset.themePreference==='system'));
  await p.emulateMedia({colorScheme:'light'});await p.waitForTimeout(50);
  chk('Sistema volta para Claro',await p.evaluate(()=>document.documentElement.dataset.theme==='light'));
  await ctx.close();}

 // larguras
 for(const w of [360,390,480,768,1280]){for(const scheme of ['light','dark']){
  const ctx=await b.newContext({colorScheme:scheme,viewport:{width:w,height:800},hasTouch:w<1000});const p=await abrir(ctx,'historico');await esperarCatalogo(p);
  await p.fill(linha(1)+' .inputCodigo','TST0303');await p.click('#btnAdicionarDisciplina');await p.fill(linha(2)+' .inputCodigo','ABC1234');await p.focus('#campoNome');
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  chk(`${w}px ${scheme} sem rolagem horizontal`,ov<=0,ov);
  const pequenos=await p.$$eval('#btnEnviar,.botaoAjuda,[data-gradip-theme-select],.itemOpcao,#campoNome,#campoAno,.inputCodigo,.inputNome,.inputTurma,#btnAdicionarDisciplina,.botaoRemover',e=>e.filter(x=>{if(x.hidden||!x.offsetParent)return false;const r=x.getBoundingClientRect();return r.height<44||r.width<44}).map(x=>x.id||x.className));
  chk(`${w}px ${scheme} alvos ≥ 44 px`,pequenos.length===0,pequenos.join());
  const cab=await p.evaluate(()=>[...document.querySelectorAll('.cabecalho *, .linhaDisciplina *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>window.innerWidth+0.5||r.left<-0.5)}).length);
  chk(`${w}px ${scheme} cabeçalho e disciplinas dentro da tela`,cab===0,cab);
  if(scheme==='light'||w===360){await p.click('.botaoAjuda');await p.waitForSelector('[data-gradip-help-overlay]:not([hidden])');
   const fechar=await p.$eval('.gradip-help-close',e=>{const r=e.getBoundingClientRect();return r.right<=window.innerWidth&&r.top>=0});
   chk(`${w}px ${scheme} ajuda: fechar visível`,fechar);
   const ov2=await p.evaluate(()=>{const d=document.querySelector('[data-gradip-help-dialog]');return d.scrollWidth-d.clientWidth});chk(`${w}px ${scheme} ajuda sem rolagem horizontal`,ov2<=0,ov2);
   if(CAPTURAS&&w===360)await p.screenshot({path:path.join(CAPTURAS,`ajuda-360-${scheme}.png`)});
   await p.keyboard.press('Escape');}
  if(CAPTURAS&&(w===360||w===768))await p.screenshot({path:path.join(CAPTURAS,`form-${w}-${scheme}.png`),fullPage:true});
  await ctx.close();}}


 // Faixa do ambiente de homologação: só na cópia de testes, legível nos
 // dois temas e sem rolagem lateral no celular.
 for(const scheme of ['light','dark']){
  const ctx=await b.newContext({colorScheme:scheme,viewport:{width:360,height:800}});const T=`[${scheme}]`;
  let p=await abrir(ctx,'normal');chk(`${T} produção sem faixa de homologação`,(await p.$('.faixaHomologacao'))===null);await p.close();
  p=await abrir(ctx,'normal',htmlHomologacao);
  chk(`${T} homologação mostra a faixa com texto`,await visivel(p,'.faixaHomologacao')&&(await p.textContent('.faixaHomologacao')).includes('Ambiente de homologação'));
  const [ct,cf,fundo]=await p.$eval('.faixaHomologacao',e=>{const s=getComputedStyle(e);return [s.color,getComputedStyle(e.querySelector('strong')).color,s.backgroundColor]});
  chk(`${T} faixa com contraste AA`,cr(ct,fundo)>=4.5&&cr(cf,fundo)>=4.5,`${cr(ct,fundo).toFixed(2)} / ${cr(cf,fundo).toFixed(2)}`);
  chk(`${T} faixa sem rolagem lateral em 360 px`,await p.evaluate(()=>document.documentElement.scrollWidth<=360));
  chk(`${T} homologação sem erro de script`,p.__errs.length===0,p.__errs.join());
  if(CAPTURAS)await p.screenshot({path:path.join(CAPTURAS,`homologacao-360-${scheme}.png`)});
  await ctx.close();}
 await b.close();console.log(`\n${ok} ok, ${fail} falha(s)`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

// Testes de navegador da Comunidade IPUSP (antiga Busca de Alunos;
// Chromium real via Playwright). Simula google.script.run com 122 alunos,
// 2 docentes, 1 servidor e 1 setor sintéticos (nenhum dado real)
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
alunos.forEach(a=>a.tipo='aluno');
const outros=[{tipo:'docente',linha:2,numeroUsp:'9200001',nome:'Roberto Docente Ficticio',email:'roberto.doc@exemplo.invalid',emailSecundario:'',_genero:'M'},{tipo:'docente',linha:3,numeroUsp:'',nome:'Helena Professora Exemplo',email:'helena@exemplo.invalid',emailSecundario:'',_genero:'F'},
 {tipo:'servidor',linha:2,numeroUsp:'9100001',nome:'Marcos Servidor Exemplo',email:'marcos@exemplo.invalid',emailSecundario:'',setor:'Serviço de Graduação',_tipo:'SERVIDOR'},{tipo:'setor',linha:3,numeroUsp:'',nome:'Serviço de Graduação',email:'graduacao@exemplo.invalid',emailSecundario:'',setor:'Serviço de Graduação',_tipo:'SETOR'}];
// Backend simulado no navegador. modo: 'ok' (editor), 'leitor' (sem permissão de editar),
// 'parcial' (cadastro de docentes indisponível) ou 'erro'.
const stub=(modo)=>`(function(){var DADOS=${JSON.stringify(alunos)};var OUTROS=${JSON.stringify(outros)};var MODO=${JSON.stringify(modo)};window.__chamadas=[];
var COLS={alunos:[['Número USP','numeroUsp'],['Nome do Aluno','nome'],['Ingresso','ingresso'],['eMail','email'],['ID da Pasta',null],['eMail Secundario','emailSecundario']],
 docentes:[['N. USP','numeroUsp'],['NOME','nome'],['M / F','_genero'],['E-mail','email'],['ID da Pasta',null],['eMail Secundario','emailSecundario']],
 servidores:[['E-MAIL','email'],['NOME','nome'],['Setor','setor'],['N.USP','numeroUsp'],['TIPO','_tipo'],['ID da Pasta',null],['eMail Secundario','emailSecundario']]};
function lista(cad){return cad==='alunos'?DADOS:OUTROS.filter(function(x){return (cad==='docentes')===(x.tipo==='docente')})}
function achar(r){var a=lista(r.cadastro).find(function(x){return x.linha===r.linha});if(!a)throw new Error('Não encontrei');var id=r.cadastro==='alunos'?['numeroUsp','nome']:['nome','email'];
 id.forEach(function(k){if(String(a[k]||'')!==String(r[k]||''))throw new Error('A planilha de '+r.cadastro+' mudou')});return a}
function ficha(cad,a){var f={cadastro:cad,linha:a.linha,podeEditar:MODO==='ok',campos:COLS[cad].map(function(c){return {titulo:c[0],valor:c[1]?String(a[c[1]]||''):'pasta-'+a.linha,editavel:!!c[1]}})};
 if(cad==='docentes')f.tratamento=a._genero==='F'?'Profª.':a._genero==='M'?'Prof.':'';return f}
function resumo(a){var r=Object.assign({},a);delete r._genero;delete r._tipo;if(a._tipo)r.tipo=a._tipo==='SETOR'?'setor':'servidor';if(r.tipo==='aluno')delete r.tipo;return r}
var API={listarComunidadeParaBusca:function(){if(MODO==='erro')throw new Error('Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID.');
  var o=OUTROS.filter(function(x){return MODO!=='parcial'||x.tipo!=='docente'});
  return {pessoas:DADOS.map(function(a){return Object.assign({},a)}).concat(o.map(resumo)),indisponiveis:MODO==='parcial'?[{descricao:'docentes',motivo:'Não encontrei a chave "PLANILHA_DOCENTES" na planilha ID_INDEX.'}]:[]}},
 obterFicha:function(r){return ficha(r.cadastro,achar(r))},
 salvarFicha:function(p){var a=achar(p);var M={};COLS[p.cadastro].forEach(function(c){M[c[0]]=c[1]});
  Object.keys(p.novos).forEach(function(k){if(k==='Ingresso'&&!/^\\d{4}\\/[12]$/.test(p.novos[k]))throw new Error('O ingresso deve estar no formato AAAA/S, por exemplo 2024/1 ou 2024/2.');
   if(k==='M / F'&&!/^[MF]?$/i.test(p.novos[k]))throw new Error('O campo "M / F" aceita só M ou F (ou vazio).');a[M[k]]=k==='M / F'||k==='TIPO'?p.novos[k].toUpperCase():p.novos[k]});
  var f=ficha(p.cadastro,a);f.alterados=Object.keys(p.novos).length;f.resumo=resumo(a);return f},
 gerarPdfListaAlunos:function(p){return {nome:p.nomeArquivo+'.pdf',base64:btoa('%PDF-1.4 '+p.linhas.length)}}};
function runner(){var s=function(){},f=function(){};var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};
 Object.keys(API).forEach(function(n){o[n]=function(arg){window.__chamadas.push([n,JSON.parse(JSON.stringify(arg===undefined?null:arg))]);setTimeout(function(){try{s(API[n](arg))}catch(e){f(e)}},40)}});return o}
window.google={script:{get run(){return runner()}}};})();`;
function lum(c){const m=c.match(/[\d.]+/g).map(Number);const a=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]}
function cr(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
// https = contexto seguro (API de área de transferência); http testa o método alternativo da cópia.
async function load(p,modo,origem='https'){await p.route(origem+'://busca.teste/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html.replace('<head>','<head><script>'+stub(modo)+'</script>')}));await p.route('https://datagrad.sistemas.ip.usp.br/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="97"><rect width="240" height="97" fill="#00509d"/></svg>'}));await p.goto(origem+'://busca.teste/');}
let ok=0,fail=0;const chk=(n,c,extra='')=>{if(c){ok++;console.log('ok',n,extra)}else{fail++;console.log('FALHA',n,extra)}};
(async()=>{const b=await chromium.launch();
 for(const scheme of ['light','dark']){
  const ctx=await b.newContext({colorScheme:scheme,viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await load(p,'ok');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  chk(`[${scheme}] tema Sistema resolvido`,await p.evaluate(s=>document.documentElement.dataset.theme===s&&document.documentElement.dataset.themePreference==='system',scheme));
  chk(`[${scheme}] info carregados`,(await p.textContent('#infoBusca')).startsWith('122 alunos, 2 docentes, 1 servidor e 1 setor carregados'),await p.textContent('#infoBusca'));
  chk(`[${scheme}] sem aviso de cadastro`,await p.$eval('#avisoCadastros',e=>e.hidden));
  await p.fill('#campoBusca','silva ana');await p.waitForTimeout(300);
  const n=await p.$$eval('.cardAluno',e=>e.length);chk(`[${scheme}] busca nome em qualquer ordem`,n===24,n);
  chk(`[${scheme}] destaque mark`,await p.$$eval('.cardAluno mark',e=>e.length)>0);
  await p.fill('#campoBusca','claudia');await p.waitForTimeout(300);chk(`[${scheme}] sem acento`,await p.$$eval('.cardAluno',e=>e.length)===24);
  await p.fill('#campoBusca','9000');await p.waitForTimeout(300);chk(`[${scheme}] limite 60`,(await p.textContent('#listaResultados')).includes('Mostrando os primeiros 60 de 120'));
  await p.fill('#campoBusca','sec3@');await p.waitForTimeout(300);chk(`[${scheme}] e-mail secundário`,(await p.textContent('#listaResultados')).includes('(secundário)'));
  await p.fill('#campoBusca','zzzz');await p.waitForTimeout(300);chk(`[${scheme}] vazio`,(await p.textContent('#listaResultados')).includes('Nenhuma pessoa encontrada'));
  // ---------- v1.2: docentes, servidores e setores ----------
  await p.fill('#campoBusca','graduacao');await p.waitForTimeout(300);
  const gr=await p.$$eval('.cardAluno',e=>e.map(x=>({tipo:x.dataset.tipo,selo:x.querySelector('.seloVinculo').textContent,nome:x.querySelector('.textoNome').textContent,det:x.querySelector('.detalheAluno').textContent,usp:x.querySelector('.copiarUsp')?x.querySelector('.copiarUsp').textContent:null,ficha:!!x.querySelector('button.abrirFicha')})));
  chk(`[${scheme}] busca pelo setor: servidor e setor`,gr.length===2&&gr[0].selo==='Servidor'&&gr[1].selo==='Setor',JSON.stringify(gr));
  chk(`[${scheme}] servidor mostra setor e e-mail`,gr[0].det.includes('Serviço de Graduação')&&gr[0].det.includes('marcos@exemplo.invalid'));
  chk(`[${scheme}] setor não repete o nome no detalhe`,gr[1].nome==='Serviço de Graduação'&&gr[1].det==='graduacao@exemplo.invalid',gr[1].det);
  chk(`[${scheme}] servidor com nº USP copiável; setor sem nº USP`,gr[0].usp==='9100001'&&gr[1].usp===null&&!(await p.$('.cardAluno--setor .badgeUsp')),JSON.stringify(gr.map(x=>x.usp)));
  chk(`[${scheme}] todos os cards abrem ficha`,gr.every(x=>x.ficha));
  // copiar nº USP
  await p.click('.cardAluno--servidor .copiarUsp');await p.waitForTimeout(150);
  const copia=await p.evaluate(async()=>[await navigator.clipboard.readText(),document.getElementById('avisoCopia').textContent,document.getElementById('avisoCopia').hidden,document.getElementById('fichaOverlay').hidden]);
  chk(`[${scheme}] clique no nº USP copia e avisa sem abrir ficha`,copia[0]==='9100001'&&copia[1]==='Número USP copiado para área de transferência'&&!copia[2]&&copia[3],JSON.stringify(copia));
  const cAv=await p.evaluate(()=>{const e=document.getElementById('avisoCopia');return [getComputedStyle(e).color,getComputedStyle(e).backgroundColor,getComputedStyle(e).position]});chk(`[${scheme}] aviso da cópia: contraste e fixo`,cr(cAv[0],cAv[1])>=4.5&&cAv[2]==='fixed',cr(cAv[0],cAv[1]).toFixed(2));
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`copia-${scheme}.png`});
  await p.waitForTimeout(3100);chk(`[${scheme}] aviso some após 3 s`,await p.$eval('#avisoCopia',e=>e.hidden));
  // ficha do servidor: TIPO → SETOR muda o selo
  await p.click('.cardAluno--servidor .abrirFicha');await p.waitForSelector('#fichaCampos input');
  chk(`[${scheme}] ficha do servidor`,(await p.textContent('#fichaRotulo'))==='Ficha do servidor'&&(await p.$$eval('#fichaCampos input',e=>e.length))===7);
  await p.fill('#fichaCampos label:nth-of-type(5) input','setor');await p.click('#fichaSalvar');await p.waitForFunction(()=>document.getElementById('fichaStatus').classList.contains('ok'));
  const chS=await p.evaluate(()=>window.__chamadas.filter(c=>c[0]==='salvarFicha').pop()[1]);
  chk(`[${scheme}] salvar servidor envia cadastro e identidade`,chS.cadastro==='servidores'&&chS.nome==='Marcos Servidor Exemplo'&&chS.email==='marcos@exemplo.invalid'&&JSON.stringify(chS.novos)==='{"TIPO":"setor"}',JSON.stringify(chS));
  chk(`[${scheme}] TIPO=SETOR troca o selo e o rótulo`,(await p.textContent('#fichaRotulo'))==='Ficha do setor'&&(await p.$$eval('.cardAluno--setor',e=>e.length))===2);
  await p.fill('#fichaCampos label:nth-of-type(5) input','SERVIDOR');await p.click('#fichaSalvar');await p.waitForFunction(()=>document.getElementById('fichaStatus').classList.contains('ok')&&document.getElementById('fichaRotulo').textContent==='Ficha do servidor');
  await p.click('#fichaCancelar');
  chk(`[${scheme}] foco volta ao card do mesmo cadastro`,await p.evaluate(()=>document.activeElement.classList.contains('abrirFicha')&&document.activeElement.dataset.chave==='servidores:2'));
  chk(`[${scheme}] destaque no setor`,await p.$$eval('.cardAluno--servidor .detalheAluno mark',e=>e.length)>0);
  const [dlg]=await Promise.all([p.waitForEvent('download'),p.click('#botaoCsv')]);
  const csvg=fs.readFileSync(await dlg.path(),'utf8');
  chk(`[${scheme}] CSV misto: vínculo e setor`,dlg.suggestedFilename()==='comunidade_busca.csv'&&csvg.includes('\r\nServidor;Marcos Servidor Exemplo;Serviço de Graduação;9100001;;marcos@exemplo.invalid;\r\n')&&csvg.includes('\r\nSetor;Serviço de Graduação;Serviço de Graduação;'),JSON.stringify(csvg.slice(0,300)));
  await p.fill('#campoBusca','roberto');await p.waitForTimeout(300);
  chk(`[${scheme}] docente com selo`,(await p.$$eval('.cardAluno',e=>e.map(x=>x.querySelector('.seloVinculo').textContent+'|'+x.dataset.tipo))).join()==='Docente|docente');
  await p.click('.cardAluno .abrirFicha');await p.waitForSelector('#fichaCampos input');
  chk(`[${scheme}] ficha do docente com Prof. e sem TRATAMENTO`,(await p.textContent('#fichaTitulo'))==='Prof. Roberto Docente Ficticio'&&(await p.textContent('#fichaRotulo'))==='Ficha do docente'&&!(await p.textContent('#fichaCampos')).includes('TRATAMENTO'),await p.textContent('#fichaTitulo'));
  chk(`[${scheme}] chamada obterFicha de docente`,await p.evaluate(()=>{const c=window.__chamadas.filter(c=>c[0]==='obterFicha').pop()[1];return c.cadastro==='docentes'&&c.linha===2&&c.email==='roberto.doc@exemplo.invalid'}));
  await p.fill('#fichaCampos label:nth-of-type(3) input','f');await p.click('#fichaSalvar');await p.waitForFunction(()=>document.getElementById('fichaStatus').classList.contains('ok'));
  chk(`[${scheme}] M / F = F vira Profª.`,(await p.textContent('#fichaTitulo'))==='Profª. Roberto Docente Ficticio');
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`ficha-docente-${scheme}.png`});
  await p.fill('#fichaCampos label:nth-of-type(3) input','X');await p.click('#fichaSalvar');await p.waitForFunction(()=>document.getElementById('fichaStatus').classList.contains('erro'));
  chk(`[${scheme}] M / F inválido recusado`,(await p.textContent('#fichaStatus')).includes('só M ou F'));
  await p.fill('#fichaCampos label:nth-of-type(3) input','M');await p.click('#fichaSalvar');await p.waitForFunction(()=>document.getElementById('fichaStatus').classList.contains('ok'));
  await p.click('#fichaCancelar');
  chk(`[${scheme}] docente com nº USP copiável`,(await p.textContent('.cardAluno--docente .copiarUsp'))==='9200001');
  await p.fill('#campoBusca','helena');await p.waitForTimeout(300);
  chk(`[${scheme}] pessoa sem nº USP mostra "sem nº USP" sem botão`,!(await p.$('.cardAluno--docente .copiarUsp'))&&(await p.textContent('.cardAluno--docente .badgeUsp.semUsp'))==='sem nº USP');
  await p.fill('#campoBusca','exemplo.invalid ana paula 1');await p.waitForTimeout(300);
  chk(`[${scheme}] aluno com selo Aluno e nº USP`,await p.$$eval('.cardAluno--aluno',e=>e.length>0&&e.every(x=>x.querySelector('.seloVinculo').textContent==='Aluno'&&x.querySelector('.copiarUsp .badgeUsp'))));
  const selos=[];
  for(const q of ['silva','roberto','graduacao']){await p.fill('#campoBusca',q);await p.waitForTimeout(300);
   selos.push(...await p.evaluate(()=>{function bg(el){while(el){const c=getComputedStyle(el).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;el=el.parentElement}return 'rgb(255,255,255)'}
    return ['aluno','docente','servidor','setor'].map(t=>{const e=document.querySelector('.seloVinculo--'+t);return e?[t,getComputedStyle(e).color,bg(e)]:null}).filter(Boolean)}));}
  chk(`[${scheme}] selos dos 4 vínculos renderizados`,new Set(selos.map(x=>x[0])).size===4);
  for(const [t,c,bgc] of selos){chk(`[${scheme}] contraste selo ${t}`,cr(c,bgc)>=4.5,cr(c,bgc).toFixed(2))}
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`selos-${scheme}.png`});
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
  await p.click('text=Não encontrou a pessoa?');await p.waitForTimeout(200);
  chk(`[${scheme}] ajuda contextual abre seção`,await p.evaluate(()=>!document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.closest('section').id==='ajuda-nao-encontrei'));
  chk(`[${scheme}] scroll lock`,await p.evaluate(()=>document.body.style.overflow==='hidden'));
  await p.fill('#gradip-help-search','acentuacao');await p.waitForTimeout(100);chk(`[${scheme}] busca da ajuda por data-search`,(await p.textContent('[data-gradip-help-search-status]')).includes('1 resultado'));
  await p.fill('#gradip-help-search','GRAFIA');await p.waitForTimeout(100);chk(`[${scheme}] busca da ajuda texto visível`,!(await p.textContent('[data-gradip-help-search-status]')).startsWith('0'));
  await p.fill('#gradip-help-search','');await p.dispatchEvent('#gradip-help-search','input');
  await p.click('[aria-controls="busca-faq-limite"]');chk(`[${scheme}] FAQ aria-expanded`,await p.evaluate(()=>document.querySelector('[aria-controls="busca-faq-limite"]').getAttribute('aria-expanded')==='true'&&!document.getElementById('busca-faq-limite').hidden));
  const faqC=await p.evaluate(()=>{const e=document.querySelector('#busca-faq-limite p');return [getComputedStyle(e).color,getComputedStyle(e.closest('.gradip-help-faq')).backgroundColor]});chk(`[${scheme}] contraste FAQ`,cr(...faqC)>=4.5,cr(...faqC).toFixed(2));
  await p.click('.linkAjudaInterno[data-gradip-help-target="ajuda-faq"]');await p.waitForTimeout(100);chk(`[${scheme}] link interno`,await p.evaluate(()=>document.activeElement.closest('section').id==='ajuda-faq'));
  await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`ajuda-${scheme}.png`});
  await p.keyboard.press('Escape');chk(`[${scheme}] ESC fecha e devolve foco`,await p.evaluate(()=>document.querySelector('[data-gradip-help-overlay]').hidden&&document.activeElement.textContent==='Não encontrou a pessoa?'&&document.body.style.overflow===''));

  // ---------- v1.1: filtro por ingresso ----------
  await p.fill('#campoBusca','');await p.dispatchEvent('#campoBusca','input');await p.waitForTimeout(200);
  const opcoes=await p.$$eval('#filtroAno option',o=>o.map(x=>[x.value,x.textContent]));
  chk(`[${scheme}] combobox com os anos da coluna Ingresso`,JSON.stringify(opcoes)===JSON.stringify([['','Todos os anos'],['2024','2024 (30)'],['2023','2023 (30)'],['2022','2022 (30)'],['2021','2021 (30)']]),JSON.stringify(opcoes));
  chk(`[${scheme}] semestre desabilitado sem ano`,await p.$eval('#filtroSemestre',e=>e.disabled));
  chk(`[${scheme}] exportação desabilitada sem resultado`,await p.$eval('#botaoCsv',e=>e.disabled)&&await p.$eval('#botaoPdf',e=>e.disabled));
  await p.selectOption('#filtroAno','2022');await p.waitForTimeout(150);
  chk(`[${scheme}] ano filtra só alunos`,await p.$$eval('.cardAluno',e=>e.every(x=>x.dataset.tipo==='aluno')));
  chk(`[${scheme}] ano sozinho lista a turma`,(await p.textContent('#infoBusca')).startsWith('30 resultados encontrados · ingresso 2022'),await p.textContent('#infoBusca'));
  const nomesAno=await p.$$eval('.cardAluno .textoNome',e=>e.map(x=>x.textContent));
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
  chk(`[${scheme}] CSV: BOM, cabeçalho e linhas`,csv.charCodeAt(0)===0xfeff&&csv.slice(1).startsWith('Vínculo;Nome;Setor;Número USP;Ingresso;E-mail;E-mail secundário\r\nAluno;')&&csv.trim().split('\r\n').length===comb.length+1);
  await p.fill('#campoBusca','');await p.dispatchEvent('#campoBusca','input');await p.selectOption('#filtroSemestre','');await p.selectOption('#filtroAno','2024');await p.waitForTimeout(200);
  const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#botaoCsv')]);
  const csv2=fs.readFileSync(await dl2.path(),'utf8');
  chk(`[${scheme}] CSV exporta a turma inteira`,csv2.trim().split('\r\n').length===31&&dl2.suggestedFilename()==='alunos_ingresso-2024.csv');
  // PDF
  const [dl3]=await Promise.all([p.waitForEvent('download'),p.click('#botaoPdf')]);
  const pdf=fs.readFileSync(await dl3.path(),'latin1');
  const chamadaPdf=await p.evaluate(()=>window.__chamadas.filter(c=>c[0]==='gerarPdfListaAlunos').pop()[1]);
  chk(`[${scheme}] PDF baixado com toda a turma`,pdf.startsWith('%PDF')&&chamadaPdf.linhas.length===30&&chamadaPdf.titulo==='Alunos — ingresso 2024'&&dl3.suggestedFilename()==='alunos_ingresso-2024.pdf');
  chk(`[${scheme}] PDF envia só as 7 colunas`,Object.keys(chamadaPdf.linhas[0]).sort().join()==='email,emailSecundario,ingresso,nome,numeroUsp,setor,vinculo'&&chamadaPdf.linhas[0].vinculo==='Aluno');
  await p.selectOption('#filtroAno','');await p.waitForTimeout(100);
  chk(`[${scheme}] "Todos os anos" volta ao estado inicial`,(await p.$$eval('.cardAluno',e=>e.length))===0&&await p.$eval('#filtroSemestre',e=>e.disabled));
  await p.fill('#campoBusca','zeca');await p.waitForTimeout(250);
  chk(`[${scheme}] ingresso fora do formato só em Todos os anos`,(await p.$$eval('.cardAluno',e=>e.length))===1);
  await p.selectOption('#filtroAno','2021');await p.waitForTimeout(150);
  chk(`[${scheme}] vazio com filtro de ingresso`,(await p.textContent('#listaResultados')).includes('Nenhum aluno encontrado com esse filtro'));
  await p.selectOption('#filtroAno','');

  // ---------- v1.1: ficha do aluno ----------
  await p.fill('#campoBusca','9000005');await p.waitForTimeout(250);
  await p.click('.cardAluno .abrirFicha');await p.waitForSelector('#fichaCampos input');
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
  const chamadaSalvar=await p.evaluate(()=>window.__chamadas.filter(c=>c[0]==='salvarFicha').pop()[1]);
  chk(`[${scheme}] salvar envia só o campo alterado + original`,JSON.stringify(chamadaSalvar.novos)==='{"eMail":"nova5@exemplo.invalid"}'&&chamadaSalvar.originais.eMail==='aluno5@exemplo.invalid'&&chamadaSalvar.linha===7&&chamadaSalvar.numeroUsp==='9000005'&&chamadaSalvar.cadastro==='alunos');
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
  chk(`[${scheme}] ESC fecha ficha, restaura scroll e foco`,await p.evaluate(()=>document.getElementById('fichaOverlay').hidden&&document.body.style.overflow===''&&document.activeElement.classList.contains('abrirFicha')&&document.activeElement.dataset.chave==='alunos:7'));
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
  const t=await p.textContent('.vazio.erro');chk('estado de erro',t.startsWith('Não consegui carregar a lista de pessoas'),t);
  const c=await p.evaluate(()=>{const e=document.querySelector('.vazio.erro');return [getComputedStyle(e).color,getComputedStyle(e).backgroundColor]});chk('contraste erro dark',cr(...c)>=4.5,cr(...c).toFixed(2));await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-erro-dark.png')});await ctx.close();}
 // leitor (sem permissão de editar)
 {const ctx=await b.newContext({colorScheme:'light'});const p=await ctx.newPage();await load(p,'leitor','http');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  await p.evaluate(()=>document.addEventListener('copy',()=>{window.__copiado=String(getSelection()||document.activeElement.value.slice(document.activeElement.selectionStart,document.activeElement.selectionEnd))}));
  await p.fill('#campoBusca','roberto');await p.waitForTimeout(250);await p.click('.copiarUsp');await p.waitForTimeout(100);
  const fb=await p.evaluate(()=>[typeof navigator.clipboard,window.__copiado,document.getElementById('avisoCopia').textContent]);
  chk('cópia sem API de área de transferência (método alternativo)',fb[0]==='undefined'&&fb[1]==='9200001'&&fb[2]==='Número USP copiado para área de transferência',JSON.stringify(fb));
  await p.fill('#campoBusca','9000001');await p.waitForTimeout(250);await p.click('.cardAluno .abrirFicha');await p.waitForSelector('#fichaCampos input');
  chk('leitor: ficha só consulta',await p.$$eval('#fichaCampos input',e=>e.every(x=>x.readOnly))&&(await p.textContent('.fichaAviso')).includes('não alterar')&&await p.$eval('#fichaSalvar',e=>e.disabled));
  await ctx.close();}

 // cadastro indisponível
 for(const scheme of ['light','dark']){const ctx=await b.newContext({colorScheme:scheme});const p=await ctx.newPage();await load(p,'parcial');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  const av=await p.textContent('#avisoCadastros');chk(`[${scheme}] parcial: aviso visível com o motivo`,!(await p.$eval('#avisoCadastros',e=>e.hidden))&&av.includes('cadastro de docentes')&&av.includes('PLANILHA_DOCENTES'),av);
  chk(`[${scheme}] parcial: demais carregados`,(await p.textContent('#infoBusca')).startsWith('122 alunos, 1 servidor e 1 setor carregados'),await p.textContent('#infoBusca'));
  const ca=await p.evaluate(()=>{const e=document.getElementById('avisoCadastros');return [getComputedStyle(e).color,getComputedStyle(e).backgroundColor]});chk(`[${scheme}] parcial: contraste do aviso`,cr(...ca)>=4.5,cr(...ca).toFixed(2));
  await ctx.close();}
 // mobile
 for(const w of [360,390,480,768]){for(const scheme of ['light','dark']){const ctx=await b.newContext({colorScheme:scheme,viewport:{width:w,height:800}});const p=await ctx.newPage();await load(p,'ok');await p.waitForFunction(()=>!document.getElementById('campoBusca').disabled);
  await p.fill('#campoBusca','e');await p.waitForTimeout(300);
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] sem overflow horizontal`,ov<=0,ov);
  const alvo=await p.evaluate(()=>['.botaoAjuda','.gradip-theme-control__select','#campoBusca'].map(s=>document.querySelector(s).getBoundingClientRect().height));chk(`[${w} ${scheme}] alvos >=44px`,alvo.every(h=>h>=44),alvo.join(','));
  await p.click('.botaoAjuda');await p.waitForTimeout(150);const ov2=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] ajuda sem overflow`,ov2<=0);
  await p.keyboard.press('Escape');
  await p.selectOption('#filtroAno','2023');await p.waitForTimeout(150);
  const ov3=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);chk(`[${w} ${scheme}] filtros sem overflow`,ov3<=0,ov3);
  const alvos2=await p.evaluate(()=>['#filtroAno','#filtroSemestre','#botaoCsv','#botaoPdf'].map(s=>document.querySelector(s).getBoundingClientRect().height));chk(`[${w} ${scheme}] filtros/exportar >=44px`,alvos2.every(h=>h>=44),alvos2.join(','));
  const alvoUsp=await p.$eval('.copiarUsp',e=>{const r=e.getBoundingClientRect();return [r.width,r.height]});chk(`[${w} ${scheme}] nº USP copiável >=44px`,alvoUsp.every(x=>x>=44),alvoUsp.join('x'));
  await p.click('.cardAluno .abrirFicha');await p.waitForSelector('#fichaCampos input');
  const fichaOv=await p.evaluate(()=>{const d=document.getElementById('fichaDialogo').getBoundingClientRect();return d.width<=innerWidth&&document.documentElement.scrollWidth<=document.documentElement.clientWidth});chk(`[${w} ${scheme}] ficha cabe na tela`,fichaOv);
  if(w===390)await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-ficha-${scheme}.png`});
  await p.click('#fichaCancelar');await p.selectOption('#filtroAno','');
  if(w===390){await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-ajuda-${scheme}.png`});await p.keyboard.press('Escape');await p.screenshot({path:require('path').join(require('os').tmpdir(),'busca-alunos-')+`m390-${scheme}.png`,fullPage:false});}
  await ctx.close();}}
 await b.close();console.log(`${ok}/${ok+fail}`);process.exit(fail?1:0);})();

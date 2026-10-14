// Testes do backend da Comunidade IPUSP, antiga Busca de Alunos (Codigo.gs) com SpreadsheetApp,
// PropertiesService, HtmlService, Session, LockService e Utilities
// simulados. Dados 100% sintéticos. Uso: node testar_backend.js
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SRC=require('path').join(__dirname,'..','src')+'/';

// Aba simulada: matriz de valores (linha 1 = cabeçalho), fórmulas opcionais.
function sheet(name,vals,opts={}){
  const s={vals,formulas:opts.formulas||{},escritas:[],parent:null,
    getName:()=>name,getLastRow:()=>vals.length,getLastColumn:()=>vals[0]?vals[0].length:0,getParent:()=>s.parent,
    getRange:(r,c,nr=1,nc=1)=>({
      getValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc)),
      getDisplayValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc).map(v=>v==null?'':String(v))),
      getFormulas:()=>vals.slice(r-1,r-1+nr).map((l,i)=>l.slice(c-1,c-1+nc).map((_,j)=>s.formulas[(r+i)+':'+(c+j)]||'')),
      setValue:v=>{vals[r-1][c-1]=v;s.escritas.push([r,c,v]);}
    })};
  return s;
}
function run(props,files,opts={}){
  const logs=[];
  const ctx={console,Logger:{log:m=>logs.push(String(m))},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
    SpreadsheetApp:{flush(){},openById:id=>{if(!files[id])throw new Error('no access');const f=files[id];
      const ss={getSheetByName:n=>f.find(s=>s.getName()===n)||null,getSheets:()=>f,
        getEditors:()=>{if(opts.editoresErro)throw new Error('denied');return (opts.editores||[]).map(e=>({getEmail:()=>e}))},
        getOwner:()=>opts.dono?{getEmail:()=>opts.dono}:null};
      f.forEach(s=>s.parent=ss);return ss;}},
    Session:{getActiveUser:()=>({getEmail:()=>opts.usuario||''})},
    LockService:{getScriptLock:()=>({tryLock:()=>opts.travaOcupada?false:true,releaseLock(){}})},
    Utilities:{formatDate:()=>'13/10/2026 às 10:00',base64Encode:b=>Buffer.from(b).toString('base64'),
      newBlob:(html)=>({getAs:()=>({getBytes:()=>Buffer.from('%PDF'+html)})})},
    HtmlService:{createTemplateFromFile:n=>({evaluate:()=>({setTitle(){return this},addMetaTag(){return this},n})}),
      createHtmlOutputFromFile:n=>({getContent:()=>fs.readFileSync(SRC+n+'.html','utf8')})}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(SRC+'Codigo.gs','utf8'),ctx);ctx.logs=logs;return ctx;
}
const indice=()=>sheet('Página1',[['Chave','Tipo','ID de Produção','Homologação'],['OUTRA','spreadsheet','x',''],['PLANILHA_ALUNOS','spreadsheet','ALU','HOM'],['SERVIDORES','spreadsheet','SRV',''],['PLANILHA_DOCENTES','spreadsheet','DOC','']]);
// v1.3: servidores e docentes pelo título (esquema de 14/10/2026). TIPO vazio → regra antiga pelo nome.
const CAB_SRV=['E-MAIL','NOME','Setor','N.USP','TIPO','ID da Pasta','eMail Secundario'];
const servidores=(opts)=>sheet('Página1',[CAB_SRV.slice(),
  ['marcos@exemplo.invalid',' Marcos Servidor ','Serviço de Graduação',9100001,'SERVIDOR','pasta-s',''],
  ['graduacao@exemplo.invalid','Serviço de Graduação','Serviço de Graduação','','SETOR','',''],
  ['biblio@exemplo.invalid','','Biblioteca','','','',''],
  ['sec@exemplo.invalid','Secretaria do Departamento X','Departamento X','','','',''],
  ['','','','','','','']],opts);
const CAB_DOC=['N. USP','NOME','M / F','E-mail','TRATAMENTO','ID da Pasta','eMail Secundario'];
const docentes=(opts)=>sheet('Página1',[CAB_DOC.slice(),['9200001','Roberto Docente','M','roberto@exemplo.invalid','Prof. Roberto Docente','',''],['','','','','','',''],['','Helena Sem Email','F','','Profª. Helena Sem Email','','']],
  Object.assign({formulas:{'2:5':'=SE(C2="F";"Profª. "&B2;SE(C2="M";"Prof. "&B2))','4:5':'=SE(...)'}},opts));
const CAB=['Número USP','Nome do Aluno','Ingresso','eMail','ID da Pasta','eMail Secundario'];
const alunos=(opts)=>sheet('Alunos',[CAB.slice(),
  [9000001,'Ana Teste','2024/1','ana@exemplo.invalid','pasta-1',''],
  ['','','','','',''],
  ['','Bruno Ficticio','2023/2','','','b@exemplo.invalid'],
  [9000003,'Carla Exemplo','2024/2','carla@exemplo.invalid','','']],opts);
function ambiente(opts={},alu,extra={}){const a=alu||alunos();return {aba:a,c:run({ID_INDEX_SPREADSHEET_ID:'IDX'},Object.assign({IDX:[indice()],ALU:[a],SRV:[servidores()],DOC:[docentes()]},extra),opts)};}
const editor={usuario:'editor@exemplo.invalid',editores:['editor@exemplo.invalid']};
const J=x=>JSON.parse(JSON.stringify(x));

let ok=0,fail=0;const t=(n,f)=>{try{f();ok++;console.log('ok',n)}catch(e){fail++;console.log('FALHA',n,e.message)}};

t('lista: campos, linha e ingresso; sem ID da Pasta',()=>{const {c}=ambiente();const r=J(c.listarAlunosParaBusca());
  assert.deepStrictEqual(r[0],{linha:2,numeroUsp:'9000001',nome:'Ana Teste',ingresso:'2024/1',email:'ana@exemplo.invalid',emailSecundario:''});
  assert.strictEqual(r.length,3);assert.strictEqual(r[1].linha,4);assert(!JSON.stringify(r).includes('pasta-1'))});
t('lista: cabeçalho com espaços nas pontas',()=>{const a=alunos();a.vals[0][3]=' eMail ';const {c}=ambiente({},a);assert.strictEqual(c.listarAlunosParaBusca()[0].email,'ana@exemplo.invalid')});
t('lista: "Tr eMail" antigo não é aceito',()=>{const a=alunos();a.vals[0][3]='Tr eMail';const {c}=ambiente({},a);assert.throws(()=>c.listarAlunosParaBusca(),/coluna "eMail"/)});
t('lista: falta Ingresso',()=>{const a=alunos();a.vals[0][2]='Outro';const {c}=ambiente({},a);assert.throws(()=>c.listarAlunosParaBusca(),/coluna "Ingresso"/)});
t('sem propriedade',()=>{const c=run({},{});assert.throws(()=>c.listarAlunosParaBusca(),/Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID/)});
t('chave ausente',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['X','y']])]});assert.throws(()=>c.listarAlunosParaBusca(),/Não encontrei a chave "PLANILHA_ALUNOS"/)});
t('id vazio',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['PLANILHA_ALUNOS','']])]});assert.throws(()=>c.listarAlunosParaBusca(),/coluna "ID de Produção" está vazia/)});
t('fallback primeira aba do índice',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Outra',indice().vals)],ALU:[alunos()]});assert.strictEqual(c.listarAlunosParaBusca().length,3)});
t('planilha vazia',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[indice()],ALU:[sheet('A',[CAB])]});assert.deepStrictEqual(Array.from(c.listarAlunosParaBusca()),[])});
t('comunidade: três cadastros com tipo',()=>{const {c}=ambiente();const r=J(c.listarComunidadeParaBusca());
  assert.deepStrictEqual(r.indisponiveis,[]);assert.strictEqual(r.pessoas.length,3+2+4);
  assert.deepStrictEqual(r.pessoas[0],{tipo:'aluno',linha:2,numeroUsp:'9000001',nome:'Ana Teste',ingresso:'2024/1',email:'ana@exemplo.invalid',emailSecundario:''});
  assert.deepStrictEqual(r.pessoas.filter(p=>p.tipo==='docente'),[{tipo:'docente',linha:2,numeroUsp:'9200001',nome:'Roberto Docente',email:'roberto@exemplo.invalid',emailSecundario:''},{tipo:'docente',linha:4,numeroUsp:'',nome:'Helena Sem Email',email:'',emailSecundario:''}]);
  assert(!JSON.stringify(r).includes('"M"')&&!JSON.stringify(r).includes('Prof'),'gênero/tratamento não vão na lista');
  const srv=r.pessoas.filter(p=>p.tipo==='servidor'||p.tipo==='setor');
  assert.deepStrictEqual(srv[0],{tipo:'servidor',linha:2,numeroUsp:'9100001',nome:'Marcos Servidor',email:'marcos@exemplo.invalid',emailSecundario:'',setor:'Serviço de Graduação'});
  assert.deepStrictEqual(srv.map(p=>p.tipo+':'+(p.nome||p.setor)),['servidor:Marcos Servidor','setor:Serviço de Graduação','setor:Biblioteca','setor:Secretaria do Departamento X']);
  assert(!JSON.stringify(r).includes('pasta-s'))});
t('servidores: TIPO prevalece sobre a regra pelo nome',()=>{const s=servidores();s.vals[1][4]='setor';s.vals[2][4]='Servidor';s.vals[3][4]='SERVIDOR';const {c}=ambiente({},null,{SRV:[s]});const r=J(c.listarComunidadeParaBusca()).pessoas.filter(p=>p.setor);
  assert.deepStrictEqual(r.map(p=>p.tipo),['setor','servidor','servidor','setor']);assert.strictEqual(r[0].numeroUsp,'','setor não tem nº USP')});
t('servidores sem coluna TIPO e com títulos em outra ordem',()=>{const {c}=ambiente({},null,{SRV:[sheet('P',[['NOME','e-mail ','SETOR'],['Ana Servidora','ana.s@exemplo.invalid','Seção X'],['Seção X','secx@exemplo.invalid','Seção X']])]});
  const r=J(c.listarComunidadeParaBusca()).pessoas.filter(p=>p.setor);assert.deepStrictEqual(r.map(p=>p.tipo+':'+p.email),['servidor:ana.s@exemplo.invalid','setor:secx@exemplo.invalid'])});
t('docentes sem coluna obrigatória viram indisponíveis',()=>{const {c}=ambiente({},null,{DOC:[sheet('P',[['N. USP','NOME'],['1','X']])]});const r=J(c.listarComunidadeParaBusca());
  assert.deepStrictEqual(r.indisponiveis.map(i=>i.descricao),['docentes']);assert(/planilha de docentes precisa ter uma coluna "E-mail"/.test(r.indisponiveis[0].motivo))});
t('setor: regra (nome vazio, igual ao setor, início da lista)',()=>{const {c}=ambiente();
  [['','X',true],['serviço de graduacao','Serviço de Graduação',true],['Seção de Alunos','',true],['Biblioteca','',true],['Ana Secretaria','Secretaria',false],['Servidora Teste','',false],['Setorial Silva','',false]]
  .forEach(([n,st,e])=>assert.strictEqual(c.ehSetor_(n,st),e,n))});
t('comunidade: cadastro indisponível não derruba os outros',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['PLANILHA_ALUNOS','ALU'],['SERVIDORES','SRV_SEM_ACESSO_1234567890123456789012345']])],ALU:[alunos()]});
  const r=J(c.listarComunidadeParaBusca());assert.strictEqual(r.pessoas.length,3);
  assert.deepStrictEqual(r.indisponiveis.map(i=>i.descricao),['docentes','servidores']);
  assert(/Não encontrei a chave "PLANILHA_DOCENTES"/.test(r.indisponiveis[0].motivo));assert(!JSON.stringify(r.indisponiveis).includes('1234567890123'))});
t('comunidade: sem alunos, mas com servidores',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['SERVIDORES','SRV']])],SRV:[servidores()]});
  const r=J(c.listarComunidadeParaBusca());assert.strictEqual(r.pessoas.length,4);assert.deepStrictEqual(r.indisponiveis.map(i=>i.descricao),['alunos','docentes'])});
t('comunidade: nenhum cadastro → erro original',()=>{const c=run({},{});assert.throws(()=>c.listarComunidadeParaBusca(),/Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID/)});
t('comunidade: cadastros vazios',()=>{const {c}=ambiente({},null,{SRV:[sheet('P',[CAB_SRV])],DOC:[sheet('P',[])]});const r=J(c.listarComunidadeParaBusca());assert.strictEqual(r.pessoas.length,3);assert.deepStrictEqual(r.indisponiveis,[])});
t('doGet template e include_',()=>{const c=run({},{});assert.strictEqual(c.doGet().n,'BuscaAlunosApp');assert(c.include_('GradipTema').includes('gradip-theme'))});

t('ficha: todas as colunas, ID da Pasta somente leitura, editor',()=>{const {c}=ambiente(editor);const f=J(c.obterFichaAluno({linha:2,numeroUsp:'9000001',nome:'Ana Teste'}));
  assert.strictEqual(f.campos.length,6);assert.strictEqual(f.podeEditar,true);
  assert.deepStrictEqual(f.campos.find(x=>x.titulo==='ID da Pasta'),{titulo:'ID da Pasta',valor:'pasta-1',editavel:false});
  assert.strictEqual(f.campos.find(x=>x.titulo==='eMail').editavel,true)});
t('ficha: não editor / sem e-mail / getEditors negado',()=>{
  assert.strictEqual(ambiente({usuario:'x@exemplo.invalid',editores:['y@exemplo.invalid']}).c.obterFichaAluno({linha:2,numeroUsp:'9000001',nome:'Ana Teste'}).podeEditar,false);
  assert.strictEqual(ambiente({editores:['y@exemplo.invalid']}).c.obterFichaAluno({linha:2,numeroUsp:'9000001',nome:'Ana Teste'}).podeEditar,false);
  assert.strictEqual(ambiente({usuario:'y@exemplo.invalid',editoresErro:true}).c.obterFichaAluno({linha:2,numeroUsp:'9000001',nome:'Ana Teste'}).podeEditar,false)});
t('ficha: dono conta como editor',()=>{assert.strictEqual(ambiente({usuario:'Dono@Exemplo.invalid',dono:'dono@exemplo.invalid'}).c.obterFichaAluno({linha:2,numeroUsp:'9000001',nome:'Ana Teste'}).podeEditar,true)});
t('ficha: linha de outro aluno é recusada',()=>{const {c}=ambiente(editor);assert.throws(()=>c.obterFichaAluno({linha:2,numeroUsp:'9000003',nome:'Carla Exemplo'}),/planilha de alunos mudou/)});
t('ficha: linha inválida',()=>{const {c}=ambiente(editor);[0,1,99,'abc',2.5].forEach(l=>assert.throws(()=>c.obterFichaAluno({linha:l}),/Não encontrei esse aluno/))});
t('ficha: célula com fórmula fica bloqueada',()=>{const {c}=ambiente(editor,alunos({formulas:{'2:4':'=A1'}}));assert.strictEqual(c.obterFichaAluno({linha:2,numeroUsp:'9000001',nome:'Ana Teste'}).campos[3].editavel,false)});

const ref={linha:2,numeroUsp:'9000001',nome:'Ana Teste'};
const pedido=(novos,originais)=>Object.assign({},ref,{novos,originais});
t('salvar: grava só o que mudou e devolve resumo',()=>{const {c,aba}=ambiente(editor);
  const f=J(c.salvarFichaAluno(pedido({'eMail':'ana.nova@exemplo.invalid','Ingresso':'2024/1'},{'eMail':'ana@exemplo.invalid','Ingresso':'2024/1'})));
  assert.deepStrictEqual(aba.escritas,[[2,4,'ana.nova@exemplo.invalid']]);assert.strictEqual(f.alterados,1);
  assert.strictEqual(f.resumo.email,'ana.nova@exemplo.invalid');assert.strictEqual(f.resumo.linha,2);assert.strictEqual(f.resumo.tipo,'aluno')});
t('salvar: mantém número em coluna numérica',()=>{const {c,aba}=ambiente(editor);c.salvarFichaAluno(pedido({'Número USP':'9000009'},{'Número USP':'9000001'}));assert.strictEqual(aba.vals[1][0],9000009)});
t('salvar: sem permissão',()=>{const {c,aba}=ambiente({usuario:'x@exemplo.invalid',editores:[]});assert.throws(()=>c.salvarFichaAluno(pedido({'eMail':'n@exemplo.invalid'},{'eMail':'ana@exemplo.invalid'})),/não tem permissão/);assert.strictEqual(aba.escritas.length,0)});
t('salvar: conflito com outra pessoa',()=>{const {c,aba}=ambiente(editor);aba.vals[1][3]='mudou@exemplo.invalid';assert.throws(()=>c.salvarFichaAluno(pedido({'eMail':'n@exemplo.invalid'},{'eMail':'ana@exemplo.invalid'})),/alterado por outra pessoa/);assert.strictEqual(aba.escritas.length,0)});
t('salvar: linha mudou de aluno',()=>{const {c,aba}=ambiente(editor);aba.vals[1][1]='Outro Nome';assert.throws(()=>c.salvarFichaAluno(pedido({'eMail':'n@exemplo.invalid'},{'eMail':'ana@exemplo.invalid'})),/planilha de alunos mudou/)});
t('salvar: ID da Pasta e fórmula recusados',()=>{const {c,aba}=ambiente(editor,alunos({formulas:{'2:6':'=X'}}));
  assert.throws(()=>c.salvarFichaAluno(pedido({'ID da Pasta':'z'},{'ID da Pasta':'pasta-1'})),/não pode ser alterada/);
  assert.throws(()=>c.salvarFichaAluno(pedido({'eMail Secundario':'z@exemplo.invalid'},{'eMail Secundario':''})),/não pode ser alterada/);assert.strictEqual(aba.escritas.length,0)});
t('salvar: coluna inexistente',()=>{const {c}=ambiente(editor);assert.throws(()=>c.salvarFichaAluno(pedido({'Senha':'x'},{'Senha':''})),/não existe/)});
t('salvar: validações de formato',()=>{const {c,aba}=ambiente(editor);
  [[{'Ingresso':'2024-1'},{'Ingresso':'2024/1'},/AAAA\/S/],[{'Ingresso':'2024/3'},{'Ingresso':'2024/1'},/AAAA\/S/],[{'Número USP':'12a'},{'Número USP':'9000001'},/só dígitos/],
   [{'eMail':'semarroba'},{'eMail':'ana@exemplo.invalid'},/e-mail válido/],[{'Nome do Aluno':'  '},{'Nome do Aluno':'Ana Teste'},/não pode ficar vazio/]]
  .forEach(([n,o,re])=>assert.throws(()=>c.salvarFichaAluno(pedido(n,o)),re));assert.strictEqual(aba.escritas.length,0)});
t('salvar: secundário pode ser apagado',()=>{const a=alunos();a.vals[1][5]='sec@exemplo.invalid';const {c}=ambiente(editor,a);c.salvarFichaAluno(pedido({'eMail Secundario':''},{'eMail Secundario':'sec@exemplo.invalid'}));assert.strictEqual(a.vals[1][5],'')});
t('salvar: caracteres de controle removidos e limite de tamanho',()=>{const {c,aba}=ambiente(editor);c.salvarFichaAluno(pedido({'Nome do Aluno':'Ana\u0007 Nova'+'x'.repeat(900)},{'Nome do Aluno':'Ana Teste'}));assert.strictEqual(aba.vals[1][1].length,500);assert(!aba.vals[1][1].includes('\u0007'))});
// ---------- v1.3: ficha de docentes, servidores e setores ----------
const refDoc={cadastro:'docentes',linha:2,nome:'Roberto Docente',email:'roberto@exemplo.invalid'};
const refSrv={cadastro:'servidores',linha:2,nome:'Marcos Servidor',email:'marcos@exemplo.invalid'};
t('ficha docente: sem TRATAMENTO, com tratamento calculado e ID da Pasta só leitura',()=>{const {c}=ambiente(editor);const f=J(c.obterFicha(refDoc));
  assert.deepStrictEqual(f.campos.map(x=>x.titulo),['N. USP','NOME','M / F','E-mail','ID da Pasta','eMail Secundario']);assert.strictEqual(f.tratamento,'Prof.');assert.strictEqual(f.cadastro,'docentes');
  assert.strictEqual(f.campos.find(x=>x.titulo==='ID da Pasta').editavel,false);assert.strictEqual(f.podeEditar,true);
  const h=J(c.obterFicha({cadastro:'docentes',linha:4,nome:'Helena Sem Email',email:''}));assert.strictEqual(h.tratamento,'Profª.')});
t('ficha docente: identidade nome + e-mail',()=>{const {c}=ambiente(editor);assert.throws(()=>c.obterFicha(Object.assign({},refDoc,{email:'outro@exemplo.invalid'})),/planilha de docentes mudou/);assert.throws(()=>c.obterFicha({cadastro:'docentes',linha:9}),/Não encontrei esse docente/)});
t('ficha: cadastro desconhecido',()=>{const {c}=ambiente(editor);['x','constructor','__proto__',undefined].forEach(k=>assert.throws(()=>c.obterFicha({cadastro:k,linha:2}),/Cadastro desconhecido/))});
t('salvar docente: M / F em maiúscula, tratamento novo e resumo',()=>{const {c}=ambiente(editor);const f=J(c.salvarFicha(Object.assign({},refDoc,{novos:{'M / F':'f','N. USP':'9200009'},originais:{'M / F':'M','N. USP':'9200001'}})));
  assert.strictEqual(f.tratamento,'Profª.');assert.strictEqual(f.alterados,2);assert.deepStrictEqual(f.resumo,{tipo:'docente',linha:2,numeroUsp:'9200009',nome:'Roberto Docente',email:'roberto@exemplo.invalid',emailSecundario:''})});
t('salvar docente: validações e TRATAMENTO bloqueado',()=>{const {c}=ambiente(editor);const d=(n,o)=>c.salvarFicha(Object.assign({},refDoc,{novos:n,originais:o}));
  assert.throws(()=>d({'M / F':'X'},{'M / F':'M'}),/aceita só M ou F/);assert.throws(()=>d({'NOME':''},{'NOME':'Roberto Docente'}),/"NOME" não pode ficar vazio/);
  assert.throws(()=>d({'E-mail':'semarroba'},{'E-mail':'roberto@exemplo.invalid'}),/e-mail válido/);assert.throws(()=>d({'TRATAMENTO':'Dr.'},{'TRATAMENTO':'Prof. Roberto Docente'}),/não pode ser alterada/);
  assert.throws(()=>d({'ID da Pasta':'z'},{'ID da Pasta':''}),/não pode ser alterada/)});
t('salvar servidor: TIPO vira SETOR e resumo muda de tipo',()=>{const {c}=ambiente(editor);const f=J(c.salvarFicha(Object.assign({},refSrv,{novos:{'TIPO':'setor'},originais:{'TIPO':'SERVIDOR'}})));
  assert.strictEqual(f.resumo.tipo,'setor');assert.strictEqual(f.campos.find(x=>x.titulo==='TIPO').valor,'SETOR');
  const {c:c2}=ambiente(editor);assert.throws(()=>c2.salvarFicha(Object.assign({},refSrv,{novos:{'TIPO':'chefe'},originais:{'TIPO':'SERVIDOR'}})),/SERVIDOR ou SETOR/)});
t('salvar servidor: nº USP numérico continua número; permissão é da planilha de servidores',()=>{const s=servidores();const {c}=ambiente(editor,null,{SRV:[s]});c.salvarFicha(Object.assign({},refSrv,{novos:{'N.USP':'9100002'},originais:{'N.USP':'9100001'}}));assert.strictEqual(s.vals[1][3],9100002);
  const {c:c2}=ambiente({usuario:'x@exemplo.invalid',editores:[]});assert.throws(()=>c2.salvarFicha(Object.assign({},refSrv,{novos:{'Setor':'Y'},originais:{'Setor':'Serviço de Graduação'}})),/alterar a planilha de servidores/)});
t('ficha de setor (TIPO = SETOR)',()=>{const {c}=ambiente(editor);const f=J(c.obterFicha({cadastro:'servidores',linha:3,nome:'Serviço de Graduação',email:'graduacao@exemplo.invalid'}));assert.strictEqual(f.campos.length,7);assert(!('tratamento' in f))});
t('salvar: trava ocupada',()=>{const {c}=ambiente(Object.assign({travaOcupada:true},editor));assert.throws(()=>c.salvarFichaAluno(pedido({'eMail':'n@exemplo.invalid'},{'eMail':'ana@exemplo.invalid'})),/Outra gravação/)});

t('pdf: gera, escapa HTML e nomeia arquivo',()=>{const {c}=ambiente();const r=c.gerarPdfListaAlunos({titulo:'Alunos — ingresso 2024',nomeArquivo:'alunos_ingresso-2024',linhas:[{vinculo:'Aluno',nome:'<script>x</script>',numeroUsp:'1',ingresso:'2024/1',email:'a@exemplo.invalid',emailSecundario:''},{vinculo:'Servidor',nome:'M',setor:'Seção Y',email:'m@exemplo.invalid'}]});
  const html=Buffer.from(r.base64,'base64').toString();assert(html.startsWith('%PDF'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>x'));assert.strictEqual(r.nome,'alunos_ingresso-2024.pdf');
  assert(html.includes('<th>Vínculo</th><th>Nome</th><th>Setor</th>'));assert(html.includes('<td>Servidor</td><td>M</td><td>Seção Y</td>'));assert(html.includes('2 pessoas'))});
t('pdf: lista vazia e acima do limite',()=>{const {c}=ambiente();assert.throws(()=>c.gerarPdfListaAlunos({linhas:[]}),/Não há pessoas/);assert.throws(()=>c.gerarPdfListaAlunos({linhas:new Array(5001).fill({})}),/mais de 5000/)});
t('pdf: nome de arquivo saneado e padrão',()=>{const {c}=ambiente();assert.strictEqual(c.gerarPdfListaAlunos({nomeArquivo:'../x y',linhas:[{}]}).nome,'.._x_y.pdf');assert.strictEqual(c.gerarPdfListaAlunos({linhas:[{}]}).nome,'comunidade-ipusp.pdf')});

t('diagnóstico sem dados pessoais',()=>{const {c}=ambiente();c.diagnosticarComunidadeIPUSP();const L=c.logs.join('\n');assert(!/Ana|Marcos|Roberto|9000001|exemplo|pasta-1|\bIDX\b|\bALU\b|\bSRV\b|\bDOC\b/.test(L),L);assert(/alunos — coluna "Ingresso": ok/.test(L));
  assert(/Chave SERVIDORES: encontrada/.test(L)&&/servidores — coluna "TIPO": ok/.test(L),L);assert(/docentes — coluna "M \/ F": ok/.test(L),L);
  assert(/docentes — coluna "TRATAMENTO": presente, mas não é mais usada/.test(L),L);
  assert(/enviadas à busca: 3 alunos, 2 docentes, 1 servidores, 3 setores/.test(L),L)});
t('diagnóstico com cadastro indisponível',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['PLANILHA_ALUNOS','ALU']])],ALU:[alunos()]});c.diagnosticarComunidadeIPUSP();const L=c.logs.join('\n');
  assert(/Chave SERVIDORES: NÃO DISPONÍVEL/.test(L));assert(/Cadastros indisponíveis: docentes, servidores/.test(L),L)});
t('diagnóstico sem propriedade',()=>{const c=run({},{});c.diagnosticarComunidadeIPUSP();assert(/AUSENTE/.test(c.logs[0]))});
t('nenhum log em operações normais',()=>{const {c}=ambiente(editor);c.listarComunidadeParaBusca();c.listarAlunosParaBusca();c.obterFicha(refDoc);c.salvarFicha(Object.assign({},refSrv,{novos:{'Setor':'Y'},originais:{'Setor':'Serviço de Graduação'}}));c.obterFichaAluno(ref);c.salvarFichaAluno(pedido({'eMail':'n@exemplo.invalid'},{'eMail':'ana@exemplo.invalid'}));assert.strictEqual(c.logs.length,0)});

console.log(`${ok}/${ok+fail}`);process.exit(fail?1:0);

// Testes do backend da Busca de Alunos (Codigo.gs) com SpreadsheetApp,
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
const indice=()=>sheet('Página1',[['Chave','Tipo','ID de Produção','Homologação'],['OUTRA','spreadsheet','x',''],['PLANILHA_ALUNOS','spreadsheet','ALU','HOM']]);
const CAB=['Número USP','Nome do Aluno','Ingresso','eMail','ID da Pasta','eMail Secundario'];
const alunos=(opts)=>sheet('Alunos',[CAB.slice(),
  [9000001,'Ana Teste','2024/1','ana@exemplo.invalid','pasta-1',''],
  ['','','','','',''],
  ['','Bruno Ficticio','2023/2','','','b@exemplo.invalid'],
  [9000003,'Carla Exemplo','2024/2','carla@exemplo.invalid','','']],opts);
function ambiente(opts={},alu){const a=alu||alunos();return {aba:a,c:run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[indice()],ALU:[a]},opts)};}
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
  assert.strictEqual(f.resumo.email,'ana.nova@exemplo.invalid');assert.strictEqual(f.resumo.linha,2)});
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
t('salvar: trava ocupada',()=>{const {c}=ambiente(Object.assign({travaOcupada:true},editor));assert.throws(()=>c.salvarFichaAluno(pedido({'eMail':'n@exemplo.invalid'},{'eMail':'ana@exemplo.invalid'})),/Outra gravação/)});

t('pdf: gera, escapa HTML e nomeia arquivo',()=>{const {c}=ambiente();const r=c.gerarPdfListaAlunos({titulo:'Alunos — ingresso 2024',nomeArquivo:'alunos_ingresso-2024',linhas:[{nome:'<script>x</script>',numeroUsp:'1',ingresso:'2024/1',email:'a@exemplo.invalid',emailSecundario:''}]});
  const html=Buffer.from(r.base64,'base64').toString();assert(html.startsWith('%PDF'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>x'));assert.strictEqual(r.nome,'alunos_ingresso-2024.pdf')});
t('pdf: lista vazia e acima do limite',()=>{const {c}=ambiente();assert.throws(()=>c.gerarPdfListaAlunos({linhas:[]}),/Não há alunos/);assert.throws(()=>c.gerarPdfListaAlunos({linhas:new Array(5001).fill({})}),/mais de 5000/)});
t('pdf: nome de arquivo saneado',()=>{const {c}=ambiente();assert.strictEqual(c.gerarPdfListaAlunos({nomeArquivo:'../x y',linhas:[{}]}).nome,'.._x_y.pdf')});

t('diagnóstico sem dados pessoais',()=>{const {c}=ambiente();c.diagnosticarBuscaAlunos();const L=c.logs.join('\n');assert(!/Ana|9000001|exemplo|pasta-1|\bIDX\b|\bALU\b/.test(L),L);assert(/Coluna "Ingresso": ok/.test(L));assert(/enviados à busca: 3/.test(L))});
t('diagnóstico sem propriedade',()=>{const c=run({},{});c.diagnosticarBuscaAlunos();assert(/AUSENTE/.test(c.logs[0]))});
t('nenhum log em operações normais',()=>{const {c}=ambiente(editor);c.listarAlunosParaBusca();c.obterFichaAluno(ref);c.salvarFichaAluno(pedido({'eMail':'n@exemplo.invalid'},{'eMail':'ana@exemplo.invalid'}));assert.strictEqual(c.logs.length,0)});

console.log(`${ok}/${ok+fail}`);process.exit(fail?1:0);

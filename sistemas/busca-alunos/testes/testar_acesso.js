// Testes de autorização do Gerenciador de Pessoas / Comunidade IPUSP v1.4
// (PessoasAcesso.gs + conferências em Codigo.gs). Serviços do Apps Script
// simulados; dados 100% sintéticos. Testes negativos: conta sem e-mail,
// conta fora da lista, perfil vazio ou desconhecido, lista indisponível,
// LEITOR tentando gravar, ADMINISTRADOR que não é editor da planilha e
// chamada direta de cada função pública. Uso: node testar_acesso.js
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SRC=require('path').join(__dirname,'..','src')+'/';

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

// files: id → abas. opts.usuario = e-mail da sessão; opts.editores = editores das planilhas.
function run(props,files,opts={}){
  const logs=[],abertos=[],cache={};
  const ctx={Logger:{log:m=>logs.push(String(m))},
    console:{log:m=>logs.push(String(m)),error:m=>logs.push(String(m)),warn:m=>logs.push(String(m))},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
    SpreadsheetApp:{flush(){},openById:id=>{abertos.push(id);if(!files[id])throw new Error('no access '+id);const f=files[id];
      const ss={getSheetByName:n=>f.find(s=>s.getName()===n)||null,getSheets:()=>f,
        getEditors:()=>(opts.editores||[]).map(e=>({getEmail:()=>e})),getOwner:()=>null};
      f.forEach(s=>s.parent=ss);return ss;}},
    Session:{getActiveUser:()=>({getEmail:()=>{if(opts.sessaoErro)throw new Error('sem sessão');return opts.usuario||''}}),
      getEffectiveUser:()=>({getEmail:()=>'implantador@exemplo.invalid'})},
    CacheService:{getScriptCache:()=>({get:k=>opts.semCache?null:(cache[k]||null),put:(k,v)=>{cache[k]=v}})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
    Utilities:{formatDate:()=>'09/11/2026 às 10:00',base64Encode:b=>Buffer.from(b).toString('base64'),
      newBlob:(html)=>({getAs:()=>({getBytes:()=>Buffer.from('%PDF'+html)})})},
    HtmlService:{createTemplateFromFile:n=>{const t={evaluate:()=>({setTitle(x){this.titulo=x;return this},addMetaTag(){return this},n,dados:Object.assign({},t)})};return t},
      createHtmlOutputFromFile:n=>({getContent:()=>fs.readFileSync(SRC+n+'.html','utf8')})}};
  vm.createContext(ctx);['Codigo.gs','PessoasAcesso.gs','PessoasFilaCadastro.gs'].forEach(f=>vm.runInContext(fs.readFileSync(SRC+f,'utf8'),ctx));
  ctx.logs=logs;ctx.abertos=abertos;ctx.cache=cache;return ctx;
}

const TIT_PERM=['N. USP','Nome','e-mail','Observação','Perfil'];
const permissoes=(linhas,nome='PESSOAS_IPUSP')=>sheet(nome,[TIT_PERM.slice()].concat(linhas));
const PERM_PADRAO=()=>permissoes([
  ['9300001','Lia Leitora','lia@exemplo.invalid','Atendimento','LEITOR'],
  ['9300002','Adão Administrador','adao@exemplo.invalid','Graduação','ADMINISTRADOR'],
  ['','Conta sem perfil','semperfil@exemplo.invalid','',''],
  ['','Perfil estranho','estranho@exemplo.invalid','','EDITOR'],
  ['','Dupla','dupla@exemplo.invalid','','ADMINISTRADOR'],
  ['','Dupla 2','DUPLA@exemplo.invalid','','leitor'],
  ['','Coringa','*@exemplo.invalid','','ADMINISTRADOR'],
  ['','Grupo','equipe','','ADMINISTRADOR'],
  ['','Admin com espaços',' Admin2 @Exemplo.invalid ','','administrador']]);
const CAB=['Número USP','Nome do Aluno','Ingresso','eMail','ID da Pasta','eMail Secundario'];
const alunos=()=>sheet('Alunos',[CAB.slice(),[9000001,'Ana Teste','2024/1','ana@exemplo.invalid','pasta-1',''],[9000003,'Carla Exemplo','2024/2','carla@exemplo.invalid','','']]);
const indice=()=>sheet('Página1',[['Chave','Tipo','ID de Produção','Homologação'],
  ['PLANILHA_ALUNOS','spreadsheet','ALU','ALU_H'],['SERVIDORES','spreadsheet','SRV',''],['PLANILHA_DOCENTES','spreadsheet','DOC',''],
  ['PERMISSOES_DE_ACESSO','spreadsheet','PERM','PERM_H']]);
const CAB_SRV=['E-MAIL','NOME','Setor','N.USP','TIPO','ID da Pasta','eMail Secundario'];
const CAB_DOC=['N. USP','NOME','M / F','E-mail','TRATAMENTO','ID da Pasta','eMail Secundario'];
function ambiente(opts={},extra={},props={}){
  const a=alunos();
  const files=Object.assign({IDX:[indice()],ALU:[a],SRV:[sheet('P',[CAB_SRV.slice(),['m@exemplo.invalid','Marcos','Seção','9100001','SERVIDOR','','']])],
    DOC:[sheet('P',[CAB_DOC.slice(),['9200001','Roberto','M','r@exemplo.invalid','','','']])],PERM:[PERM_PADRAO()]},extra);
  return {aba:a,c:run(Object.assign({ID_INDEX_SPREADSHEET_ID:'IDX'},props),files,opts)};
}
const ref={linha:2,numeroUsp:'9000001',nome:'Ana Teste'};
const pedido=()=>Object.assign({},ref,{novos:{'eMail':'nova@exemplo.invalid'},originais:{'eMail':'ana@exemplo.invalid'}});
const J=x=>JSON.parse(JSON.stringify(x));
const CADASTROS_REAIS=['ALU','SRV','DOC','ALU_H'];
const abriuCadastro=c=>c.abertos.some(id=>CADASTROS_REAIS.includes(id));

// Toda função pública, com um argumento válido.
const PUBLICAS={
  listarAlunosParaBusca:c=>c.listarAlunosParaBusca(),
  listarComunidadeParaBusca:c=>c.listarComunidadeParaBusca(),
  obterFicha:c=>c.obterFicha(Object.assign({cadastro:'alunos'},ref)),
  obterFichaAluno:c=>c.obterFichaAluno(ref),
  salvarFicha:c=>c.salvarFicha(Object.assign({cadastro:'alunos'},pedido())),
  salvarFichaAluno:c=>c.salvarFichaAluno(pedido()),
  gerarPdfListaAlunos:c=>c.gerarPdfListaAlunos({linhas:[{nome:'X'}]}),
  obterFilaCadastro:c=>c.obterFilaCadastro(),
  decidirCadastro:c=>c.decidirCadastro({protocoloId:'PID-1',versao:1,acao:'REJEITAR',motivo:'x'})
};

let ok=0,fail=0;const t=(n,f)=>{try{f();ok++;console.log('ok',n)}catch(e){fail++;console.log('FALHA',n,e.message)}};

// ---------- toda função pública é conferida no servidor ----------
t('o código não tem função pública fora da lista conferida',()=>{
  const src=['Codigo.gs','PessoasAcesso.gs','PessoasFilaCadastro.gs'].map(f=>fs.readFileSync(SRC+f,'utf8')).join('\n');
  const publicas=[...src.matchAll(/^function ([A-Za-z0-9]+)\s*\(/gm)].map(m=>m[1]).filter(n=>!n.endsWith('_')).sort();
  assert.deepStrictEqual(publicas,Object.keys(PUBLICAS).concat(['doGet','diagnosticarComunidadeIPUSP','prepararDecisoesCadastro']).sort())});
t('v1.5: prepararDecisoesCadastro recusa quem abre a página (sessão diferente da conta que executa), mesmo ADMINISTRADOR',()=>{
  ['adao@exemplo.invalid','lia@exemplo.invalid',''].forEach(u=>{const {c}=ambiente({usuario:u});assert.throws(()=>c.prepararDecisoesCadastro(),/só pelo editor/);assert(!c.abertos.length,c.abertos.join(','))})});
t('v1.5: LEITOR não vê a fila nem como contador',()=>{const {c}=ambiente({usuario:'lia@exemplo.invalid'});assert.deepStrictEqual(J(c.obterFilaCadastro()),{visivel:false});assert(!abriuCadastro(c))});

[['sem e-mail na sessão',{},/identificar a sua conta/],
 ['sessão que lança erro',{sessaoErro:true},/identificar a sua conta/],
 ['conta fora da lista',{usuario:'fora@exemplo.invalid'},/não tem acesso/],
 ['perfil vazio',{usuario:'semperfil@exemplo.invalid'},/não tem acesso/],
 ['perfil desconhecido (EDITOR)',{usuario:'estranho@exemplo.invalid'},/não tem acesso/],
 ['linha com coringa não vale',{usuario:'qualquer@exemplo.invalid'},/não tem acesso/],
 ['e-mail do implantador não autoriza',{usuario:'implantador@exemplo.invalid'},/não tem acesso/]
].forEach(([caso,opts,re])=>Object.keys(PUBLICAS).forEach(nome=>t(`negado (${caso}): ${nome} não abre cadastro nem grava`,()=>{
  const {c,aba}=ambiente(Object.assign({editores:['fora@exemplo.invalid','semperfil@exemplo.invalid']},opts));
  assert.throws(()=>PUBLICAS[nome](c),re);assert(!abriuCadastro(c),'abriu cadastro: '+c.abertos.join(','));assert.strictEqual(aba.escritas.length,0)})));

t('erro de acesso tem código (para a página distinguir)',()=>{const {c}=ambiente({usuario:'fora@exemplo.invalid'});
  try{c.listarComunidadeParaBusca();assert.fail('não lançou')}catch(e){assert.strictEqual(e.codigoAcesso,'SEM_ACESSO')}});

// ---------- lista de acesso indisponível: falha fechada ----------
[['planilha de permissões não abre',{PERM:undefined}],
 ['sem a aba PESSOAS_IPUSP',{PERM:[permissoes([['','Adão','adao@exemplo.invalid','','ADMINISTRADOR']],'OUTRA_ABA')]}],
 ['aba com menos de 5 colunas',{PERM:[sheet('PESSOAS_IPUSP',[['N. USP','Nome','e-mail'],['','Adão','adao@exemplo.invalid']])]}],
 ['títulos trocados (C não é e-mail)',{PERM:[sheet('PESSOAS_IPUSP',[['N. USP','Nome','Perfil','Observação','e-mail'],['','Adão','ADMINISTRADOR','','adao@exemplo.invalid']])]}],
 ['chave ausente no ID_INDEX',{IDX:[sheet('Página1',[['Chave','ID de Produção'],['PLANILHA_ALUNOS','ALU']])]}]
].forEach(([caso,extra])=>t(`indisponível (${caso}) → negado, sem abrir cadastro`,()=>{
  const {c,aba}=ambiente({usuario:'adao@exemplo.invalid',editores:['adao@exemplo.invalid']},extra);
  Object.keys(PUBLICAS).forEach(n=>assert.throws(()=>PUBLICAS[n](c),/Não foi possível conferir o seu acesso/,n));
  assert(!abriuCadastro(c));assert.strictEqual(aba.escritas.length,0);
  assert(!c.logs.join('\n').includes('adao@'),'e-mail no registro de execução')}));

// ---------- LEITOR ----------
t('LEITOR: lista, abre ficha sem botão de editar e exporta',()=>{const {c}=ambiente({usuario:'lia@exemplo.invalid',editores:['lia@exemplo.invalid']});
  assert.strictEqual(J(c.listarComunidadeParaBusca()).pessoas.length,4);assert.strictEqual(c.listarAlunosParaBusca().length,2);
  assert.strictEqual(c.obterFichaAluno(ref).podeEditar,false,'leitor que é editor da planilha também não edita aqui');
  assert(c.gerarPdfListaAlunos({linhas:[{nome:'X'}]}).base64)});
t('LEITOR: salvarFicha e salvarFichaAluno recusados sem gravar, mesmo sendo editor da planilha',()=>{
  const {c,aba}=ambiente({usuario:'lia@exemplo.invalid',editores:['lia@exemplo.invalid']});
  assert.throws(()=>c.salvarFichaAluno(pedido()),/somente de consulta/);assert.throws(()=>c.salvarFicha(Object.assign({cadastro:'alunos'},pedido())),/somente de consulta/);
  assert.strictEqual(aba.escritas.length,0);assert(!abriuCadastro(c),'salvar de LEITOR não deve nem abrir o cadastro')});
t('e-mail repetido: vale o menor perfil (LEITOR)',()=>{const {c,aba}=ambiente({usuario:'dupla@exemplo.invalid',editores:['dupla@exemplo.invalid']});
  assert.throws(()=>c.salvarFichaAluno(pedido()),/somente de consulta/);assert.strictEqual(aba.escritas.length,0);assert.strictEqual(c.listarAlunosParaBusca().length,2)});

// ---------- ADMINISTRADOR ----------
t('ADMINISTRADOR editor: edita e grava',()=>{const {c,aba}=ambiente({usuario:'adao@exemplo.invalid',editores:['adao@exemplo.invalid']});
  assert.strictEqual(c.obterFichaAluno(ref).podeEditar,true);c.salvarFichaAluno(pedido());assert.deepStrictEqual(aba.escritas,[[2,4,'nova@exemplo.invalid']])});
t('ADMINISTRADOR que não é editor da planilha: não edita nem grava',()=>{const {c,aba}=ambiente({usuario:'adao@exemplo.invalid',editores:[]});
  assert.strictEqual(c.obterFichaAluno(ref).podeEditar,false);assert.throws(()=>c.salvarFichaAluno(pedido()),/não tem permissão para alterar a planilha/);assert.strictEqual(aba.escritas.length,0)});
t('e-mail com maiúsculas e espaços na sessão e na lista',()=>{const {c}=ambiente({usuario:'ADMIN2@exemplo.invalid',editores:['admin2@exemplo.invalid']});assert.strictEqual(c.obterFichaAluno(ref).podeEditar,true)});
t('e-mail da página é ignorado (só a sessão vale)',()=>{const {c,aba}=ambiente({usuario:'lia@exemplo.invalid',editores:['lia@exemplo.invalid','adao@exemplo.invalid']});
  assert.throws(()=>c.salvarFichaAluno(Object.assign(pedido(),{email:'adao@exemplo.invalid',usuario:'adao@exemplo.invalid',perfil:'ADMINISTRADOR'})),/somente de consulta/);assert.strictEqual(aba.escritas.length,0)});

// ---------- doGet ----------
t('doGet sem acesso: página de aviso, sem abrir cadastro',()=>{
  [[{},'Conta não identificada'],[{usuario:'fora@exemplo.invalid'},'Sem acesso a esta página']].forEach(([o,tit])=>{
    const {c}=ambiente(o);const p=c.doGet();assert.strictEqual(p.n,'PessoasSemAcesso');assert.strictEqual(p.dados.titulo,tit);assert(!abriuCadastro(c))});
  const {c}=ambiente({usuario:'adao@exemplo.invalid'},{PERM:undefined});const p=c.doGet();assert.strictEqual(p.n,'PessoasSemAcesso');assert.strictEqual(p.dados.titulo,'Não foi possível abrir a página')});
t('doGet com LEITOR e ADMINISTRADOR: página principal, sem ler cadastro no doGet',()=>{['lia@exemplo.invalid','adao@exemplo.invalid'].forEach(u=>{
  const {c}=ambiente({usuario:u});const p=c.doGet();assert.strictEqual(p.n,'BuscaAlunosApp');assert(!abriuCadastro(c))})});
t('página sem acesso não tem dado nem chamada ao servidor',()=>{const h=fs.readFileSync(SRC+'PessoasSemAcesso.html','utf8');
  assert(!/google\.script\.run/.test(h));assert(/<\?= titulo \?>/.test(h)&&/<\?= mensagem \?>/.test(h),'título e mensagem com escape (<?= ?>)');assert(!/<\?!= (titulo|mensagem)/.test(h))});

// ---------- cache e registro de execução ----------
t('lista de acesso fica em cache (uma leitura por minuto)',()=>{const {c}=ambiente({usuario:'adao@exemplo.invalid',editores:['adao@exemplo.invalid']});
  c.listarAlunosParaBusca();c.usuarioDaExecucaoPessoas_=null;const antes=c.abertos.filter(i=>i==='PERM').length;c.listarAlunosParaBusca();
  assert.strictEqual(c.abertos.filter(i=>i==='PERM').length,antes);assert(Object.keys(c.cache)[0].startsWith('pessoasPermissoes:v1:producao'))});
t('registro de execução sem e-mails nem nomes',()=>{const {c}=ambiente({usuario:'adao@exemplo.invalid',editores:['adao@exemplo.invalid']});
  c.listarComunidadeParaBusca();c.obterFichaAluno(ref);c.salvarFichaAluno(pedido());assert.strictEqual(c.logs.length,0,c.logs.join('|'))});

// ---------- AMBIENTE ----------
t('homologação: lê a coluna Homologação (permissões e cadastro)',()=>{
  const ah=alunos();ah.vals[1][1]='Ana Homologação';ah.vals.length=2;
  const {c}=ambiente({usuario:'adao@exemplo.invalid',editores:['adao@exemplo.invalid']},{ALU_H:[ah],PERM_H:[PERM_PADRAO()]},{AMBIENTE:'homologacao'});
  const r=c.listarAlunosParaBusca();assert.strictEqual(r.length,1);assert.strictEqual(r[0].nome,'Ana Homologação');
  assert(c.abertos.includes('PERM_H')&&!c.abertos.includes('PERM')&&!c.abertos.includes('ALU'),c.abertos.join(','))});
t('homologação: coluna vazia não cai para a produção',()=>{const {c}=ambiente({usuario:'adao@exemplo.invalid',editores:['adao@exemplo.invalid']},{ALU_H:[alunos()],PERM_H:[PERM_PADRAO()]},{AMBIENTE:'homologacao'});
  const r=J(c.listarComunidadeParaBusca());assert.deepStrictEqual(r.pessoas.map(p=>p.tipo),['aluno','aluno'],'nenhum servidor/docente de produção');
  assert.deepStrictEqual(r.indisponiveis.map(i=>i.descricao),['docentes','servidores']);
  assert(/coluna "Homologação" está vazia/.test(r.indisponiveis[0].motivo));assert(!c.abertos.includes('SRV')&&!c.abertos.includes('DOC'))});
t('homologação: permissões sem ID de homologação → negado',()=>{const ix=indice();ix.vals[4][3]='';const {c}=ambiente({usuario:'adao@exemplo.invalid'},{IDX:[ix]},{AMBIENTE:'homologacao'});
  assert.throws(()=>c.listarAlunosParaBusca(),/conferir o seu acesso/);assert(!c.abertos.includes('PERM'))});
t('AMBIENTE inválido → negado',()=>{const {c}=ambiente({usuario:'adao@exemplo.invalid'},{},{AMBIENTE:'teste'});assert.throws(()=>c.listarAlunosParaBusca(),/conferir o seu acesso/);assert(!abriuCadastro(c))});
t('título da página em homologação',()=>{const {c}=ambiente({usuario:'adao@exemplo.invalid'},{PERM_H:[PERM_PADRAO()]},{AMBIENTE:'homologacao'});assert(/^\[HOMOLOGAÇÃO\] /.test(c.doGet().titulo))});

// ---------- diagnóstico ----------
t('diagnóstico: sem acesso não lê cadastros nem registra e-mail',()=>{const {c}=ambiente({usuario:'lia@exemplo.invalid'});c.diagnosticarComunidadeIPUSP();const L=c.logs.join('\n');
  assert(/Acesso da conta que está rodando \(aba PESSOAS_IPUSP\): LEITOR/.test(L),L);assert(/exige o perfil ADMINISTRADOR/.test(L));assert(!abriuCadastro(c));assert(!/@/.test(L),L)});
t('diagnóstico: ADMINISTRADOR vê contagens, sem dados pessoais',()=>{const {c}=ambiente({usuario:'adao@exemplo.invalid'});c.diagnosticarComunidadeIPUSP();const L=c.logs.join('\n');
  assert(/Ambiente: producao/.test(L));assert(/enviadas à busca: 2 alunos, 1 docentes, 1 servidores, 0 setores/.test(L),L);assert(!/@|Ana|Adão|9000001/.test(L),L)});

console.log(`${ok} ok, ${fail} falha(s).`);process.exit(fail?1:0);

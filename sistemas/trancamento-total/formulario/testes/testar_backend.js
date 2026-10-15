// Testes do backend do formulário de Pedido de Trancamento Total (Codigo.gs)
// com SpreadsheetApp, PropertiesService, CacheService, LockService, Session e
// Utilities simulados. Dados 100% sintéticos. Uso: node testar_backend.js
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SRC=require('path').join(__dirname,'..','src')+'/';
function sheet(name,vals){
  const s={vals,getName:()=>name,getLastRow:()=>vals.length,getLastColumn:()=>vals[0]?vals[0].length:0,
    getDataRange:()=>s.getRange(1,1,vals.length,vals[0].length),
    appendRow:l=>{vals.push(l.slice())},
    getRange:(r,c,nr=1,nc=1)=>({
      getValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc)),
      getDisplayValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc).map(v=>v==null?'':String(v)))})};
  return s;
}
function run(props,files,opts={}){
  const logs=[],cache={};
  const ctx={console,Date,Logger:{log:m=>logs.push(String(m))},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v}})},
    SpreadsheetApp:{openById:id=>{if(!files[id])throw new Error('no access '+id);const f=files[id];return {getSheetByName:n=>f.find(s=>s.getName()===n)||null,getSheets:()=>f}}},
    Session:{getActiveUser:()=>({getEmail:()=>opts.usuario===undefined?'ana@usp.br':opts.usuario})},
    LockService:{getScriptLock:()=>({tryLock:()=>!opts.travaOcupada,releaseLock(){}})},
    Utilities:{formatDate:()=>'02/03/2026 10:00'},
    HtmlService:{createTemplateFromFile:()=>({evaluate:()=>({setTitle(){return this},addMetaTag(){return this}})})}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(SRC+'Codigo.gs','utf8'),ctx);ctx.logs=logs;return ctx;
}
const PERG='Está ciente de todas as informações pertinentes e confirma o trancamento total de matrícula a partir do semestre vigente?';
const CAB=['Situação','Carimbo de data/hora','Endereço de e-mail','Nome Completo','Número USP','Ano de Ingresso','E-mail para contato','Justificativa',PERG,'Registro ID','Versão'];
const respostas=()=>sheet('Respostas',[CAB.slice(),['Concluído','01/08/2025','ana@usp.br','Ana Teste','9000001','2023','','Motivo','Sim','00000000-0000-4000-8000-000000000001',2],['pendente','01/09/2025','outro@usp.br','Outro','9000009','2022','','x','Sim','',1]]);
const alunos=()=>sheet('Alunos',[['Número USP','Nome do Aluno','Ingresso','eMail','ID da Pasta','eMail Secundario'],[9000001,'Ana Teste','2023/1','ana@exemplo.invalid','pasta','ana@usp.br'],[9000002,'Bruno Ficticio','2024/2','bruno@usp.br','','']]);
const indice=()=>sheet('Página1',[['Chave','Tipo','ID de Produção'],['PLANILHA_ALUNOS','spreadsheet','ALU'],['TRANCAMENTO_TOTAL_MATRICULA','spreadsheet','RESP']]);
function amb(opts={},extra={}){const r=extra.RESP||respostas();return {r,c:run({ID_INDEX_SPREADSHEET_ID:'IDX'},Object.assign({IDX:[indice()],ALU:[alunos()],RESP:[r]},extra.files||{}),opts)};}
const pedido=(o={})=>Object.assign({nome:'Ana Teste',nUsp:'9000001',anoIngresso:'2023',emailContato:'ana@exemplo.invalid',justificativa:'Motivo novo',confirmacao:'Sim'},o);
const J=x=>JSON.parse(JSON.stringify(x));
let ok=0,fail=0;const t=(n,f)=>{try{f();ok++;console.log('ok',n)}catch(e){fail++;console.log('FALHA',n,e.stack.split('\n').slice(0,2).join(' '))}};

t('carga: aluno achado pelo eMail Secundario, histórico só do próprio e-mail',()=>{const {c}=amb();const d=J(c.obterDadosIniciais());
  assert.deepStrictEqual(d,{autenticado:true,encontrado:true,email:'ana@usp.br',nUsp:'9000001',nome:'Ana Teste',anoIngresso:'2023',historico:[{carimbo:'01/08/2025',situacao:'Concluído'}]})});
t('carga: aluno pelo eMail principal',()=>{const {c}=amb({usuario:'Bruno@USP.br'});const d=c.obterDadosIniciais();assert.strictEqual(d.nome,'Bruno Ficticio');assert.strictEqual(d.anoIngresso,'2024');assert.strictEqual(d.historico.length,0)});
t('carga: fora do domínio bloqueia',()=>{for(const u of ['','x@gmail.com','x@usp.br.evil.com','x@fakeusp.br']){const {c}=amb({usuario:u});assert.strictEqual(c.obterDadosIniciais().autenticado,false,u)}});
t('carga: planilha de alunos fora do ar não bloqueia',()=>{const {c}=amb({},{files:{ALU:undefined}});const r=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[indice()],RESP:[respostas()]});const d=r.obterDadosIniciais();
  assert.strictEqual(d.autenticado,true);assert.strictEqual(d.encontrado,false);assert.strictEqual(d.historico.length,1)});
t('carga: títulos de alunos errados não bloqueiam',()=>{const a=alunos();a.vals[0][1]='Nome';const {c}=amb({},{files:{ALU:[a]}});assert.strictEqual(c.obterDadosIniciais().encontrado,false)});
t('envio grava linha nova com identidade da sessão',()=>{const {c,r}=amb();c.registrarSolicitacao(pedido({nUsp:'90.000-01'}));const l=r.vals[3];
  assert.strictEqual(l[0],'pendente');assert(l[1] instanceof Date);assert.strictEqual(l[2],'ana@usp.br');assert.strictEqual(l[4],'900001'.replace('900001','9000001'));assert.strictEqual(l[8],'Sim');assert.strictEqual(l[9],'');assert.strictEqual(l.length,11)});
t('envio ignora e-mail mandado pelo cliente',()=>{const {c,r}=amb();c.registrarSolicitacao(pedido({email:'outro@usp.br'}));assert.strictEqual(r.vals[3][2],'ana@usp.br')});
t('confirmação achada pelo título mesmo fora da 9ª coluna',()=>{const r=respostas();r.vals.forEach(l=>l.splice(1,0,''));r.vals[0][1]='Extra';const {c}=amb({},{RESP:r});c.registrarSolicitacao(pedido());assert.strictEqual(r.vals[3][9],'Sim');assert.strictEqual(r.vals[3][8],'Motivo novo')});
t('fórmula neutralizada',()=>{const {c,r}=amb();c.registrarSolicitacao(pedido({nome:'=HYPERLINK("x")',justificativa:'+1'}));assert.strictEqual(r.vals[3][3],"'=HYPERLINK(\"x\")");assert.strictEqual(r.vals[3][7],"'+1")});
t('validações',()=>{const {c}=amb();
  assert.throws(()=>c.registrarSolicitacao(pedido({confirmacao:'Não'})),/Só é possível/);
  assert.throws(()=>c.registrarSolicitacao(pedido({anoIngresso:'1999'})),/inválido/);
  assert.throws(()=>c.registrarSolicitacao(pedido({emailContato:'x'})),/inválido/);
  assert.throws(()=>c.registrarSolicitacao(pedido({justificativa:'  '})),/vazia/);
  assert.throws(()=>c.registrarSolicitacao(pedido({justificativa:'a'.repeat(4001)})),/passou de 4000/);
  c.registrarSolicitacao(pedido({justificativa:'a'.repeat(4000)}))});
t('sem login não grava',()=>{const {c,r}=amb({usuario:''});assert.throws(()=>c.registrarSolicitacao(pedido()),/NAO_AUTENTICADO/);assert.strictEqual(r.vals.length,3)});
t('trava ocupada: mensagem clara',()=>{const {c}=amb({travaOcupada:true});assert.throws(()=>c.registrarSolicitacao(pedido()),/Aguarde alguns segundos/)});
t('planilha de respostas sem acesso: mensagem genérica, detalhe só no log',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[indice()],ALU:[alunos()]});
  assert.throws(()=>c.registrarSolicitacao(pedido()),e=>/problema de configuração/.test(e.message)&&!/RESP/.test(e.message));assert(c.logs.some(l=>/RESP/.test(l)))});
t('sem propriedade do ID_INDEX: não grava',()=>{const c=run({},{});assert.throws(()=>c.registrarSolicitacao(pedido()),/problema de configuração/)});
t('coluna obrigatória ausente bloqueia',()=>{const r=respostas();r.vals[0][7]='Motivo';const {c}=amb({},{RESP:r});assert.throws(()=>c.registrarSolicitacao(pedido()),/Justificativa/)});
t('log sem dados pessoais',()=>{const {c}=amb();c.obterDadosIniciais();c.registrarSolicitacao(pedido());assert(!c.logs.join().match(/Ana|usp\.br|9000001/))});
t('sem ID literal de planilha',()=>{const s=fs.readFileSync(SRC+'Codigo.gs','utf8');assert(!/[A-Za-z0-9_-]{40,}/.test(s));assert(!/openById\(\s*["']/.test(s))});
console.log(`\n${ok} ok, ${fail} falha(s)`);process.exit(fail?1:0);

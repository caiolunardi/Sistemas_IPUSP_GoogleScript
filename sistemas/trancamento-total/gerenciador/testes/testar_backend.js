// Testes do backend do Gerenciador de Trancamento Total (Codigo.gs) com
// SpreadsheetApp, PropertiesService, CacheService, LockService, MailApp,
// Session e Utilities simulados. Dados 100% sintéticos. Uso: node testar_backend.js
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SRC=require('path').join(__dirname,'..','src')+'/';
const pad=n=>String(n).padStart(2,'0');
function fmt(d,tz,f){d=new Date(d.getTime()-3*3600e3);const Y=d.getUTCFullYear(),M=pad(d.getUTCMonth()+1),D=pad(d.getUTCDate()),h=pad(d.getUTCHours()),m=pad(d.getUTCMinutes()),s=pad(d.getUTCSeconds());
  return f.replace('yyyy',Y).replace('MM',M).replace('dd',D).replace('HH',h).replace('mm',m).replace('ss',s).replace(/^H$/,String(d.getUTCHours()));}
function sheet(name,vals){
  const s={vals,getName:()=>name,getLastRow:()=>vals.length,getLastColumn:()=>vals[0].length,
    getDataRange:()=>s.getRange(1,1,vals.length,vals[0].length),
    getRange:(r,c,nr=1,nc=1)=>{const grow=()=>{while(vals[0].length<c+nc-1)vals.forEach(l=>l.push(''));};return {
      getValues:()=>{grow();return vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc))},
      getDisplayValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc).map(v=>v==null?'':String(v))),
      getValue:()=>{grow();return vals[r-1][c-1]},
      setValue:v=>{grow();vals[r-1][c-1]=v},
      setValues:m=>{grow();m.forEach((l,i)=>l.forEach((v,j)=>vals[r-1+i][c-1+j]=v))}}}};
  return s;
}
let uuid=0;
function run(props,files,opts={}){
  const logs=[],mails=[],cache={};
  const ctx={console,Date,Logger:{log:m=>logs.push(String(m))},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v}})},
    SpreadsheetApp:{openById:id=>{if(!files[id])throw new Error('no access');const f=files[id];return {getSheetByName:n=>f.find(s=>s.getName()===n)||null,getSheets:()=>f}}},
    LockService:{getScriptLock:()=>({tryLock:()=>!opts.travaOcupada,releaseLock(){}})},
    MailApp:{sendEmail:(to,assunto,corpo)=>{if(opts.antesDoEnvio)opts.antesDoEnvio();if(opts.falhaEnvio)throw new Error('falha de rede');mails.push({to,assunto,corpo})}},
    Utilities:{formatDate:fmt,getUuid:()=>'00000000-0000-4000-8000-'+String(++uuid).padStart(12,'0')},
    HtmlService:{createTemplateFromFile:n=>({evaluate:()=>({setTitle(){return this},addMetaTag(){return this}})})}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(SRC+'Codigo.gs','utf8'),ctx);Object.assign(ctx,{logs,mails});return ctx;
}
const PERG='Está ciente de todas as informações pertinentes e confirma o trancamento total de matrícula a partir do semestre vigente?';
const CAB=['Situação','Carimbo de data/hora','Endereço de e-mail','Nome Completo','Número USP','Ano de Ingresso','E-mail para contato','Justificativa',PERG];
const respostas=()=>sheet('Respostas ao formulário 1',[CAB.slice(),
  ['',new Date('2026-03-02T13:00:00Z'),'ana@exemplo.invalid','Ana Teste',9000001,'2023','','Motivo A','SIM'],
  ['Concluído',new Date('2025-08-10T13:00:00Z'),'bruno@exemplo.invalid','Bruno Ficticio',9000002,'2022','b2@exemplo.invalid','Motivo B','SIM'],
  ['','','','','','','','','']]);
const indice=()=>sheet('Página1',[['Chave','Tipo','ID de Produção'],['OUTRA','spreadsheet','x'],['TRANCAMENTO_TOTAL_MATRICULA','spreadsheet','RESP']]);
function amb(opts,resp){const r=resp||respostas();const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[indice()],RESP:[r]},opts);c.doGet();return {c,r};}
const col=(r,t)=>r.vals[0].indexOf(t);
const J=x=>JSON.parse(JSON.stringify(x));
let ok=0,fail=0;const t=(n,f)=>{try{f();ok++;console.log('ok',n)}catch(e){fail++;console.log('FALHA',n,e.stack.split('\n').slice(0,2).join(' '))}};

t('sem propriedade',()=>{const c=run({},{});assert.throws(()=>c.obterPendentes(),/Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID/)});
t('chave ausente no ID_INDEX',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['X','y']])]});assert.throws(()=>c.obterPendentes(),/Não encontrei a chave "TRANCAMENTO_TOTAL_MATRICULA"/)});
t('ID de Produção vazio',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['TRANCAMENTO_TOTAL_MATRICULA','']])]});assert.throws(()=>c.obterPendentes(),/está vazia/)});
t('planilha sem acesso: mensagem sem ID',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[indice()]});assert.throws(()=>c.obterPendentes(),e=>/chave TRANCAMENTO_TOTAL_MATRICULA/.test(e.message)&&!/RESP/.test(e.message))});
t('doGet migra Registro ID e Versão; pendentes e concluídos',()=>{const {c,r}=amb();assert(col(r,'Registro ID')>0&&col(r,'Versão')>0);
  const p=J(c.obterPendentes());assert.strictEqual(p.length,1);assert.strictEqual(p[0].nome,'Ana Teste');
  const k=J(c.obterConcluidosRecentes());assert.strictEqual(k.length,1);assert.strictEqual(k[0].nome,'Bruno Ficticio');
  assert(!c.logs.join('\n').includes('Ana'),'nome não vai para o log')});
t('concluir sem avisar',()=>{const {c,r}=amb();const p=c.obterPendentes()[0];const res=c.salvarPedido(p.registroId,p.versao,{concluirSolicitacao:true});
  assert.strictEqual(res.versao,2);assert.strictEqual(r.vals[1][0],'Concluído');assert(r.vals[1][col(r,'Data de Conclusão')] instanceof Date);assert.strictEqual(c.mails.length,0)});
t('concluir e avisar: e-mail, carimbo e versão',()=>{const {c,r}=amb();const p=c.obterPendentes()[0];const res=c.salvarPedido(p.registroId,p.versao,{concluirSolicitacao:true,avisarAluno:true});
  assert.strictEqual(c.mails.length,1);assert.strictEqual(c.mails[0].to,'ana@exemplo.invalid');assert(/, Ana\./.test(c.mails[0].corpo));
  assert.strictEqual(r.vals[1][col(r,'E-mail Enviado')],res.emailEnviado);assert.strictEqual(res.versao,3)});
t('versão antiga é recusada',()=>{const {c}=amb();const p=c.obterPendentes()[0];c.salvarPedido(p.registroId,p.versao,{concluirSolicitacao:true});
  assert.throws(()=>c.salvarPedido(p.registroId,p.versao,{}),/alterado por outra sessão/)});
t('durante o envio, outra sessão com a versão antiga não salva por cima',()=>{let c2;const {c,r}=amb({antesDoEnvio:()=>{assert.throws(()=>c.salvarPedido(p.registroId,p.versao,{concluirSolicitacao:false}),/outra sessão/)}});var p=c.obterPendentes()[0];
  c.salvarPedido(p.registroId,p.versao,{concluirSolicitacao:true,avisarAluno:true});assert.strictEqual(r.vals[1][0],'Concluído')});
t('planilha reordenada durante o envio: carimbo vai para a linha certa',()=>{const r=respostas();let c;const res=amb({antesDoEnvio:()=>{const l=r.vals.splice(1,1)[0];r.vals.push(l)}},r);c=res.c;const p=c.obterPendentes()[0];
  c.salvarPedido(p.registroId,p.versao,{concluirSolicitacao:true,avisarAluno:true});const linha=r.vals.find(l=>l[3]==='Ana Teste');
  assert(/^\d{2}\/\d{2}\/\d{4}/.test(linha[col(r,'E-mail Enviado')]));const outra=r.vals.find(l=>l[3]==='Bruno Ficticio');assert.strictEqual(outra[col(r,'E-mail Enviado')]||'','')});
t('falha no envio desfaz a reserva',()=>{const {c,r}=amb({falhaEnvio:true});const p=c.obterPendentes()[0];assert.throws(()=>c.salvarPedido(p.registroId,p.versao,{avisarAluno:true,concluirSolicitacao:true}),/falha de rede/);
  assert.strictEqual(r.vals[1][col(r,'E-mail Enviado')],'')});
t('já avisado pede reenvio; reenviar manda de novo',()=>{const {c,r}=amb();let p=c.obterPendentes()[0];let res=c.salvarPedido(p.registroId,p.versao,{avisarAluno:true,concluirSolicitacao:true});
  assert.throws(()=>c.salvarPedido(p.registroId,res.versao,{avisarAluno:true,concluirSolicitacao:true}),/REENVIO_NECESSARIO/);
  c.salvarPedido(p.registroId,res.versao,{avisarAluno:true,concluirSolicitacao:true,reenviar:true});assert.strictEqual(c.mails.length,2)});
t('reserva recente bloqueia; reserva velha ou sem data pede reenvio',()=>{const {c,r}=amb();const p=c.obterPendentes()[0];const ce=col(r,'E-mail Enviado')<0?(r.vals[0].push('E-mail Enviado'),r.vals.forEach((l,i)=>i&&l.push('')),r.vals[0].length-1):col(r,'E-mail Enviado');
  r.vals[1][ce]=c.novaReserva_();assert.throws(()=>c.salvarPedido(p.registroId,p.versao,{avisarAluno:true}),/envio em andamento/);
  r.vals[1][ce]='ENVIANDO…';assert.throws(()=>c.salvarPedido(p.registroId,p.versao,{avisarAluno:true}),/REENVIO_NECESSARIO: Um envio anterior/);
  r.vals[1][ce]='ENVIANDO… 2026-01-01 10:00:00';assert.throws(()=>c.salvarPedido(p.registroId,p.versao,{avisarAluno:true}),/interrompido/);
  c.salvarPedido(p.registroId,p.versao,{avisarAluno:true,reenviar:true});assert.strictEqual(c.mails.length,1);
  assert.strictEqual(c.obterDetalhe(p.registroId).emailEnviado,r.vals[1][ce])});
t('reabrir limpa Data de Conclusão',()=>{const {c,r}=amb();const k=c.obterConcluidosRecentes()[0];c.salvarPedido(k.registroId,k.versao,{concluirSolicitacao:true});
  const d=c.obterDetalhe(k.registroId);c.salvarPedido(k.registroId,d.versao,{concluirSolicitacao:false});assert.strictEqual(r.vals[2][0],'Pendente');assert.strictEqual(r.vals[2][col(r,'Data de Conclusão')],'')});
t('e-mail inválido não reserva nem envia',()=>{const r=respostas();r.vals[1][2]='sem-arroba';const {c}=amb({},r);const p=c.obterPendentes()[0];assert.throws(()=>c.salvarPedido(p.registroId,p.versao,{avisarAluno:true}),/não parece válido/);assert.strictEqual(c.mails.length,0)});
t('trava ocupada: mensagem clara',()=>{const r=respostas();const {c}=amb({},r);const p=c.obterPendentes()[0];
  const c2=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[indice()],RESP:[r]},{travaOcupada:true});assert.throws(()=>c2.salvarPedido(p.registroId,p.versao,{}),/Outra gravação está em andamento/)});
t('registroId inválido',()=>{const {c}=amb();assert.throws(()=>c.obterDetalhe('../x'),/inválido/)});
t('busca e relatório',()=>{const {c}=amb();assert.strictEqual(c.buscarHistorico('b2@exemplo').length,1);assert.strictEqual(c.buscarHistorico('9000001')[0].situacao,'Pendente');
  const rel=J(c.obterRelatorio());assert.strictEqual(rel.total,2);assert.deepStrictEqual(rel.porAno.map(x=>x.chave),['2026','2025'])});
t('sem ID literal de planilha no código',()=>{const src=fs.readFileSync(SRC+'Codigo.gs','utf8');assert(!/openById\(\s*["']/.test(src));assert(!/[A-Za-z0-9_-]{40,}/.test(src))});
console.log(`\n${ok} ok, ${fail} falha(s)`);process.exit(fail?1:0);

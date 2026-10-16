// Testes do backend do formulário de Pedido de Trancamento Parcial (Codigo.gs)
// com SpreadsheetApp, PropertiesService, CacheService, LockService, Session,
// MailApp, ScriptApp e Utilities simulados. Dados 100% sintéticos.
// Uso: node testar_backend.js
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SRC=require('path').join(__dirname,'..','src')+'/';
function sheet(name,vals){
  const s={vals,getName:()=>name,getLastRow:()=>vals.length,getLastColumn:()=>vals[0]?vals[0].length:0,
    getDataRange:()=>s.getRange(1,1,vals.length,vals[0].length),
    appendRow:l=>{vals.push(l.slice())},
    getRange:(r,c,nr=1,nc=1)=>({
      getValues:()=>vals.slice(r-1,r-1+nr).map(l=>{const x=l.slice(c-1,c-1+nc);while(x.length<nc)x.push('');return x}),
      getDisplayValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc).map(v=>v==null?'':String(v)))})};
  return s;
}
// Utilities.parseDate/formatDate simplificados: fuso de Brasília fixo em -03:00.
function parseBR(txt){const m=txt.match(/^(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d)$/);return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00-03:00`)}
function fmtBR(d,f){const b=new Date(d.getTime()-3*3600e3);const p=n=>String(n).padStart(2,'0');
  const map={yyyy:b.getUTCFullYear(),MM:p(b.getUTCMonth()+1),dd:p(b.getUTCDate()),HH:p(b.getUTCHours()),mm:p(b.getUTCMinutes())};
  return f.replace(/'([^']*)'/g,'\u0001$1\u0001').split('\u0001').map((t,i)=>i%2?t:t.replace(/yyyy|MM|dd|HH|mm/g,k=>map[k])).join('')}
function run(props,files,opts={}){
  const logs=[],cache={},mails=[];
  const ctx={console,Logger:{log:m=>logs.push(String(m))},
    Date:opts.agora?class extends Date{constructor(...a){a.length?super(...a):super(opts.agora)}}:Date,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
    CacheService:{getScriptCache:()=>({get:k=>k in cache?cache[k]:null,put:(k,v)=>{cache[k]=v},
      getAll:ks=>{const o={};ks.forEach(k=>{if(k in cache)o[k]=cache[k]});return o},putAll:o=>{Object.assign(cache,o)}})},
    SpreadsheetApp:{openById:id=>{opts.aberturas&&opts.aberturas.push(id);if(!files[id])throw new Error('no access '+id);const f=files[id];return {getSheetByName:n=>f.find(s=>s.getName()===n)||null,getSheets:()=>f}}},
    Session:{getActiveUser:()=>({getEmail:()=>opts.usuario===undefined?'ana@usp.br':opts.usuario})},
    LockService:{getScriptLock:()=>({tryLock:()=>!opts.travaOcupada,releaseLock(){}})},
    MailApp:{sendEmail:(to,assunto,corpo,o)=>{if(opts.falhaEmail)throw new Error('cota');mails.push({to,assunto,corpo,o})}},
    ScriptApp:{getService:()=>({getUrl:()=>'https://form.teste/exec'})},
    Utilities:{formatDate:(d,tz,f)=>fmtBR(d,f),parseDate:(t)=>parseBR(t)},
    HtmlService:{createTemplateFromFile:()=>({evaluate:()=>({setTitle(){return this},addMetaTag(){return this}})})}};
  ctx.cache=cache;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(SRC+'Codigo.gs','utf8'),ctx);ctx.logs=logs;ctx.mails=mails;return ctx;
}
const CIENCIA='Declaro estar ciente de que logo após o encerramento do período de trancamento parcial de matrícula (entre os dias 06 e 17/04/2026), deverei acessar o meu histórico escolar...';
const CAB=['Situação do Pedido','Carimbo de data/hora','Endereço de e-mail',CIENCIA,'Número USP','Nome','Número de créditos-aula em que está matriculado(a)','Após o trancamento, você ficará com menos de 12 créditos-aula?','Você concluirá o curso neste semestre?','Disciplina 1','Disciplina 2','Disciplina 3','Disciplina 4','Disciplina 5','Disciplina 6','Observações','Justificativa','Detalhe das Disciplinas','Data de Conclusão','Registro ID','Versão','E-mail Enviado'];
const linhaResp=(sit,carimbo,email,d1)=>{const l=new Array(CAB.length).fill('');l[0]=sit;l[1]=carimbo;l[2]=email;l[3]='Ciente';l[9]=d1;return l};
const respostas=()=>sheet('Respostas',[CAB.slice(),linhaResp('Concluído','01/04/2025','ana@usp.br','TST0001 - Teste Antigo'),linhaResp('pendente','02/04/2026','outro@usp.br','TST0002 - Outra')]);
const alunos=()=>sheet('Alunos',[['Número USP','Nome do Aluno','Ingresso','eMail','ID da Pasta','eMail Secundario'],[9000001,'Ana Teste','2023/1','ana@exemplo.invalid','pasta','ana@usp.br'],[9000002,'Bruno Ficticio','2024/2','bruno@usp.br','','']]);
const periodos=(o={})=>sheet('Períodos',[['Formulário','Link','Tipo','A1','HA1','F1','HF1','A2','HA2','F2','HF2'],
  ['Outro formulário','x','Sazonal','01/01/2026','00:00','31/12/2026','23:59','','','',''],
  [o.nome||'Pedido de Trancamento Parcial de Matrícula','link',o.tipo||'Sazonal','06/04/2026','08:00','17/04/2026','23:59','08/09/2026','08:00','18/09/2026','23:59']]);
const DCAB=['disciplina_id','codigo','codigos_anteriores','nome','creditos_aula','situacao','observacao_interna','universo'];
const disciplinas=()=>[sheet('LEIA-ME',[['Leia-me']]),sheet('DISCIPLINAS',[DCAB,
  ['disc_1','TST0101','TST9999, TST8888','Psicologia Teste I',4,'Ativa','NÃO DEVE SAIR','IP'],
  ['disc_2','TST0202','','Psicologia Teste II',2,'Fora da estrutura atual','segredo','IP'],
  ['disc_3','TST0303','','Disciplina Velha',4,'Substituída','','IP'],
  ['disc_4','TST0303','','Disciplina Nova',6,'Ativa','','IP'],
  ['disc_5','EXT 0001','','Externa Teste','','Ativa','','EXTERNA'],
  ['disc_6','','','Sem código',2,'Ativa','','IP']])];
const indice=(extra=[])=>sheet('Página1',[['Chave','Tipo','ID de Produção'],['PLANILHA_ALUNOS','spreadsheet','ALU'],['TRANCAMENTO_PARCIAL_MATRICULA','spreadsheet','RESP'],['PERIODOS','spreadsheet','PER'],['DISCIPLINAS','spreadsheet','DISC'],...extra]);
const ABERTO=new Date('2026-04-10T12:00:00-03:00');
function amb(opts={},extra={}){const r=extra.RESP||respostas();const files=Object.assign({IDX:[indice()],ALU:[alunos()],RESP:[r],PER:[extra.PER||periodos()],DISC:extra.DISC||disciplinas()},extra.files||{});
  Object.keys(files).forEach(k=>{if(files[k]===undefined)delete files[k]});
  return {r,c:run({ID_INDEX_SPREADSHEET_ID:'IDX'},files,Object.assign({agora:ABERTO},opts))};}
const pedido=(o={})=>Object.assign({ciencia:true,nUsp:'9000001',nome:'Ana Teste',creditos:'20',menos12:'Não',concluiCurso:'Não',justificativa:'Motivo',disciplinas:[{codigo:'tst0101',nome:''},{codigo:'TST-0202',nome:'nome ignorado'}]},o);
const J=x=>JSON.parse(JSON.stringify(x));
const col=t=>CAB.indexOf(t);
let ok=0,fail=0;const t=(n,f)=>{try{f();ok++;console.log('ok',n)}catch(e){fail++;console.log('FALHA',n,e.stack.split('\n').slice(0,2).join(' '))}};

t('carga: aluno pelo eMail Secundario, período, histórico só do próprio e-mail',()=>{const {c}=amb();const d=J(c.obterDadosIniciais());
  assert.deepStrictEqual(d,{autenticado:true,periodoAberto:true,periodo:{semestre:1,ano:2026,horaFimTexto:'23h59',diaFimTexto:'17/04/2026',dataInicioTexto:'06/04/2026',dataFimTexto:'17/04/2026'},
    encontrado:true,email:'ana@usp.br',nUsp:'9000001',nome:'Ana Teste',historico:[{carimbo:'01/04/2025',situacao:'Concluído',pendente:false,disciplinas:['TST0001 - Teste Antigo']}],urlFormulario:'https://form.teste/exec'})});
t('carga: aluno pelo eMail principal, sem ano de ingresso',()=>{const {c}=amb({usuario:'Bruno@USP.br'});const d=c.obterDadosIniciais();assert.strictEqual(d.nome,'Bruno Ficticio');assert.strictEqual(d.anoIngresso,undefined);assert.strictEqual(d.historico.length,0)});
t('carga: fora do domínio bloqueia',()=>{for(const u of ['','x@gmail.com','x@usp.br.evil.com','x@fakeusp.br','a@b@usp.br']){const {c}=amb({usuario:u});assert.strictEqual(c.obterDadosIniciais().autenticado,false,u)}});
t('carga: 2º semestre',()=>{const {c}=amb({agora:new Date('2026-09-10T10:00:00-03:00')});const d=c.obterDadosIniciais();assert.strictEqual(d.periodo.semestre,2);assert.strictEqual(d.periodo.dataFimTexto,'18/09/2026')});
t('carga: fora do período fecha (inclusive 1 minuto depois)',()=>{for(const a of ['2026-04-18T00:00:30-03:00','2026-04-06T07:59:00-03:00','2026-06-01T10:00:00-03:00']){const {c}=amb({agora:new Date(a)});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,false,a);assert(/não está disponível/.test(d.motivoFechado));assert.strictEqual(d.email,undefined)}});
t('carga: linha do período ausente fecha sem detalhe técnico',()=>{const {c}=amb({},{PER:periodos({nome:'Outro'})});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,false);assert(/não está configurado/.test(d.motivoFechado))});
t('carga: Contínuo fica aberto',()=>{const {c}=amb({agora:new Date('2026-06-01T10:00:00-03:00')},{PER:periodos({tipo:'Contínuo'})});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,true);assert.strictEqual(d.periodo.semestre,null)});
t('carga: planilha de períodos sem acesso fecha com mensagem genérica',()=>{const {c}=amb({},{files:{PER:undefined}});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,false);assert(!/PER|ID_INDEX/.test(d.motivoFechado));assert(c.logs.some(l=>/períodos/.test(l)))});
t('carga: planilha de alunos fora do ar não bloqueia',()=>{const {c}=amb({},{files:{ALU:undefined}});const d=c.obterDadosIniciais();assert.strictEqual(d.encontrado,false);assert.strictEqual(d.periodoAberto,true)});
t('catálogo: aba DISCIPLINAS (não a primeira), só código/nome/créditos, substituída perde',()=>{const {c}=amb();const k=J(c.obterCatalogoDisciplinas());
  assert.strictEqual(k.disponivel,true);
  assert.deepStrictEqual(k.disciplinas,[['EXT0001','Externa Teste',null],['TST0101','Psicologia Teste I',4],['TST0202','Psicologia Teste II',2],['TST0303','Disciplina Nova',6]]);
  assert.deepStrictEqual(k.apelidos,{TST9999:'TST0101',TST8888:'TST0101'});
  assert(!JSON.stringify(k).match(/NÃO DEVE SAIR|segredo|disc_|IP/))});
t('catálogo: em cache (não reabre a planilha)',()=>{const aberturas=[];const {c}=amb({aberturas});c.obterCatalogoDisciplinas();const n=aberturas.filter(x=>x==='DISC').length;c.obterCatalogoDisciplinas();assert.strictEqual(aberturas.filter(x=>x==='DISC').length,n);assert.strictEqual(n,1)});
t('catálogo: grande é dividido em pedaços do cache',()=>{const d=disciplinas();for(let i=0;i<3000;i++)d[1].vals.push(['x','TSX'+String(i).padStart(4,'0'),'','Disciplina sintética de nome bem comprido número '+i,4,'Ativa','','IP']);
  const {c}=amb({},{DISC:d});const k=c.obterCatalogoDisciplinas();assert.strictEqual(k.disciplinas.length,3004);assert(Number(c.cache['catalogoDisciplinas:v1:n'])>1);
  assert(Object.keys(c.cache).filter(x=>/^catalogoDisciplinas:v1:\d+$/.test(x)).every(x=>c.cache[x].length<=90000));
  assert.strictEqual(J(c.obterCatalogoDisciplinas()).disciplinas.length,3004)});
t('catálogo: sem chave/aba não quebra',()=>{const {c}=amb({},{files:{DISC:[sheet('Outra',[['a']])]}});assert.strictEqual(c.obterCatalogoDisciplinas().disponivel,false);
  const c2=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','Tipo','ID de Produção'],['X','s','Y']])]});assert.strictEqual(c2.obterCatalogoDisciplinas().disponivel,false)});
t('catálogo: exige login',()=>{const {c}=amb({usuario:'x@gmail.com'});assert.throws(()=>c.obterCatalogoDisciplinas(),/NAO_AUTENTICADO/)});
t('envio grava pelo título, nome do cadastro, ciência e identidade da sessão',()=>{const {c,r}=amb();const res=J(c.registrarSolicitacao(pedido({email:'outro@usp.br',nUsp:'90.000-01'})));const l=r.vals[3];
  assert.strictEqual(l.length,CAB.length);assert.strictEqual(l[col('Situação do Pedido')],'pendente');assert(l[1] instanceof Date);assert.strictEqual(l[2],'ana@usp.br');assert.strictEqual(l[3],'Ciente');
  assert.strictEqual(l[col('Número USP')],'9000001');assert.strictEqual(l[col('Nome')],'Ana Teste');assert.strictEqual(l[6],'20');assert.strictEqual(l[7],'Não');assert.strictEqual(l[8],'Não');
  assert.strictEqual(l[col('Disciplina 1')],'TST0101 - Psicologia Teste I');assert.strictEqual(l[col('Disciplina 2')],'TST0202 - Psicologia Teste II');assert.strictEqual(l[col('Disciplina 3')],'');
  assert.strictEqual(l[col('Observações')],'');assert.strictEqual(l[col('Justificativa')],'Motivo');assert(l.slice(17).every(v=>v===''));
  assert.deepStrictEqual(res.disciplinas,['TST0101 - Psicologia Teste I','TST0202 - Psicologia Teste II']);assert.strictEqual(res.reciboEnviado,true)});
t('colunas fora de ordem e ciência em outra posição',()=>{const r=respostas();const perm=[2,0,1,16,4,5,6,7,8,9,10,11,12,13,14,15,3,17,18,19,20,21];r.vals.forEach((l,i)=>{r.vals[i]=perm.map(p=>l[p])});
  const {c}=amb({},{RESP:r});c.registrarSolicitacao(pedido());const l=r.vals[3];const h=r.vals[0];
  assert.strictEqual(l[h.indexOf('Endereço de e-mail')],'ana@usp.br');assert.strictEqual(l[h.indexOf(CIENCIA)],'Ciente');assert.strictEqual(l[h.indexOf('Justificativa')],'Motivo');assert.strictEqual(l[h.indexOf('Situação do Pedido')],'pendente')});
t('título da ciência com outras datas/acentos ainda é achado',()=>{const r=respostas();r.vals[0][3]='  DECLARO estar  ciente de que (entre 08 e 18/09/2026)...';const {c}=amb({},{RESP:r});c.registrarSolicitacao(pedido());assert.strictEqual(r.vals[3][3],'Ciente')});
t('código antigo vira o atual; substituída usa a nova; código sem cadastro usa nome digitado',()=>{const {c,r}=amb();
  c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST9999'},{codigo:'TST0303',nome:'x'},{codigo:'abc1234',nome:'  Optativa   de Outra Unidade '}]}));const l=r.vals[3];
  assert.strictEqual(l[col('Disciplina 1')],'TST0101 - Psicologia Teste I');assert.strictEqual(l[col('Disciplina 2')],'TST0303 - Disciplina Nova');assert.strictEqual(l[col('Disciplina 3')],'ABC1234 - Optativa de Outra Unidade')});
t('disciplinas: validações',()=>{const {c,r}=amb();
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[]})),/ao menos uma/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'',nome:''}]})),/ao menos uma/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:'TST0101'})),/ao menos uma/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'',nome:'Só nome'}]})),/informe o código/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'AB'}]})),/inválido/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'XYZ9999'}]})),/não está no cadastro/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101'},{codigo:'tst 0101'}]})),/mais de uma vez/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101'},{codigo:'TST9999'}]})),/mais de uma vez/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:Array.from({length:7},(_,i)=>({codigo:'ZZZ000'+i,nome:'n'}))})),/até 6/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'ZZZ0001',nome:'a'.repeat(151)}]})),/muito longo/);
  assert.strictEqual(r.vals.length,3);
  c.registrarSolicitacao(pedido({disciplinas:Array.from({length:6},(_,i)=>({codigo:'ZZZ000'+i,nome:'n'+i}))}));assert.strictEqual(r.vals[3][col('Disciplina 6')],'ZZZ0005 - n5')});
t('sem cadastro de disciplinas: aceita o nome digitado',()=>{const {c,r}=amb({},{files:{DISC:undefined}});c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101',nome:'Nome Digitado'}]}));assert.strictEqual(r.vals[3][col('Disciplina 1')],'TST0101 - Nome Digitado')});
t('validações dos outros campos',()=>{const {c,r}=amb();
  assert.throws(()=>c.registrarSolicitacao(pedido({ciencia:false})),/Ciente/);
  assert.throws(()=>c.registrarSolicitacao(pedido({ciencia:'true'})),/Ciente/);
  assert.throws(()=>c.registrarSolicitacao(pedido({nome:'  '})),/nome/);
  assert.throws(()=>c.registrarSolicitacao(pedido({nUsp:'abc'})),/inválido/);
  for(const v of ['','0','100','1a','12.5'])assert.throws(()=>c.registrarSolicitacao(pedido({creditos:v})),/créditos-aula/,v);
  assert.throws(()=>c.registrarSolicitacao(pedido({menos12:'talvez'})),/menos de 12/);
  assert.throws(()=>c.registrarSolicitacao(pedido({concluiCurso:''})),/concluirá/);
  assert.throws(()=>c.registrarSolicitacao(pedido({justificativa:'a'.repeat(4001)})),/passou de 4000/);
  assert.strictEqual(r.vals.length,3);
  c.registrarSolicitacao(pedido({justificativa:'a'.repeat(4000),creditos:'08'}));assert.strictEqual(r.vals[3][6],'8')});
t('envio fora do período é recusado',()=>{const {c,r}=amb({agora:new Date('2026-04-18T10:00:00-03:00')});assert.throws(()=>c.registrarSolicitacao(pedido()),/não está disponível/);assert.strictEqual(r.vals.length,3)});
t('fórmula neutralizada',()=>{const {c,r}=amb();c.registrarSolicitacao(pedido({nome:'=HYPERLINK("x")',justificativa:'+1'}));assert.strictEqual(r.vals[3][col('Nome')],"'=HYPERLINK(\"x\")");assert.strictEqual(r.vals[3][col('Justificativa')],"'+1")});
t('justificativa em branco é aceita',()=>{const {c,r}=amb();c.registrarSolicitacao(pedido({justificativa:'  '}));assert.strictEqual(r.vals[3][col('Justificativa')],'');assert(/\(não informada\)/.test(c.mails[0].corpo))});
t('sem login não grava',()=>{const {c,r}=amb({usuario:''});assert.throws(()=>c.registrarSolicitacao(pedido()),/NAO_AUTENTICADO/);assert.strictEqual(r.vals.length,3)});
t('trava ocupada: mensagem clara',()=>{const {c}=amb({travaOcupada:true});assert.throws(()=>c.registrarSolicitacao(pedido()),/Aguarde alguns segundos/)});
t('planilha de respostas sem acesso: mensagem genérica, detalhe só no log',()=>{const {c}=amb({},{files:{RESP:undefined}});
  assert.throws(()=>c.registrarSolicitacao(pedido()),e=>/problema de configuração/.test(e.message)&&!/RESP/.test(e.message));assert(c.logs.some(l=>/RESP/.test(l)))});
t('coluna obrigatória ausente bloqueia',()=>{for(const tit of ['Justificativa','Disciplina 6','Número de créditos-aula em que está matriculado(a)']){const r=respostas();r.vals[0][col(tit)]='Outro';const {c}=amb({},{RESP:r});assert.throws(()=>c.registrarSolicitacao(pedido()),new RegExp('coluna "'+tit.replace(/[()]/g,'\\$&')),tit);assert.strictEqual(r.vals.length,3)}});
t('não escreve na planilha de alunos',()=>{const {c}=amb({usuario:'novo@usp.br'});const a=alunos();const files={IDX:[indice()],ALU:[a],RESP:[respostas()],PER:[periodos()],DISC:disciplinas()};const c2=run({ID_INDEX_SPREADSHEET_ID:'IDX'},files,{agora:ABERTO,usuario:'novo@usp.br'});
  c2.registrarSolicitacao(pedido());assert.strictEqual(a.vals.length,3)});
t('recibo: só login, noReply, disciplinas e datas, sem apóstrofo nem HTML',()=>{const {c}=amb();c.registrarSolicitacao(pedido({nome:'=Ana Teste'}));const m=c.mails[0];
  assert.strictEqual(m.to,'ana@usp.br');assert.strictEqual(m.o.noReply,true);assert.strictEqual(m.o.cc,undefined);assert(/Parcial/.test(m.assunto));
  assert(/1\. TST0101 - Psicologia Teste I\n2\. TST0202 - Psicologia Teste II/.test(m.corpo));assert(/Nome: =Ana Teste/.test(m.corpo));assert(/Entre 06\/04\/2026 e 17\/04\/2026/.test(m.corpo));assert(/10 \(dez\) dias úteis/.test(m.corpo));assert(!/<[a-z]/i.test(m.corpo))});
t('recibo falhou: pedido gravado mesmo assim',()=>{const {c,r}=amb({falhaEmail:true});const res=c.registrarSolicitacao(pedido());assert.strictEqual(res.reciboEnviado,false);assert.strictEqual(r.vals.length,4)});
t('pedido pendente não impede novo envio',()=>{const {c,r}=amb({usuario:'outro@usp.br'});assert.strictEqual(c.obterDadosIniciais().historico[0].pendente,true);c.registrarSolicitacao(pedido());assert.strictEqual(r.vals.length,4)});
t('log sem dados pessoais',()=>{const {c}=amb({falhaEmail:true});c.obterDadosIniciais();c.obterCatalogoDisciplinas();c.registrarSolicitacao(pedido());
  const {c:c2}=amb({},{files:{ALU:undefined,DISC:undefined}});c2.obterDadosIniciais();c2.registrarSolicitacao(pedido({disciplinas:[{codigo:'X1234',nome:'n'}]}));
  assert(!c.logs.concat(c2.logs).join().match(/Ana|usp\.br|9000001|Motivo/))});
t('sem ID literal de planilha nem openById com texto',()=>{const s=fs.readFileSync(SRC+'Codigo.gs','utf8');assert(!/[A-Za-z0-9_-]{40,}/.test(s));assert(!/openById\(\s*["']/.test(s))});
console.log(`\n${ok} ok, ${fail} falha(s)`);process.exit(fail?1:0);

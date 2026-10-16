// Testes do backend do Formulário de Exclusão de Disciplinas (Codigo.gs)
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
      getValues:()=>vals.slice(r-1,r-1+nr).map(l=>{const x=(l||[]).slice(c-1,c-1+nc);while(x.length<nc)x.push('');return x}),
      getDisplayValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc).map(v=>v==null?'':String(v))),
      setValues:m=>{s.escritas=(s.escritas||0)+1;assert.strictEqual(m.length,nr);m.forEach((l,i)=>{assert.strictEqual(l.length,nc);const alvo=vals[r-1+i]||(vals[r-1+i]=[]);l.forEach((v,j)=>{alvo[c-1+j]=v})})}})};
  return s;
}
// Utilities.parseDate/formatDate simplificados: fuso de Brasília fixo em -03:00.
function parseBR(txt){const m=txt.match(/^(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d)$/);return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00-03:00`)}
function fmtBR(d,f){const b=new Date(d.getTime()-3*3600e3);const p=n=>String(n).padStart(2,'0');
  const map={yyyy:b.getUTCFullYear(),MM:p(b.getUTCMonth()+1),dd:p(b.getUTCDate()),HH:p(b.getUTCHours()),mm:p(b.getUTCMinutes())};
  return f.replace(/'([^']*)'/g,'\u0001$1\u0001').split('\u0001').map((t,i)=>i%2?t:t.replace(/yyyy|MM|dd|HH|mm/g,k=>map[k])).join('')}
function run(props,files,opts={}){
  const logs=[],cache={},mails=[];let uuid=0;
  const ctx={console,Logger:{log:m=>logs.push(String(m))},
    Date:opts.agora?class extends Date{constructor(...a){a.length?super(...a):super(opts.agora)}}:Date,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
    CacheService:{getScriptCache:()=>({get:k=>k in cache?cache[k]:null,put:(k,v)=>{cache[k]=v},
      getAll:ks=>{const o={};ks.forEach(k=>{if(k in cache)o[k]=cache[k]});return o},putAll:o=>{Object.assign(cache,o)},removeAll:ks=>ks.forEach(k=>delete cache[k])})},
    SpreadsheetApp:{openById:id=>{opts.aberturas&&opts.aberturas.push(id);if(!files[id])throw new Error('no access '+id);const f=files[id];return {getSheetByName:n=>f.find(s=>s.getName()===n)||null,getSheets:()=>f}}},
    Session:{getActiveUser:()=>({getEmail:()=>opts.usuario===undefined?'ana@usp.br':opts.usuario})},
    LockService:{getScriptLock:()=>({tryLock:()=>!opts.travaOcupada,releaseLock(){}})},
    MailApp:{sendEmail:(to,assunto,corpo,o)=>{if(opts.falhaEmail)throw new Error('cota');mails.push({to,assunto,corpo,o})}},
    ScriptApp:{getService:()=>({getUrl:()=>'https://form.teste/exec'})},
    Utilities:{formatDate:(d,tz,f)=>fmtBR(d,f),parseDate:(t)=>parseBR(t),getUuid:()=>'uuid-'+(++uuid)},
    HtmlService:{createTemplateFromFile:()=>({evaluate:()=>({setTitle(){return this},addMetaTag(){return this}})})}};
  ctx.cache=cache;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(SRC+'Codigo.gs','utf8'),ctx);ctx.logs=logs;ctx.mails=mails;return ctx;
}
// Planilha de respostas: A–T por posição (como a v1.0 e o Painel dos servidores).
const CAB=['Carimbo de data/hora','Endereço de e-mail','Nº USP','Nome completo','E-mail USP','Ano de ingresso','Curso/Habilitação','Concluirá o curso neste semestre?','Declaração de ciência','Sigla/nome da disciplina','Turma','Pedido ID','x','x','x','Observações','Situação antiga','Enviar E-mail','Confirmação','Situação'];
const linhaResp=(o)=>{const l=new Array(20).fill('');l[0]=o.carimbo||'';l[1]=o.email;l[9]=o.disc;l[10]=o.turma||'';l[11]=o.id||'';l[19]=o.sit||'';return l};
const respostas=()=>sheet('Respostas ao formulário 1',[CAB.slice(),
  linhaResp({carimbo:'01/03/2025',email:'ana@usp.br',disc:'TST0001 Teste Antigo',turma:'2025101',sit:'concluído'}),
  linhaResp({carimbo:'02/03/2026',email:'outro@usp.br',disc:'TST0002 - Outra',turma:'01',id:'p1'}),
  linhaResp({carimbo:'03/03/2026',email:'ana@usp.br',disc:'TST0101 - Psicologia Teste I',turma:'01',id:'p2',sit:'concluído'}),
  linhaResp({carimbo:'03/03/2026',email:'ana@usp.br',disc:'TST0202 - Psicologia Teste II',turma:'02',id:'p2'})]);
const N_INICIAL=5;
const alunos=()=>sheet('Alunos',[['Número USP','Nome do Aluno','Ingresso','eMail','ID da Pasta','eMail Secundario'],[9000001,'Ana Teste','2023/1','ana@exemplo.invalid','pasta','ana@usp.br'],[9000002,'Bruno Ficticio','2024/2','bruno@usp.br','','']]);
// A–Q: N/O retificação do 1º semestre, P/Q do 2º.
const periodos=(o={})=>sheet('Períodos',[['Formulário','Link','Tipo','A1','HA1','F1','HF1','A2','HA2','F2','HF2','L','M','R1i','R1f','R2i','R2f'],
  ['Outro formulário','x','Sazonal','01/01/2026','00:00','31/12/2026','23:59','','','','','','','','','',''],
  [o.nome||'Formulário de Exclusão de Disciplinas','link',o.tipo||'sazonal','02/03/2026','08:00','06/03/2026','12:00','03/08/2026','08:00','07/08/2026','23:59','','',
   'retif1i' in o?o.retif1i:'02/03/2026','09/03/2026','03/08/2026','10/08/2026']]);
const DCAB=['disciplina_id','codigo','codigos_anteriores','nome','creditos_aula','situacao','observacao_interna','universo'];
const disciplinas=()=>[sheet('LEIA-ME',[['Leia-me']]),sheet('DISCIPLINAS',[DCAB,
  ['disc_1','TST0101','TST9999','Psicologia Teste I',4,'Ativa','NÃO DEVE SAIR','IP'],
  ['disc_2','TST0202','','Psicologia Teste II',2,'Ativa','segredo','IP'],
  ['disc_3','TST0303','','Disciplina Velha',4,'Substituída','','IP'],
  ['disc_4','TST0303','','Disciplina Nova',6,'Ativa','','IP']])];
const indice=()=>sheet('Página1',[['Chave','Tipo','ID de Produção'],['PLANILHA_ALUNOS','spreadsheet','ALU'],['EXCLUSAO_DISCIPLINAS','spreadsheet','RESP'],['PERIODOS','spreadsheet','PER'],['DISCIPLINAS','spreadsheet','DISC']]);
const ABERTO=new Date('2026-03-04T15:00:00-03:00');
function amb(opts={},extra={}){const r=extra.RESP||respostas();const files=Object.assign({IDX:[indice()],ALU:[alunos()],RESP:[sheet('Outra aba',[['a']]),r],PER:[extra.PER||periodos()],DISC:extra.DISC||disciplinas()},extra.files||{});
  Object.keys(files).forEach(k=>{if(files[k]===undefined)delete files[k]});
  return {r,c:run({ID_INDEX_SPREADSHEET_ID:'IDX'},files,Object.assign({agora:ABERTO},opts))};}
const pedido=(o={})=>Object.assign({ciencia:true,nUsp:'9000001',nome:'Ana Teste',anoIngresso:'2023',cursos:['Formação de Psicólogo(a)','Licenciatura'],concluira:'Não',observacoes:'Obs',
  disciplinas:[{codigo:'tst0101',nome:'',turma:'01'},{codigo:'TST-0303',nome:'nome ignorado',turma:' 2026102 '}]},o);
const J=x=>JSON.parse(JSON.stringify(x));
let ok=0,fail=0;const t=(n,f)=>{try{f();ok++;console.log('ok',n)}catch(e){fail++;console.log('FALHA',n,e.stack.split('\n').slice(0,2).join(' '))}};

t('carga: aluno pelo eMail Secundario, ano de ingresso, período e histórico agrupado pelo Pedido ID',()=>{const {c}=amb();const d=J(c.obterDadosIniciais());
  assert.deepStrictEqual(d.periodo,{semestre:1,ano:'2026',dataAbertura:'02/03/2026',horaAbertura:'08:00',dataFechamento:'06/03/2026',horaFechamento:'12:00',retifInicio:'02/03/2026',retifFim:'09/03/2026'});
  assert.strictEqual(d.email,'ana@usp.br');assert.strictEqual(d.nUsp,'9000001');assert.strictEqual(d.nome,'Ana Teste');assert.strictEqual(d.anoIngresso,'2023');assert.strictEqual(d.maxDisciplinas,6);
  assert.deepStrictEqual(d.historico,[
    {carimbo:'01/03/2025',pendente:false,disciplinas:[{texto:'TST0001 Teste Antigo — turma 2025101',concluida:true}],codigosPendentes:[]},
    {carimbo:'03/03/2026',pendente:true,disciplinas:[{texto:'TST0101 - Psicologia Teste I — turma 01',concluida:true},{texto:'TST0202 - Psicologia Teste II — turma 02',concluida:false}],codigosPendentes:['TST0202']}])});
t('carga: aluno pelo eMail principal; não encontrado vem em branco',()=>{const {c}=amb({usuario:'Bruno@USP.br'});const d=c.obterDadosIniciais();assert.strictEqual(d.anoIngresso,'2024');assert.strictEqual(d.historico.length,0);
  const {c:c2}=amb({usuario:'novo@usp.br'});const d2=c2.obterDadosIniciais();assert.strictEqual(d2.encontrado,false);assert.strictEqual(d2.nome,'')});
t('carga: fora do domínio bloqueia',()=>{for(const u of ['','x@gmail.com','x@usp.br.evil.com','x@fakeusp.br','a@b@usp.br']){const {c}=amb({usuario:u});assert.strictEqual(c.obterDadosIniciais().autenticado,false,u)}});
t('busca de aluno não é pública',()=>{const {c}=amb();assert.strictEqual(typeof c.buscarAlunoPorEmail,'undefined');assert.strictEqual(typeof c.cadastrarAlunoSeNaoExistir,'undefined')});
t('carga: 2º semestre usa P/Q',()=>{const {c}=amb({agora:new Date('2026-08-05T10:00:00-03:00')});const d=c.obterDadosIniciais();assert.strictEqual(d.periodo.semestre,2);assert.strictEqual(d.periodo.retifFim,'10/08/2026');assert.strictEqual(d.periodo.horaFechamento,'23:59')});
t('carga: fora do período fecha (inclusive 1 minuto depois)',()=>{for(const a of ['2026-03-06T12:00:30-03:00','2026-03-02T07:59:00-03:00','2026-06-01T10:00:00-03:00']){const {c}=amb({agora:new Date(a)});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,false,a);assert(/Fora do período/.test(d.motivoFechado));assert.strictEqual(d.email,undefined)}});
t('carga: linha ausente, Contínuo ou janela sem retificação fecham como "não configurado"',()=>{
  for(const per of [periodos({nome:'Outro'}),periodos({tipo:'Contínuo'}),periodos({retif1i:''})]){const {c}=amb({},{PER:per});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,false);assert(/não foi configurado/.test(d.motivoFechado))}});
t('carga: datas como Data do Sheets também valem',()=>{const p=periodos();const l=p.vals[2];l[3]=new Date('2026-03-02T08:00:00-03:00');l[5]=new Date('2026-03-06T00:00:00-03:00');l[6]=new Date('1899-12-30T12:00:00-03:00');l[14]=new Date('2026-03-09T00:00:00-03:00');
  const {c}=amb({},{PER:p});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,true);assert.strictEqual(d.periodo.retifFim,'09/03/2026');assert.strictEqual(d.periodo.dataFechamento,'06/03/2026')});
t('carga: planilha de períodos sem acesso fecha com mensagem genérica',()=>{const {c}=amb({},{files:{PER:undefined}});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,false);assert(!/PER|ID_INDEX/.test(d.motivoFechado));assert(c.logs.some(l=>/períodos/.test(l)))});
t('carga: sem a propriedade ID_INDEX fecha',()=>{const c=run({},{},{agora:ABERTO});const d=c.obterDadosIniciais();assert.strictEqual(d.periodoAberto,false)});
t('carga: planilhas de alunos e respostas fora do ar não bloqueiam',()=>{const {c}=amb({},{files:{ALU:undefined,RESP:undefined}});const d=c.obterDadosIniciais();assert.strictEqual(d.encontrado,false);assert.strictEqual(d.periodoAberto,true);assert.deepStrictEqual(J(d.historico),[])});
t('catálogo: só código/nome/créditos',()=>{const {c}=amb();const k=J(c.obterCatalogoDisciplinas());assert.strictEqual(k.disponivel,true);
  assert.deepStrictEqual(k.disciplinas,[['TST0101','Psicologia Teste I',4],['TST0202','Psicologia Teste II',2],['TST0303','Disciplina Nova',6]]);assert.deepStrictEqual(k.apelidos,{TST9999:'TST0101'});assert(!/NÃO DEVE|segredo|disc_/.test(JSON.stringify(k)))});
t('catálogo: exige login e não quebra sem a aba',()=>{const {c}=amb({usuario:'x@gmail.com'});assert.throws(()=>c.obterCatalogoDisciplinas(),/NAO_AUTENTICADO/);
  const {c:c2}=amb({},{files:{DISC:[sheet('Outra',[['a']])]}});assert.strictEqual(c2.obterCatalogoDisciplinas().disponivel,false)});
t('envio: uma linha por disciplina em A–P, mesmo Pedido ID, uma escrita, identidade da sessão',()=>{const {c,r}=amb();const res=J(c.registrarSolicitacao(pedido({email:'outro@usp.br',nUsp:'90.000-01'})));
  assert.strictEqual(r.vals.length,N_INICIAL+2);assert.strictEqual(r.escritas,1);
  const [a,b]=r.vals.slice(N_INICIAL);
  assert(a[0] instanceof Date);assert.strictEqual(a[1],'ana@usp.br');assert.strictEqual(a[2],'9000001');assert.strictEqual(a[3],'Ana Teste');assert.strictEqual(a[4],'');assert.strictEqual(a[5],'2023');
  assert.strictEqual(a[6],'Formação de Psicólogo(a) + Licenciatura');assert.strictEqual(a[7],'Não');assert.strictEqual(a[8],'Ciente');
  assert.strictEqual(a[9],'TST0101 - Psicologia Teste I');assert.strictEqual(a[10],'01');assert.strictEqual(a[11],'uuid-1');assert.deepStrictEqual(a.slice(12,15),['','','']);assert.strictEqual(a[15],'Obs');
  assert.strictEqual(a.length,16);assert.strictEqual(b[9],'TST0303 - Disciplina Nova');assert.strictEqual(b[10],'2026102');assert.strictEqual(b[11],'uuid-1');assert.strictEqual(b[0],a[0]);
  assert.deepStrictEqual(res.disciplinas,['TST0101 - Psicologia Teste I — turma 01','TST0303 - Disciplina Nova — turma 2026102']);assert.strictEqual(res.reciboEnviado,true)});
t('envio: não toca em Q–T de linhas existentes',()=>{const {c,r}=amb();const antes=JSON.stringify(r.vals.slice(0,N_INICIAL));c.registrarSolicitacao(pedido());assert.strictEqual(JSON.stringify(r.vals.slice(0,N_INICIAL)),antes)});
t('código antigo vira o atual; código fora do cadastro usa nome digitado; turma livre',()=>{const {c,r}=amb();
  c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST9999',turma:'1'},{codigo:'abc1234',nome:'  Optativa   de Outra Unidade ',turma:'Turma A'}]}));const l=r.vals.slice(N_INICIAL);
  assert.strictEqual(l[0][9],'TST0101 - Psicologia Teste I');assert.strictEqual(l[0][10],'1');assert.strictEqual(l[1][9],'ABC1234 - Optativa de Outra Unidade');assert.strictEqual(l[1][10],'Turma A')});
t('disciplinas: validações',()=>{const {c,r}=amb();
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[]})),/ao menos uma/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:'TST0101'})),/ao menos uma/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'',nome:'Só nome',turma:'1'}]})),/informe o código/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'AB',turma:'1'}]})),/inválido/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'XYZ9999',turma:'1'}]})),/não está no cadastro/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101',turma:''}]})),/informe a turma/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101',turma:'x'.repeat(21)}]})),/turma muito longa/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101',turma:'1'},{codigo:'tst 0101',turma:'2'}]})),/mais de uma vez/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101',turma:'1'},{codigo:'TST9999',turma:'2'}]})),/mais de uma vez/);
  assert.throws(()=>c.registrarSolicitacao(pedido({disciplinas:Array.from({length:7},(_,i)=>({codigo:'ZZZ000'+i,nome:'n',turma:'1'}))})),/até 6/);
  assert.strictEqual(r.vals.length,N_INICIAL);
  c.registrarSolicitacao(pedido({disciplinas:Array.from({length:6},(_,i)=>({codigo:'ZZZ000'+i,nome:'n'+i,turma:'0'+i}))}));assert.strictEqual(r.vals.length,N_INICIAL+6)});
t('disciplina já pendente em pedido anterior não bloqueia',()=>{const {c,r}=amb();c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0202',turma:'02'}]}));assert.strictEqual(r.vals.length,N_INICIAL+1)});
t('sem cadastro de disciplinas: aceita o nome digitado',()=>{const {c,r}=amb({},{files:{DISC:undefined}});c.registrarSolicitacao(pedido({disciplinas:[{codigo:'TST0101',nome:'Nome Digitado',turma:'1'}]}));assert.strictEqual(r.vals[N_INICIAL][9],'TST0101 - Nome Digitado')});
t('validações dos outros campos',()=>{const {c,r}=amb();
  assert.throws(()=>c.registrarSolicitacao(pedido({ciencia:false})),/ciência/);
  assert.throws(()=>c.registrarSolicitacao(pedido({ciencia:'true'})),/ciência/);
  assert.throws(()=>c.registrarSolicitacao(pedido({nome:'  '})),/nome/);
  assert.throws(()=>c.registrarSolicitacao(pedido({nUsp:'abc'})),/inválido/);
  for(const v of ['','23','abcd','1900','2027'])assert.throws(()=>c.registrarSolicitacao(pedido({anoIngresso:v})),/ano de ingresso|Ano de ingresso/,v);
  for(const v of [[],'Bacharelado',['Mestrado'],['Bacharelado','Outro']])assert.throws(()=>c.registrarSolicitacao(pedido({cursos:v})),/Curso\/Habilitação/,JSON.stringify(v));
  assert.throws(()=>c.registrarSolicitacao(pedido({concluira:'talvez'})),/concluirá/);
  assert.throws(()=>c.registrarSolicitacao(pedido({observacoes:'a'.repeat(4001)})),/passaram de 4000/);
  assert.strictEqual(r.vals.length,N_INICIAL);
  c.registrarSolicitacao(pedido({observacoes:'a'.repeat(4000),cursos:['Licenciatura','Bacharelado']}));assert.strictEqual(r.vals[N_INICIAL][6],'Bacharelado + Licenciatura')});
t('envio fora do período é recusado',()=>{const {c,r}=amb({agora:new Date('2026-03-06T12:01:00-03:00')});assert.throws(()=>c.registrarSolicitacao(pedido()),/Fora do período/);assert.strictEqual(r.vals.length,N_INICIAL)});
t('fórmula neutralizada (nome, turma, observações, nome digitado)',()=>{const {c,r}=amb();c.registrarSolicitacao(pedido({nome:'=HYPERLINK("x")',observacoes:'+1',disciplinas:[{codigo:'ZZZ0001',nome:'=x',turma:'-1'}]}));const l=r.vals[N_INICIAL];
  assert.strictEqual(l[3],"'=HYPERLINK(\"x\")");assert.strictEqual(l[15],"'+1");assert.strictEqual(l[10],"'-1");assert.strictEqual(l[9],'ZZZ0001 - =x')});
t('sem login não grava',()=>{const {c,r}=amb({usuario:''});assert.throws(()=>c.registrarSolicitacao(pedido()),/NAO_AUTENTICADO/);assert.strictEqual(r.vals.length,N_INICIAL)});
t('trava ocupada: mensagem clara',()=>{const {c}=amb({travaOcupada:true});assert.throws(()=>c.registrarSolicitacao(pedido()),/Aguarde alguns segundos/)});
t('planilha de respostas sem acesso ou aba errada: mensagem genérica, nada gravado',()=>{const {c}=amb({},{files:{RESP:undefined}});
  assert.throws(()=>c.registrarSolicitacao(pedido()),e=>/problema de configuração/.test(e.message)&&!/RESP/.test(e.message));assert(c.logs.some(l=>/RESP/.test(l)));
  const r=respostas();r.vals[0][0]='Nome';const {c:c2}=amb({},{RESP:r});assert.throws(()=>c2.registrarSolicitacao(pedido()),/problema de configuração/);assert.strictEqual(r.vals.length,N_INICIAL)});
t('aba renomeada: usa a primeira',()=>{const r=sheet('Respostas',respostas().vals);const files={IDX:[indice()],ALU:[alunos()],RESP:[r],PER:[periodos()],DISC:disciplinas()};const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},files,{agora:ABERTO});c.registrarSolicitacao(pedido());assert.strictEqual(r.vals.length,N_INICIAL+2)});
t('não escreve na planilha de alunos',()=>{const a=alunos();const files={IDX:[indice()],ALU:[a],RESP:[respostas()],PER:[periodos()],DISC:disciplinas()};const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},files,{agora:ABERTO,usuario:'novo@usp.br'});
  c.registrarSolicitacao(pedido());assert.strictEqual(a.vals.length,3)});
t('recibo: só login, noReply, disciplinas com turma, sem apóstrofo nem HTML',()=>{const {c}=amb();c.registrarSolicitacao(pedido({nome:'=Ana Teste'}));const m=c.mails[0];
  assert.strictEqual(c.mails.length,1);assert.strictEqual(m.to,'ana@usp.br');assert.strictEqual(m.o.noReply,true);assert.strictEqual(m.o.replyTo,undefined);assert.strictEqual(m.o.cc,undefined);assert(/Exclusão/.test(m.assunto));
  assert(/^Boa tarde, =Ana\./.test(m.corpo),m.corpo);assert(/1\. TST0101 - Psicologia Teste I — turma 01\n2\. TST0303 - Disciplina Nova — turma 2026102/.test(m.corpo));
  assert(/\(1º semestre de 2026\) em 04\/03\/2026 às 15:00/.test(m.corpo),m.corpo);assert(/Ano de ingresso: 2023/.test(m.corpo));assert(/ordem de chegada/.test(m.corpo));assert(!/<[a-z]/i.test(m.corpo))});
t('recibo falhou: pedido gravado mesmo assim',()=>{const {c,r}=amb({falhaEmail:true});const res=c.registrarSolicitacao(pedido());assert.strictEqual(res.reciboEnviado,false);assert.strictEqual(r.vals.length,N_INICIAL+2)});
t('log sem dados pessoais',()=>{const {c}=amb({falhaEmail:true});c.obterDadosIniciais();c.obterCatalogoDisciplinas();c.registrarSolicitacao(pedido());
  const {c:c2}=amb({},{files:{ALU:undefined,DISC:undefined}});c2.obterDadosIniciais();c2.registrarSolicitacao(pedido({disciplinas:[{codigo:'X1234',nome:'n',turma:'1'}]}));
  assert(!c.logs.concat(c2.logs).join().match(/Ana|usp\.br|9000001|Obs/))});
t('sem ID literal de planilha nem openById com texto',()=>{const s=fs.readFileSync(SRC+'Codigo.gs','utf8');assert(!/[A-Za-z0-9_-]{40,}/.test(s));assert(!/openById\(\s*["']/.test(s))});
t('diagnóstico: tudo OK, aberto, títulos A–T, sem dados pessoais nem IDs',()=>{const {c}=amb();const r=c.diagnosticarConfiguracao();
  assert(!/ERRO/.test(r),r);assert(/Período agora — ABERTO \(1º semestre de 2026, até 06\/03\/2026 12:00\)/.test(r),r);assert(/3 disciplinas/.test(r));assert(/A="Carimbo de data\/hora".*T="Situação"/.test(r),r);assert(/retificação "02\/03\/2026" a "09\/03\/2026"/.test(r),r);
  assert(!/\b(ALU|RESP|PER|DISC|IDX)\b|Ana|9000001/.test(r.replace(/abas: [^\n]*/g,'')),r)});
t('diagnóstico: sem propriedade e sem chave apontam o passo',()=>{const c=run({},{},{agora:ABERTO});assert(/ERRO  Propriedade ID_INDEX_SPREADSHEET_ID/.test(c.diagnosticarConfiguracao()));
  const i=sheet('Página1',[['Chave','Tipo','ID de Produção'],['PLANILHA_ALUNOS','spreadsheet','ALU']]);const c2=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[i],ALU:[alunos()]},{agora:ABERTO});const r=c2.diagnosticarConfiguracao();
  assert(/ERRO  Chave EXCLUSAO_DISCIPLINAS no ID_INDEX e acesso à planilha — Não encontrei a chave "EXCLUSAO_DISCIPLINAS"/.test(r),r);assert(/OK    Chave PLANILHA_ALUNOS/.test(r))});
console.log(`\n${ok} ok, ${fail} falha(s)`);process.exit(fail?1:0);

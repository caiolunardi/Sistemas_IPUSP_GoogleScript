// Testes do backend da Busca de Alunos (Codigo.gs) com SpreadsheetApp,
// PropertiesService e HtmlService simulados. Dados 100% sintéticos.
// Uso: node testar_backend.js
const fs=require('fs'),vm=require('vm');
const SRC=require('path').join(__dirname,'..','src')+'/';
function sheet(name,vals){return{getName:()=>name,getLastRow:()=>vals.length,getLastColumn:()=>vals[0]?vals[0].length:0,
 getRange:(r,c,nr,nc)=>({getValues:()=>vals.slice(r-1,r-1+nr).map(l=>l.slice(c-1,c-1+nc))})};}
function run(props,files){const logs=[];const ctx={console,Logger:{log:m=>logs.push(String(m))},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null})},
 SpreadsheetApp:{openById:id=>{if(!files[id])throw new Error('no access');const f=files[id];return{getSheetByName:n=>f.find(s=>s.getName()===n)||null,getSheets:()=>f};}},
 HtmlService:{createTemplateFromFile:n=>({evaluate:()=>({setTitle(){return this},addMetaTag(){return this},n})}),createHtmlOutputFromFile:n=>({getContent:()=>fs.readFileSync(SRC+n+'.html','utf8')})}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(SRC+'Codigo.gs','utf8'),ctx);ctx.logs=logs;return ctx;}
const idx=sheet('Página1',[['Chave','Tipo','ID de Produção','Homologação'],['OUTRA','spreadsheet','x',''],['PLANILHA_ALUNOS','spreadsheet','ALU','HOM']]);
const alu=sheet('Alunos',[['ID da Pasta','Número USP','Nome do Aluno','Tr eMail','eMail Secundario'],['p1',1234567,'Ana Teste','ana@exemplo.invalid',''],['p2','','',' ',''],['p3','','Bruno Ficticio','','b@exemplo.invalid']]);
let ok=0,fail=0;const t=(n,f)=>{try{f();ok++;console.log('ok',n)}catch(e){fail++;console.log('FALHA',n,e.message)}};
const assert=require('assert');
t('lista correta',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[idx],ALU:[alu]});const r=c.listarAlunosParaBusca();assert.deepStrictEqual(JSON.parse(JSON.stringify(r)),[{numeroUsp:'1234567',nome:'Ana Teste',email:'ana@exemplo.invalid',emailSecundario:''},{numeroUsp:'',nome:'Bruno Ficticio',email:'',emailSecundario:'b@exemplo.invalid'}]);assert(!('pasta' in r[0]))});
t('sem propriedade',()=>{const c=run({},{});assert.throws(()=>c.listarAlunosParaBusca(),/Configuração obrigatória ausente: ID_INDEX_SPREADSHEET_ID/)});
t('chave ausente',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['X','y']])]});assert.throws(()=>c.listarAlunosParaBusca(),/Não encontrei a chave "PLANILHA_ALUNOS"/)});
t('id vazio',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Página1',[['Chave','ID de Produção'],['PLANILHA_ALUNOS','']])]});assert.throws(()=>c.listarAlunosParaBusca(),/coluna "ID de Produção" está vazia/)});
t('fallback primeira aba',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[sheet('Outra',idx.getRange(1,1,3,4).getValues())],ALU:[alu]});assert.strictEqual(c.listarAlunosParaBusca().length,2)});
t('coluna faltando',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[idx],ALU:[sheet('A',[['Número USP','Nome do Aluno','Tr eMail'],[1,'x','y']])]});assert.throws(()=>c.listarAlunosParaBusca(),/coluna "eMail Secundario"/)});
t('planilha vazia',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[idx],ALU:[sheet('A',[['Número USP']])]});assert.deepStrictEqual(Array.from(c.listarAlunosParaBusca()),[])});
t('doGet template',()=>{const c=run({},{});assert.strictEqual(c.doGet().n,'BuscaAlunosApp')});
t('include_',()=>{const c=run({},{});assert(c.include_('GradipTema').includes('gradip-theme'))});
t('diagnostico sem dados pessoais',()=>{const c=run({ID_INDEX_SPREADSHEET_ID:'IDX'},{IDX:[idx],ALU:[alu]});c.diagnosticarBuscaAlunos();const L=c.logs.join('\n');console.log(L);assert(!/Ana|1234567|exemplo|\bIDX\b|\bALU\b/.test(L));assert(/Alunos que seriam enviados à busca: 2/.test(L))});
t('diagnostico sem prop',()=>{const c=run({},{});c.diagnosticarBuscaAlunos();assert(/AUSENTE/.test(c.logs[0]))});
console.log(`${ok}/${ok+fail}`);process.exit(fail?1:0);

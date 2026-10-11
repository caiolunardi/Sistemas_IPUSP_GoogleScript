// (1.8.14) Etapa 9 / A9 — o resultado do envio NÃO devolve o endereço da planilha
// de auditoria (consultada pelo painel, decisão da 1.8.0); a cópia de segurança
// continua com o seu link; a auditoria continua criada, reaproveitada, anotada e
// identificada no índice. Funções REAIS do servidor no simulador de Apps Script
// (mockGoogle.js): estrutura curricular SINTÉTICA (curso 47012), planilha das
// secretarias, índice, pastas e auditorias FICTÍCIOS do simulador; e-mails .example.
// O objeto conferido é o que vai ao cliente: JSON.parse(JSON.stringify(resposta)),
// como google.script.run serializa.
// Uso: node testar_etapa9_auditoria_envio.js [--evidencias arq]
//      DIR_SRC=/caminho/fonte/src … para rodar em outra fonte (ex.: 1.8.13, "antes").
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa9_auditoria_envio.txt');
const evidencias = [];
const ev = (t) => evidencias.push(t);
let ok = 0, falhas = 0;
const falhou = [];
function teste(nome, fn) {
  ev('\n--- ' + nome);
  try { fn(); ok++; console.log('  ✓', nome); ev('RESULTADO: ok'); }
  catch (e) {
    falhas++; falhou.push(nome);
    console.log('  ✗', nome, '\n     ', e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e);
    ev('RESULTADO: FALHOU — ' + String(e && e.message || e).split('\n')[0]);
  }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';
const P262 = '470120000262';
const OB = 'OBRIGATORIA', EL = 'OPTATIVA_ELETIVA';
const NOMES = { PST1001: 'Disciplina teste', PST1003: 'Eletiva teste', PSA1005: 'Obrigatória PSA', PST1008: 'Do 2º semestre' };
function pacoteCurso(vinc) {
  const curs = [...new Set(vinc.map((v) => v[0]))];
  const discs = [...new Set(vinc.map((v) => v[1]))];
  const p = {
    versaoPacote: 1, curso: { codigo: '47012', nome: 'Psicologia' },
    curriculos: curs.map((c) => ({ codigo: c, habilitacao: '0', habilitacaoNome: 'Psicólogo', ano: 2026, semestre: 2, situacao: null, aacHoras: 60, aacPercentual: 1.5, info: null })),
    disciplinas: discs.map((d) => ({ codigo: d, nome: NOMES[d], versao: null, versaoOrigem: null, creditosAula: 2, creditosTrabalho: 0, ch: 30, ce: 0, cp: 0, ext: null, atpa: 0 })),
    vinculos: vinc.map((v) => ({ curriculo: v[0], disciplina: v[1], tipo: v[2], periodoIdeal: v[3] })),
    requisitos: [], avisos: [], conferencia: null,
    origem: { formato: 'csv', leitura: 'csv', arquivo: 'sintetico.csv', tamanhoBytes: 1000, codificacao: 'UTF-8', geradoEm: null }
  };
  const por = {};
  curs.forEach((c) => { const vs = p.vinculos.filter((v) => v.curriculo === c); por[c] = { disciplinas: vs.length, OBRIGATORIA: vs.filter((v) => v.tipo === OB).length, OPTATIVA_ELETIVA: vs.filter((v) => v.tipo === EL).length, OPTATIVA_LIVRE: 0, requisitos: 0 }; });
  p.resumoLeitura = { curriculos: curs.length, disciplinas: discs.length, vinculos: vinc.length, requisitos: 0, porCurriculo: por };
  return p;
}
const E = (k) => ({ origem: 'estrutura', chave: k });
function ambiente() {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(amb.ctx.obterDadosPainel());
  const pk = pacoteCurso([[P262, 'PST1001', OB, 1], [P262, 'PST1003', EL, 1], [P262, 'PSA1005', OB, 1], [P262, 'PST1008', OB, 2]]);
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  pedir(amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao }));
  pedir(amb.ctx.adicionarAGrade([E('PST1001'), E('PST1003'), E('PSA1005'), E('PST1008')]));
  amb.criarPlanilhaGrade();
  return amb;
}
/** Envio com a prévia conferida (fase 8) e a resposta COMO O CLIENTE A RECEBE (serializada). */
function enviar(amb, semestre, ano) {
  const pv = pedir(amb.ctx.previaEnvioGrade({ semestre, ano }));
  const r = amb.ctx.enviarGradeParaPreenchimento({ semestre, ano, assinatura: pv.assinatura, esperado: pv.contagens });
  return JSON.parse(JSON.stringify(r));
}
const indice = (amb) => { const a = amb.indiceGrades().getSheets()[0]; return a.getRange(1, 1, a.getLastRow(), 3).getValues(); };
const audIdDe = (amb, sem) => (indice(amb).filter((l) => String(l[0]).replace(/^'/, '') === sem && l[2])[0] || [])[2] || null;
/** O que o cliente recebe não pode conter o ID nem o endereço da planilha de auditoria. */
function semEnderecoDaAuditoria(amb, r, sem) {
  const id = audIdDe(amb, sem);
  verdade(id, 'auditoria identificada no índice');
  const url = amb.planilhas.get(id).getUrl();
  const texto = JSON.stringify(r);
  ev('  auditoria no índice: ' + id + ' · endereço interno: ' + url);
  ev('  resposta serializada (dados.auditoria): ' + JSON.stringify(r.dados && r.dados.auditoria) + ' · chaves: ' + JSON.stringify(Object.keys((r.dados && r.dados.auditoria) || {}).sort()));
  igual(Object.keys(r.dados.auditoria).sort(), ['criada', 'nome', 'registroAtivo'], 'contrato de auditoria');
  verdade(!texto.includes(url), 'o endereço da auditoria não vai ao cliente');
  verdade(!texto.includes(id), 'o ID da auditoria não vai ao cliente');
}

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 9 / A9 — resultado do envio sem o endereço da auditoria ===');
ev('Ambiente: funções reais do servidor no simulador de Apps Script (mockGoogle.js); dados sintéticos.');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* */ }

let amb1, r1;
teste('L1. envio 2027/1 que CRIA a auditoria: dados.auditoria = {nome, criada: true, registroAtivo: false} — sem url nem ID — no objeto serializado; aviso de ativação mantido', () => {
  amb1 = ambiente();
  r1 = enviar(amb1, '1', 2027);
  pedir(r1);
  ev('  [L1] auditoria: ' + JSON.stringify(r1.dados.auditoria) + ' · avisos: ' + JSON.stringify(r1.dados.avisos));
  igual([r1.dados.auditoria.nome, r1.dados.auditoria.criada, r1.dados.auditoria.registroAtivo], ['Auditoria - Grade Horária - 1º semestre de 2027', true, false]);
  verdade(r1.dados.avisos.some((a) => /ativarAuditoriaGrade/.test(a)), 'aviso de registro incompleto');
  semEnderecoDaAuditoria(amb1, r1, '2027/1');
});

teste('L2. reenvio de 2027/1 que REAPROVEITA a auditoria: criada = false, mesmo nome e situação, sem url nem ID; a MESMA planilha no índice', () => {
  const id0 = audIdDe(amb1, '2027/1');
  const r = enviar(amb1, '1', 2027);
  pedir(r);
  ev('  [L2] auditoria: ' + JSON.stringify(r.dados.auditoria));
  igual([r.dados.auditoria.nome, r.dados.auditoria.criada, r.dados.auditoria.registroAtivo], ['Auditoria - Grade Horária - 1º semestre de 2027', false, false]);
  igual(audIdDe(amb1, '2027/1'), id0, 'mesma auditoria');
  semEnderecoDaAuditoria(amb1, r, '2027/1');
});

teste('L3. registro ATIVO (ativarAuditoriaGrade antes): registroAtivo = true e sem o aviso de ativação; INATIVO (L1): false e com o aviso; nos dois, sem url', () => {
  const amb = ambiente();
  pedir(amb.ctx.ativarAuditoriaGrade());
  const r = enviar(amb, '1', 2027);
  pedir(r);
  ev('  [L3] ativa: ' + JSON.stringify(r.dados.auditoria) + ' · avisos: ' + JSON.stringify(r.dados.avisos));
  igual([r.dados.auditoria.registroAtivo, r.dados.avisos.some((a) => /ativarAuditoriaGrade/.test(a))], [true, false]);
  igual([r1.dados.auditoria.registroAtivo, r1.dados.avisos.some((a) => /ativarAuditoriaGrade/.test(a))], [false, true], 'inativa (L1)');
  semEnderecoDaAuditoria(amb, r, '2027/1');
});

teste('L7. cópia de segurança (controle, nas duas versões): dados.backup = {nome, url https, semestre 2026/1}; o endereço é o da cópia na pasta e o ID dela está na coluna B do índice', () => {
  const b = r1.dados.backup;
  ev('  [L7] backup: ' + JSON.stringify(b));
  igual(Object.keys(b).sort(), ['nome', 'semestre', 'url']);
  igual(b.semestre, '2026/1');
  verdade(/^https:\/\//.test(b.url), 'url https');
  verdade(/^Grade Horária - 1º Semestre de 2026 \(cópia de \d\d\/\d\d\/\d{4} \d\d:\d\d\)$/.test(b.nome), b.nome);
  const idCopia = indice(amb1).filter((l) => String(l[0]).replace(/^'/, '') === '2026/1')[0][1];
  verdade(idCopia && amb1.estado.pastas.get('ID_PASTA_BACKUP_TESTE').arquivos.includes(idCopia), 'cópia na pasta e no índice');
  igual(b.url, amb1.planilhas.get(idCopia).getUrl(), 'link da própria cópia');
});

teste('L8. auditoria interna intacta: ID na coluna C do índice, planilha na pasta das auditorias com o evento "Envio da grade" (2 depois do reenvio); obterAuditoriaGrade funciona para administrador e leitor', () => {
  const id = audIdDe(amb1, '2027/1');
  verdade(amb1.estado.pastas.get('ID_PASTA_AUDITORIA_TESTE').arquivos.includes(id), 'na pasta das auditorias');
  const ed = amb1.planilhas.get(id).getSheetByName('Edições');
  const tipos = ed.getRange(2, 14, Math.max(ed.getLastRow() - 1, 1), 1).getValues().map((l) => l[0]).filter(Boolean);
  igual(tipos, ['Envio da grade', 'Envio da grade'], 'eventos anotados');
  const adm = pedir(amb1.ctx.obterAuditoriaGrade({ semestre: '2027/1' }));
  const leitor = pedir(criarAmbiente({ dirSrc: DIR_SRC, reusar: amb1, usuario: LEITOR, dono: ADMIN }).ctx.obterAuditoriaGrade({ semestre: '2027/1' }));
  const tiposPainel = (d) => d.edicoes.map((l) => l[10]);
  ev('  [L8] índice: ' + JSON.stringify(indice(amb1).slice(2)) + ' · eventos: ' + JSON.stringify(tipos) + ' · obterAuditoriaGrade (admin): ' + adm.totalEdicoes + ' linha(s) ' + JSON.stringify(tiposPainel(adm)) + '; (leitor): ' + leitor.totalEdicoes);
  igual([adm.semestre, adm.totalEdicoes, tiposPainel(adm)], ['2027/1', 2, ['Envio da grade', 'Envio da grade']], 'consulta pelo painel (administrador)');
  igual([leitor.semestre, leitor.totalEdicoes], ['2027/1', 2], 'consulta pelo painel (leitor)');
});

teste('L8b. envio 2027/2: auditoria NOVA de 2027/2 (criada = true) e "Grade encerrada" anotada na de 2027/1; resposta sem url nem ID', () => {
  const r = enviar(amb1, '2', 2027);
  pedir(r);
  igual([r.dados.auditoria.nome, r.dados.auditoria.criada], ['Auditoria - Grade Horária - 2º semestre de 2027', true]);
  const ed = amb1.planilhas.get(audIdDe(amb1, '2027/1')).getSheetByName('Edições');
  const tipos = ed.getRange(2, 14, ed.getLastRow() - 1, 1).getValues().map((l) => l[0]);
  igual(tipos[tipos.length - 1], 'Grade encerrada');
  semEnderecoDaAuditoria(amb1, r, '2027/2');
});

teste('L8c. recusa sem auditoria disponível (falha ao criar a planilha de auditoria): AUDITORIA_FALHOU, cópia feita, grade intacta — o caminho de erro continua igual', () => {
  const amb = ambiente();
  amb.injetarFalha((e) => e.tipo === 'createSpreadsheet');
  const r = enviar(amb, '1', 2027);
  ev('  [L8c] ' + JSON.stringify({ ok: r.ok, codigo: r.codigo, erro: r.erro }));
  igual([r.ok, r.codigo], [false, 'AUDITORIA_FALHOU']);
  igual(amb.grade().getName(), 'Grade Horária - 1º Semestre de 2026');
  verdade(!/https:\/\//.test(JSON.stringify(r)), 'nenhum endereço na recusa');
});

teste('L9. (complementar, só leitura do código) EnvioGrade.gs não monta o endereço da auditoria na resposta e PainelPreparacao.html não usa auditoria.url', () => {
  const envio = fs.readFileSync(path.join(DIR_SRC, 'EnvioGrade.gs'), 'utf8');
  const painel = fs.readFileSync(path.join(DIR_SRC, 'PainelPreparacao.html'), 'utf8');
  const linhaRetorno = (envio.match(/auditoria: \{[^}]*\}/) || [''])[0];
  ev('  [L9] retorno: ' + linhaRetorno + ' · painel usa auditoria.url: ' + /auditoria\.url/.test(painel));
  verdade(linhaRetorno && !/getUrl|url:/.test(linhaRetorno), 'retorno sem url: ' + linhaRetorno);
  verdade(!/auditoria\.url/.test(painel), 'painel sem auditoria.url');
  verdade(/backup: \{ nome: nomeCopia, url: copia\.getUrl\(\)/.test(envio), 'backup continua com url');
});

console.log('\nExecutados: ' + (ok + falhas) + ' · ' + ok + ' ok · ' + falhas + ' falhas · 0 pulados');
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
ev('\n=== Resumo: ' + ok + ' ok, ' + falhas + ' falhas, 0 pulados');
fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true });
fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n');
process.exit(falhas ? 1 : 0);

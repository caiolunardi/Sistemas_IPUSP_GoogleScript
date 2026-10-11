// Etapa 4 (1.8.5; seções 16–18 da correção complementar 1.8.6) — salvamento individual de disciplina da ESTRUTURA:
// ajustes ("Ajustes manuais") + observação (coluna Observações da aba
// Disciplinas em uso) + marca de grade, com falhas DETERMINÍSTICAS
// injetadas no simulador (mockGoogle.js) e reabertura sobre a mesma
// persistência — inclusive a partir de uma FOTOGRAFIA tirada no meio da
// execução (execução encerrada: catch/compensação/resposta não acontecem).
//
// Reprodução da revisão (seção 1): PST1001, nome "Nome ajustado" e
// observação "Observação nova", falha no setValue da observação. Na 1.8.4:
// ok:false INESPERADO e, depois de reabrir, nome ajustado com observação
// vazia (gravação parcial silenciosa).
//
// Estrutura curricular SINTÉTICA (códigos PST1001, PST1002, 4701003,
// PSA1004, PSE1005, a partir de pacotes_sinteticos.js; o CSV do Júpiter só
// empresta o formato do curso/currículo). E-mails .example.
// Uso: node testar_etapa4_salvamento.js <grade_curricular.csv> [--evidencias arq]
//      DIR_SRC=/caminho/fonte/src … para rodar em outra fonte.
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');
const { carregar } = require('./carregar_leitores');
const { parSintetico } = require('./pacotes_sinteticos');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const csvPath = process.argv[2];
if (!csvPath || csvPath.startsWith('--')) { console.log('Uso: node testar_etapa4_salvamento.js <grade_curricular.csv>'); process.exit(2); }
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa4_salvamento.txt');
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

// ---------------------------------------------------------------- dados
const leitores = carregar();
const modelo = leitores.LeitorCsvJupiter.lerBytes(new Uint8Array(fs.readFileSync(csvPath)), 'grade_curricular.csv');
const CODIGOS = { SIN0001: 'PST1001', SIN0002: 'PST1002', SIN0003: '4701003', SIN0004: 'PSA1004', SIN0005: 'PSE1005' };
function pacote() {
  const p = parSintetico(modelo, 5).csv;
  p.disciplinas.forEach((d) => { d.codigo = CODIGOS[d.codigo]; d.nome = 'Sintética ' + d.codigo; });
  p.vinculos.forEach((v) => { v.disciplina = CODIGOS[v.disciplina]; });
  return p;
}
const META_ATIVA = 'estruturaCurricular.ativa';
const META_SALV = 'estruturaCurricular.salvamento';
const ADMIN = 'dono@unidade.example';
const LEITOR = 'leitor@unidade.example';

function novoAmbiente() {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: ADMIN, dono: ADMIN, permissoes: [[LEITOR, 'LEITOR']] });
  pedir(amb.ctx.obterDadosPainel());
  importar(amb);
  return amb;
}
function importar(amb) {
  const pk = pacote();
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  return amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), p0.assinatura, { operacao: p0.operacao, previa: p0.impressao });
}
/** Novo contexto (execução nova) sobre a MESMA persistência ou sobre uma fotografia. */
function reabrir(origem, usuario) { return criarAmbiente({ dirSrc: DIR_SRC, reusar: origem, usuario: usuario || ADMIN, dono: ADMIN }); }

// ---- leitura DIRETA da persistência (sem passar pelo sistema)
function metadado(ss, k) { const m = ss.meta.find((x) => x.k === k); return m ? m.v : null; }
function abaAtiva(amb, nome) {
  const ss = amb.estrutura();
  const m = JSON.parse(metadado(ss, META_ATIVA));
  return ss.sheets.find((s) => s.getSheetId() === m.abas[nome]);
}
function objetos(aba) {
  if (!aba || aba.getLastRow() < 2) return [];
  const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => { const o = {}; v[0].forEach((t, i) => { if (t) o[t] = l[i] instanceof Date ? l[i].toISOString() : l[i]; }); return o; });
}
function ajusteGravado(amb, chave) { return objetos(amb.estrutura().getSheetByName('Ajustes manuais')).filter((a) => String(a['Disciplina (código no Júpiter)']) === chave); }
function obsGravada(amb, chave) { const l = objetos(abaAtiva(amb, 'Disciplinas')).find((d) => String(d['Código']) === chave); return l ? String(l['Observações'] == null ? '' : l['Observações']) : null; }
function pendencia(amb) { const v = metadado(amb.estrutura(), META_SALV); return v ? JSON.parse(v) : null; }
/** Resumo da persistência de uma disciplina: [nome ajustado, créditos-aula ajustados, na grade, observação, há pendência]. */
function persistido(amb, chave) {
  const a = ajusteGravado(amb, chave);
  if (a.length > 1) throw new Error('linhas duplicadas em Ajustes manuais para ' + chave);
  return { nome: a[0] ? a[0]['Nome ajustado'] || '' : '(sem linha)', creditosAula: a[0] ? a[0]['Créditos-aula ajustados'] : '(sem linha)', naGrade: a[0] ? a[0]['Adicionada à grade horária'] || '' : '(sem linha)', obs: obsGravada(amb, chave), pendente: !!pendencia(amb) };
}
/** Leitura pelo painel numa execução nova. */
function painel(origem, usuario) { const a = reabrir(origem, usuario); return { amb: a, d: pedir(a.ctx.obterDadosPainel()) }; }
function nomeNoPainel(d, chave) { const a = d.preparacao.ajustes.find((x) => x.chave === chave); return a && a.campos.nome ? a.campos.nome : null; }
function obsNoPainel(d, chave) { const x = d.base.disciplinas.find((y) => y.codigo === chave); return x ? x.observacoes : null; }
/** Ficha como o painel manda: todos os campos (do Júpiter + ajustes) + o que mudou. */
function pedidoFicha(amb, chave, mudar, observacoes, extra) {
  const d = pedir(amb.ctx.obterDadosPainel());
  const base = d.base.disciplinas.find((x) => x.codigo === chave);
  const aj = d.preparacao.ajustes.find((x) => x.chave === chave);
  const campos = {};
  ['codigo', 'nome', 'departamento', 'creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'ext', 'atpa', 'versao'].forEach((k) => {
    const v = aj && aj.campos[k] !== undefined ? aj.campos[k] : base[k];
    campos[k] = v === null || v === undefined ? '' : String(v);
  });
  Object.assign(campos, mudar || {});
  const p = { origem: 'estrutura', chave, campos, oferta: null };
  if (observacoes !== undefined) p.observacoes = observacoes;
  return Object.assign(p, extra || {});
}
const ehObs = (chave) => (e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba);
const falhaObs = (amb, vezes) => amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba), vezes);
function registrar(titulo, r, amb, chave) {
  ev(titulo + ' — resposta: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, resultado: r.dados && r.dados.resultado || null, erro: r.erro || null, salvamento: r.dados && r.dados.salvamento || null }));
  if (amb) ev('  persistido: ' + JSON.stringify(persistido(amb, chave)));
}

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 4 — salvamento individual (estrutura: ajustes + observação + grade) ===');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* */ }

// =====================================================================
console.log('\n== R. Reprodução da revisão (só registra)');
(function () {
  ev('\n--- R. Reprodução: PST1001, nome "Nome ajustado" + observação "Observação nova", falha no setValue da observação (sempre)');
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  registrar('Salvar', r, amb, 'PST1001');
  const { d } = painel(amb);
  ev('Depois de reabrir (contexto novo, sem falhas): nome no painel = ' + JSON.stringify(nomeNoPainel(d, 'PST1001')) + ' · observação = ' + JSON.stringify(obsNoPainel(d, 'PST1001')) + ' · salvamentoPendente = ' + JSON.stringify(d.salvamentoPendente === undefined ? '(campo inexistente)' : d.salvamentoPendente));
  ev('Persistido depois da reabertura: ' + JSON.stringify(persistido(amb, 'PST1001')));
  console.log('  (retrato gravado nas evidências)');
})();

// =====================================================================
console.log('\n== 1. Sucesso');
teste('1a. campos e observação juntos: concluído, gravados, resposta com o que foi lido, releitura igual', () => {
  const amb = novoAmbiente();
  const r = pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Nome ajustado', creditosAula: '4' }, 'Observação nova')));
  igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: 4, naGrade: '', obs: 'Observação nova', pendente: false });
  igual(r.observacao, { chave: 'PST1001', texto: 'Observação nova' }, 'observação na resposta');
  igual(r.preparacao.ajustes.find((a) => a.chave === 'PST1001').campos.nome, 'Nome ajustado');
  const { d } = painel(amb);
  igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001')], ['Nome ajustado', 'Observação nova']);
  igual([r.resultado, d.salvamentoPendente], ['concluido', null], 'contrato 1.8.5: resultado e campo salvamentoPendente');
});
teste('1b–1f. só campos; só observação; limpar observação; omitir observação; voltar ao Júpiter (linha removida)', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Só nome' })));
  igual(persistido(amb, 'PST1001'), { nome: 'Só nome', creditosAula: '', naGrade: '', obs: '', pendente: false }, 'só campos');
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', {}, 'Só observação')));
  igual(persistido(amb, 'PST1001'), { nome: 'Só nome', creditosAula: '', naGrade: '', obs: 'Só observação', pendente: false }, 'só observação');
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { creditosAula: '6' })));
  igual(persistido(amb, 'PST1001').obs, 'Só observação', 'observacoes ausente não mexe');
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', {}, '')));
  igual(persistido(amb, 'PST1001').obs, '', 'observação vazia limpa');
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Sintética PST1001', creditosAula: '2' })));
  igual(ajusteGravado(amb, 'PST1001'), [], 'tudo igual ao Júpiter: sem linha de ajuste');
  igual(painel(amb).d.salvamentoPendente, null, 'contrato 1.8.5: salvamentoPendente');
});

// =====================================================================
console.log('\n== 2. Ajustes anteriores');
teste('2. sem ajuste anterior cria a linha; com ajustes anteriores, campos não enviados, marca de grade, exclusão e coluna extra sobrevivem', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1002', { creditosAula: '5' })));
  pedir(amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PST1002' }]));
  const aba = amb.estrutura().getSheetByName('Ajustes manuais');
  const col = aba.getLastColumn() + 1;
  aba.getRange(1, col).setValue('Nota da equipe');
  aba.getRange(2, col).setValue('não mexer');
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { nome: 'Novo nome' }, observacoes: 'obs 1002' }));
  const a = ajusteGravado(amb, 'PST1002');
  igual([a.length, a[0]['Nome ajustado'], a[0]['Créditos-aula ajustados'], a[0]['Adicionada à grade horária'], a[0]['Nota da equipe']], [1, 'Novo nome', 5, 'Sim', 'não mexer']);
  igual(obsGravada(amb, 'PST1002'), 'obs 1002');
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Sem ajuste antes' })));
  igual(ajusteGravado(amb, 'PST1001').length, 1, 'linha nova');
});

// =====================================================================
console.log('\n== 3. Falha antes da primeira escrita e entre as escritas');
teste('3a. validação recusada: nada muda (resposta, persistência, releitura)', () => {
  const amb = novoAmbiente();
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'X', codigo: 'PST1002' }, observacoes: 'não pode entrar' });
  igual([r.ok, r.codigo], [false, 'CODIGO_REPETIDO']);
  igual(persistido(amb, 'PST1001'), { nome: '(sem linha)', creditosAula: '(sem linha)', naGrade: '(sem linha)', obs: '', pendente: false });
});
teste('3b. falha na PRIMEIRA escrita (antes de aplicar): "não concluído", estado anterior confirmado, nada pendente', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Antes' }, 'obs antes')));
  const f = amb.injetarFalha((e) => (e.tipo === 'metadado' && e.chave === META_SALV) || (e.tipo === 'setValues' && e.aba === 'Ajustes manuais'), 1);
  const r = amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Depois' }, 'obs depois'));
  registrar('3b', r, amb, 'PST1001');
  igual(f.disparos, 1, 'falha disparada');
  igual(persistido(amb, 'PST1001'), { nome: 'Antes', creditosAula: '', naGrade: '', obs: 'obs antes', pendente: false }, 'estado anterior');
  igual([r.ok, r.codigo, r.dados && r.dados.resultado], [false, 'NAO_SALVO', 'nao_concluido'], 'resposta');
  verdade(/Nada foi salvo/.test(r.erro), r.erro);
  igual(nomeNoPainel(r.dados.preparacao ? r.dados : { preparacao: { ajustes: [] } }, 'PST1001'), 'Antes', 'dados confirmados (lidos) na resposta');
  const { d } = painel(amb);
  igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001'), d.salvamentoPendente], ['Antes', 'obs antes', null], 'após reabrir');
});
teste('3c. falha na escrita da OBSERVAÇÃO (uma vez): nova tentativa na mesma chamada conclui; nada parcial', () => {
  const amb = novoAmbiente();
  const f = falhaObs(amb, 1);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  registrar('3c', r, amb, 'PST1001');
  igual(f.disparos, 1, 'falha disparada');
  igual([r.ok, r.dados && r.dados.resultado], [true, 'concluido']);
  igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
});
teste('3d. REPRODUÇÃO: falha persistente na observação depois dos ajustes: nada de parcial silencioso — pendência explícita com o que já foi gravado; reabertura conclui', () => {
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  registrar('3d', r, amb, 'PST1001');
  igual([r.ok, r.codigo], [false, 'SALVAMENTO_PENDENTE'], 'resposta não é erro genérico');
  igual([r.dados.resultado, r.dados.salvamento.chave, r.dados.salvamento.ajusteGravado, r.dados.salvamento.observacaoGravada], ['pendente', 'PST1001', true, false], 'o que está gravado');
  igual(nomeNoPainel(r.dados, 'PST1001'), 'Nome ajustado', 'dados confirmados lidos da planilha');
  igual(r.dados.observacao, { chave: 'PST1001', texto: '' }, 'observação confirmada (ainda a anterior)');
  igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: '', pendente: true }, 'parcial, mas registrado');
  const { amb: a2, d } = painel(amb);   // execução nova, escrita voltou a funcionar
  igual(d.salvamentoPendente && d.salvamentoPendente.estado, 'concluido', 'reabertura reconhece e conclui');
  igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001')], ['Nome ajustado', 'Observação nova']);
  igual(persistido(a2, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
});

// =====================================================================
console.log('\n== 4. Escrita aplicada seguida de exceção');
for (const [nome, regra] of [
  ['observação (setValue aplicado e erro)', (e) => e.tipo === 'setValueDepois' && /^Disciplinas/.test(e.aba)],
  ['ajustes (setValues aplicado e erro)', (e) => e.tipo === 'setValuesDepois' && e.aba === 'Ajustes manuais'],
  ['primeira escrita do fluxo — registro do pedido (gravado e erro)', (e) => e.tipo === 'metadadoDepois' && e.chave === META_SALV]]) {
  teste('4. ' + nome + ': a escrita aconteceu antes do erro; o resultado vem da planilha (concluído)', () => {
    const amb = novoAmbiente();
    let gravadoNoErro = null;
    const f = amb.injetarFalha((e) => { const sim = regra(e); if (sim) gravadoNoErro = persistido(amb, 'PST1001'); return sim; }, 1);
    const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
    registrar('4 ' + nome, r, amb, 'PST1001');
    igual(f.disparos, 1, 'falha disparada');
    ev('  persistido no instante do erro: ' + JSON.stringify(gravadoNoErro));
    igual([r.ok, r.dados && r.dados.resultado], [true, 'concluido']);
    igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
  });
}

// =====================================================================
console.log('\n== 5. Falha durante a recuperação');
teste('5a. recuperação falha de novo (reabertura com a escrita ainda falhando): pendência continua; depois, "Concluir" conclui', () => {
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  const a2 = reabrir(amb);
  falhaObs(a2, 99);
  const d = pedir(a2.ctx.obterDadosPainel());
  igual([d.salvamentoPendente.estado, d.salvamentoPendente.codigo, d.salvamentoPendente.ajusteGravado, d.salvamentoPendente.observacaoGravada], ['pendente', 'PST1001', true, false], 'pendência no painel');
  verdade(/não terminou/.test(d.salvamentoPendente.mensagem), d.salvamentoPendente.mensagem);
  verdade(persistido(a2, 'PST1001').pendente, 'registro continua');
  const r1 = a2.ctx.resolverSalvamentoPendente({ acao: 'concluir' });
  igual([r1.ok, r1.codigo], [false, 'SALVAMENTO_PENDENTE'], '"Concluir" com a escrita falhando: continua pendente');
  a2.limparFalhas();
  const r2 = pedir(a2.ctx.resolverSalvamentoPendente({ acao: 'concluir' }));
  igual([r2.resultado, r2.observacao], ['concluido', { chave: 'PST1001', texto: 'Observação nova' }]);
  igual(persistido(a2, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
});
teste('5b. falha ao remover o registro depois de tudo gravado: pendente com "já gravado"; a próxima ação confirma sem reescrever', () => {
  const amb = novoAmbiente();
  amb.injetarFalha((e) => e.tipo === 'metadadoRemover' && e.chave === META_SALV, 2);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  registrar('5b', r, amb, 'PST1001');
  igual([r.ok, r.codigo, r.dados.salvamento.ajusteGravado, r.dados.salvamento.observacaoGravada], [false, 'SALVAMENTO_PENDENTE', true, true]);
  verdade(/já estão gravadas/.test(r.erro), r.erro);
  const escritas = amb.estado.escritas;
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1002', { nome: 'Outra' })));   // próxima gravação conclui antes
  igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
  verdade(amb.estado.escritas - escritas === 1, 'só a escrita da outra disciplina (a pendente não foi reescrita): ' + (amb.estado.escritas - escritas));
});

// =====================================================================
console.log('\n== 6–7. Execução encerrada (fotografia da persistência) e reabertura');
for (const [nome, regra, esperadoNaFoto] of [
  ['6a. encerrada logo depois do registro do pedido (antes de qualquer dado)', (e) => e.tipo === 'metadadoDepois' && e.chave === META_SALV, { nome: '(sem linha)', obs: '' }],
  ['6b. encerrada ENTRE as escritas (ajustes gravados, observação não)', (e) => e.tipo === 'setValuesDepois' && e.aba === 'Ajustes manuais', { nome: 'Nome ajustado', obs: '' }],
  ['7. encerrada depois das escritas principais, antes de concluir/responder', (e) => e.tipo === 'setValueDepois' && /^Disciplinas/.test(e.aba), { nome: 'Nome ajustado', obs: 'Observação nova' }]]) {
  teste(nome + ': a reabertura reconhece e conclui o pedido', () => {
    const amb = novoAmbiente();
    let foto = null, naFoto = null;
    amb.injetarFalha((e) => { if (!foto && regra(e)) { foto = amb.fotografia(); naFoto = persistido(amb, 'PST1001'); } return false; }, 1);
    amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
    verdade(foto, 'fotografia tirada no ponto');
    ev('  persistido no instante do encerramento: ' + JSON.stringify(naFoto));
    igual([naFoto.nome, naFoto.obs], [esperadoNaFoto.nome, esperadoNaFoto.obs], 'estado no ponto do encerramento');
    const { amb: a2, d } = painel(foto);
    ev('  salvamentoPendente na reabertura: ' + JSON.stringify(d.salvamentoPendente === undefined ? '(campo inexistente)' : d.salvamentoPendente));
    igual(persistido(a2, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false }, 'concluído após reabrir');
    igual(d.salvamentoPendente && d.salvamentoPendente.estado, 'concluido', 'painel informa que concluiu');
    igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001')], ['Nome ajustado', 'Observação nova']);
  });
}
teste('6c. encerrada entre as escritas e reaberta por um LEITOR: dados como estão + aviso de salvamento em andamento; nada é escrito', () => {
  const amb = novoAmbiente();
  let foto = null;
  amb.injetarFalha((e) => { if (!foto && e.tipo === 'setValuesDepois' && e.aba === 'Ajustes manuais') foto = amb.fotografia(); return false; }, 1);
  amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  const leitor = reabrir(foto, LEITOR);
  const escritas = leitor.estado.escritas;
  const d = pedir(leitor.ctx.obterDadosPainel());
  igual(d.salvamentoPendente, { estado: 'pendente' }, 'leitor: só o aviso');
  igual(leitor.estado.escritas, escritas, 'leitor não escreve');
  igual(obsNoPainel(d, 'PST1001'), '', 'leitor vê o que está gravado');
  igual(leitor.ctx.resolverSalvamentoPendente({ acao: 'concluir' }).codigo, 'SO_ADMIN', 'leitor não conclui');
});

// =====================================================================
console.log('\n== 8. Flush');
teste('8. falha no flush depois das escritas (uma vez): conferência e nova tentativa concluem (o simulador não reproduz os buffers reais do Google)', () => {
  const amb = novoAmbiente();
  const f = amb.injetarFalha((e) => e.tipo === 'flush', 1);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  registrar('8', r, amb, 'PST1001');
  igual(f.disparos, 1);
  igual([r.ok, r.dados && r.dados.resultado], [true, 'concluido']);
  igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
});

// =====================================================================
console.log('\n== 9. Repetição e pedidos posteriores');
teste('9a. recuperação repetida (duas reaberturas) não duplica linha nem perde ajustes anteriores', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { creditosAula: '7' })));
  let foto = null;
  amb.injetarFalha((e) => { if (!foto && e.tipo === 'setValuesDepois' && e.aba === 'Ajustes manuais') foto = amb.fotografia(); return false; }, 1);
  amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  const a2 = reabrir(foto); pedir(a2.ctx.obterDadosPainel());
  const a3 = reabrir(a2); pedir(a3.ctx.obterDadosPainel());
  pedir(a3.ctx.resolverSalvamentoPendente({ acao: 'concluir' }));
  igual(persistido(a3, 'PST1001'), { nome: 'Nome ajustado', creditosAula: 7, naGrade: '', obs: 'Observação nova', pendente: false });
});
teste('9b. pendência que não conclui bloqueia novo salvamento da MESMA disciplina; liberada a escrita, o pedido antigo é concluído ANTES e o novo vale por último', () => {
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Pedido antigo' }, observacoes: 'obs antiga' });
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Pedido novo' }, observacoes: 'obs nova' });
  igual([r.ok, r.codigo], [false, 'SALVAMENTO_PENDENTE'], 'novo bloqueado');
  igual(persistido(amb, 'PST1001').nome, 'Pedido antigo', 'novo não foi aplicado');
  amb.limparFalhas();
  pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Pedido novo' }, observacoes: 'obs nova' }));
  igual(persistido(amb, 'PST1001'), { nome: 'Pedido novo', creditosAula: '', naGrade: '', obs: 'obs nova', pendente: false }, 'o novo é o estado final');
  const { d } = painel(amb);
  igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001'), d.salvamentoPendente], ['Pedido novo', 'obs nova', null], 'reabertura não reaplica o antigo');
});

// =====================================================================
console.log('\n== 10. Salvar com adicionarAGrade');
teste('10a. sucesso: marca de grade e observação gravadas juntas', () => {
  const amb = novoAmbiente();
  const r = pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Para a grade' }, 'obs grade', { adicionarAGrade: true })));
  igual(persistido(amb, 'PST1001'), { nome: 'Para a grade', creditosAula: '', naGrade: 'Sim', obs: 'obs grade', pendente: false });
  igual([r.grade.adicionada, r.resultado], [true, 'concluido'], 'grade e contrato');
});
teste('10b. sem semestre de oferecimento: salva e informa; excluída: salva sem marcar', () => {
  const amb = novoAmbiente();
  const r = pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PSE1005', { nome: 'Sem semestre' }, 'obs', { adicionarAGrade: true })));
  igual([r.grade.semOferecimento, persistido(amb, 'PSE1005').naGrade, persistido(amb, 'PSE1005').obs], [true, '', 'obs']);
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSA1004' }], true));
  const r2 = pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PSA1004', { nome: 'Excluída' }, 'obs exc', { adicionarAGrade: true })));
  igual([r2.grade.excluida, persistido(amb, 'PSA1004').naGrade, ajusteGravado(amb, 'PSA1004')[0]['Excluída']], [true, '', 'Sim']);
});
teste('10c. falha entre as escritas: a marca de grade segue o mesmo pedido (pendente, depois concluída), não fica esquecida', () => {
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  const r = amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Para a grade' }, 'obs grade', { adicionarAGrade: true }));
  igual([r.codigo, r.dados.salvamento.ajusteGravado, r.dados.salvamento.observacaoGravada], ['SALVAMENTO_PENDENTE', true, false]);
  igual(r.dados.preparacao.ajustes.find((a) => a.chave === 'PST1001').naGrade, true, 'marca já gravada e informada (lida da planilha)');
  const { amb: a2 } = painel(amb);
  igual(persistido(a2, 'PST1001'), { nome: 'Para a grade', creditosAula: '', naGrade: 'Sim', obs: 'obs grade', pendente: false });
});

// =====================================================================
console.log('\n== 11. Identidade');
teste('11. código efetivo alterado: observação e recuperação ficam na chave original; código numérico; observação parecida com fórmula continua texto', () => {
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { codigo: 'PST1999', nome: 'Código trocado' }, 'obs da 1001'));
  const { amb: a2 } = painel(amb);
  igual(persistido(a2, 'PST1001'), { nome: 'Código trocado', creditosAula: '', naGrade: '', obs: 'obs da 1001', pendente: false });
  igual(ajusteGravado(a2, 'PST1001')[0]['Código ajustado'], 'PST1999');
  igual(obsGravada(a2, 'PST1999'), null, 'nenhuma linha com o código efetivo');
  pedir(a2.ctx.salvarDisciplina(pedidoFicha(a2, '4701003', { nome: 'Numérica' }, '=SOMA(1;2)')));
  igual(obsGravada(a2, '4701003'), '=SOMA(1;2)', 'texto (não fórmula)');
  const cel = abaAtiva(a2, 'Disciplinas').cells; verdade(![...cel.values()].some((v) => v && v.formula), 'nenhuma fórmula gravada');
  igual(painel(a2).d.base.disciplinas.find((x) => x.codigo === '4701003').observacoes, '=SOMA(1;2)');
});

// =====================================================================
console.log('\n== 12. Outras disciplinas, aba ativa, reimportação');
teste('12. outras disciplinas e colunas extras intactas; aba Disciplinas EM USO (depois de reimportar); reimportação preserva a observação', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1002', {}, 'obs 1002')));
  const r0 = importar(amb); pedir(r0);   // reimportação: a aba Disciplinas em uso muda (ID interno)
  const abaUso = abaAtiva(amb, 'Disciplinas');
  const extraCol = abaUso.getLastColumn() + 1;
  abaUso.getRange(1, extraCol).setValue('Coluna livre'); abaUso.getRange(3, extraCol).setValue('valor livre');
  const outrasAntes = objetos(abaUso).filter((l) => l['Código'] !== 'PST1001');
  falhaObs(amb, 1);
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Depois da reimportação' }, 'obs na aba em uso')));
  igual(obsGravada(amb, 'PST1001'), 'obs na aba em uso', 'gravada na aba em uso');
  igual(objetos(abaAtiva(amb, 'Disciplinas')).filter((l) => l['Código'] !== 'PST1001'), outrasAntes, 'outras linhas e coluna livre intactas');
  const nominal = amb.estrutura().getSheetByName('Disciplinas');
  ev('  aba nominal "Disciplinas" é a em uso? ' + (nominal === abaAtiva(amb, 'Disciplinas')));
  pedir(importar(amb));
  igual([obsGravada(amb, 'PST1001'), obsGravada(amb, 'PST1002')], ['obs na aba em uso', 'obs 1002'], 'reimportação preserva as observações');
});

// =====================================================================
console.log('\n== 13. Pendência persistente e pontos conflitantes');
function ambPendente() {
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  return amb;   // falhas continuam ativas neste contexto
}
teste('13a. com a pendência sem concluir: outra disciplina, ação em lote, importação e recomeço são recusados com a mensagem da pendência; nada muda', () => {
  const amb = ambPendente();
  const antes = JSON.stringify([persistido(amb, 'PST1001'), persistido(amb, 'PST1002'), abaAtiva(amb, 'Disciplinas').getSheetId()]);
  const tentativas = [
    ['outra disciplina', amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1002', { nome: 'X' }))],
    ['lote', amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PST1002' }])],
    ['importação', importar(amb)],
    ['recomeço', amb.ctx.cadastrarNovaGrade('APAGAR')]
  ];
  tentativas.forEach(([n, r]) => { igual([n, r.ok, r.codigo], [n, false, 'SALVAMENTO_PENDENTE']); verdade(/PST1001/.test(r.erro), n + ': ' + r.erro); });
  igual(JSON.stringify([persistido(amb, 'PST1001'), persistido(amb, 'PST1002'), abaAtiva(amb, 'Disciplinas').getSheetId()]), antes, 'nada mudou');
  amb.limparFalhas();
  pedir(importar(amb));
  igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false }, 'importação conclui a pendência antes e preserva a observação');
});
teste('13b. base mudou (registro de outra aba Disciplinas): não reaplica; "Descartar" só nesse caso', () => {
  const amb = ambPendente();
  amb.limparFalhas();
  const m = amb.estrutura().meta.find((x) => x.k === META_SALV);
  const j = JSON.parse(m.v); j.abaDisciplinas = 999999; m.v = JSON.stringify(j);
  const d = pedir(amb.ctx.obterDadosPainel());
  igual([d.salvamentoPendente.estado, d.salvamentoPendente.podeDescartar], ['base_mudou', true]);
  igual(persistido(amb, 'PST1001').obs, '', 'não aplicado');
  igual(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1002', { nome: 'X' })).codigo, 'SALVAMENTO_PENDENTE');
  igual(amb.ctx.resolverSalvamentoPendente({ acao: 'descartar', id: 'outro' }).codigo, 'DADOS_INVALIDOS');
  igual(pedir(amb.ctx.resolverSalvamentoPendente({ acao: 'descartar', id: j.id })).resultado, 'descartado');
  igual(pendencia(amb), null);
  const amb2 = ambPendente(); amb2.limparFalhas();
  const j2 = pendencia(amb2);
  igual(amb2.ctx.resolverSalvamentoPendente({ acao: 'descartar', id: j2.id }).codigo, 'DADOS_INVALIDOS', 'mesma base: não descarta');
  verdade(pendencia(amb2), 'continua');
});

// =====================================================================
console.log('\n== 15. Outros cursos (regressão)');
teste('15. salvar disciplina para outros cursos com campos e observação (uma linha), cadastro e lista por unidade continuam', () => {
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST3001', nome: 'Outra' } }));
  const r = pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST3001', campos: { nome: 'Outra editada' }, observacoes: 'obs outros' }));
  const linha = objetos(amb.estrutura().getSheetByName('Disciplinas para outros cursos')).find((o) => o['Identificador'] === 'PST3001');
  igual([linha['Nome'], linha['Observações']], ['Outra editada', 'obs outros']);
  const t = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\nPST3002;Da unidade;01/01/2026;;Semestral;2;0\n';
  const p = pedir(amb.ctx.previaDisciplinasUnidade(t, 'u.csv'));
  igual(pedir(amb.ctx.incluirDisciplinasUnidade(t, 'u.csv', p.assinatura, ['PST3002'])).incluidas, 1);
  igual(pendencia(amb), null);
  igual(r.resultado, 'concluido', 'contrato 1.8.5');
});

// =====================================================================
// (1.8.6) Correção complementar da etapa 4 — seções 16 (recuperação
// automática chega ao painel), 17 (exceção depois de remover o registro)
// e 18 (colunas extras com tipo). "Cliente" abaixo = cópia dos dados do
// painel atualizada com o MESMO contrato do PainelApp (recuperado antes,
// dados do próprio pedido depois); a ficha reaberta é montada dela.
// =====================================================================
function clienteInicial(amb) { return JSON.parse(JSON.stringify(pedir(amb.ctx.obterDadosPainel()))); }
function aplicarNoCliente(cli, dados) {
  if (!dados) return;
  const patch = (o) => { if (o) { const x = cli.base.disciplinas.find((d) => d.codigo === o.chave); if (x) x.observacoes = o.texto; } };
  const rec = dados.recuperado;
  if (rec) { if (rec.preparacao) cli.preparacao = JSON.parse(JSON.stringify(rec.preparacao)); patch(rec.observacao); }
  if (dados.preparacao) cli.preparacao = JSON.parse(JSON.stringify(dados.preparacao));
  patch(dados.observacao);
}
function respostaNoCliente(cli, r) { aplicarNoCliente(cli, r && r.dados); return r; }
function obsNoCliente(cli, chave) { const x = cli.base.disciplinas.find((y) => y.codigo === chave); return x ? x.observacoes : null; }
/** Ficha reaberta a partir dos dados do cliente: campos em vigor e observação pré-preenchida (o painel sempre envia o textarea). */
function pedidoDoCliente(cli, chave, mudar, obs) {
  const base = cli.base.disciplinas.find((x) => x.codigo === chave);
  const aj = cli.preparacao.ajustes.find((x) => x.chave === chave);
  const campos = {};
  ['codigo', 'nome', 'departamento', 'creditosAula', 'creditosTrabalho', 'ch', 'ce', 'cp', 'ext', 'atpa', 'versao'].forEach((k) => {
    const v = aj && aj.campos[k] !== undefined ? aj.campos[k] : base[k];
    campos[k] = v === null || v === undefined ? '' : String(v);
  });
  Object.assign(campos, mudar || {});
  return { origem: 'estrutura', chave, campos, oferta: null, observacoes: obs === undefined ? (base.observacoes || '') : obs };
}
function resumoResposta(r) { return { ok: r.ok, codigo: r.codigo || null, resultado: r.dados && r.dados.resultado || null, observacao: r.dados && r.dados.observacao || null, recuperado: r.dados && r.dados.recuperado ? { chave: r.dados.recuperado.chave, codigo: r.dados.recuperado.codigo, observacao: r.dados.recuperado.observacao, comPreparacao: !!r.dados.recuperado.preparacao } : null }; }
/** A pendente: nome "A corrigida" + "Observação recuperada de A", falha persistente no setValue da observação. */
function aPendente(amb, cli) {
  falhaObs(amb, 99);
  const r = respostaNoCliente(cli, amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1001', { nome: 'A corrigida' }, 'Observação recuperada de A')));
  igual([r.ok, r.codigo], [false, 'SALVAMENTO_PENDENTE'], 'A pendente');
  return r;
}

console.log('\n== 16. (1.8.6) Recuperação automática: o que foi concluído chega ao painel');
teste('16a. REPRODUÇÃO A→B→A: A pendente, B salva (conclui A), A reaberta depois e salva só o nome — a observação recuperada não se perde (planilha, dados do painel, ficha, contexto novo)', () => {
  const amb = novoAmbiente();
  const cli = clienteInicial(amb);
  aPendente(amb, cli);
  ev('  depois de A: persistido ' + JSON.stringify(persistido(amb, 'PST1001')) + ' · cliente obs A = ' + JSON.stringify(obsNoCliente(cli, 'PST1001')));
  amb.limparFalhas();
  const rB = respostaNoCliente(cli, amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1002', { nome: 'B corrigida' }, 'Observação de B')));
  ev('  resposta de B: ' + JSON.stringify(resumoResposta(rB)));
  igual([rB.ok, rB.dados.resultado], [true, 'concluido'], 'B concluída');
  igual(rB.dados.observacao, { chave: 'PST1002', texto: 'Observação de B' }, 'observação de B');
  igual(persistido(amb, 'PST1001'), { nome: 'A corrigida', creditosAula: '', naGrade: '', obs: 'Observação recuperada de A', pendente: false }, 'A concluída na planilha');
  const obsDepoisDeB = [obsNoCliente(cli, 'PST1001'), obsNoCliente(cli, 'PST1002')];
  ev('  dados do painel depois de B (obs A, obs B): ' + JSON.stringify(obsDepoisDeB));
  const fichaA = pedidoDoCliente(cli, 'PST1001', { nome: 'Outra correção em A' });
  ev('  ficha de A reaberta: nome ' + JSON.stringify(fichaA.campos.nome) + ' · observação pré-preenchida ' + JSON.stringify(fichaA.observacoes));
  const rA2 = respostaNoCliente(cli, amb.ctx.salvarDisciplina(fichaA));
  ev('  novo salvamento de A: ' + JSON.stringify(resumoResposta(rA2)));
  ev('  persistido depois do novo salvamento de A: ' + JSON.stringify(persistido(amb, 'PST1001')));
  const { d } = painel(amb);
  ev('  contexto novo: nome A ' + JSON.stringify(nomeNoPainel(d, 'PST1001')) + ' · obs A ' + JSON.stringify(obsNoPainel(d, 'PST1001')));
  // comportamento (planilha, dados do painel, ficha, contexto novo) antes do contrato
  igual(rA2.ok, true);
  igual(persistido(amb, 'PST1001'), { nome: 'Outra correção em A', creditosAula: '', naGrade: '', obs: 'Observação recuperada de A', pendente: false }, 'observação de A preservada na planilha');
  igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001'), nomeNoPainel(d, 'PST1002'), obsNoPainel(d, 'PST1002'), d.salvamentoPendente], ['Outra correção em A', 'Observação recuperada de A', 'B corrigida', 'Observação de B', null], 'contexto novo');
  igual(obsDepoisDeB, ['Observação recuperada de A', 'Observação de B'], 'dados do painel (estado.dados.base) depois de B');
  igual([fichaA.campos.nome, fichaA.observacoes], ['Outra correção em A', 'Observação recuperada de A'], 'ficha de A reaberta (pré-preenchida com o confirmado)');
  igual(rB.dados.recuperado && rB.dados.recuperado.observacao, { chave: 'PST1001', texto: 'Observação recuperada de A' }, 'contrato 1.8.6: observação de A na resposta de B');
});
teste('16b. recuperação antes de OUTRAS operações (grade em lote, exclusão, outros cursos, lista por unidade): a observação de A vem em "recuperado" e o painel a aplica', () => {
  const casos = [
    ['adicionarAGrade', (amb) => amb.ctx.adicionarAGrade([{ origem: 'estrutura', chave: 'PST1002' }])],
    ['excluirDisciplinas', (amb) => amb.ctx.excluirDisciplinas([{ origem: 'estrutura', chave: 'PSA1004' }], true)],
    ['cadastrarDisciplinaOutros', (amb) => amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST3001', nome: 'Outra' } })],
    ['salvarDisciplina (outros cursos)', (amb) => { amb.limparFalhas(); pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST3009', nome: 'X' } })); return null; }]
  ];
  for (const [nome, fazer] of casos.slice(0, 3)) {
    const amb = novoAmbiente();
    const cli = clienteInicial(amb);
    aPendente(amb, cli);
    amb.limparFalhas();
    const r = respostaNoCliente(cli, fazer(amb));
    ev('  ' + nome + ': ' + JSON.stringify(resumoResposta(r)));
    igual(r.ok, true, nome);
    igual(persistido(amb, 'PST1001').obs, 'Observação recuperada de A', nome + ': planilha');
    igual(obsNoCliente(cli, 'PST1001'), 'Observação recuperada de A', nome + ': painel');
    igual(r.dados.recuperado && r.dados.recuperado.observacao, { chave: 'PST1001', texto: 'Observação recuperada de A' }, nome + ': contrato 1.8.6 (recuperado)');
  }
  // outros cursos: salvar uma disciplina de outros cursos conclui A
  const amb = novoAmbiente();
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST3001', nome: 'Outra' } }));
  const cli = clienteInicial(amb);
  aPendente(amb, cli);
  amb.limparFalhas();
  const r = respostaNoCliente(cli, amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST3001', campos: { nome: 'Outra editada' }, observacoes: 'obs outros' }));
  ev('  salvarDisciplina (outros cursos): ' + JSON.stringify(resumoResposta(r)));
  igual([r.ok, obsNoCliente(cli, 'PST1001')], [true, 'Observação recuperada de A'], 'outros cursos: painel');
  igual(r.dados.recuperado && r.dados.recuperado.observacao && r.dados.recuperado.observacao.texto, 'Observação recuperada de A', 'outros cursos: contrato');
  // lista por unidade (via chamarServidor direto no painel)
  const amb2 = novoAmbiente();
  const cli2 = clienteInicial(amb2);
  aPendente(amb2, cli2);
  amb2.limparFalhas();
  const t = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho\nPST3002;Da unidade;01/01/2026;;Semestral;2;0\n';
  const p = pedir(amb2.ctx.previaDisciplinasUnidade(t, 'u.csv'));   // sem trava: não conclui nada
  verdade(pendencia(amb2), 'prévia (sem trava) não mexe na pendência');
  const r2 = respostaNoCliente(cli2, amb2.ctx.incluirDisciplinasUnidade(t, 'u.csv', p.assinatura, ['PST3002']));
  igual([r2.ok, obsNoCliente(cli2, 'PST1001')], [true, 'Observação recuperada de A'], 'incluirDisciplinasUnidade');
});
teste('16c. recuperação concluída e o NOVO pedido recusado ou com falha (validação, escrita, erro inesperado, leitura, importação): "recuperado" vem na recusa e o painel aplica', () => {
  // recusa de validação (DADOS_INVALIDOS depois da conclusão)
  let amb = novoAmbiente(); let cli = clienteInicial(amb);
  aPendente(amb, cli); amb.limparFalhas();
  let r = respostaNoCliente(cli, amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { nome: 'X', codigo: 'PST1001' }, observacoes: 'não entra' }));
  ev('  recusa de validação: ' + JSON.stringify(resumoResposta(r)));
  igual([r.ok, r.codigo], [false, 'CODIGO_REPETIDO']);
  igual([obsNoCliente(cli, 'PST1001'), nomeNoPainel(cli, 'PST1001')], ['Observação recuperada de A', 'A corrigida'], 'painel atualizado');
  igual([r.dados && r.dados.recuperado && r.dados.recuperado.observacao, !!(r.dados && r.dados.recuperado && r.dados.recuperado.preparacao)], [{ chave: 'PST1001', texto: 'Observação recuperada de A' }, true], 'contrato 1.8.6: recuperado na recusa');
  igual([persistido(amb, 'PST1002').nome, obsGravada(amb, 'PST1002')], ['(sem linha)', ''], 'B não mudou');
  // falha de escrita do novo pedido (B fica pendente): recuperado de A + salvamento de B
  amb = novoAmbiente(); cli = clienteInicial(amb);
  aPendente(amb, cli); amb.limparFalhas();
  amb.injetarFalha((e) => e.tipo === 'setValue' && /^Disciplinas/.test(e.aba) && e.linha !== undefined && objetos(abaAtiva(amb, 'Disciplinas'))[e.linha - 2] && String(objetos(abaAtiva(amb, 'Disciplinas'))[e.linha - 2]['Código']) === 'PST1002', 99);
  r = respostaNoCliente(cli, amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1002', { nome: 'B corrigida' }, 'Observação de B')));
  ev('  B com falha: ' + JSON.stringify(resumoResposta(r)) + ' · salvamento ' + JSON.stringify(r.dados && r.dados.salvamento));
  igual([r.ok, r.codigo, r.dados.salvamento.chave], [false, 'SALVAMENTO_PENDENTE', 'PST1002']);
  igual([obsNoCliente(cli, 'PST1001'), obsNoCliente(cli, 'PST1002')], ['Observação recuperada de A', ''], 'painel: A confirmada, B como está na planilha');
  igual(r.dados.recuperado && r.dados.recuperado.observacao, { chave: 'PST1001', texto: 'Observação recuperada de A' }, 'contrato 1.8.6: recuperado de A junto');
  // erro inesperado depois da conclusão (falha de escrita no cadastro de outros cursos, uma escrita só).
  // (1.8.7) Até a 1.8.6 este caso usava uma exclusão em lote; desde a 1.8.7 a ação em lote é
  // retomável (a falha única é refeita e conclui), então o erro inesperado vem do cadastro.
  amb = novoAmbiente(); cli = clienteInicial(amb);
  aPendente(amb, cli); amb.limparFalhas();
  let a1 = false;
  amb.injetarFalha((e) => { if (e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV) a1 = true; return a1 && e.tipo === 'setValues' && e.aba === 'Disciplinas para outros cursos'; }, 1);
  r = respostaNoCliente(cli, amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST3001', nome: 'Outra' } }));
  ev('  erro inesperado no cadastro de outros cursos: ' + JSON.stringify(resumoResposta(r)) + ' · mensagem ' + JSON.stringify(r.erro));
  igual([r.ok, r.codigo], [false, 'INESPERADO']);
  verdade(/erro inesperado/.test(r.erro), r.erro);
  igual(obsNoCliente(cli, 'PST1001'), 'Observação recuperada de A', 'painel');
  igual(r.dados && r.dados.recuperado && r.dados.recuperado.observacao, { chave: 'PST1001', texto: 'Observação recuperada de A' }, 'contrato 1.8.6: recuperado no erro inesperado');
  // leitura falhando depois da conclusão: a observação conferida vem; a preparação não (pede recarga)
  amb = novoAmbiente(); cli = clienteInicial(amb);
  aPendente(amb, cli); amb.limparFalhas();
  let a2 = false;
  amb.injetarFalha((e) => { if (e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV) a2 = true; return false; }, 1);
  amb.injetarFalhaLeitura(() => a2, 999);
  r = respostaNoCliente(cli, amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { nome: 'B' }, oferta: null, observacoes: 'obs B' }));
  amb.limparFalhas();
  ev('  leitura falhando depois da conclusão: ' + JSON.stringify(resumoResposta(r)) + ' · leituraFalhou ' + JSON.stringify(r.dados && r.dados.recuperado && r.dados.recuperado.leituraFalhou));
  igual([obsNoCliente(cli, 'PST1001'), persistido(amb, 'PST1002').nome], ['Observação recuperada de A', '(sem linha)'], 'painel; B não gravada');
  const rr = (r.dados && r.dados.recuperado) || {};
  igual([r.ok, r.codigo, rr.observacao, rr.leituraFalhou, rr.preparacao], [false, 'INESPERADO', { chave: 'PST1001', texto: 'Observação recuperada de A' }, true, undefined], 'contrato 1.8.6: recuperado sem preparação, com aviso de leitura');
  // importação recusada depois da conclusão (prévia desatualizada)
  amb = novoAmbiente(); cli = clienteInicial(amb);
  aPendente(amb, cli); amb.limparFalhas();
  const pk = pacote();
  const p0 = pedir(amb.ctx.prepararImportacao(JSON.parse(JSON.stringify(pk))));
  r = respostaNoCliente(cli, amb.ctx.confirmarImportacao(JSON.parse(JSON.stringify(pk)), 'assinatura-velha', { operacao: p0.operacao, previa: p0.impressao }));
  ev('  importação recusada: ' + JSON.stringify(resumoResposta(r)));
  igual([r.ok, r.codigo, obsNoCliente(cli, 'PST1001')], [false, 'PREVIA_DESATUALIZADA', 'Observação recuperada de A'], 'importação: painel');
  igual(r.dados && r.dados.recuperado && r.dados.recuperado.observacao, { chave: 'PST1001', texto: 'Observação recuperada de A' }, 'importação: contrato 1.8.6');
});
teste('16d. ordem dos valores: novo pedido de A que MUDA a observação vence o valor recuperado; recuperação SEM mudança de observação não apaga o texto existente', () => {
  // novo pedido da mesma disciplina com outra observação
  let amb = novoAmbiente(); let cli = clienteInicial(amb);
  aPendente(amb, cli); amb.limparFalhas();
  let r = respostaNoCliente(cli, amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1001', { nome: 'A nova' }, 'Observação mais recente de A')));
  ev('  A de novo, outra observação: ' + JSON.stringify(resumoResposta(r)));
  igual(obsNoCliente(cli, 'PST1001'), 'Observação mais recente de A', 'painel: o mais recente vence');
  igual(persistido(amb, 'PST1001'), { nome: 'A nova', creditosAula: '', naGrade: '', obs: 'Observação mais recente de A', pendente: false }, 'planilha');
  igual(obsNoPainel(painel(amb).d, 'PST1001'), 'Observação mais recente de A', 'contexto novo');
  igual([r.dados.recuperado && r.dados.recuperado.observacao, r.dados.observacao], [{ chave: 'PST1001', texto: 'Observação recuperada de A' }, { chave: 'PST1001', texto: 'Observação mais recente de A' }], 'contrato 1.8.6: os dois valores, identificados');
  // novo pedido da mesma disciplina com a observação do rascunho (igual à recuperada): não muda
  amb = novoAmbiente(); cli = clienteInicial(amb);
  aPendente(amb, cli); amb.limparFalhas();
  r = respostaNoCliente(cli, amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1001', { nome: 'A só nome' }, 'Observação recuperada de A')));
  igual([obsNoCliente(cli, 'PST1001'), persistido(amb, 'PST1001').obs], ['Observação recuperada de A', 'Observação recuperada de A'], 'painel e planilha');
  igual([r.dados.recuperado && r.dados.recuperado.observacao.texto, r.dados.observacao], ['Observação recuperada de A', { chave: 'PST1001', texto: 'Observação recuperada de A' }], 'contrato 1.8.6: pedido não muda a observação (a resposta traz a lida)');
  // recuperação sem mudança de observação (o pedido pendente não enviava observação)
  amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', {}, 'Texto que já existia')));
  cli = clienteInicial(amb);
  amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Ajustes manuais', 99);
  r = respostaNoCliente(cli, amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Só o nome' }, oferta: null }));
  igual([r.ok, r.codigo], [false, 'SALVAMENTO_PENDENTE']);
  amb.limparFalhas();
  r = respostaNoCliente(cli, amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1002', { nome: 'B' }, 'obs B')));
  ev('  recuperação sem observação: ' + JSON.stringify(resumoResposta(r)));
  igual([obsNoCliente(cli, 'PST1001'), persistido(amb, 'PST1001').nome, persistido(amb, 'PST1001').obs, nomeNoPainel(cli, 'PST1001')], ['Texto que já existia', 'Só o nome', 'Texto que já existia', 'Só o nome'], 'texto existente intacto');
  igual([r.ok, r.dados.recuperado && r.dados.recuperado.chave, r.dados.recuperado && r.dados.recuperado.observacao], [true, 'PST1001', null], 'contrato 1.8.6: recuperado sem observação');
});

// =====================================================================
console.log('\n== 17. (1.8.6) Exceção depois de remover o registro');
function idDoRegistro(amb) { let id = null; amb.injetarFalha((e) => { if (!id && e.tipo === 'metadadoDepois' && e.chave === META_SALV) id = (pendencia(amb) || {}).id; return false; }, 1); return () => id; }
function contagemEscritas(amb) { return amb.estado.eventos.filter((e) => e.tipo === 'setValues' || e.tipo === 'setValue').length; }
for (const [nome, montar] of [
  ['17a. remoção aplicada e exceção (metadadoRemoverDepois)', (amb, marca) => amb.injetarFalha((e) => { const sim = e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV; if (sim) marca.registroNoErro = pendencia(amb); return sim; }, 1)],
  ['17b. falha no SEGUNDO flush (depois da remoção; o 8 cobre o primeiro)', (amb, marca) => { let removido = false; return amb.injetarFalha((e) => { if (e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV) removido = true; const sim = removido && e.tipo === 'flush'; if (sim) marca.registroNoErro = pendencia(amb); return sim; }, 1); }]]) {
  teste(nome + ': resposta "concluído" com o lido (observação inclusive), nada de pendente inexistente; repetir não duplica', () => {
    const amb = novoAmbiente();
    const cli = clienteInicial(amb);
    const id = idDoRegistro(amb);
    const marca = {};
    const f = montar(amb, marca);
    const r = respostaNoCliente(cli, amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1001', { nome: 'Nome ajustado' }, 'Observação nova')));
    registrar(nome, r, amb, 'PST1001');
    ev('  registro no instante do erro: ' + JSON.stringify(marca.registroNoErro) + ' · id do pedido ' + JSON.stringify(id()));
    igual(f.disparos, 1, 'falha disparada');
    igual(marca.registroNoErro, null, 'o registro JÁ tinha sido removido quando a exceção veio');
    igual([r.ok, r.codigo || null, r.dados && r.dados.resultado], [true, null, 'concluido'], 'resposta');
    igual(r.dados.observacao, { chave: 'PST1001', texto: 'Observação nova' }, 'observação do pedido na resposta');
    igual(nomeNoPainel(r.dados, 'PST1001'), 'Nome ajustado', 'preparação lida');
    igual(obsNoCliente(cli, 'PST1001'), 'Observação nova', 'painel');
    igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false }, 'planilha');
    const { d } = painel(amb);
    igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001'), d.salvamentoPendente], ['Nome ajustado', 'Observação nova', null], 'contexto novo');
    const r2 = amb.ctx.salvarDisciplina(pedidoDoCliente(cli, 'PST1001', { nome: 'Nome ajustado' }, 'Observação nova'));
    igual([r2.ok, r2.dados.resultado], [true, 'concluido'], 'repetir');
    igual(persistido(amb, 'PST1001').nome, 'Nome ajustado', 'sem linha duplicada');
  });
}
teste('17c. falha ANTES da remoção (registro presente): pendente identificado, com "já gravado"; conclusão sem reescrever', () => {
  const amb = novoAmbiente();
  const id = idDoRegistro(amb);
  amb.injetarFalha((e) => e.tipo === 'metadadoRemover' && e.chave === META_SALV, 99);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  registrar('17c', r, amb, 'PST1001');
  const s = r.dados.salvamento;
  igual([r.ok, r.codigo, s.estado, s.id, s.chave, s.codigo, s.ajusteGravado, s.observacaoGravada], [false, 'SALVAMENTO_PENDENTE', 'pendente', id(), 'PST1001', 'PST1001', true, true]);
  igual(pendencia(amb).id, id(), 'registro continua');
  igual(r.dados.observacao, { chave: 'PST1001', texto: 'Observação nova' }, 'observação lida na recusa');
  const a2 = reabrir(amb);
  const antes = contagemEscritas(a2);
  const d = pedir(a2.ctx.obterDadosPainel());
  igual([d.salvamentoPendente.estado, contagemEscritas(a2) - antes], ['concluido', 0], 'concluído sem reescrever');
  igual(persistido(a2, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
});
teste('17d. remoção feita + falha de LEITURA na conferência: não declara sucesso nem "nada gravado"; SALVAMENTO_INCERTO identificado, rascunho preservável; contexto novo e repetição corretos', () => {
  const amb = novoAmbiente();
  const id = idDoRegistro(amb);
  let removido = false;
  amb.injetarFalha((e) => { if (e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV) { removido = true; return true; } return false; }, 1);
  const fl = amb.injetarFalhaLeitura(() => removido, 999);
  const r = amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  amb.limparFalhas();
  registrar('17d', r, amb, 'PST1001');
  ev('  leituras recusadas: ' + fl.disparos + ' · mensagem: ' + r.erro);
  verdade(fl.disparos > 0, 'falha de leitura disparada');
  const s = r.dados && r.dados.salvamento;
  igual([r.ok, r.codigo, r.dados.resultado, s.estado, s.id, s.chave, s.codigo, s.ajusteGravado], [false, 'SALVAMENTO_INCERTO', 'incerto', 'incerto', id(), 'PST1001', 'PST1001', null], 'incerto, identificado');
  verdade(r.codigo !== 'SALVAMENTO_PENDENTE' && s.estado !== 'nenhum', 'nunca pendente inexistente');
  verdade(/Não foi possível confirmar/.test(r.erro) && /não foi possível ler/.test(r.erro), r.erro);
  igual([r.dados.preparacao, r.dados.leituraFalhou], [null, true], 'sem leitura: nada aplicado, pede recarga');
  igual(pendencia(amb), null, 'registro removido (não recriado)');
  igual(persistido(amb, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false }, 'planilha (o que de fato ficou)');
  const { d } = painel(amb);
  igual([nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001'), d.salvamentoPendente], ['Nome ajustado', 'Observação nova', null], 'contexto novo');
  const r2 = pedir(amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' }));
  igual([r2.resultado, ajusteGravado(amb, 'PST1001').length], ['concluido', 1], 'repetir o rascunho: sem duplicar');
});
teste('17e. "Concluir salvamento pendente", recuperação automática e abertura do painel com exceção depois da remoção: concluído (nada de pendente inexistente)', () => {
  const amb = novoAmbiente();
  falhaObs(amb, 99);
  amb.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1001', campos: { nome: 'Nome ajustado' }, observacoes: 'Observação nova' });
  // cada caminho parte de uma fotografia própria (reabrir compartilha a persistência da origem)
  const remocao = (a) => a.injetarFalha((e) => e.tipo === 'metadadoRemoverDepois' && e.chave === META_SALV, 1);
  // explícito
  let a = reabrir(amb.fotografia()); remocao(a);
  let r = a.ctx.resolverSalvamentoPendente({ acao: 'concluir' });
  ev('  explícito: ' + JSON.stringify({ ok: r.ok, codigo: r.codigo || null, resultado: r.dados && r.dados.resultado, observacao: r.dados && r.dados.observacao }));
  igual([r.ok, r.dados && r.dados.resultado, r.dados && r.dados.observacao], [true, 'concluido', { chave: 'PST1001', texto: 'Observação nova' }], 'explícito');
  igual(persistido(a, 'PST1001'), { nome: 'Nome ajustado', creditosAula: '', naGrade: '', obs: 'Observação nova', pendente: false });
  // automático (antes de outro salvamento)
  a = reabrir(amb.fotografia()); remocao(a);   // pedido montado sem abrir o painel (a abertura concluiria antes)
  r = a.ctx.salvarDisciplina({ origem: 'estrutura', chave: 'PST1002', campos: { nome: 'B' }, oferta: null, observacoes: 'obs B' });
  ev('  automático: ' + JSON.stringify(resumoResposta(r)));
  verdade(r.ok || r.codigo !== 'SALVAMENTO_PENDENTE', 'não recusa por pendente inexistente: ' + r.codigo);
  igual([r.ok, r.dados.recuperado && r.dados.recuperado.observacao], [true, { chave: 'PST1001', texto: 'Observação nova' }], 'automático');
  // abertura do painel
  a = reabrir(amb.fotografia()); remocao(a);
  const d = pedir(a.ctx.obterDadosPainel());
  igual([d.salvamentoPendente && d.salvamentoPendente.estado, obsNoPainel(d, 'PST1001')], ['concluido', 'Observação nova'], 'abertura do painel');
});

// =====================================================================
console.log('\n== 18. (1.8.6) Colunas extras de "Ajustes manuais" na retomada');
const EXTRAS = ['Data livre', 'Texto ISO', 'Número', 'Booleano', 'Vazio'];
function colunasExtras(amb) {
  const aba = amb.estrutura().getSheetByName('Ajustes manuais');
  let col = aba.getLastColumn();
  EXTRAS.forEach((t) => { aba.getRange(1, ++col).setValue(t); });
  return aba;
}
function linhaDe(aba, chave) { const v = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues(); const c = v[0].indexOf('Disciplina (código no Júpiter)'); return v.findIndex((l, i) => i > 0 && String(l[c]) === chave) + 1; }
function celulasExtras(amb, chave) {
  const aba = amb.estrutura().getSheetByName('Ajustes manuais');
  const tit = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const lin = linhaDe(aba, chave);
  const o = {};
  EXTRAS.forEach((t) => { const c = tit.indexOf(t) + 1; const v = c && lin ? aba.getRange(lin, c).getValue() : '(sem coluna)'; o[t] = v instanceof Date ? { tipo: 'Date', getTime: v.getTime(), iso: v.toISOString() } : { tipo: typeof v, valor: v }; });
  return o;
}
function preencher(aba, chave, valores) {
  const tit = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const lin = linhaDe(aba, chave);
  Object.keys(valores).forEach((t) => aba.getRange(lin, tit.indexOf(t) + 1).setValue(valores[t]));
}
const DATA_A = new Date('2026-10-01T12:00:00.000Z');
const DATA_B = new Date('2025-05-05T08:30:00.000Z');
function cenarioExtras() {
  const amb = novoAmbiente();
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Antes' })));
  pedir(amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1002', { nome: 'Outra com extras' })));
  const aba = colunasExtras(amb);
  preencher(aba, 'PST1001', { 'Data livre': DATA_A, 'Texto ISO': "'2026-10-01", 'Número': 42, 'Booleano': true });
  preencher(aba, 'PST1002', { 'Data livre': DATA_B, 'Texto ISO': "'2025-05-05T08:30:00.000Z", 'Número': 0, 'Booleano': false });
  return amb;
}
teste('18a. REPRODUÇÃO: data em coluna extra continua DATA (mesmo getTime) depois da retomada; texto parecido com ISO, número, booleano e vazio intactos; outra disciplina intacta', () => {
  const amb = cenarioExtras();
  const antesA = celulasExtras(amb, 'PST1001'), antesB = celulasExtras(amb, 'PST1002');
  ev('  antes  PST1001: ' + JSON.stringify(antesA));
  ev('  antes  PST1002: ' + JSON.stringify(antesB));
  igual([antesA['Data livre'].tipo, antesA['Texto ISO'], antesA['Número'], antesA['Booleano'], antesA['Vazio']], ['Date', { tipo: 'string', valor: '2026-10-01' }, { tipo: 'number', valor: 42 }, { tipo: 'boolean', valor: true }, { tipo: 'string', valor: '' }], 'montagem');
  amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Ajustes manuais', 99);
  const r = amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Depois' }, 'Observação nova'));
  registrar('18a', r, amb, 'PST1001');
  igual([r.ok, r.codigo], [false, 'SALVAMENTO_PENDENTE'], 'pendente');
  ev('  registro (ajuste) tem _extras? ' + JSON.stringify(Object.prototype.hasOwnProperty.call(pendencia(amb).ajuste, '_extras')));
  const { amb: a2, d } = painel(amb);   // contexto novo: a abertura conclui
  igual([d.salvamentoPendente && d.salvamentoPendente.estado, nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001')], ['concluido', 'Depois', 'Observação nova'], 'concluído');
  const depoisA = celulasExtras(a2, 'PST1001'), depoisB = celulasExtras(a2, 'PST1002');
  ev('  depois PST1001: ' + JSON.stringify(depoisA));
  ev('  depois PST1002: ' + JSON.stringify(depoisB));
  igual(depoisA, antesA, 'PST1001: tipo e valor de cada extra');
  igual(depoisB, antesB, 'PST1002: tipo e valor de cada extra');
  igual(depoisA['Data livre'].getTime, DATA_A.getTime(), 'getTime');
});
teste('18b. registro no formato da 1.8.5 (ajuste com _extras e datas viradas texto ISO pelo JSON) é concluído sem converter a data em texto', () => {
  const amb = cenarioExtras();
  const antesA = celulasExtras(amb, 'PST1001'), antesB = celulasExtras(amb, 'PST1002');
  amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Ajustes manuais', 99);
  amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Depois' }, 'Observação nova'));
  // Reescreve o registro como a 1.8.5 o gravava: ajuste com _extras da linha lida (Date → JSON → texto ISO).
  const ss = amb.estrutura();
  const m = ss.meta.find((x) => x.k === META_SALV);
  const j = JSON.parse(m.v);
  const aba = ss.getSheetByName('Ajustes manuais');
  const tit = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const lin = aba.getRange(linhaDe(aba, 'PST1001'), 1, 1, aba.getLastColumn()).getValues()[0];
  const extras = {}; tit.forEach((t, i) => { if (EXTRAS.includes(t)) extras[t] = lin[i]; });
  j.ajuste._extras = JSON.parse(JSON.stringify(extras));
  m.v = JSON.stringify(j);
  ev('  registro no formato 1.8.5: ajuste._extras = ' + JSON.stringify(j.ajuste._extras));
  igual(j.ajuste._extras['Data livre'], '2026-10-01T12:00:00.000Z', 'data como texto no registro');
  const { amb: a2, d } = painel(amb);
  igual([d.salvamentoPendente && d.salvamentoPendente.estado, nomeNoPainel(d, 'PST1001'), obsNoPainel(d, 'PST1001')], ['concluido', 'Depois', 'Observação nova'], 'concluído');
  const depoisA = celulasExtras(a2, 'PST1001');
  ev('  depois PST1001: ' + JSON.stringify(depoisA));
  igual(depoisA, antesA, 'PST1001: extras com tipo e valor');
  igual(celulasExtras(a2, 'PST1002'), antesB, 'PST1002 intacta');
});
teste('18c. extra alterado na planilha DEPOIS do pedido pendente não é sobrescrito pelo registro (vale a linha atual)', () => {
  const amb = cenarioExtras();
  amb.injetarFalha((e) => e.tipo === 'setValues' && e.aba === 'Ajustes manuais', 99);
  amb.ctx.salvarDisciplina(pedidoFicha(amb, 'PST1001', { nome: 'Depois' }, 'Observação nova'));
  amb.limparFalhas();
  const aba = amb.estrutura().getSheetByName('Ajustes manuais');
  const NOVA = new Date('2027-01-02T03:04:05.000Z');
  preencher(aba, 'PST1001', { 'Data livre': NOVA, 'Número': 7 });
  const { amb: a2 } = painel(amb);
  const c = celulasExtras(a2, 'PST1001');
  igual([c['Data livre'].tipo, c['Data livre'].getTime, c['Número']], ['Date', NOVA.getTime(), { tipo: 'number', valor: 7 }], 'valores atuais preservados');
  igual(persistido(a2, 'PST1001').nome, 'Depois');
});

// =====================================================================
console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
ev('\n=== TOTAL: ' + ok + ' ok, ' + falhas + ' falha(s) ===');
try { fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true }); fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n'); } catch (e) { /* */ }
process.exit(falhas ? 1 : 0);

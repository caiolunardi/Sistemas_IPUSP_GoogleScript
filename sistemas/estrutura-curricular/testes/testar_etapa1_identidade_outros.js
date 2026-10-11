// Etapa 1 — identidade de disciplinas para outros cursos (1.8.1).
// Regressão da sobrescrita: um registro de "Disciplinas para outros cursos"
// tem a chave (coluna Identificador) PST0391 e, depois de editado, o código
// PST0392. O CSV da lista por unidade traz PST0391 de novo: ele PODE
// aparecer como novo (regra aceita), e a inclusão precisa criar um registro
// INDEPENDENTE, sem tocar no existente.
//
// Exercita as funções reais (Preparacao.gs) no simulador (mockGoogle.js) e
// confere o que ficou GRAVADO na aba, inclusive depois de reabrir o
// contexto (novo "Apps Script" sobre as mesmas planilhas).
//
// Dados 100% sintéticos (códigos fictícios, e-mails .example).
// Uso:
//   node testar_etapa1_identidade_outros.js [--evidencias arquivo]
//   DIR_SRC=/caminho/fonte/src node testar_etapa1_identidade_outros.js   (fonte a testar; padrão ../src)
'use strict';
const fs = require('fs');
const path = require('path');
const { criarAmbiente } = require('./mockGoogle');

const DIR_SRC = process.env.DIR_SRC || path.join(__dirname, '..', 'src');
const iEv = process.argv.indexOf('--evidencias');
const ARQ_EVIDENCIAS = iEv > 0 ? process.argv[iEv + 1] : path.join(__dirname, 'saida', 'evidencias_etapa1_identidade_outros.txt');
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
    ev('RESULTADO: FALHOU — ' + (e && e.message));
  }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperado verdadeiro'); }
function pedir(r) { if (!r || !r.ok) throw new Error((r && r.codigo) + ': ' + (r && r.erro)); return r.dados; }

const ABA = 'Disciplinas para outros cursos';
const ORIGEM_UNIDADE = 'Lista de disciplinas por unidade (Júpiter)';
const ORIGEM_MANUAL = 'Cadastro manual';
const OBS = 'Observação administrativa que deve sobreviver';
const CAB = 'Disciplina;Nome;Ativação;Desativação;Tipo;Créditos aula;Créditos trabalho';
const csv = (...linhas) => [CAB].concat(linhas).join('\n');
const CSV_PST0391 = csv('PST0391;Disciplina trazida pelo CSV;01/01/2026;;Ativa;2;0');

// ---------------------------------------------------------------- apoio
function novoAmbiente() {
  const amb = criarAmbiente({ dirSrc: DIR_SRC, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(amb.ctx.obterDadosPainel());
  return amb;
}
/** Novo contexto (cache vazio) sobre as MESMAS planilhas. */
function reabrir(amb) {
  const novo = criarAmbiente({ dirSrc: DIR_SRC, reusar: amb, usuario: 'dono@unidade.example', dono: 'dono@unidade.example' });
  pedir(novo.ctx.obterDadosPainel());
  return novo;
}
/** Linhas GRAVADAS na aba (pelo título das colunas), sem passar pelo sistema. */
function linhasGravadas(amb) {
  const s = amb.estrutura().getSheetByName(ABA);
  if (!s || s.getLastRow() < 2) return [];
  const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues();
  const cab = v[0];
  return v.slice(1).filter((l) => l.some((x) => x !== '' && x !== null)).map((l) => {
    const o = {}; cab.forEach((t, i) => { o[t] = typeof l[i] === 'string' ? l[i].replace(/^'/, '') : l[i]; }); return o;
  });
}
/** O que o painel recebe (lista de outros cursos de preparacaoParaCliente_). */
function outrosDoPainel(amb) { return pedir(amb.ctx.obterDadosPainel()).preparacao.outros; }
function ids(linhas) { return linhas.map((l) => l['Identificador']); }
function semRepeticao(lista, msg) {
  const vistos = {}; const rep = lista.filter((x) => { const r = vistos[x]; vistos[x] = true; return r; });
  igual(rep, [], msg || 'identificadores repetidos');
}
function porId(linhas, id) {
  const achadas = linhas.filter((l) => l['Identificador'] === id);
  igual(achadas.length, 1, 'linhas com Identificador ' + id);
  return achadas[0];
}
function resumo(linhas) {
  return linhas.map((l) => [l['Identificador'], l['Código'], l['Nome'], l['Observações'] || '', l['Semestre de oferecimento'] || '', l['Origem'], l['Excluída'] || '', l['Adicionada à grade horária'] || ''].join(' | '));
}
function registrarEstado(titulo, amb) { ev(titulo + ' (Identificador | Código | Nome | Observações | Semestre | Origem | Excluída | Na grade):'); resumo(linhasGravadas(amb)).forEach((l) => ev('  ' + l)); }
/** Prévia + inclusão como o painel faz (códigos = os escolhidos; padrão: todos os novos). */
function importarUnidade(amb, texto, codigos) {
  const p = pedir(amb.ctx.previaDisciplinasUnidade(texto, 'disciplinas_unidade_sintetica.csv'));
  const escolhidos = codigos || p.novas.map((n) => n.codigo);
  const r = pedir(amb.ctx.incluirDisciplinasUnidade(texto, 'disciplinas_unidade_sintetica.csv', p.assinatura, escolhidos));
  return { previa: p, inclusao: r };
}
/** Registro corrigido do cenário principal: cadastrado como PST0391 e editado para PST0392. */
function prepararCorrigido(amb, extra) {
  pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Disciplina original', oferecimento: '1' }, observacoes: OBS }));
  pedir(amb.ctx.salvarDisciplina(Object.assign({ origem: 'outros', chave: 'PST0391', campos: { codigo: 'PST0392', nome: 'Disciplina corrigida' } }, extra || {})));
}
/** Campos do registro corrigido que a importação NÃO pode alterar. */
const CAMPOS_PRESERVADOS = ['Identificador', 'Código', 'Nome', 'Departamento', 'Créditos-aula', 'Créditos-trabalho', 'CH total (h)', 'Unidade atendida', 'Curso atendido', 'Semestre de oferecimento', 'Origem', 'Incluída em', 'Excluída', 'Adicionada à grade horária', 'Observações', 'Alterado em', 'Alterado por'];
function fotografia(linha) { const o = {}; CAMPOS_PRESERVADOS.forEach((c) => { const v = linha[c]; o[c] = v instanceof Date ? v.toISOString() : v; }); return o; }
function linhasDaGrade(amb, semestre) {
  const g = amb.ctx.linhasDaGrade_(amb.ctx.contextoPreparacao_(amb.estrutura()), semestre);
  return Object.keys(g).reduce((a, k) => a.concat(g[k]), []).map((l) => l.codigo + ' ' + l.nomeCompleto);
}

console.log('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (externa)' : '../src'));
ev('=== Etapa 1 — identidade de disciplinas para outros cursos ===');
ev('Fonte testada: ' + (process.env.DIR_SRC ? 'DIR_SRC (fonte indicada na linha de comando)' : '../src (fonte deste pacote)'));
try { ev('Versão declarada na fonte: ' + (fs.readFileSync(path.join(DIR_SRC, 'Codigo.gs'), 'utf8').match(/VERSAO_SISTEMA = '([^']+)'/) || [])[1]); } catch (e) { /* sem versão */ }

// =====================================================================
// Retrato (sem asserção): o que fica gravado em cada passo da reprodução.
// Serve de evidência nas duas fontes (original e corrigida).
console.log('\n== R. Retrato da reprodução (só registra; as asserções estão em A–G)');
(function retrato() {
  ev('\n--- R. Retrato da reprodução');
  const amb = novoAmbiente();
  prepararCorrigido(amb);
  registrarEstado('R1. Cadastrada PST0391 e editada para PST0392', amb);
  const p = pedir(amb.ctx.previaDisciplinasUnidade(CSV_PST0391, 'disciplinas_unidade_sintetica.csv'));
  ev('R2. Prévia do CSV — novas: ' + JSON.stringify(p.novas.map((n) => n.codigo)) + '; conhecidas: ' + p.conhecidas);
  pedir(amb.ctx.incluirDisciplinasUnidade(CSV_PST0391, 'disciplinas_unidade_sintetica.csv', p.assinatura, ['PST0391']));
  registrarEstado('R3. Depois de confirmar a inclusão', amb);
  ev('R3. Painel recebe: ' + JSON.stringify(outrosDoPainel(amb).map((o) => ({ id: 'O:' + o.chave, codigo: o.codigo, nome: o.nome, observacoes: o.observacoes }))));
  const amb2 = reabrir(amb);
  ev('R4. Reaberto — contexto do servidor (chave → código/nome): ' + JSON.stringify(amb2.ctx.contextoPreparacao_(amb2.estrutura()).ordemOutros.map((k) => { const o = amb2.ctx.contextoPreparacao_(amb2.estrutura()).outros[k]; return k + ' → ' + o.codigo + ' / ' + o.nome; })));
  pedir(amb2.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: {} }));
  registrarEstado('R5. Depois de reabrir e salvar a ficha PST0391 sem mudanças (regrava a aba)', amb2);
  console.log('  (retrato gravado nas evidências)');
})();

// =====================================================================
console.log('\n== A. Regressão principal (código editado + CSV com o código antigo)');
teste('A. PST0391 aparece como nova; a inclusão cria registro independente e preserva o corrigido (gravado e após reabrir)', () => {
  const amb = novoAmbiente();
  prepararCorrigido(amb);
  const antes = porId(linhasGravadas(amb), 'PST0391');
  igual([antes['Código'], antes['Nome'], antes['Observações'], antes['Semestre de oferecimento']], ['PST0392', 'Disciplina corrigida', OBS, '1º semestre'], 'registro corrigido antes da importação');
  registrarEstado('Antes da importação', amb);

  const p = pedir(amb.ctx.previaDisciplinasUnidade(CSV_PST0391, 'disciplinas_unidade_sintetica.csv'));
  igual(p.novas.map((n) => n.codigo), ['PST0391'], 'PST0391 aparece como nova (regra aceita)');
  pedir(amb.ctx.incluirDisciplinasUnidade(CSV_PST0391, 'disciplinas_unidade_sintetica.csv', p.assinatura, ['PST0391']));
  registrarEstado('Depois da inclusão', amb);

  const conferir = (a, quando) => {
    const linhas = linhasGravadas(a);
    igual(linhas.length, 2, quando + ': dois registros gravados');
    semRepeticao(ids(linhas), quando + ': identificadores repetidos na aba');
    const velho = porId(linhas, 'PST0391');
    igual(fotografia(velho), fotografia(antes), quando + ': registro corrigido intacto');
    const novo = linhas.find((l) => l['Identificador'] !== 'PST0391');
    verdade(novo, quando + ': registro novo');
    verdade(novo['Identificador'] && novo['Identificador'] !== 'PST0391', quando + ': chave do novo diferente da do existente');
    verdade(String(novo['Identificador']).length <= 20, quando + ': chave do novo cabe no limite de 20 caracteres');
    igual([novo['Código'], novo['Nome'], novo['Créditos-aula'], novo['Créditos-trabalho'], novo['CH total (h)'], novo['Ativação'], novo['Origem']],
      ['PST0391', 'Disciplina trazida pelo CSV', 2, 0, 30, '01/01/2026', ORIGEM_UNIDADE], quando + ': dados do CSV no novo');
    igual([novo['Excluída'] || '', novo['Adicionada à grade horária'] || '', novo['Observações'] || '', novo['Unidade atendida'] || '', novo['Semestre de oferecimento'] || ''],
      ['', '', '', '', ''], quando + ': estado inicial do novo');
    // Visão do painel (frontend usa _id = 'O:' + chave)
    const painel = outrosDoPainel(a);
    igual(painel.length, 2, quando + ': dois itens no painel');
    semRepeticao(painel.map((o) => 'O:' + o.chave), quando + ': ids do painel repetidos');
    const pv = painel.find((o) => o.chave === 'PST0391'), pn = painel.find((o) => o.chave === novo['Identificador']);
    igual([pv.codigo, pv.nome, pv.observacoes], ['PST0392', 'Disciplina corrigida', OBS], quando + ': painel — registro corrigido');
    igual([pn.codigo, pn.nome, pn.origem], ['PST0391', 'Disciplina trazida pelo CSV', ORIGEM_UNIDADE], quando + ': painel — registro novo');
    return novo['Identificador'];
  };
  const chaveNova = conferir(amb, 'após inclusão');
  ev('Chave alocada para o novo registro: ' + chaveNova);
  const amb2 = reabrir(amb);
  igual(conferir(amb2, 'após reabrir'), chaveNova, 'chave do novo estável após reabrir');
  registrarEstado('Após reabrir o contexto', amb2);
  // Uma gravação posterior (regrava a aba inteira) depois de reabrir não perde nenhum dos dois.
  pedir(amb2.ctx.excluirDisciplinas([{ origem: 'outros', chave: chaveNova }], true));
  pedir(amb2.ctx.excluirDisciplinas([{ origem: 'outros', chave: chaveNova }], false));
  const amb3 = reabrir(amb2);
  const l3 = linhasGravadas(amb3);
  igual(l3.length, 2, 'após gravação posterior e nova reabertura: dois registros');
  semRepeticao(ids(l3));
  igual(fotografia(porId(l3, 'PST0391')), fotografia(antes), 'após gravação posterior: corrigido intacto');
  igual(porId(l3, chaveNova)['Código'], 'PST0391');
});

teste('A2. Mesmo cenário com o registro original vindo do próprio CSV da unidade', () => {
  const amb = novoAmbiente();
  importarUnidade(amb, CSV_PST0391);
  igual(ids(linhasGravadas(amb)), ['PST0391']);
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { codigo: 'PST0392', nome: 'Disciplina corrigida', oferecimento: '2' }, observacoes: OBS }));
  const antes = fotografia(porId(linhasGravadas(amb), 'PST0391'));
  const { previa } = importarUnidade(amb, CSV_PST0391);
  igual(previa.novas.map((n) => n.codigo), ['PST0391']);
  [amb, reabrir(amb)].forEach((a, i) => {
    const linhas = linhasGravadas(a);
    igual(linhas.length, 2, (i ? 'após reabrir' : 'após inclusão') + ': dois registros');
    semRepeticao(ids(linhas));
    igual(fotografia(porId(linhas, 'PST0391')), antes, 'corrigido intacto');
    const novo = linhas.find((l) => l['Identificador'] !== 'PST0391');
    igual([novo['Código'], novo['Nome'], novo['Origem']], ['PST0391', 'Disciplina trazida pelo CSV', ORIGEM_UNIDADE]);
  });
});

// =====================================================================
console.log('\n== B. Preservação dos campos do registro corrigido');
teste('B. nome, créditos/CH, observações, unidade/curso, semestre e marca "na grade" não mudam com a importação', () => {
  const amb = novoAmbiente();
  prepararCorrigido(amb, { campos: { codigo: 'PST0392', nome: 'Disciplina corrigida', creditosAula: 4, creditosTrabalho: 1, ch: 90, unidadeAtendida: 'Unidade Fictícia', cursoAtendido: 'Curso Fictício', departamento: 'PST' } });
  const ad = pedir(amb.ctx.adicionarAGrade([{ origem: 'outros', chave: 'PST0391' }]));
  igual(ad.adicionadas, 1, 'marcado para a grade');
  const antes = porId(linhasGravadas(amb), 'PST0391');
  igual([antes['Nome'], antes['Créditos-aula'], antes['Créditos-trabalho'], antes['CH total (h)'], antes['Observações'], antes['Unidade atendida'], antes['Curso atendido'], antes['Semestre de oferecimento'], antes['Adicionada à grade horária']],
    ['Disciplina corrigida', 4, 1, 90, OBS, 'Unidade Fictícia', 'Curso Fictício', '1º semestre', 'Sim'], 'valores preenchidos antes');
  importarUnidade(amb, CSV_PST0391, ['PST0391']);
  [amb, reabrir(amb)].forEach((a, i) => {
    igual(fotografia(porId(linhasGravadas(a), 'PST0391')), fotografia(antes), (i ? 'após reabrir' : 'após inclusão') + ': todos os campos preservados');
  });
  igual(linhasDaGrade(amb, '1'), ['PST0392 Disciplina corrigida – ' + OBS], 'grade do 1º semestre continua só com o corrigido (o novo não foi marcado)');
});

// =====================================================================
console.log('\n== C. Independência das operações');
function cenarioPosInclusao() {
  const amb = novoAmbiente();
  prepararCorrigido(amb);
  importarUnidade(amb, CSV_PST0391, ['PST0391']);
  const novo = linhasGravadas(amb).find((l) => l['Identificador'] !== 'PST0391');
  return { amb, chaveNova: novo['Identificador'], velho: fotografia(porId(linhasGravadas(amb), 'PST0391')), novo: fotografia(novo) };
}
teste('C1. editar o novo registro não altera o antigo (e vice-versa)', () => {
  const { amb, chaveNova, velho } = cenarioPosInclusao();
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: chaveNova, campos: { nome: 'Nome do novo editado', unidadeAtendida: 'Outra Unidade Fictícia', oferecimento: '2' }, observacoes: 'Obs do novo' }));
  let linhas = linhasGravadas(amb);
  igual(fotografia(porId(linhas, 'PST0391')), velho, 'antigo intacto depois de editar o novo');
  const n = porId(linhas, chaveNova);
  igual([n['Código'], n['Nome'], n['Unidade atendida'], n['Observações'], n['Semestre de oferecimento']], ['PST0391', 'Nome do novo editado', 'Outra Unidade Fictícia', 'Obs do novo', '2º semestre']);
  const novoDepois = fotografia(n);
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0391', campos: { nome: 'Corrigida de novo' } }));
  linhas = linhasGravadas(reabrir(amb));
  igual(fotografia(porId(linhas, chaveNova)), novoDepois, 'novo intacto depois de editar o antigo');
  igual(porId(linhas, 'PST0391')['Nome'], 'Corrigida de novo');
  igual(linhas.length, 2);
});
teste('C2. excluir o novo não exclui o antigo; restaurar o novo não mexe no antigo', () => {
  const { amb, chaveNova, velho } = cenarioPosInclusao();
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: chaveNova }], true));
  let linhas = linhasGravadas(amb);
  igual(porId(linhas, chaveNova)['Excluída'], 'Sim');
  igual(fotografia(porId(linhas, 'PST0391')), velho, 'antigo intacto');
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: chaveNova }], false));
  linhas = linhasGravadas(reabrir(amb));
  igual(porId(linhas, chaveNova)['Excluída'] || '', '');
  igual(fotografia(porId(linhas, 'PST0391')), velho, 'antigo intacto após restaurar o novo');
});
teste('C3. operação inversa: excluir o antigo não exclui o novo', () => {
  const { amb, chaveNova, novo } = cenarioPosInclusao();
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: 'PST0391' }], true));
  const linhas = linhasGravadas(reabrir(amb));
  igual(porId(linhas, 'PST0391')['Excluída'], 'Sim');
  igual(fotografia(porId(linhas, chaveNova)), novo, 'novo intacto');
});
teste('C4. marcação para a grade usa a identidade correta (cada registro com o seu código na grade)', () => {
  const { amb, chaveNova } = cenarioPosInclusao();
  // novo sem semestre: não entra e o aviso aponta a chave/código do NOVO
  const r0 = pedir(amb.ctx.adicionarAGrade([{ origem: 'outros', chave: chaveNova }]));
  igual(r0.semOferecimento, [{ origem: 'outros', chave: chaveNova, codigo: 'PST0391' }], 'aviso de "sem semestre" é do novo');
  igual(porId(linhasGravadas(amb), 'PST0391')['Adicionada à grade horária'] || '', '', 'antigo não foi marcado');
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: chaveNova, campos: { oferecimento: '1' }, adicionarAGrade: true }));
  let linhas = linhasGravadas(amb);
  igual(porId(linhas, chaveNova)['Adicionada à grade horária'], 'Sim', 'novo marcado');
  igual(porId(linhas, 'PST0391')['Adicionada à grade horária'] || '', '', 'antigo continua sem marca');
  igual(linhasDaGrade(amb, '1'), ['PST0391 Disciplina trazida pelo CSV'], 'grade: só o novo, com o código PST0391');
  pedir(amb.ctx.adicionarAGrade([{ origem: 'outros', chave: 'PST0391' }]));
  igual(linhasDaGrade(reabrir(amb), '1').sort(), ['PST0391 Disciplina trazida pelo CSV', 'PST0392 Disciplina corrigida – ' + OBS], 'grade: os dois, cada um com seu código');
  pedir(amb.ctx.removerDaGrade([{ origem: 'outros', chave: chaveNova }]));
  linhas = linhasGravadas(amb);
  igual([porId(linhas, chaveNova)['Adicionada à grade horária'] || '', porId(linhas, 'PST0391')['Adicionada à grade horária']], ['', 'Sim'], 'remover o novo da grade não tira o antigo');
});

// =====================================================================
console.log('\n== D. Reimportação');
teste('D. reimportar o mesmo CSV com PST0391 e PST0392 já presentes não cria outro registro', () => {
  const { amb } = cenarioPosInclusao();
  const antes = linhasGravadas(amb).map(fotografia);
  const p = pedir(amb.ctx.previaDisciplinasUnidade(CSV_PST0391, 'disciplinas_unidade_sintetica.csv'));
  igual(p.novas, [], 'nada novo na prévia');
  igual(p.conhecidas, 1, 'PST0391 reconhecida');
  const r = amb.ctx.incluirDisciplinasUnidade(CSV_PST0391, 'disciplinas_unidade_sintetica.csv', p.assinatura, ['PST0391']);
  igual(r.ok, false, 'inclusão forçada do código já presente é recusada');
  igual(r.codigo, 'DADOS_INVALIDOS');
  igual(linhasGravadas(reabrir(amb)).map(fotografia), antes, 'aba inalterada');
});

// =====================================================================
console.log('\n== E. Colisão com a chave alternativa');
teste('E. a primeira chave alternativa também ocupada: o alocador acha outra livre sem sobrescrever', () => {
  const amb = novoAmbiente();
  prepararCorrigido(amb);
  importarUnidade(amb, CSV_PST0391, ['PST0391']);
  const primeira = linhasGravadas(amb).find((l) => l['Identificador'] !== 'PST0391')['Identificador'];
  // O registro da primeira alternativa também tem o código editado → PST0391 volta a ser "nova".
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: primeira, campos: { codigo: 'PST0393', nome: 'Segunda corrigida' }, observacoes: 'Obs da segunda' }));
  const antes = linhasGravadas(amb).map(fotografia);
  const { previa } = importarUnidade(amb, csv('PST0391;Terceira vinda do CSV;01/01/2026;;Ativa;2;0'));
  igual(previa.novas.map((n) => n.codigo), ['PST0391']);
  [amb, reabrir(amb)].forEach((a, i) => {
    const linhas = linhasGravadas(a);
    igual(linhas.length, 3, (i ? 'após reabrir' : 'após inclusão') + ': três registros');
    semRepeticao(ids(linhas));
    antes.forEach((f) => igual(fotografia(porId(linhas, f['Identificador'])), f, 'registro ' + f['Identificador'] + ' intacto'));
    const terceira = linhas.find((l) => l['Identificador'] !== 'PST0391' && l['Identificador'] !== primeira);
    igual([terceira['Código'], terceira['Nome']], ['PST0391', 'Terceira vinda do CSV']);
    verdade(String(terceira['Identificador']).length <= 20);
    if (!i) ev('Chaves alocadas: ' + ids(linhas).join(', '));
  });
});
teste('E2. chave alternativa ocupada por registro EXCLUÍDO também não é reaproveitada', () => {
  const amb = novoAmbiente();
  prepararCorrigido(amb);
  importarUnidade(amb, CSV_PST0391, ['PST0391']);
  const primeira = linhasGravadas(amb).find((l) => l['Identificador'] !== 'PST0391')['Identificador'];
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: primeira, campos: { codigo: 'PST0393' } }));
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: primeira }], true));
  const antes = linhasGravadas(amb).map(fotografia);
  importarUnidade(amb, CSV_PST0391, ['PST0391']);
  const linhas = linhasGravadas(reabrir(amb));
  igual(linhas.length, 3);
  semRepeticao(ids(linhas));
  antes.forEach((f) => igual(fotografia(porId(linhas, f['Identificador'])), f, 'registro ' + f['Identificador'] + ' intacto (inclusive o excluído)'));
});

// =====================================================================
console.log('\n== F. Fluxos sem colisão');
const CSV_LOTE = csv(
  'PST0501;Sintética Lote Um;01/01/2026;;Ativa;2;0',
  'PSA0502;Sintética Lote Dois;01/01/2026;;Ativa;4;1',
  '4709991;Sintética Lote Três;01/01/2026;;Ativa;2;0',
  'PSE0504;Sintética Lote Quatro;01/01/2026;;Ativa;0;2');
teste('F1. importação normal: chave = código, dados do CSV, sem repetição', () => {
  const amb = novoAmbiente();
  const { inclusao } = importarUnidade(amb, CSV_LOTE);
  igual(inclusao.incluidas, 4);
  const linhas = linhasGravadas(reabrir(amb));
  igual(ids(linhas), ['PST0501', 'PSA0502', '4709991', 'PSE0504'], 'chave = código quando livre (comportamento anterior mantido)');
  igual(linhas.map((l) => l['Código']), ['PST0501', 'PSA0502', '4709991', 'PSE0504']);
  igual(linhas.map((l) => l['CH total (h)']), [30, 90, 30, 60]);
  verdade(linhas.every((l) => l['Origem'] === ORIGEM_UNIDADE));
});
teste('F2. seleção de só parte das novas continua funcionando', () => {
  const amb = novoAmbiente();
  const { previa } = importarUnidade(amb, CSV_LOTE, ['PSA0502', 'PSE0504']);
  igual(previa.novas.length, 4);
  igual(ids(linhasGravadas(amb)), ['PSA0502', 'PSE0504']);
  const p2 = pedir(amb.ctx.previaDisciplinasUnidade(CSV_LOTE, 'x.csv'));
  igual(p2.novas.map((n) => n.codigo), ['PST0501', '4709991'], 'as não escolhidas continuam como novas');
});
teste('F3. edição posterior do código mantém a identidade interna', () => {
  const amb = novoAmbiente();
  importarUnidade(amb, CSV_LOTE, ['PST0501']);
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0501', campos: { codigo: 'PST0599' } }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0501', campos: { nome: 'Renomeada' } }));
  const linhas = linhasGravadas(reabrir(amb));
  igual(ids(linhas), ['PST0501']);
  igual([linhas[0]['Código'], linhas[0]['Nome']], ['PST0599', 'Renomeada']);
});
teste('F4. chave de registro excluído (sem código editado) não é reutilizada nem o código volta como novo', () => {
  const amb = novoAmbiente();
  importarUnidade(amb, CSV_LOTE, ['PST0501']);
  pedir(amb.ctx.excluirDisciplinas([{ origem: 'outros', chave: 'PST0501' }], true));
  const p = pedir(amb.ctx.previaDisciplinasUnidade(CSV_LOTE, 'x.csv'));
  verdade(!p.novas.some((n) => n.codigo === 'PST0501'), 'excluída continua conhecida (regra existente)');
  const antes = fotografia(porId(linhasGravadas(amb), 'PST0501'));
  importarUnidade(amb, CSV_LOTE);
  const linhas = linhasGravadas(reabrir(amb));
  igual(linhas.length, 4);
  semRepeticao(ids(linhas));
  igual(fotografia(porId(linhas, 'PST0501')), antes, 'excluída intacta');
});
teste('F5. lote com várias disciplinas, algumas com a chave ocupada por registros de código editado', () => {
  const amb = novoAmbiente();
  importarUnidade(amb, CSV_LOTE, ['PST0501', 'PSA0502']);
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PST0501', campos: { codigo: 'PST0591' }, observacoes: 'obs 501' }));
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: 'PSA0502', campos: { codigo: 'PSA0592' }, observacoes: 'obs 502' }));
  const antes = linhasGravadas(amb).map(fotografia);
  const { previa, inclusao } = importarUnidade(amb, CSV_LOTE);
  igual(previa.novas.map((n) => n.codigo), ['PST0501', 'PSA0502', '4709991', 'PSE0504']);
  igual(inclusao.incluidas, 4);
  [amb, reabrir(amb)].forEach((a) => {
    const linhas = linhasGravadas(a);
    igual(linhas.length, 6);
    semRepeticao(ids(linhas));
    antes.forEach((f) => igual(fotografia(porId(linhas, f['Identificador'])), f, f['Identificador'] + ' intacto'));
    igual(linhas.map((l) => l['Código']).sort(), ['4709991', 'PSA0502', 'PSA0592', 'PSE0504', 'PST0501', 'PST0591']);
    igual(porId(linhas, '4709991')['Código'], '4709991', 'livres continuam com chave = código');
    igual(porId(linhas, 'PSE0504')['Código'], 'PSE0504');
    verdade(linhas.every((l) => String(l['Identificador']).length <= 20));
  });
});

teste('F6. código numérico (interdepartamental) com a chave ocupada: chave alternativa gravada como texto e lida igual após reabrir', () => {
  const amb = novoAmbiente();
  importarUnidade(amb, CSV_LOTE, ['4709991']);
  pedir(amb.ctx.salvarDisciplina({ origem: 'outros', chave: '4709991', campos: { codigo: '4709992' } }));
  importarUnidade(amb, CSV_LOTE, ['4709991']);
  const amb2 = reabrir(amb);
  const linhas = linhasGravadas(amb2);
  igual(linhas.map((l) => [l['Identificador'], l['Código']]), [['4709991', '4709992'], ['4709991-2', '4709991']]);
  verdade(linhas.every((l) => typeof l['Identificador'] === 'string'), 'identificadores lidos como texto');
  const painel = outrosDoPainel(amb2);
  igual(painel.map((o) => 'O:' + o.chave), ['O:4709991', 'O:4709991-2']);
  pedir(amb2.ctx.salvarDisciplina({ origem: 'outros', chave: '4709991-2', campos: { nome: 'Editada pela chave alternativa' } }));
  igual(porId(linhasGravadas(reabrir(amb2)), '4709991-2')['Nome'], 'Editada pela chave alternativa');
});

// =====================================================================
console.log('\n== G. Cadastro manual (conferência, sem mudança de comportamento)');
teste('G. cadastro manual do código antigo com a chave ocupada é recusado e nada é gravado', () => {
  const amb = novoAmbiente();
  prepararCorrigido(amb);
  const antes = linhasGravadas(amb).map(fotografia);
  const r = amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0391', nome: 'Manual com código antigo' } });
  igual([r.ok, r.codigo], [false, 'DISCIPLINA_EXISTENTE'], 'recusa (não sobrescreve)');
  igual(linhasGravadas(reabrir(amb)).map(fotografia), antes, 'aba inalterada');
  const r2 = amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0392', nome: 'Manual com código em uso' } });
  igual([r2.ok, r2.codigo], [false, 'CODIGO_REPETIDO']);
  const r3 = pedir(amb.ctx.cadastrarDisciplinaOutros({ campos: { codigo: 'PST0777', nome: 'Manual livre' } }));
  igual(r3.chave, 'PST0777', 'cadastro manual sem colisão: chave = código');
  igual(porId(linhasGravadas(amb), 'PST0777')['Origem'], ORIGEM_MANUAL);
});

// =====================================================================
console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
if (falhou.length) console.log('Falharam:\n  - ' + falhou.join('\n  - '));
ev('\n=== TOTAL: ' + ok + ' ok, ' + falhas + ' falha(s) ===');
try { fs.mkdirSync(path.dirname(ARQ_EVIDENCIAS), { recursive: true }); fs.writeFileSync(ARQ_EVIDENCIAS, evidencias.join('\n') + '\n'); } catch (e) { console.log('evidências não gravadas: ' + e.message); }
process.exit(falhas ? 1 : 0);

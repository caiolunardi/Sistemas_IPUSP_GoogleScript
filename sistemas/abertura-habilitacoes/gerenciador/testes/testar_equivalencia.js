// Equivalência entre a versão 1.0 (baseline sanitizado, em
// testes/baseline/) e a 2.0: as duas rodam sobre CÓPIAS das mesmas
// planilhas sintéticas, com os mesmos serviços simulados, e os resultados
// são comparados campo a campo. Nada aqui devolve um "resultado esperado"
// pronto: o esperado é o que a 1.0 faz.
//
// Onde a 2.0 muda de propósito, o teste afirma a diferença documentada
// (docs/sistemas/abertura-habilitacoes/INVENTARIO_LEGADO.md, coluna
// "Teste de equivalência").
// Uso: node sistemas/abertura-habilitacoes/gerenciador/testes/testar_equivalencia.js
'use strict';
process.env.TZ = 'America/Sao_Paulo';

const assert = require('assert');
const S = require('./simulacao');
const D = require('./dados_sinteticos');

const NOVO = S.arquivosDoGerenciador();
const ANTIGO = [S.BASELINE];

// Planilhas "consistentes": todo pedido com ID único e válido.
function linhasConsistentes() {
  const l = D.linhasAtuais();
  l[5][12] = D.uuid(5); l[5][13] = 1;   // Elisa
  l[8][12] = D.uuid(7);                 // Gabriela (deixa de repetir)
  l[9][12] = D.uuid(8);                 // Hugo (formato válido)
  return l;
}

/** Os dois ambientes, cada um com sua cópia das planilhas. */
function par(fabrica, opcoes = {}) {
  const novo = D.montar(Object.assign({ atual: fabrica(), historico: opcoes.historico ? opcoes.historico() : undefined }, opcoes.novo || {}));
  const antigo = D.montar({ atual: fabrica(), historico: opcoes.historico ? opcoes.historico() : undefined, ambiente: opcoes.ambiente });
  antigo.amb.arquivos[D.IDS.BASELINE] = antigo.amb.arquivos[D.IDS.RESPOSTAS];
  if (opcoes.ambiente) Object.assign(novo.amb, opcoes.ambiente);
  return {
    novo, antigo,
    n: (f, ...a) => S.executar(novo.amb, NOVO, f, a),
    a: (f, ...a) => S.executar(antigo.amb, ANTIGO, f, a)
  };
}

const CAMPOS_LISTA = ['registroId', 'versao', 'nome', 'nUsp', 'email', 'habilitacao', 'carimbo', 'observacoes'];
const so = (obj, campos) => campos.reduce((o, k) => { o[k] = obj[k]; return o; }, {});
const ehData = v => Object.prototype.toString.call(v) === '[object Date]';
// Célula comparável: Date vira "DATA" (o instante muda entre execuções).
const celulas = aba => aba.valores.map(l => l.map(v => ehData(v) ? 'DATA' : v));
const tentar = f => { try { return { ok: f() }; } catch (e) { return { erro: String(e.message) }; } };

let ok = 0, falhas = 0;
function t(nome, fn) {
  try { fn(); ok++; console.log('ok   ', nome); }
  catch (e) { falhas++; console.log('FALHA', nome, '\n      ', String(e && e.stack || e).split('\n').slice(0, 14).join('\n       ')); }
}

/*==================== LEITURAS ====================*/

t('pendentes: mesmos pedidos, mesma ordem, mesmos campos', () => {
  const p = par(linhasConsistentes);
  const a = p.a('obterPendentes'), n = p.n('obterPendentes');
  assert(a.length >= 7);
  assert.deepStrictEqual(n.map(x => so(x, CAMPOS_LISTA)), a.map(x => so(x, CAMPOS_LISTA)));
  assert(n.every(x => x.inconsistencia === ''));
});

t('concluídos recentes: mesmos 10, mesma ordem, mesmas datas e aviso', () => {
  const fabrica = () => {
    const l = linhasConsistentes();
    for (let i = 0; i < 12; i++) l.push(D.linha({ nome: 'Extra ' + i, nUsp: 9000200 + i, email: 'e' + i + '@exemplo.invalid', sit: 'Concluído', id: D.uuid(200 + i), conclusao: D.brt(2025, 6, 1 + i), enviado: i % 2 ? D.brt(2025, 6, 1 + i, 12) : '' }));
    return l;
  };
  const p = par(fabrica);
  const campos = CAMPOS_LISTA.concat(['dataConclusao', 'emailEnviado']);
  assert.deepStrictEqual(p.n('obterConcluidosRecentes').map(x => so(x, campos)), p.a('obterConcluidosRecentes').map(x => so(x, campos)));
});

t('detalhe: mesmos campos para todos os pedidos', () => {
  const p = par(linhasConsistentes);
  const ids = p.a('obterPendentes').concat(p.a('obterConcluidosRecentes')).map(x => x.registroId);
  assert(ids.length >= 10);
  ids.forEach(id => {
    const a = p.a('obterDetalhe', id), n = p.n('obterDetalhe', id);
    Object.keys(a).forEach(k => assert.deepStrictEqual(n[k], a[k], id + ' campo ' + k));
  });
});

t('busca no histórico: mesmos resultados e ordem (termos sem acento, datas Date)', () => {
  const hist = () => D.linhasHistorico().map((l, i) => (i && /\d{2}\/\d{2}\/\d{4}/.test(l[0]) ? [D.brt(2021, 1 + i, 3)].concat(l.slice(1)) : l));
  const atual = () => { const l = linhasConsistentes(); l[4][0] = D.brt(2026, 1, 15, 9, 30); return l; };
  const p = par(atual, { historico: hist });
  const campos = ['origem', 'nome', 'nUsp', 'email', 'habilitacao', 'carimbo', 'situacao'];
  ['bruna', 'exemplo.invalid', '900000', 'PSICOLOGIA', 'marcos@', 'ninguém-com-esse-nome'].forEach(termo => {
    assert.deepStrictEqual(p.n('buscarHistorico', termo).map(x => so(x, campos)), p.a('buscarHistorico', termo).map(x => so(x, campos)), termo);
  });
  assert.deepStrictEqual(p.n('buscarHistorico', ''), p.a('buscarHistorico', ''));
  const curto = [tentar(() => p.a('buscarHistorico', 'x')), tentar(() => p.n('buscarHistorico', 'x'))];
  assert(curto[0].erro && curto[1].erro, 'termo curto é recusado nas duas');
});

t('relatório: mesmas contagens (total, habilitação, ano, mês)', () => {
  const p = par(D.linhasAtuais);
  const a = p.a('obterRelatorio'), n = p.n('obterRelatorio');
  ['total', 'porHabilitacao', 'porAno', 'porMes'].forEach(k => assert.deepStrictEqual(n[k], a[k], k));
});

t('relatório com linhas sem Registro ID, ID repetido e aba histórica ausente: mesmas contagens', () => {
  const p = par(D.linhasAtuais, { historico: () => [['Outra coisa']] });
  ['total', 'porHabilitacao', 'porAno', 'porMes'].forEach(k => assert.deepStrictEqual(p.n('obterRelatorio')[k], p.a('obterRelatorio')[k], k));
});

/*==================== SALVAR ====================*/

// Mesma sequência nas duas versões; compara planilha e e-mails.
function compararSequencia(passos, fabrica = linhasConsistentes, opcoes = {}) {
  const p = par(fabrica, opcoes);
  const resultados = passos.map(([id, dados]) => {
    const versaoA = p.a('obterDetalhe', id).versao, versaoN = p.n('obterDetalhe', id).versao;
    return { a: tentar(() => p.a('salvarPedido', id, versaoA, dados)), n: tentar(() => p.n('salvarPedido', id, versaoN, dados)) };
  });
  assert.deepStrictEqual(celulas(p.novo.atual), celulas(p.antigo.atual), 'planilha diferente');
  const email = e => ({ para: e.para, assunto: e.assunto, corpo: e.corpo, opcoes: JSON.parse(JSON.stringify(e.opcoes)) });
  assert.deepStrictEqual(p.novo.amb.emails.map(email), p.antigo.amb.emails.map(email), 'e-mails diferentes');
  return { p, resultados };
}

t('concluir sem avisar', () => {
  const { resultados } = compararSequencia([[D.uuid(1), { observacoes: 'conferido', concluirSolicitacao: true }]]);
  assert.strictEqual(resultados[0].a.ok.versao, resultados[0].n.ok.versao);
});

t('concluir e avisar: mesmo e-mail, mesmas células', () => {
  const { p, resultados } = compararSequencia([[D.uuid(1), { observacoes: 'ok', concluirSolicitacao: true, avisarAluno: true }]]);
  assert.strictEqual(p.novo.amb.emails.length, 1);
  assert.strictEqual(resultados[0].a.ok.versao, resultados[0].n.ok.versao);
  assert.strictEqual(resultados[0].a.ok.emailEnviado, resultados[0].n.ok.emailEnviado);
});

t('avisar sem concluir, só observações e reabrir', () => {
  compararSequencia([
    [D.uuid(2), { avisarAluno: true }],
    [D.uuid(1), { observacoes: 'só nota' }],
    [D.uuid(3), { concluirSolicitacao: false, observacoes: 'reaberto' }],
    [D.uuid(4), { concluirSolicitacao: true, avisarAluno: true }]
  ]);
});

t('observações com fórmula e caracteres de controle: mesmo texto gravado', () => {
  compararSequencia([[D.uuid(1), { observacoes: '  +SOMA(1;2)\u0001 ' }], [D.uuid(2), { observacoes: '@x' }]]);
});

t('reenvio confirmado: mesmo e-mail e mesma data substituída', () => {
  compararSequencia([[D.uuid(3), { concluirSolicitacao: true, avisarAluno: true, reenviar: true }]]);
});

t('versão antiga: as duas recusam sem gravar', () => {
  const p = par(linhasConsistentes);
  const antes = celulas(p.novo.atual);
  const a = tentar(() => p.a('salvarPedido', D.uuid(2), 1, { concluirSolicitacao: true }));
  const n = tentar(() => p.n('salvarPedido', D.uuid(2), 1, { concluirSolicitacao: true }));
  assert(/alterado por outra sessão/.test(a.erro));
  assert(/^CONFLITO_VERSAO:/.test(n.erro));
  assert.deepStrictEqual(celulas(p.novo.atual), antes);
  assert.deepStrictEqual(celulas(p.antigo.atual), antes);
});

t('falha no envio: mesmas células (pedido salvo, reserva desfeita); a 2.0 devolve resultado em vez de erro', () => {
  const { resultados } = compararSequencia([[D.uuid(1), { concluirSolicitacao: true, avisarAluno: true }]], linhasConsistentes, { ambiente: { falhaEnvio: true } });
  assert(/^PEDIDO_SALVO_EMAIL_FALHOU:2:/.test(resultados[0].a.erro));
  assert.deepStrictEqual([resultados[0].n.ok.email, resultados[0].n.ok.versao], ['FALHOU', 2]);
});

/*==================== DIFERENÇAS INTENCIONAIS ====================*/

t('DIFERENÇA: já avisado — a 1.0 grava as observações antes de recusar; a 2.0 não grava nada', () => {
  const p = par(linhasConsistentes);
  const antes = celulas(p.novo.atual);
  const a = tentar(() => p.a('salvarPedido', D.uuid(3), 2, { observacoes: 'nova', avisarAluno: true }));
  const n = p.n('salvarPedido', D.uuid(3), 2, { observacoes: 'nova', avisarAluno: true });
  assert(/^REENVIO_NECESSARIO:/.test(a.erro));
  assert.strictEqual(n.resultado, 'REENVIO_NECESSARIO');
  assert.strictEqual(p.antigo.atual.valores[3][9], 'nova');
  assert.deepStrictEqual(celulas(p.novo.atual), antes);
});

t('DIFERENÇA: sem e-mail — a 1.0 grava as observações e recusa; a 2.0 recusa sem gravar', () => {
  const p = par(linhasConsistentes);
  const a = tentar(() => p.a('salvarPedido', D.uuid(10), 1, { observacoes: 'x', avisarAluno: true }));
  const n = tentar(() => p.n('salvarPedido', D.uuid(10), 1, { observacoes: 'x', avisarAluno: true }));
  assert(/não tem e-mail/.test(a.erro) && /^SEM_EMAIL:/.test(n.erro));
  assert.strictEqual(p.antigo.atual.valores[10][9], 'x');
  assert.strictEqual(p.novo.atual.valores[10][9], '');
});

t('DIFERENÇA: concluído salvo de novo — a 1.0 troca a data de conclusão; a 2.0 mantém', () => {
  const p = par(linhasConsistentes);
  const original = p.novo.atual.valores[3][11];
  p.a('salvarPedido', D.uuid(3), 2, { concluirSolicitacao: true });
  p.n('salvarPedido', D.uuid(3), 2, { concluirSolicitacao: true });
  assert.notStrictEqual(p.antigo.atual.valores[3][11].getTime(), original.getTime());
  assert.strictEqual(p.novo.atual.valores[3][11], original);
});

t('DIFERENÇA: versão omitida — a 1.0 salva sem conferir; a 2.0 recusa', () => {
  const p = par(linhasConsistentes);
  assert(tentar(() => p.a('salvarPedido', D.uuid(2), undefined, { concluirSolicitacao: true })).ok);
  assert(/^ENTRADA:/.test(tentar(() => p.n('salvarPedido', D.uuid(2), undefined, { concluirSolicitacao: true })).erro));
});

t('DIFERENÇA: ID repetido ou fora do formato — a 1.0 lista como clicável; a 2.0 marca e não abre', () => {
  const p = par(D.linhasAtuais);
  const a = p.a('obterPendentes'), n = p.n('obterPendentes');
  assert.deepStrictEqual(n.map(x => x.nome), a.map(x => x.nome), 'mesmos pedidos na lista');
  const fabioA = a.find(x => x.nome === 'Fábio Repetido'), fabioN = n.find(x => x.nome === 'Fábio Repetido');
  assert.strictEqual(fabioA.registroId, D.uuid(6));
  assert.deepStrictEqual([fabioN.registroId, fabioN.inconsistencia], ['', 'IDENTIFICADOR_REPETIDO']);
  assert.strictEqual(a.find(x => x.nome === 'Hugo Inválido').registroId, 'abc');
  assert.strictEqual(n.find(x => x.nome === 'Hugo Inválido').inconsistencia, 'IDENTIFICADOR_INVALIDO');
});

t('DIFERENÇA: abrir a página — a 1.0 grava IDs (migração automática); a 2.0 não altera nada', () => {
  const p = par(D.linhasAtuais);
  const antes = celulas(p.novo.atual);
  p.a('doGet', {});
  p.n('doGet', {});
  assert.notDeepStrictEqual(celulas(p.antigo.atual), antes);
  assert.deepStrictEqual(celulas(p.novo.atual), antes);
});

t('DIFERENÇA: busca sem acento e por data em texto — a 2.0 encontra e ordena; a 1.0 não', () => {
  const p = par(linhasConsistentes);
  assert.strictEqual(p.a('buscarHistorico', 'ficticio').length, 0);
  assert.strictEqual(p.n('buscarHistorico', 'ficticio').length, 1);
  const ordemN = p.n('buscarHistorico', 'exemplo.invalid').map(x => x.nome);
  const ordemA = p.a('buscarHistorico', 'exemplo.invalid').map(x => x.nome);
  // Nadia (03/02/2022, texto) vem antes de Bruna no histórico (10/05/2021, texto) só na 2.0
  assert(ordemN.indexOf('Marcos Histórico') < ordemN.indexOf('Nadia Antiga'));
  assert(ordemN.indexOf('Nadia Antiga') < ordemN.lastIndexOf('Bruna Exemplo'));
  assert(ordemN.indexOf('Daniel Teste') < ordemN.indexOf('Fábio Repetido'), 'carimbo em texto ordenado pela data');
  assert(ordemA.indexOf('Daniel Teste') > ordemA.indexOf('Fábio Repetido'), 'na 1.0 o carimbo em texto vai para o fim');
});

t('DIFERENÇA: reserva "ENVIANDO…" nos concluídos — a 1.0 mostra como aviso; a 2.0 não', () => {
  const fabrica = () => { const l = linhasConsistentes(); l[3][14] = 'ENVIANDO…'; return l; };
  const p = par(fabrica);
  assert.strictEqual(p.a('obterConcluidosRecentes').find(x => x.nome === 'Carla Modelo').emailEnviado, 'ENVIANDO…');
  const n = p.n('obterConcluidosRecentes').find(x => x.nome === 'Carla Modelo');
  assert.deepStrictEqual([n.emailEnviado, n.envioReservado], ['', true]);
});

t('DIFERENÇA: observações acima de 2.000 caracteres — a 1.0 corta; a 2.0 recusa', () => {
  const p = par(linhasConsistentes);
  p.a('salvarPedido', D.uuid(1), 1, { observacoes: 'z'.repeat(2500) });
  assert.strictEqual(p.antigo.atual.valores[1][9].length, 2000);
  assert(/^ENTRADA:/.test(tentar(() => p.n('salvarPedido', D.uuid(1), 1, { observacoes: 'z'.repeat(2500) })).erro));
});

t('DIFERENÇA: reserva alterada durante o envio — a 1.0 grava a data por cima; a 2.0 preserva a alteração', () => {
  const p = par(linhasConsistentes);
  const editar = m => () => { m.atual.valores[1][14] = 'conferido por telefone'; };
  p.antigo.amb.antesDoEnvio = editar(p.antigo);
  p.novo.amb.antesDoEnvio = editar(p.novo);
  p.a('salvarPedido', D.uuid(1), 1, { avisarAluno: true });
  const n = p.n('salvarPedido', D.uuid(1), 1, { avisarAluno: true });
  assert(ehData(p.antigo.atual.valores[1][14]), '1.0: a edição feita durante o envio some');
  assert.strictEqual(p.novo.atual.valores[1][14], 'conferido por telefone');
  assert.deepStrictEqual([n.email, n.motivo], ['ENVIADO_SEM_REGISTRO', 'RESERVA_ALTERADA']);
  assert.deepStrictEqual([p.antigo.amb.emails.length, p.novo.amb.emails.length], [1, 1]);
});

t('DIFERENÇA: versão malformada na planilha — a 1.0 lê como 1 e salva; a 2.0 marca e recusa', () => {
  const fabrica = () => { const l = linhasConsistentes(); l[1][13] = 'abc'; l[2][13] = 0; return l; };
  const p = par(fabrica);
  const a = p.a('obterPendentes'), n = p.n('obterPendentes');
  assert.deepStrictEqual(n.map(x => x.nome), a.map(x => x.nome), 'mesmos pedidos na lista');
  assert.deepStrictEqual([a.find(x => x.nome === 'Bruna Exemplo').versao, a.find(x => x.nome === 'Bruna Exemplo').registroId], [1, D.uuid(1)]);
  ['Bruna Exemplo', 'Álvaro Fictício'].forEach(nome => assert.strictEqual(n.find(x => x.nome === nome).inconsistencia, 'VERSAO_INVALIDA'));
  assert(tentar(() => p.a('salvarPedido', D.uuid(1), 1, { observacoes: 'x' })).ok);
  const antes = celulas(p.novo.atual);
  assert(/^VERSAO_INVALIDA:/.test(tentar(() => p.n('salvarPedido', D.uuid(1), 1, { observacoes: 'x' })).erro));
  assert.deepStrictEqual(celulas(p.novo.atual), antes);
});

t('DIFERENÇA: migração com versão malformada — a 1.0 troca 0 e texto por 1; a 2.0 preserva e informa', () => {
  const fabrica = () => { const l = D.linhasAtuais(); l[1][13] = 'abc'; l[2][13] = 0; return l; };
  const p = par(fabrica);
  p.a('doGet', {});
  assert.deepStrictEqual([p.antigo.atual.valores[1][13], p.antigo.atual.valores[2][13]], [1, 1]);
  const r = p.n('diagnosticarMigracaoRegistroId');
  assert.strictEqual(r.versaoMalformada, 2);
  p.novo.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = r.codigoConfirmacao;
  p.n('executarMigracaoRegistroId');
  assert.deepStrictEqual([p.novo.atual.valores[1][13], p.novo.atual.valores[2][13]], ['abc', 0]);
  assert.strictEqual(p.novo.atual.valores[5][13], p.antigo.atual.valores[5][13], 'versão vazia: as duas põem 1');
});

t('volta à 1.0: com o diagnóstico da 2.0 limpo, abrir a 1.0 não grava nada; sem ele, grava', () => {
  // Condição documentada em INSTALACAO_E_ATUALIZACAO.md §5: precisaMigrar
  // false, versaoMalformada 0 e reservasDeEnvio 0 antes de voltar.
  const p = par(() => { const l = D.linhasAtuais(); l[1][13] = 'abc'; return l; });
  const plano = p.n('diagnosticarMigracaoRegistroId');
  p.novo.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = plano.codigoConfirmacao;
  p.n('executarMigracaoRegistroId');
  [2, 10].forEach(linha => {
    p.novo.amb.propriedades.RECUPERACAO_REGISTRO = String(linha);
    p.novo.amb.propriedades.RECUPERACAO_REGISTRO = p.n('diagnosticarRecuperacaoRegistro').codigoConfirmacao;
    p.n('executarRecuperacaoRegistro');
  });
  const limpo = p.n('diagnosticarMigracaoRegistroId');
  assert.deepStrictEqual([limpo.precisaMigrar, limpo.versaoMalformada, limpo.identificadoresForaDoFormato, p.n('diagnosticarPlanilha').reservasDeEnvio], [false, 0, 0, 0]);
  // a 1.0 roda sobre a planilha deixada pela 2.0
  const v1 = D.montar({ atual: p.novo.atual.valores.map(l => l.slice()) });
  v1.amb.arquivos[D.IDS.BASELINE] = v1.amb.arquivos[D.IDS.RESPOSTAS];
  S.executar(v1.amb, ANTIGO, 'doGet', [{}]);
  assert.strictEqual(v1.atual.contadores.setValue + v1.atual.contadores.setValues, 0, 'a 1.0 não devia gravar nada');
  // sem a recuperação, a mesma visita reescreve as colunas e troca a versão malformada
  const sujo = D.montar({ atual: p.antigo.atual.valores.map(l => l.slice()) });
  sujo.amb.arquivos[D.IDS.BASELINE] = sujo.amb.arquivos[D.IDS.RESPOSTAS];
  S.executar(sujo.amb, ANTIGO, 'doGet', [{}]);
  assert(sujo.atual.contadores.setValues > 0);
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);

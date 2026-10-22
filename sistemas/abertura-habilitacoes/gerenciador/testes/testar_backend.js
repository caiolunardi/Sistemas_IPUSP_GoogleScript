// Testes do servidor do Gerenciador de Abertura de Habilitações 2.0.
// Serviços do Apps Script simulados (simulacao.js) e dados 100% sintéticos
// (dados_sinteticos.js). Nenhum e-mail real, nenhuma planilha real.
// Uso: node sistemas/abertura-habilitacoes/gerenciador/testes/testar_backend.js
'use strict';
process.env.TZ = 'America/Sao_Paulo';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const S = require('./simulacao');
const D = require('./dados_sinteticos');

const ARQ = S.arquivosDoGerenciador();
const SRC = path.join(__dirname, '..', 'src');

const chamar = (m, nome, ...args) => S.executar(m.amb, ARQ, nome, args);
const como = (m, usuario) => { m.amb.usuario = usuario; return m; };
const codigo = c => e => {
  if (!new RegExp('^' + c + ':').test(String(e && e.message))) throw new Error('esperado ' + c + ', veio: ' + (e && e.message));
  return true;
};
const retrato = aba => JSON.stringify(aba.valores);
const col = (m, titulo) => m.atual.valores[0].indexOf(titulo);
const linhaDe = (m, nome) => m.atual.valores.find(l => l[3] === nome);
const ehData = v => Object.prototype.toString.call(v) === '[object Date]';

let ok = 0, falhas = 0;
function t(nome, fn) {
  try { fn(); ok++; console.log('ok   ', nome); }
  catch (e) { falhas++; console.log('FALHA', nome, '\n      ', String(e && e.stack || e).split('\n').slice(0, 14).join('\n       ')); }
}

/*==================== CONFIGURAÇÃO E ID_INDEX ====================*/

// A lista de acesso também vem do ID_INDEX: sem configuração, a pessoa
// recebe ACESSO_INDISPONIVEL (sem detalhes) e o dono vê a causa no
// diagnóstico.
t('sem ID_INDEX_SPREADSHEET_ID: negado, nada aberto; diagnóstico mostra a causa', () => {
  const m = D.montar({ propriedades: {} });
  assert.throws(() => chamar(m, 'obterPendentes'), codigo('ACESSO_INDISPONIVEL'));
  assert.deepStrictEqual(m.amb.aberturas, {});
  m.amb.usuario = m.amb.dono;
  const diag = chamar(m, 'diagnosticarConfiguracao');
  assert(/^FALHA: CONFIGURACAO: Falta a propriedade do script ID_INDEX_SPREADSHEET_ID/.test(diag.chaves.ABERTURA_HABILITACOES), diag.chaves.ABERTURA_HABILITACOES);
});

t('ID_INDEX inacessível: mensagens e registros sem o ID', () => {
  const m = D.montar({ propriedades: { ID_INDEX_SPREADSHEET_ID: 'INDICE_QUE_NAO_EXISTE' } });
  assert.throws(() => chamar(m, 'obterPendentes'), e => codigo('ACESSO_INDISPONIVEL')(e) && !/INDICE_QUE_NAO_EXISTE/.test(e.message));
  m.amb.usuario = m.amb.dono;
  const diag = JSON.stringify(chamar(m, 'diagnosticarConfiguracao'));
  assert(/CONFIGURACAO/.test(diag) && !/INDICE_QUE_NAO_EXISTE/.test(diag));
  assert(!m.amb.logs.join('\n').includes('INDICE_QUE_NAO_EXISTE'));
});

t('chave de pedidos com problema: CONFIGURACAO depois do acesso conferido', () => {
  const m = D.montar({ indice: D.abaIndice([['PERMISSOES_DE_ACESSO', 'spreadsheet', D.IDS.PERMISSOES, ''], ['ABERTURA_HABILITACOES', 'spreadsheet', 'PLANILHA_SEM_ACESSO', '']]) });
  assert.throws(() => chamar(m, 'obterPendentes'), e => codigo('CONFIGURACAO')(e) && !/PLANILHA_SEM_ACESSO/.test(e.message));
});

t('chave ausente, repetida, sem ID ou de outro tipo: falha fechada', () => {
  const casos = [
    [['ABERTURA_HABILITACOES', 'spreadsheet', D.IDS.RESPOSTAS, '']],
    [['ABERTURA_HABILITACOES', 'spreadsheet', D.IDS.RESPOSTAS, ''], ['PERMISSOES_DE_ACESSO', 'spreadsheet', D.IDS.PERMISSOES, ''], ['PERMISSOES_DE_ACESSO', 'spreadsheet', D.IDS.PERMISSOES, '']],
    [['ABERTURA_HABILITACOES', 'spreadsheet', D.IDS.RESPOSTAS, ''], ['PERMISSOES_DE_ACESSO', 'spreadsheet', '', '']],
    [['ABERTURA_HABILITACOES', 'spreadsheet', D.IDS.RESPOSTAS, ''], ['PERMISSOES_DE_ACESSO', 'folder', D.IDS.PERMISSOES, '']]
  ];
  casos.forEach(linhas => {
    const m = D.montar({ indice: D.abaIndice(linhas) });
    // a lista de acesso vem antes: sem ela, nada de pedidos
    assert.throws(() => chamar(m, 'obterPendentes'), codigo('ACESSO_INDISPONIVEL'));
    assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], undefined);
  });
  const m = D.montar({ indice: D.abaIndice([['PERMISSOES_DE_ACESSO', 'spreadsheet', D.IDS.PERMISSOES, ''], ['ABERTURA_HABILITACOES', 'spreadsheet', D.IDS.RESPOSTAS, ''], ['ABERTURA_HABILITACOES', 'spreadsheet', 'OUTRA', '']]) });
  assert.throws(() => chamar(m, 'obterPendentes'), e => codigo('CONFIGURACAO')(e) && /mais de uma vez/.test(e.message));
});

t('AMBIENTE desconhecido: erro, nunca usa a produção', () => {
  const m = D.montar({ propriedades: { ID_INDEX_SPREADSHEET_ID: D.IDS.INDICE, AMBIENTE: 'teste' } });
  assert.throws(() => chamar(m, 'obterPendentes'), codigo('ACESSO_INDISPONIVEL'));
  assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], undefined);
  assert.throws(() => chamar(m, 'diagnosticarConfiguracao'), codigo('ACESSO_INDISPONIVEL'));
  m.amb.usuario = m.amb.dono;
  const diag = chamar(m, 'diagnosticarConfiguracao');
  assert(/^FALHA/.test(diag.ambiente));
});

t('homologação: lê a coluna Homologação, prefixo no título e no assunto', () => {
  const homolog = D.linhasAtuais().slice(0, 2);
  homolog[1][3] = 'Pessoa da Homologação';
  const m = D.montar({ homologacao: homolog, propriedades: { ID_INDEX_SPREADSHEET_ID: D.IDS.INDICE, AMBIENTE: 'homologacao' } });
  const p = chamar(m, 'obterPendentes');
  assert.deepStrictEqual(p.map(x => x.nome), ['Pessoa da Homologação']);
  assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], undefined, 'produção não pode ser aberta');
  assert.strictEqual(m.amb.aberturas[D.IDS.PERMISSOES], undefined, 'lista de produção não pode ser usada');
  chamar(m, 'doGet', {});
  assert(/^\[HOMOLOGAÇÃO\] /.test(m.amb.paginas[0].titulo));
  const r = chamar(m, 'salvarPedido', D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert.strictEqual(r.email, 'ENVIADO');
  assert(/^\[HOMOLOGAÇÃO\] Abertura de Habilitação$/.test(m.amb.emails[0].assunto));
});

t('homologação sem ID na coluna Homologação: falha fechada, sem cair na produção', () => {
  const m = D.montar({
    indice: D.abaIndice([['ABERTURA_HABILITACOES', 'spreadsheet', D.IDS.RESPOSTAS, ''], ['PERMISSOES_DE_ACESSO', 'spreadsheet', D.IDS.PERMISSOES, D.IDS.PERMISSOES]]),
    propriedades: { ID_INDEX_SPREADSHEET_ID: D.IDS.INDICE, AMBIENTE: 'homologacao' }
  });
  assert.throws(() => chamar(m, 'obterPendentes'), e => codigo('CONFIGURACAO')(e) && /Homologação/.test(e.message));
  assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], undefined);
});

t('ID_INDEX em cache: chave nova é relida em vez de falhar', () => {
  const m = D.montar();
  chamar(m, 'obterPendentes');
  const chaveCache = Object.keys(m.amb.cache).find(k => /^habilitacoesIndice:/.test(k));
  const mapa = JSON.parse(m.amb.cache[chaveCache]);
  delete mapa.ABERTURA_HABILITACOES;
  m.amb.cache[chaveCache] = JSON.stringify(mapa);
  assert.strictEqual(chamar(m, 'obterPendentes').length, 7);
});

t('nenhum ID literal nem openById com texto fixo no código', () => {
  fs.readdirSync(SRC).forEach(f => {
    const texto = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert(!/openById\(\s*["'`]/.test(texto), f + ': openById com texto fixo');
    if (f.endsWith('.gs')) (texto.match(/["'`][A-Za-z0-9_-]{25,}["'`]/g) || []).forEach(x => assert(!(/[a-z]/.test(x) && /[A-Z]/.test(x) && /[0-9]/.test(x)), f + ': texto com formato de ID'));
  });
  assert(!fs.existsSync(path.join(SRC, '.clasp.json')), '.clasp.json não pode ser publicado');
});

/*==================== ACESSO ====================*/

const PUBLICAS = ['atribuirIdentificador', 'buscarHistorico', 'diagnosticarConfiguracao', 'diagnosticarMigracaoRegistroId',
  'diagnosticarPlanilha', 'diagnosticarRecuperacaoRegistro', 'doGet', 'executarMigracaoRegistroId', 'executarRecuperacaoRegistro',
  'obterConcluidosRecentes', 'obterDetalhe', 'obterPendentes', 'obterRelatorio', 'salvarPedido',
  'consolidarAuditoriaHabilitacoes', 'prepararAuditoriaHabilitacoes', 'registrarEventosHabilitacoes', 'verificarIntegridadeAuditoria'];
const DE_ESCRITA = ['atribuirIdentificador', 'diagnosticarMigracaoRegistroId', 'diagnosticarPlanilha', 'diagnosticarRecuperacaoRegistro',
  'executarMigracaoRegistroId', 'executarRecuperacaoRegistro', 'salvarPedido',
  'consolidarAuditoriaHabilitacoes', 'prepararAuditoriaHabilitacoes', 'verificarIntegridadeAuditoria'];
const ARGS = {
  obterDetalhe: [D.uuid(1)], buscarHistorico: ['bruna'], salvarPedido: [D.uuid(1), 1, { concluirSolicitacao: true }],
  atribuirIdentificador: [{ linha: 6, carimbo: D.brt(2026, 5, 5).getTime(), nUsp: '9000005' }],
  registrarEventosHabilitacoes: [{ sessao_id: '', contexto: {}, eventos: [] }]
};

t('funções públicas são exatamente as previstas (as demais terminam com _)', () => {
  const nomes = [];
  ARQ.forEach(a => {
    const texto = fs.readFileSync(a, 'utf8');
    let r; const re = /^function\s+([A-Za-z0-9_]+)\s*\(/gm;
    while ((r = re.exec(texto))) if (!/_$/.test(r[1])) nomes.push(r[1]);
  });
  assert.deepStrictEqual(nomes.sort(), PUBLICAS.slice().sort());
});

t('conta fora da lista: toda função pública negada antes de abrir os pedidos', () => {
  PUBLICAS.filter(f => f !== 'doGet').forEach(f => {
    const m = como(D.montar(), D.ESTRANHO);
    assert.throws(() => chamar(m, f, ...(ARGS[f] || [])), codigo('SEM_ACESSO'), f);
    assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], undefined, f + ' abriu a planilha de pedidos');
    assert.strictEqual(m.atual.escritas.length, 0, f);
  });
});

// Desde a 2.1, a recusa é gravada na auditoria: só o ID_INDEX e a
// planilha da auditoria são abertos, nunca pedidos nem a lista de acesso.
t('sessão sem e-mail: negado sem abrir pedidos nem a lista; recusa na auditoria', () => {
  PUBLICAS.filter(f => f !== 'doGet').forEach(f => {
    const m = como(D.montar(), '');
    assert.throws(() => chamar(m, f, ...(ARGS[f] || [])), codigo('SEM_IDENTIFICACAO'), f);
    assert.deepStrictEqual(Object.keys(m.amb.aberturas).sort(), [D.IDS.AUDITORIA, D.IDS.INDICE].sort(), f);
    const ev = m.auditoria.linhas('EVENTOS_' + new Date().getFullYear());
    assert.strictEqual(ev.length, 1, f);
    assert.strictEqual(ev[0][12], 'ACESSO.NEGAR', f);
  });
});

t('LEITOR: consulta liberada; gravação, e-mail e manutenção negados sem escrever', () => {
  const m = como(D.montar(), D.LEITOR);
  assert.strictEqual(chamar(m, 'obterPendentes').length, 7);
  chamar(m, 'obterConcluidosRecentes'); chamar(m, 'obterDetalhe', D.uuid(1)); chamar(m, 'buscarHistorico', 'bruna'); chamar(m, 'obterRelatorio');
  const antes = retrato(m.atual);
  DE_ESCRITA.forEach(f => assert.throws(() => chamar(m, f, ...(ARGS[f] || [])), codigo('SO_LEITURA'), f));
  assert.strictEqual(retrato(m.atual), antes);
  assert.strictEqual(m.amb.emails.length, 0);
});

t('lista de acesso: coringa e perfil desconhecido ignorados; duplicado vale o menor; caixa e espaços normalizados', () => {
  ['*@exemplo.invalid', 'semperfil@exemplo.invalid', 'super@exemplo.invalid'].forEach(u => {
    assert.throws(() => chamar(como(D.montar(), u), 'obterPendentes'), codigo('SEM_ACESSO'), u);
  });
  assert.throws(() => chamar(como(D.montar(), 'dup@exemplo.invalid'), 'salvarPedido', D.uuid(1), 1, {}), codigo('SO_LEITURA'));
  const m = como(D.montar(), 'admin2@exemplo.invalid');
  assert.strictEqual(chamar(m, 'salvarPedido', D.uuid(1), 1, {}).resultado, 'SALVO');
});

t('lista de acesso indisponível ou malformada: ACESSO_INDISPONIVEL, página sem dados', () => {
  const semAba = D.montar(); semAba.arquivos[D.IDS.PERMISSOES].abas = [S.criarAba('OUTRA', [['x']])];
  const titulos = D.montar({ permissoes: S.criarAba('GERENCIADOR_HABILITACOES', [['a', 'b', 'c', 'd', 'e'], ['', '', D.ADMIN, '', 'ADMINISTRADOR']]) });
  const semArquivo = D.montar(); delete semArquivo.arquivos[D.IDS.PERMISSOES];
  [semAba, titulos, semArquivo].forEach(m => {
    assert.throws(() => chamar(m, 'obterPendentes'), codigo('ACESSO_INDISPONIVEL'));
    chamar(m, 'doGet', {});
    assert.strictEqual(m.amb.paginas[0].nome, 'GerenciadorSemAcesso');
    assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], undefined);
  });
  assert(!semArquivo.amb.logs.join('\n').includes(D.IDS.PERMISSOES), 'ID da planilha no registro');
});

t('doGet: página com perfil; não abre os pedidos nem grava (sem migração automática)', () => {
  const m = D.montar();
  chamar(m, 'doGet', {});
  assert.strictEqual(m.amb.paginas[0].nome, 'GerenciadorApp');
  assert.strictEqual(m.amb.paginas[0].perfil, 'ADMINISTRADOR');
  assert.strictEqual(m.amb.paginas[0].homologacao, false);
  assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], undefined);
  assert.strictEqual(m.atual.escritas.length, 0);
  const l = como(D.montar(), D.LEITOR); chamar(l, 'doGet', {});
  assert.strictEqual(l.amb.paginas[0].perfil, 'LEITOR');
  const e = como(D.montar(), D.ESTRANHO); chamar(e, 'doGet', {});
  assert.strictEqual(e.amb.paginas[0].nome, 'GerenciadorSemAcesso');
  assert.strictEqual(e.amb.paginas[0].titulo, 'Gerenciador de Abertura de Habilitações');
  assert(/não tem acesso/.test(e.amb.paginas[0].mensagem));
});

t('diagnosticarConfiguracao: dono do projeto passa mesmo sem estar na lista; ninguém vê IDs', () => {
  const m = D.montar();
  m.amb.usuario = m.amb.dono;
  const r = chamar(m, 'diagnosticarConfiguracao');
  assert.strictEqual(r.ambiente, 'producao');
  assert(/^ok: /.test(r.chaves.ABERTURA_HABILITACOES));
  assert(/2 administrador\(es\), 2 leitor\(es\)/.test(r.acesso), r.acesso);
  assert(!JSON.stringify(r).includes(D.IDS.RESPOSTAS));
  assert(!JSON.stringify(r).includes(D.ADMIN));
});

/*==================== LISTAS ====================*/

t('pendentes: ordem alfabética pt-BR, sem linhas vazias nem concluídas', () => {
  const m = D.montar();
  const p = chamar(m, 'obterPendentes');
  assert.deepStrictEqual(p.map(x => x.nome), ['Álvaro Fictício', 'Bruna Exemplo', 'Elisa Sem Identificador', 'Fábio Repetido', 'Gabriela Repetida', 'Hugo Inválido', 'Joana Sem Email']);
  assert.strictEqual(m.amb.ultimoRetornoTinhaData, false);
  const bruna = p.find(x => x.nome === 'Bruna Exemplo');
  assert.strictEqual(bruna.registroId, D.uuid(1));
  assert.strictEqual(bruna.carimbo, '02/03/2026 10:00');
  assert.strictEqual(bruna.nUsp, '9000001');
  assert.strictEqual(p.find(x => x.nome === 'Álvaro Fictício').versao, 3);
});

t('pendentes: sem identificador, inválido e repetido continuam na lista, sem ação', () => {
  const p = chamar(D.montar(), 'obterPendentes');
  const por = n => p.find(x => x.nome === n);
  assert.strictEqual(por('Elisa Sem Identificador').inconsistencia, 'SEM_IDENTIFICADOR');
  assert.deepStrictEqual(por('Elisa Sem Identificador').referencia, { linha: 6, carimbo: D.brt(2026, 5, 5).getTime(), nUsp: '9000005' });
  assert.strictEqual(por('Hugo Inválido').inconsistencia, 'IDENTIFICADOR_INVALIDO');
  assert.strictEqual(por('Fábio Repetido').inconsistencia, 'IDENTIFICADOR_REPETIDO');
  assert.strictEqual(por('Gabriela Repetida').inconsistencia, 'IDENTIFICADOR_REPETIDO');
  ['Elisa Sem Identificador', 'Hugo Inválido', 'Fábio Repetido'].forEach(n => assert.strictEqual(por(n).registroId, ''));
});

t('pendentes: uma leitura em lote, planilha aberta uma vez', () => {
  const m = D.montar();
  chamar(m, 'obterPendentes');
  assert.strictEqual(m.atual.contadores.getValues, 1);
  assert.strictEqual(m.atual.contadores.getValue, 0);
  assert.strictEqual(m.amb.aberturas[D.IDS.RESPOSTAS], 1);
  assert.strictEqual(m.historico.contadores.getValues, 0, 'histórico não é lido nos pendentes');
});

t('concluídos: 10 mais recentes, pela conclusão ou pelo carimbo, texto ou Date', () => {
  const linhas = D.linhasAtuais();
  for (let i = 0; i < 12; i++) {
    linhas.push(D.linha({ nome: 'Extra ' + String(i).padStart(2, '0'), nUsp: 9000100 + i, email: 'x' + i + '@exemplo.invalid', sit: 'Concluído', id: D.uuid(100 + i), conclusao: D.brt(2024, 1, 1 + i) }));
  }
  const m = D.montar({ atual: linhas });
  const c = chamar(m, 'obterConcluidosRecentes');
  assert.strictEqual(c.length, 10);
  assert.deepStrictEqual(c.slice(0, 3).map(x => x.nome), ['Carla Modelo', 'Daniel Teste', 'Lia Concluída Antiga']);
  assert.strictEqual(c[0].emailEnviado, '01/04/2026 15:05');
  assert.strictEqual(c[1].dataConclusao, '15/01/2026 09:30:00', 'sem Data de Conclusão usa o carimbo');
  assert.strictEqual(c[3].nome, 'Extra 11');
  assert.strictEqual(m.amb.ultimoRetornoTinhaData, false);
});

t('concluídos: reserva de envio não aparece como aviso enviado', () => {
  const linhas = D.linhasAtuais();
  linhas[3][14] = D.reserva(1);
  const c = chamar(D.montar({ atual: linhas }), 'obterConcluidosRecentes');
  const carla = c.find(x => x.nome === 'Carla Modelo');
  assert.strictEqual(carla.emailEnviado, '');
  assert.strictEqual(carla.envioReservado, true);
});

t('detalhe: campos, datas como texto, reserva e envio interrompido', () => {
  const m = D.montar();
  const d = chamar(m, 'obterDetalhe', D.uuid(3));
  assert.strictEqual(m.amb.ultimoRetornoTinhaData, false);
  assert.deepStrictEqual(
    [d.nome, d.nUsp, d.email, d.habilitacao, d.carimbo, d.situacao, d.concluido, d.dataConclusao, d.emailEnviado, d.anoIngresso, d.trancamento, d.versao],
    ['Carla Modelo', '9000003', 'carla@exemplo.invalid', D.HAB_B + ', ' + D.HAB_L, '20/03/2026 09:00', 'Concluído', true, '01/04/2026 15:00', '01/04/2026 15:05', '2024', 'Não', 2]);
  const linhas = D.linhasAtuais();
  linhas[1][14] = D.reserva(30);
  linhas[2][14] = 'ENVIANDO…';
  const m2 = D.montar({ atual: linhas });
  const a = chamar(m2, 'obterDetalhe', D.uuid(1));
  assert.deepStrictEqual([a.emailEnviado, a.envioReservado, a.envioInterrompido], ['', true, true]);
  const b = chamar(m2, 'obterDetalhe', D.uuid(2));
  assert.deepStrictEqual([b.emailEnviado, b.envioReservado, b.envioInterrompido], ['', true, true], 'reserva da 1.0, sem data');
});

t('detalhe: ID inválido, inexistente, repetido e planilha sem coluna Registro ID', () => {
  const m = D.montar();
  assert.throws(() => chamar(m, 'obterDetalhe', '../x'), codigo('ENTRADA'));
  assert.throws(() => chamar(m, 'obterDetalhe', null), codigo('ENTRADA'));
  assert.throws(() => chamar(m, 'obterDetalhe', D.uuid(999)), codigo('NAO_ENCONTRADO'));
  assert.throws(() => chamar(m, 'obterDetalhe', D.uuid(6)), codigo('INTEGRIDADE'));
  const semColuna = D.linhasAtuais().map(l => l.slice(0, 12));
  assert.throws(() => chamar(D.montar({ atual: semColuna }), 'obterDetalhe', D.uuid(1)), codigo('MIGRACAO_NECESSARIA'));
});

t('estrutura: título repetido, J/K deslocadas e coluna obrigatória ausente param tudo', () => {
  const rep = D.linhasAtuais(); rep[0][14] = 'Nome';
  assert.throws(() => chamar(D.montar({ atual: rep }), 'obterPendentes'), e => codigo('ESTRUTURA')(e) && /repetido/.test(e.message));
  const desloc = D.linhasAtuais(); desloc[0][9] = 'Versão'; desloc[0][13] = 'Observações';
  assert.throws(() => chamar(D.montar({ atual: desloc }), 'obterPendentes'), e => codigo('ESTRUTURA')(e) && /deslocadas/.test(e.message));
  const sem = D.linhasAtuais(); sem[0][4] = 'Email USP';
  assert.throws(() => chamar(D.montar({ atual: sem }), 'obterPendentes'), e => codigo('ESTRUTURA')(e) && /E-mail USP/.test(e.message));
  const semAba = D.montar(); semAba.arquivos[D.IDS.RESPOSTAS].abas = [semAba.historico];
  assert.throws(() => chamar(semAba, 'obterPendentes'), codigo('ESTRUTURA'));
});

/*==================== BUSCA E HISTÓRICO ====================*/

t('busca: nome sem acento, Nº USP e e-mail, nas duas abas, do mais recente ao mais antigo', () => {
  const m = D.montar();
  const r = chamar(m, 'buscarHistorico', 'BRUNA');
  assert.deepStrictEqual(r.map(x => [x.origem, x.situacao]), [['Atual', 'Pendente'], ['Histórico (2021-2022)', 'Concluído']]);
  assert.strictEqual(r[0].registroId, D.uuid(1));
  assert.strictEqual(r[1].registroId, '');
  assert.strictEqual(chamar(m, 'buscarHistorico', 'alvaro')[0].nome, 'Álvaro Fictício');
  assert.strictEqual(chamar(m, 'buscarHistorico', '9000020')[0].nome, 'Marcos Histórico');
  assert.strictEqual(chamar(m, 'buscarHistorico', 'nadia@exemplo')[0].carimbo, '03/02/2022');
  const ordem = chamar(m, 'buscarHistorico', 'exemplo.invalid').map(x => x.nome);
  assert(ordem.indexOf('Marcos Histórico') < ordem.indexOf('Nadia Antiga'), 'texto e Date na mesma ordem');
  assert.strictEqual(ordem[ordem.length - 1], 'Otávio Sem Data');
  assert.strictEqual(chamar(m, 'buscarHistorico', 'fabio')[0].registroId, '', 'ID repetido não abre');
  assert.strictEqual(m.amb.ultimoRetornoTinhaData, false);
});

t('busca: termo vazio, curto e longo', () => {
  const m = D.montar();
  assert.deepStrictEqual(chamar(m, 'buscarHistorico', '   '), []);
  assert.deepStrictEqual(chamar(m, 'buscarHistorico', null), []);
  assert.throws(() => chamar(m, 'buscarHistorico', 'a'), codigo('ENTRADA'));
  assert.deepStrictEqual(chamar(m, 'buscarHistorico', 'x'.repeat(5000)), []);
});

t('busca e relatório sem a aba histórica: só a aba atual', () => {
  const m = D.montar({ historico: null });
  assert.strictEqual(chamar(m, 'buscarHistorico', 'bruna').length, 1);
  const r = chamar(m, 'obterRelatorio');
  assert.strictEqual(r.fontes.historico, null);
  assert.strictEqual(r.total, 10);
});

t('aba histórica nunca é escrita nem reordenada (todas as operações)', () => {
  const m = D.montar();
  const antes = retrato(m.historico);
  chamar(m, 'obterPendentes'); chamar(m, 'obterConcluidosRecentes'); chamar(m, 'buscarHistorico', 'exemplo'); chamar(m, 'obterRelatorio');
  chamar(m, 'salvarPedido', D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  chamar(m, 'diagnosticarPlanilha');
  const plano = chamar(m, 'diagnosticarMigracaoRegistroId');
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = plano.codigoConfirmacao;
  chamar(m, 'executarMigracaoRegistroId');
  m.amb.propriedades.RECUPERACAO_REGISTRO = '10';
  m.amb.propriedades.RECUPERACAO_REGISTRO = chamar(m, 'diagnosticarRecuperacaoRegistro').codigoConfirmacao;
  chamar(m, 'executarRecuperacaoRegistro');
  assert.strictEqual(retrato(m.historico), antes);
  assert.strictEqual(m.historico.contadores.setValue + m.historico.contadores.setValues, 0);
});

t('gravarCelula_ recusa escrever fora da aba atual', () => {
  const m = D.montar();
  const ctx = S.carregar(m.amb, ARQ);
  const tabela = ctx.lerTabela_(m.historico);
  assert.throws(() => ctx.gravarCelula_(tabela, 2, 1, 'x'), codigo('ESTRUTURA'));
  assert.throws(() => ctx.obterOuCriarColuna_(tabela, 'registroId'), codigo('ESTRUTURA'));
});

/*==================== RELATÓRIOS ====================*/

t('relatório: totais, múltipla seleção, outro, ano e mês por Date e texto, sem data', () => {
  const m = D.montar();
  const r = chamar(m, 'obterRelatorio');
  assert.strictEqual(r.total, 14);
  assert.deepStrictEqual(r.fontes, { atual: 10, historico: 4 });
  const hab = Object.fromEntries(r.porHabilitacao.map(x => [x.chave, x.quantidade]));
  assert.deepStrictEqual(hab, { [D.HAB_B]: 11, [D.HAB_L]: 4, 'Outro / não identificado': 1 });
  const ano = Object.fromEntries(r.porAno.map(x => [x.chave, x.quantidade]));
  assert.deepStrictEqual(ano, { 2026: 9, 2025: 1, 2022: 2, 2021: 1 });
  assert.deepStrictEqual(r.porAno.map(x => x.chave), ['2026', '2025', '2022', '2021']);
  assert.strictEqual(r.porMes[0].chave, '2026-05');
  assert.strictEqual(r.porMes.find(x => x.chave === '2022-02').quantidade, 1);
  assert.strictEqual(r.semData, 1);
});

/*==================== SALVAR ====================*/

const salvar = (m, id, versao, dados) => chamar(m, 'salvarPedido', id, versao, dados);

t('concluir sem avisar: situação, data, observações, versão; nenhum e-mail', () => {
  const m = D.montar();
  const r = salvar(m, D.uuid(1), 1, { observacoes: '  Documento conferido  ', concluirSolicitacao: true });
  assert.deepStrictEqual([r.resultado, r.email, r.versao, r.concluido, r.situacao], ['SALVO', 'NAO_SOLICITADO', 2, true, 'Concluído']);
  const l = linhaDe(m, 'Bruna Exemplo');
  assert.strictEqual(l[9], 'Documento conferido');
  assert.strictEqual(l[10], 'Concluído');
  assert(ehData(l[11]));
  assert.strictEqual(l[13], 2);
  assert.strictEqual(m.amb.emails.length, 0);
  assert(m.atual.escritas.every(e => e.travado), 'toda escrita dentro da trava');
  assert(m.amb.flushes.some(f => f.travado), 'flush antes de liberar a trava');
});

t('só observações (pedido pendente): situação "pendente", versão sobe', () => {
  const m = D.montar();
  const r = salvar(m, D.uuid(1), 1, { observacoes: 'anotação' });
  assert.deepStrictEqual([r.versao, r.situacao, r.concluido], [2, 'pendente', false]);
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[10], 'pendente');
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[11], '');
});

t('concluir e avisar: e-mail com o texto da 1.0, fora da trava; data e versão registradas', () => {
  const m = D.montar();
  const r = salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert.deepStrictEqual([r.email, r.versao], ['ENVIADO', 3]);
  assert.strictEqual(m.amb.emails.length, 1);
  const e = m.amb.emails[0];
  const hora = Number(S.formatarData(new Date(), S.TZ, 'H'));
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  assert.strictEqual(e.para, 'bruna@exemplo.invalid');
  assert.strictEqual(e.assunto, 'Abertura de Habilitação');
  assert.strictEqual(e.corpo, `${saudacao}, Bruna.\n\nInformo que sua habilitação de ${D.HAB_B} foi aberta conforme solicitado.\n\nAtenciosamente,\nEquipe do Serviço de Graduação`);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(e.opcoes)), { name: 'Serviço de Graduação — IPUSP', replyTo: 'gradip@usp.br' });
  assert.strictEqual(e.travado, false, 'e-mail fora da seção crítica');
  const l = linhaDe(m, 'Bruna Exemplo');
  assert(ehData(l[14]));
  assert.strictEqual(r.emailEnviado, S.formatarData(l[14], S.TZ, 'dd/MM/yyyy HH:mm'));
  assert.strictEqual(l[13], 3);
});

t('avisar sem concluir: e-mail enviado, pedido continua pendente', () => {
  const m = D.montar();
  const r = salvar(m, D.uuid(2), 3, { avisarAluno: true });
  assert.deepStrictEqual([r.email, r.concluido, r.situacao], ['ENVIADO', false, 'pendente']);
  assert.strictEqual(m.amb.emails[0].corpo.split('\n')[2], `Informo que sua habilitação de ${D.HAB_L} foi aberta conforme solicitado.`);
});

t('salvar de novo um concluído mantém a data de conclusão original', () => {
  const m = D.montar();
  const antes = linhaDe(m, 'Carla Modelo')[11];
  salvar(m, D.uuid(3), 2, { observacoes: 'nota', concluirSolicitacao: true });
  assert.strictEqual(linhaDe(m, 'Carla Modelo')[11], antes);
  // concluído sem data registrada recebe data
  salvar(m, D.uuid(4), 1, { concluirSolicitacao: true });
  assert(ehData(linhaDe(m, 'Daniel Teste')[11]));
});

t('reabrir: situação "pendente" e data de conclusão anterior mantida (como na 1.0)', () => {
  const m = D.montar();
  const antes = linhaDe(m, 'Carla Modelo')[11];
  const r = salvar(m, D.uuid(3), 2, { concluirSolicitacao: false });
  assert.deepStrictEqual([r.situacao, r.concluido], ['pendente', false]);
  assert.strictEqual(linhaDe(m, 'Carla Modelo')[11], antes);
  assert(chamar(m, 'obterPendentes').some(p => p.nome === 'Carla Modelo'));
});

t('versão antiga, ausente ou inválida: recusa sem gravar nada', () => {
  const m = D.montar();
  const antes = retrato(m.atual);
  assert.throws(() => salvar(m, D.uuid(2), 1, { observacoes: 'x' }), codigo('CONFLITO_VERSAO'));
  assert.throws(() => salvar(m, D.uuid(2), undefined, { observacoes: 'x' }), codigo('ENTRADA'));
  assert.throws(() => salvar(m, D.uuid(2), '', {}), codigo('ENTRADA'));
  assert.throws(() => salvar(m, D.uuid(2), 2.5, {}), codigo('ENTRADA'));
  assert.throws(() => salvar(m, D.uuid(2), 3, null), codigo('ENTRADA'));
  assert.throws(() => salvar(m, D.uuid(2), 3, { observacoes: 42 }), codigo('ENTRADA'));
  assert.throws(() => salvar(m, D.uuid(2), 3, { observacoes: 'a'.repeat(2001) }), codigo('ENTRADA'));
  assert.throws(() => salvar(m, 'x', 3, {}), codigo('ENTRADA'));
  assert.strictEqual(retrato(m.atual), antes);
});

t('opções só valem com true de verdade (texto "true" não envia e-mail)', () => {
  const m = D.montar();
  const r = salvar(m, D.uuid(1), 1, { avisarAluno: 'true', concluirSolicitacao: 1 });
  assert.deepStrictEqual([r.email, r.concluido], ['NAO_SOLICITADO', false]);
  assert.strictEqual(m.amb.emails.length, 0);
});

t('observações: fórmula neutralizada, caracteres de controle removidos, 2000 aceitos', () => {
  const m = D.montar();
  salvar(m, D.uuid(1), 1, { observacoes: '=HYPERLINK("x")\u0007' });
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[9], '\'=HYPERLINK("x")');
  salvar(m, D.uuid(1), 2, { observacoes: 'b'.repeat(2000) });
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[9].length, 2000);
});

t('trava ocupada: TRAVA_OCUPADA sem gravar', () => {
  const m = D.montar({ ambiente: { travaOcupada: true } });
  const antes = retrato(m.atual);
  assert.throws(() => salvar(m, D.uuid(1), 1, { concluirSolicitacao: true }), codigo('TRAVA_OCUPADA'));
  assert.throws(() => chamar(m, 'atribuirIdentificador', ARGS.atribuirIdentificador[0]), codigo('TRAVA_OCUPADA'));
  assert.strictEqual(retrato(m.atual), antes);
});

t('já avisado: pede reenvio sem gravar nada (nem observações); reenviar envia de novo', () => {
  const m = D.montar();
  const antes = retrato(m.atual);
  const r = salvar(m, D.uuid(3), 2, { observacoes: 'novo texto', avisarAluno: true, concluirSolicitacao: true });
  assert.deepStrictEqual([r.resultado, r.motivo, r.versao], ['REENVIO_NECESSARIO', 'JA_AVISADO', 2]);
  assert(/01\/04\/2026 15:05/.test(r.mensagem));
  assert.strictEqual(retrato(m.atual), antes);
  const r2 = salvar(m, D.uuid(3), 2, { observacoes: 'novo texto', avisarAluno: true, concluirSolicitacao: true, reenviar: true });
  assert.strictEqual(r2.email, 'ENVIADO');
  assert.strictEqual(m.amb.emails.length, 1);
  assert.strictEqual(linhaDe(m, 'Carla Modelo')[9], 'novo texto');
});

t('reserva recente bloqueia; reserva antiga ou da 1.0 pede confirmação', () => {
  const linhas = D.linhasAtuais();
  linhas[1][14] = D.reserva(1, '0a1b2c3d');
  const m = D.montar({ atual: linhas });
  const antes = retrato(m.atual);
  assert.throws(() => salvar(m, D.uuid(1), 1, { avisarAluno: true }), codigo('ENVIO_EM_ANDAMENTO'));
  assert.strictEqual(retrato(m.atual), antes);
  // sem avisar, salvar continua possível e não mexe na reserva
  salvar(m, D.uuid(1), 1, { observacoes: 'só nota' });
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[14], linhas[1][14]);
  ['ENVIANDO…', D.reserva(15), D.reserva(15, '0a1b2c3d'), 'ENVIANDO… 2026-01-01 10:00:00 #marca-estranha'].forEach(valor => {
    const l2 = D.linhasAtuais(); l2[1][14] = valor;
    const m2 = D.montar({ atual: l2 });
    const r = salvar(m2, D.uuid(1), 1, { avisarAluno: true });
    assert.deepStrictEqual([r.resultado, r.motivo], ['REENVIO_NECESSARIO', 'ENVIO_INTERROMPIDO']);
    assert.strictEqual(m2.atual.escritas.length, 0);
    assert.strictEqual(salvar(m2, D.uuid(1), 1, { avisarAluno: true, reenviar: true }).email, 'ENVIADO');
    assert(ehData(linhaDe(m2, 'Bruna Exemplo')[14]));
  });
});

t('sem e-mail ou e-mail inválido: SEM_EMAIL sem gravar nem enviar', () => {
  const m = D.montar();
  const antes = retrato(m.atual);
  assert.throws(() => salvar(m, D.uuid(10), 1, { avisarAluno: true, observacoes: 'x' }), codigo('SEM_EMAIL'));
  const linhas = D.linhasAtuais(); linhas[1][4] = 'bruna arroba exemplo';
  const m2 = D.montar({ atual: linhas });
  assert.throws(() => salvar(m2, D.uuid(1), 1, { avisarAluno: true }), codigo('SEM_EMAIL'));
  assert.strictEqual(retrato(m.atual), antes);
  assert.strictEqual(m.amb.emails.length + m2.amb.emails.length, 0);
});

t('falha no envio: pedido salvo, reserva desfeita, e-mail não marcado como enviado', () => {
  const m = D.montar({ ambiente: { falhaEnvio: true } });
  const r = salvar(m, D.uuid(1), 1, { observacoes: 'ok', avisarAluno: true, concluirSolicitacao: true });
  assert.deepStrictEqual([r.resultado, r.email, r.versao, r.emailEnviado, r.concluido], ['SALVO', 'FALHOU', 2, '', true]);
  assert(/foi salvo/.test(r.mensagem));
  const l = linhaDe(m, 'Bruna Exemplo');
  assert.deepStrictEqual([l[9], l[10], l[13], l[14]], ['ok', 'Concluído', 2, '']);
  assert(!m.amb.logs.join('\n').includes('bruna@'), 'e-mail no registro');
  // nova tentativa com a versão devolvida funciona
  m.amb.falhaEnvio = false;
  assert.strictEqual(salvar(m, D.uuid(1), r.versao, { observacoes: 'ok', avisarAluno: true, concluirSolicitacao: true }).email, 'ENVIADO');
});

t('falha no reenvio: volta a data do aviso anterior', () => {
  const m = D.montar({ ambiente: { falhaEnvio: true } });
  const antes = linhaDe(m, 'Carla Modelo')[14];
  const r = salvar(m, D.uuid(3), 2, { avisarAluno: true, concluirSolicitacao: true, reenviar: true });
  assert.strictEqual(r.email, 'FALHOU');
  assert.strictEqual(r.emailEnviado, '01/04/2026 15:05');
  assert.strictEqual(linhaDe(m, 'Carla Modelo')[14], antes);
});

t('e-mail enviado mas confirmação falha: ENVIADO_SEM_REGISTRO, um único e-mail', () => {
  const m = D.montar();
  m.atual.falharEscrita = (linha, coluna, valor) => coluna === 15 && ehData(valor);
  const r = salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert.deepStrictEqual([r.resultado, r.email, r.versao], ['SALVO', 'ENVIADO_SEM_REGISTRO', 2]);
  assert(/Não reenvie/.test(r.mensagem));
  assert.strictEqual(m.amb.emails.length, 1);
  assert(/^ENVIANDO… /.test(linhaDe(m, 'Bruna Exemplo')[14]), 'a reserva fica: ninguém reenvia sem confirmação');
});

t('falha de gravação depois da versão: GRAVACAO_PARCIAL, nenhum e-mail', () => {
  const m = D.montar();
  m.atual.falharEscrita = (linha, coluna) => coluna === 10;
  assert.throws(() => salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true }), codigo('GRAVACAO_PARCIAL'));
  assert.strictEqual(m.amb.emails.length, 0);
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[13], 2, 'versão subiu: quem tinha aberto recebe conflito');
});

t('falha na primeira gravação: nada muda, nenhum e-mail', () => {
  const m = D.montar();
  m.atual.falharEscrita = () => true;
  const antes = retrato(m.atual);
  assert.throws(() => salvar(m, D.uuid(1), 1, { avisarAluno: true }), /Falha simulada/);
  assert.strictEqual(retrato(m.atual), antes);
  assert.strictEqual(m.amb.emails.length, 0);
});

t('outra sessão com a versão antiga durante o envio recebe conflito', () => {
  const m = D.montar();
  let erroDaOutra = null;
  m.amb.antesDoEnvio = () => {
    try { S.executar(m.amb, ARQ, 'salvarPedido', [D.uuid(1), 1, { concluirSolicitacao: false }]); } catch (e) { erroDaOutra = e; }
  };
  salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert(erroDaOutra && /^CONFLITO_VERSAO:/.test(erroDaOutra.message));
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[10], 'Concluído');
});

t('outra sessão tentando avisar durante o envio: ENVIO_EM_ANDAMENTO', () => {
  const m = D.montar();
  let erroDaOutra = null;
  m.amb.antesDoEnvio = () => {
    const v = linhaDe(m, 'Bruna Exemplo')[13];
    try { S.executar(m.amb, ARQ, 'salvarPedido', [D.uuid(1), v, { avisarAluno: true, reenviar: true }]); } catch (e) { erroDaOutra = e; }
  };
  salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert(erroDaOutra && /^ENVIO_EM_ANDAMENTO:/.test(erroDaOutra.message));
  assert.strictEqual(m.amb.emails.length, 1);
});

t('planilha reordenada durante o envio: confirmação vai para a linha certa', () => {
  const m = D.montar();
  m.amb.antesDoEnvio = () => { const l = m.atual.valores.splice(1, 1)[0]; m.atual.valores.push(l); };
  salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert(ehData(linhaDe(m, 'Bruna Exemplo')[14]));
  assert.strictEqual(linhaDe(m, 'Álvaro Fictício')[14], '');
});

t('pedido sem coluna E-mail Enviado nem Data de Conclusão: criadas depois de K', () => {
  const linhas = D.linhasAtuais().map(l => l.slice(0, 9));
  linhas.forEach((l, i) => { l.push(i ? '' : 'Observações', i ? '' : 'Situação'); });
  linhas[0].push('Registro ID', 'Versão'); linhas.slice(1).forEach((l, i) => l.push(D.linhasAtuais()[i + 1][12], 1));
  const m = D.montar({ atual: linhas });
  salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert.deepStrictEqual(m.atual.valores[0].slice(9), ['Observações', 'Situação', 'Registro ID', 'Versão', 'E-mail Enviado', 'Data de Conclusão']);
});

/*==================== PREPARAR PEDIDO SEM ID ====================*/

t('atribuirIdentificador: grava só ID e versão 1 da linha conferida', () => {
  const m = D.montar();
  const elisa = chamar(m, 'obterPendentes').find(p => p.nome === 'Elisa Sem Identificador');
  const antes = JSON.parse(retrato(m.atual));
  const r = chamar(m, 'atribuirIdentificador', elisa.referencia);
  assert(/^[0-9a-f-]{36}$/.test(r.registroId));
  assert.strictEqual(r.versao, 1);
  assert.deepStrictEqual(m.atual.escritas.map(e => [e.linha, e.coluna]), [[6, 13], [6, 14]]);
  const depois = JSON.parse(retrato(m.atual));
  depois[5][12] = antes[5][12]; depois[5][13] = antes[5][13];
  assert.deepStrictEqual(depois, antes);
  assert.strictEqual(chamar(m, 'obterDetalhe', r.registroId).nome, 'Elisa Sem Identificador');
});

t('atribuirIdentificador: referência desatualizada, linha com ID ou sem colunas', () => {
  const m = D.montar();
  const ref = { linha: 6, carimbo: D.brt(2026, 5, 5).getTime(), nUsp: '9000005' };
  assert.throws(() => chamar(m, 'atribuirIdentificador', Object.assign({}, ref, { nUsp: '1' })), codigo('REFERENCIA_DESATUALIZADA'));
  assert.throws(() => chamar(m, 'atribuirIdentificador', Object.assign({}, ref, { linha: 7 })), codigo('REFERENCIA_DESATUALIZADA'));
  assert.throws(() => chamar(m, 'atribuirIdentificador', { linha: 2, carimbo: D.brt(2026, 3, 2, 10).getTime(), nUsp: '9000001' }), codigo('REFERENCIA_DESATUALIZADA'));
  assert.throws(() => chamar(m, 'atribuirIdentificador', { linha: 'x' }), codigo('ENTRADA'));
  assert.throws(() => chamar(m, 'atribuirIdentificador', null), codigo('ENTRADA'));
  assert.strictEqual(m.atual.escritas.length, 0);
  const semColunas = D.linhasAtuais().map(l => l.slice(0, 12));
  assert.throws(() => chamar(D.montar({ atual: semColunas }), 'atribuirIdentificador', ref), codigo('MIGRACAO_NECESSARIA'));
});

/*==================== MIGRAÇÃO CONTROLADA ====================*/

t('diagnóstico da migração: só leitura, contagens e código de confirmação', () => {
  const m = D.montar();
  const antes = retrato(m.atual);
  const r = chamar(m, 'diagnosticarMigracaoRegistroId');
  assert.strictEqual(retrato(m.atual), antes);
  assert.deepStrictEqual([r.precisaMigrar, r.semIdentificador, r.identificadoresRepetidos, r.versaoAusente, r.versaoMalformada,
    r.identificadoresForaDoFormato, r.linhasQueSeraoAlteradas], [true, 1, 1, 1, 0, 1, 2]);
  assert.deepStrictEqual(r.linhas.semIdentificador, [6]);
  assert.deepStrictEqual(r.linhas.identificadoresRepetidos, [9]);
  assert(/^MIGRAR-1-1-1-0-[0-9a-f]{16}$/.test(r.codigoConfirmacao), r.codigoConfirmacao);
  assert.strictEqual(chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao, r.codigoConfirmacao, 'determinístico');
  assert.strictEqual(chamar(D.montar(), 'diagnosticarMigracaoRegistroId').codigoConfirmacao, r.codigoConfirmacao, 'mesma planilha, mesmo código');
  assert(!m.amb.logs.join('\n').includes('Elisa'), 'nome no registro');
});

t('migração: sem confirmação ou com código errado não grava', () => {
  const m = D.montar();
  const antes = retrato(m.atual);
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'));
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = 'MIGRAR-0-0-0-0-12';
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'));
  // mesmas contagens, outra impressão digital (o formato antigo, só com quantidades, também não vale)
  ['MIGRAR-1-1-1-0-0000000000000000', 'MIGRAR-1-1-1-0-12'].forEach(c => {
    m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = c;
    assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'));
  });
  assert.strictEqual(retrato(m.atual), antes);
});

t('migração: planilha mudou depois do diagnóstico → código não confere, nada gravado', () => {
  const m = D.montar();
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  m.atual.valores.push(D.linha({ nome: 'Nova Resposta', nUsp: 9000030, email: 'nova@exemplo.invalid', id: '', versao: '' }));
  const antes = retrato(m.atual);
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'));
  assert.strictEqual(retrato(m.atual), antes);
});

t('migração: grava só Registro ID e Versão, mantém o primeiro repetido, é idempotente', () => {
  const m = D.montar();
  const antes = JSON.parse(retrato(m.atual));
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  const r = chamar(m, 'executarMigracaoRegistroId');
  assert.strictEqual(r.executada, true);
  assert.strictEqual(m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO, undefined);
  const depois = JSON.parse(retrato(m.atual));
  depois.forEach((l, i) => l.forEach((v, j) => { if (j !== 12 && j !== 13) assert.deepStrictEqual(v, antes[i][j], `célula ${i + 1},${j + 1} mudou`); }));
  assert.strictEqual(linhaDe(m, 'Fábio Repetido')[12], D.uuid(6), 'primeira ocorrência mantida');
  assert(/^[0-9a-f-]{36}$/.test(linhaDe(m, 'Gabriela Repetida')[12]) && linhaDe(m, 'Gabriela Repetida')[12] !== D.uuid(6));
  assert(/^[0-9a-f-]{36}$/.test(linhaDe(m, 'Elisa Sem Identificador')[12]));
  assert.strictEqual(linhaDe(m, 'Elisa Sem Identificador')[13], 1);
  assert.strictEqual(linhaDe(m, 'Hugo Inválido')[12], 'abc', 'ID fora do formato só é informado');
  assert.strictEqual(m.atual.valores[6][12], '', 'linha sem nome não recebe ID');
  assert.strictEqual(linhaDe(m, 'Daniel Teste')[12], antes[4][12], 'ID único mantido');
  assert.strictEqual(linhaDe(m, 'Álvaro Fictício')[13], 3, 'versão válida mantida');
  const segunda = chamar(m, 'executarMigracaoRegistroId');
  assert.deepStrictEqual([segunda.executada, segunda.motivo], [false, 'NADA_A_FAZER']);
  assert.strictEqual(chamar(m, 'obterPendentes').filter(p => p.inconsistencia).length, 1, 'só o ID fora do formato');
});

t('migração cria as colunas que faltam depois de K, mesmo com J e K vazias', () => {
  const linhas = D.linhasAtuais().map(l => l.slice(0, 9));
  const m = D.montar({ atual: linhas });
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  chamar(m, 'executarMigracaoRegistroId');
  assert.strictEqual(m.atual.valores[0][11], 'Registro ID');
  assert.strictEqual(m.atual.valores[0][12], 'Versão');
  assert.strictEqual(m.atual.valores[0][9] || '', '');
  assert.strictEqual(chamar(m, 'obterPendentes').filter(p => !p.inconsistencia).length, 10);
});

/*==================== MIGRAÇÃO: O CÓDIGO IDENTIFICA O PLANO ====================*/

// Diagnostica, aplica uma mudança que mantém as contagens e confere que
// a execução recusa sem gravar; depois, um novo diagnóstico executa.
function mudancaComMesmasContagens(mudar, rotulo) {
  const m = D.montar();
  const antesDiag = chamar(m, 'diagnosticarMigracaoRegistroId');
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = antesDiag.codigoConfirmacao;
  mudar(m.atual.valores);
  const depoisDiag = chamar(m, 'diagnosticarMigracaoRegistroId');
  const contagens = r => [r.semIdentificador, r.identificadoresRepetidos, r.versaoAusente, r.versaoMalformada, r.identificadoresForaDoFormato,
    r.linhasQueSeraoAlteradas, r.colunasFaltando.length, r.linhasComNome];
  assert.deepStrictEqual(contagens(depoisDiag), contagens(antesDiag), rotulo + ': as contagens deviam ser iguais');
  assert.strictEqual(depoisDiag.codigoConfirmacao.split('-').slice(0, 5).join('-'), antesDiag.codigoConfirmacao.split('-').slice(0, 5).join('-'));
  assert.notStrictEqual(depoisDiag.codigoConfirmacao, antesDiag.codigoConfirmacao, rotulo + ': o código devia mudar');
  const antes = retrato(m.atual);
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'), rotulo);
  assert.strictEqual(retrato(m.atual), antes, rotulo + ': gravou algo');
  assert.strictEqual(m.atual.escritas.length, 0, rotulo);
  assert(!m.amb.logs.join('\n').includes('Gabriela') && !m.amb.logs.join('\n').includes('9000007'), rotulo + ': dado pessoal no registro');
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = depoisDiag.codigoConfirmacao;
  assert.strictEqual(chamar(m, 'executarMigracaoRegistroId').executada, true, rotulo + ': novo diagnóstico devia executar');
  return m;
}

t('migração: linhas trocadas de lugar com as mesmas contagens → recusa sem gravar', () => {
  // os dois repetidos trocam de posição: quem mantém o ID passaria a ser outra pessoa
  const m = mudancaComMesmasContagens(v => { const x = v[7]; v[7] = v[8]; v[8] = x; }, 'repetidos trocados');
  assert.strictEqual(linhaDe(m, 'Gabriela Repetida')[12], D.uuid(6), 'depois do novo diagnóstico, a primeira ocorrência (agora Gabriela) fica');
  // linha sem ID troca de lugar com uma linha com ID
  mudancaComMesmasContagens(v => { const x = v[4]; v[4] = v[5]; v[5] = x; }, 'sem ID trocado com outra linha');
});

t('migração: registros alterados com as mesmas contagens → recusa sem gravar', () => {
  mudancaComMesmasContagens(v => { v[8][2] = 9000099; }, 'Nº USP da linha que recebe ID novo');
  mudancaComMesmasContagens(v => { v[7][12] = D.uuid(77); v[8][12] = D.uuid(77); }, 'ID do grupo repetido trocado');
  mudancaComMesmasContagens(v => { v[9][12] = 'abd'; }, 'ID fora do formato editado');
  mudancaComMesmasContagens(v => { v[2][13] = 4; }, 'Versão válida editada');
  mudancaComMesmasContagens(v => { v[1][13] = '1'; }, 'Versão de número para texto');
  mudancaComMesmasContagens(v => { v[5][0] = D.brt(2026, 5, 6); }, 'carimbo da linha sem ID');
});

t('migração: linha substituída por outro pedido com as mesmas contagens → recusa sem gravar', () => {
  mudancaComMesmasContagens(v => {
    v[5] = D.linha({ nome: 'Outra Pessoa Sem ID', nUsp: 9000055, email: 'outra@exemplo.invalid', id: '', versao: '', carimbo: D.brt(2026, 5, 9) });
  }, 'linha sem ID substituída');
  mudancaComMesmasContagens(v => {
    v[1] = D.linha({ nome: 'Pessoa No Lugar Da Bruna', nUsp: 9000056, email: 'pessoa@exemplo.invalid', id: D.uuid(1), carimbo: D.brt(2026, 3, 2, 10) });
  }, 'linha com ID substituída mantendo o ID');
});

t('migração: mudança fora das colunas de identificação não invalida o código', () => {
  const m = D.montar();
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  m.atual.valores[1][9] = 'observação nova'; m.atual.valores[2][10] = 'Concluído';
  assert.strictEqual(chamar(m, 'executarMigracaoRegistroId').executada, true);
});

t('migração: trava ocupada recusa sem gravar e mantém a confirmação', () => {
  const m = D.montar();
  const c = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = c;
  m.amb.travaOcupada = true;
  const antes = retrato(m.atual);
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('TRAVA_OCUPADA'));
  assert.strictEqual(retrato(m.atual), antes);
  assert.strictEqual(m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO, c);
});

/*==================== MIGRAÇÃO: SÓ AS CÉLULAS DO PLANO ====================*/

const migrar = m => {
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  return chamar(m, 'executarMigracaoRegistroId');
};
const posicoes = m => m.atual.escritas.map(e => [e.linha, e.coluna]);

t('migração: grava só as células do plano; fórmulas e valores das outras linhas intactos', () => {
  const m = D.montar();
  // fórmulas em células que o plano NÃO toca, nas duas colunas da migração e fora delas
  Object.assign(m.atual.formulas, { '2,13': '=TEXTO_DO_ID()', '3,14': '=2+1', '4,14': '=1+1', '8,13': '=ID_FIXO()', '2,11': '=SITUACAO()', '7,13': '=""' });
  const formulasAntes = JSON.stringify(m.atual.formulas);
  const antes = JSON.parse(retrato(m.atual));
  const r = migrar(m);
  assert.strictEqual(r.executada, true);
  // Elisa (6): ID e Versão; Gabriela (9, repetida): só ID
  assert.deepStrictEqual(posicoes(m).sort(), [[6, 13], [6, 14], [9, 13]]);
  assert.strictEqual(JSON.stringify(m.atual.formulas), formulasAntes, 'fórmulas fora do plano foram trocadas por valores');
  const depois = JSON.parse(retrato(m.atual));
  depois.forEach((l, i) => l.forEach((v, j) => {
    if (!((i === 5 && (j === 12 || j === 13)) || (i === 8 && j === 12))) assert.deepStrictEqual(v, antes[i][j], `célula ${i + 1},${j + 1} mudou`);
  }));
  assert.strictEqual(typeof depois[2][13], 'number', 'tipo da versão intacta mantido');
  assert.deepStrictEqual([m.atual.contadores.setValues, m.atual.contadores.setValue], [3, 0]);
  assert.deepStrictEqual(r.resumo.gravacao, { titulos: 0, blocos: 3, celulas: 3 });
});

t('migração: fórmula numa célula do plano é a única substituída', () => {
  const m = D.montar();
  m.atual.formulas['6,14'] = '=""';   // Versão vazia calculada por fórmula: o plano põe 1
  m.atual.formulas['5,14'] = '=1';
  migrar(m);
  assert.deepStrictEqual(m.atual.formulas, { '5,14': '=1' });
  assert.strictEqual(m.atual.valores[5][13], 1);
});

t('migração: linhas seguidas viram um bloco por coluna', () => {
  const linhas = D.linhasAtuais();
  [3, 4, 5].forEach(i => { linhas[i][12] = ''; linhas[i][13] = ''; });  // Carla, Daniel, Elisa
  const m = D.montar({ atual: linhas });
  const r = migrar(m);
  // ID: 4–6 (um bloco) e 9; Versão: 4–6 (um bloco)
  assert.deepStrictEqual(r.resumo.gravacao, { titulos: 0, blocos: 3, celulas: 7 });
  assert.strictEqual(m.atual.contadores.setValues, 3);
  assert.strictEqual(new Set([3, 4, 5, 8].map(i => m.atual.valores[i][12])).size, 4, 'IDs novos únicos');
});

t('migração: colunas ausentes — títulos criados e só as linhas com Nome preenchidas', () => {
  const linhas = D.linhasAtuais().map(l => l.slice(0, 12));
  const m = D.montar({ atual: linhas });
  m.atual.formulas['7,1'] = '=""';
  const r = migrar(m);
  assert.deepStrictEqual([m.atual.valores[0][12], m.atual.valores[0][13]], ['Registro ID', 'Versão']);
  assert.deepStrictEqual(r.resumo.gravacao, { titulos: 2, blocos: 4, celulas: 20 });
  assert(!posicoes(m).some(([l]) => l === 7), 'linha sem Nome não recebe nada');
  assert.deepStrictEqual(m.atual.formulas, { '7,1': '=""' });
  assert.strictEqual(chamar(m, 'obterPendentes').filter(p => !p.inconsistencia).length, 7);
  assert.strictEqual(migrar(m).motivo, 'NADA_A_FAZER');
});

t('migração: só a coluna Versão faltando — título e versões, IDs intactos', () => {
  const linhas = D.linhasAtuais().map(l => l.slice(0, 13));
  linhas[5][12] = D.uuid(5); linhas[8][12] = D.uuid(7);
  const m = D.montar({ atual: linhas });
  const r = migrar(m);
  assert.strictEqual(m.atual.valores[0][13], 'Versão');
  assert(posicoes(m).every(([l, c]) => (l === 1 && c === 14) || c === 14), 'só a coluna Versão');
  assert.deepStrictEqual(r.resumo.gravacao, { titulos: 1, blocos: 2, celulas: 10 });
});

t('migração: só títulos a criar (nenhum pedido) — grava só a linha 1', () => {
  [[D.TITULOS_ATUAL.slice(0, 12)], [D.TITULOS_ATUAL.slice(0, 12), D.linha({ nome: '', nUsp: '', email: '', carimbo: '' }).slice(0, 12)]].forEach(linhas => {
    const m = D.montar({ atual: linhas });
    const d = chamar(m, 'diagnosticarMigracaoRegistroId');
    assert.deepStrictEqual([d.precisaMigrar, d.linhasQueSeraoAlteradas, d.colunasFaltando.length], [true, 0, 2]);
    const r = migrar(m);
    assert.deepStrictEqual(r.resumo.gravacao, { titulos: 2, blocos: 0, celulas: 0 });
    assert(posicoes(m).every(([l]) => l === 1));
    assert.strictEqual(migrar(m).motivo, 'NADA_A_FAZER');
  });
});

t('migração: falha no meio da gravação → GRAVACAO_PARCIAL, nunca sucesso; nova rodada completa', () => {
  const m = D.montar();
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  m.atual.falharEscrita = (linha, coluna) => coluna === 14;   // IDs gravam, a Versão falha
  let erro = null;
  try { chamar(m, 'executarMigracaoRegistroId'); } catch (e) { erro = e; }
  assert(erro && /^GRAVACAO_PARCIAL:/.test(erro.message), String(erro && erro.message));
  assert(m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO, 'confirmação não é apagada como se tivesse terminado');
  assert(m.amb.logs.some(l => /^error: Migração interrompida depois de 0 título\(s\), 2 bloco\(s\) e 2 célula\(s\)/.test(l)));
  // a confirmação antiga não vale mais; o diagnóstico mostra só o que falta
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'));
  m.atual.falharEscrita = null;
  const resto = chamar(m, 'diagnosticarMigracaoRegistroId');
  assert.deepStrictEqual([resto.semIdentificador, resto.identificadoresRepetidos, resto.versaoAusente], [0, 0, 1]);
  const idElisa = linhaDe(m, 'Elisa Sem Identificador')[12];
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = resto.codigoConfirmacao;
  assert.strictEqual(chamar(m, 'executarMigracaoRegistroId').executada, true);
  assert.strictEqual(linhaDe(m, 'Elisa Sem Identificador')[12], idElisa, 'ID já gravado não é trocado');
  assert.strictEqual(linhaDe(m, 'Elisa Sem Identificador')[13], 1);
});

t('migração: falha ao criar o título → GRAVACAO_PARCIAL, nenhuma célula de dados gravada', () => {
  const m = D.montar({ atual: D.linhasAtuais().map(l => l.slice(0, 12)) });
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  m.atual.falharEscrita = linha => linha === 1;
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('GRAVACAO_PARCIAL'));
  assert.strictEqual(m.atual.escritas.length, 0);
});

/*==================== VERSÃO: CONTRATO ÚNICO ====================*/

t('versaoValida_ e estadoDaVersao_: um só critério para todos os valores', () => {
  const m = D.montar();
  const casos = [
    [1, 1, 'VALIDA'], [3, 3, 'VALIDA'], ['3', 3, 'VALIDA'], [' 4 ', 4, 'VALIDA'], ['007', 7, 'VALIDA'],
    ['', null, 'AUSENTE'], ['   ', null, 'AUSENTE'], [null, null, 'AUSENTE'],
    [0, null, 'MALFORMADA'], ['0', null, 'MALFORMADA'], [-2, null, 'MALFORMADA'], ['-2', null, 'MALFORMADA'],
    [1.5, null, 'MALFORMADA'], ['1.5', null, 'MALFORMADA'], ['1.0', null, 'MALFORMADA'], ['1e3', null, 'MALFORMADA'],
    [Infinity, null, 'MALFORMADA'], [NaN, null, 'MALFORMADA'], [2 ** 53, null, 'MALFORMADA'], ['abc', null, 'MALFORMADA'],
    ['#NUM!', null, 'MALFORMADA'], [true, null, 'MALFORMADA'], [D.brt(2026, 1, 1), null, 'MALFORMADA']
  ];
  casos.forEach(([valor, valida, estado]) => {
    assert.strictEqual(S.executar(m.amb, ARQ, 'versaoValida_', [valor]), valida, 'versaoValida_(' + String(valor) + ')');
    assert.strictEqual(S.executar(m.amb, ARQ, 'estadoDaVersao_', [valor]), estado, 'estadoDaVersao_(' + String(valor) + ')');
  });
});

// Bruna (pendente) e Carla (concluída) com Versão malformada.
function comVersoesMalformadas(vBruna, vCarla) {
  const linhas = D.linhasAtuais();
  linhas[1][13] = vBruna; linhas[3][13] = vCarla;
  return D.montar({ atual: linhas });
}

t('leitura: versão malformada aparece marcada e não abre (pendentes, concluídos, busca, detalhe)', () => {
  [[0, 'abc'], [-2, 1.5], ['1.0', Infinity]].forEach(([vb, vc]) => {
    const m = comVersoesMalformadas(vb, vc);
    const bruna = chamar(m, 'obterPendentes').find(p => p.nome === 'Bruna Exemplo');
    assert.deepStrictEqual([bruna.inconsistencia, bruna.registroId], ['VERSAO_INVALIDA', ''], String(vb));
    const carla = chamar(m, 'obterConcluidosRecentes').find(p => p.nome === 'Carla Modelo');
    assert.deepStrictEqual([carla.inconsistencia, carla.registroId], ['VERSAO_INVALIDA', ''], String(vc));
    assert.strictEqual(chamar(m, 'buscarHistorico', 'bruna').find(r => r.origem === 'Atual').registroId, '');
    assert.throws(() => chamar(m, 'obterDetalhe', D.uuid(1)), codigo('VERSAO_INVALIDA'));
    assert.throws(() => chamar(m, 'obterDetalhe', D.uuid(3)), codigo('VERSAO_INVALIDA'));
    assert.strictEqual(m.atual.escritas.length, 0, 'consultar não corrige a versão');
  });
  // vazia com ID bom também não abre
  const m = comVersoesMalformadas('', 2);
  assert.strictEqual(chamar(m, 'obterPendentes').find(p => p.nome === 'Bruna Exemplo').inconsistencia, 'VERSAO_INVALIDA');
  assert.throws(() => chamar(m, 'obterDetalhe', D.uuid(1)), codigo('VERSAO_INVALIDA'));
});

t('salvamento: versão malformada ou vazia na planilha recusa sem gravar nem enviar', () => {
  [0, -2, 1.5, 'abc', '', Infinity].forEach(v => {
    const m = comVersoesMalformadas(v, 2);
    const antes = retrato(m.atual);
    [1, 0, -2].forEach(enviada => assert.throws(() => salvar(m, D.uuid(1), enviada, { avisarAluno: true, concluirSolicitacao: true, observacoes: 'x' }),
      e => /^(VERSAO_INVALIDA|ENTRADA):/.test(e.message), String(v)));
    assert.strictEqual(retrato(m.atual), antes, String(v));
    assert.strictEqual(m.amb.emails.length, 0);
  });
});

t('migração: só versão vazia recebe 1; malformada é informada e preservada', () => {
  const m = comVersoesMalformadas(0, 'abc');
  m.atual.valores[2][13] = 1.5; m.atual.valores[4][13] = -2;
  const r = chamar(m, 'diagnosticarMigracaoRegistroId');
  assert.deepStrictEqual([r.versaoAusente, r.versaoMalformada], [1, 4]);
  assert.deepStrictEqual(r.linhas.versaoMalformada, [2, 3, 4, 5]);
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = r.codigoConfirmacao;
  chamar(m, 'executarMigracaoRegistroId');
  assert.deepStrictEqual([2, 3, 4, 5].map(i => m.atual.valores[i - 1][13]), [0, 1.5, 'abc', -2], 'malformadas não foram corrigidas sozinhas');
  assert.strictEqual(linhaDe(m, 'Elisa Sem Identificador')[13], 1);
  // só malformadas e ID fora do formato restando: nada a migrar
  const de_novo = chamar(m, 'diagnosticarMigracaoRegistroId');
  assert.deepStrictEqual([de_novo.precisaMigrar, de_novo.versaoMalformada, de_novo.identificadoresForaDoFormato], [false, 4, 1]);
  assert(m.amb.logs.some(l => /recuperação um a um/.test(l)));
});

t('atribuirIdentificador: versão válida mantida, vazia vira 1, malformada recusa sem gravar', () => {
  const ref = { linha: 6, carimbo: D.brt(2026, 5, 5).getTime(), nUsp: '9000005' };
  const comVersao = v => { const l = D.linhasAtuais(); l[5][13] = v; return D.montar({ atual: l }); };
  const m1 = comVersao(4);
  const r1 = chamar(m1, 'atribuirIdentificador', ref);
  assert.strictEqual(r1.versao, 4);
  assert.deepStrictEqual(m1.atual.escritas.map(e => [e.linha, e.coluna]), [[6, 13]]);
  assert.strictEqual(chamar(m1, 'obterDetalhe', r1.registroId).versao, 4);
  const m2 = comVersao('  ');
  assert.strictEqual(chamar(m2, 'atribuirIdentificador', ref).versao, 1);
  [0, 'abc', 2.5].forEach(v => {
    const m3 = comVersao(v);
    assert.throws(() => chamar(m3, 'atribuirIdentificador', ref), codigo('VERSAO_INVALIDA'), String(v));
    assert.strictEqual(m3.atual.escritas.length, 0);
  });
});

/*==================== E-MAIL: CONFIRMAÇÃO SÓ SOBRE A PRÓPRIA RESERVA ====================*/

const FORMATO_RESERVA = /^ENVIANDO… \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} #[0-9a-f]{8}$/;

t('reserva tem marca própria da operação; duas reservas nunca são iguais', () => {
  const vistas = [];
  for (let i = 0; i < 3; i++) {
    const m = D.montar();
    m.amb.antesDoEnvio = () => vistas.push(linhaDe(m, 'Bruna Exemplo')[14]);
    assert.strictEqual(salvar(m, D.uuid(1), 1, { avisarAluno: true }).email, 'ENVIADO');
  }
  vistas.forEach(v => assert(FORMATO_RESERVA.test(v), v));
  assert.strictEqual(new Set(vistas).size, 3);
});

function envioComCelulaAlterada(novoValor, rotulo) {
  const m = D.montar();
  let reservaVista = null;
  m.amb.antesDoEnvio = () => { reservaVista = linhaDe(m, 'Bruna Exemplo')[14]; linhaDe(m, 'Bruna Exemplo')[14] = novoValor; };
  const r = salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  assert(FORMATO_RESERVA.test(reservaVista), rotulo);
  assert.deepStrictEqual([r.resultado, r.email, r.motivo, r.versao], ['SALVO', 'ENVIADO_SEM_REGISTRO', 'RESERVA_ALTERADA', 2], rotulo);
  assert(/foi enviado/.test(r.mensagem) && /Não reenvie/.test(r.mensagem), rotulo);
  assert.strictEqual(m.amb.emails.length, 1, rotulo + ': um único e-mail');
  assert.deepStrictEqual(linhaDe(m, 'Bruna Exemplo')[14], novoValor, rotulo + ': a célula alterada não pode ser sobrescrita');
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[13], 2, rotulo + ': versão não sobe na confirmação recusada');
  assert(m.amb.logs.some(l => /^warn: E-mail enviado, mas a reserva desta operação não estava mais/.test(l)), rotulo);
  assert(!m.amb.logs.join('\n').includes('Bruna') && !m.amb.logs.join('\n').includes('bruna@'), rotulo);
  return m;
}

t('reserva alterada durante o envio (edição manual): e-mail dado como enviado, nada sobrescrito', () => {
  envioComCelulaAlterada('', 'célula apagada');
  envioComCelulaAlterada('conferido por telefone', 'texto digitado');
  envioComCelulaAlterada(D.brt(2026, 6, 1, 8), 'data digitada');
  envioComCelulaAlterada('ENVIANDO…', 'reserva da 1.0');
});

t('reserva de outra operação durante o envio: não confirma sobre ela', () => {
  const m = envioComCelulaAlterada(D.reserva(0, 'ffffffff'), 'outra reserva com marca');
  // a outra operação continua dona da reserva: a página dela pode confirmar
  assert.strictEqual(chamar(m, 'obterDetalhe', D.uuid(1)).envioReservado, true);
  envioComCelulaAlterada(D.reserva(0), 'outra reserva sem marca, mesmo segundo');
});

t('versão invalidada durante o envio: confirmação não grava', () => {
  const m = D.montar();
  m.amb.antesDoEnvio = () => { linhaDe(m, 'Bruna Exemplo')[13] = 'x'; };
  const r = salvar(m, D.uuid(1), 1, { avisarAluno: true });
  assert.deepStrictEqual([r.email, r.motivo], ['ENVIADO_SEM_REGISTRO', 'RESERVA_ALTERADA']);
  assert(FORMATO_RESERVA.test(linhaDe(m, 'Bruna Exemplo')[14]), 'a reserva fica (vira envio interrompido depois de 10 min)');
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[13], 'x');
  assert.strictEqual(m.amb.emails.length, 1);
  assert.strictEqual(m.amb.emails[0].travado, false, 'envio fora da trava');
});

t('confirmação normal: grava a data sobre a própria reserva, fora da trava no envio', () => {
  const m = D.montar();
  const r = salvar(m, D.uuid(1), 1, { avisarAluno: true });
  assert.deepStrictEqual([r.email, r.motivo, r.versao], ['ENVIADO', undefined, 3]);
  assert(ehData(linhaDe(m, 'Bruna Exemplo')[14]));
  assert.strictEqual(m.amb.emails[0].travado, false);
});

/*==================== RECUPERAÇÃO ADMINISTRATIVA DE UM PEDIDO ====================*/

const recuperar = (m, linha) => {
  m.amb.propriedades.RECUPERACAO_REGISTRO = String(linha);
  const d = chamar(m, 'diagnosticarRecuperacaoRegistro');
  return d;
};

t('recuperação: diagnóstico só lê, mostra problemas, ações e código', () => {
  const m = D.montar();
  const antes = retrato(m.atual);
  const d = recuperar(m, 10);
  assert.deepStrictEqual([d.linha, d.problemas, d.acoes, d.linhasComOMesmoIdentificador], [10, ['IDENTIFICADOR_FORA_DO_FORMATO'], ['NOVO_ID'], []]);
  assert(/^RECUPERAR-10-[0-9a-f]{16}$/.test(d.codigoConfirmacao));
  assert.strictEqual(recuperar(m, d.codigoConfirmacao).codigoConfirmacao, d.codigoConfirmacao, 'aceita o próprio código e é determinístico');
  const g = recuperar(m, 9);
  assert.deepStrictEqual([g.problemas, g.acoes, g.linhasComOMesmoIdentificador], [['IDENTIFICADOR_REPETIDO'], ['NOVO_ID'], [8]]);
  assert.deepStrictEqual(recuperar(m, 8).linhasComOMesmoIdentificador, [9]);
  const ok = recuperar(m, 2);
  assert.deepStrictEqual([ok.problemas, ok.acoes, ok.codigoConfirmacao], [[], [], '']);
  assert.strictEqual(retrato(m.atual), antes);
  assert.strictEqual(m.atual.escritas.length, 0);
  const logs = m.amb.logs.join('\n');
  ['Hugo', 'Gabriela', 'Fábio', '9000008', '"abc"', D.uuid(6)].forEach(x => assert(!logs.includes(x), 'registro contém ' + x));
});

t('recuperação: entradas inválidas recusam sem gravar', () => {
  const m = D.montar();
  delete m.amb.propriedades.RECUPERACAO_REGISTRO;
  assert.throws(() => chamar(m, 'diagnosticarRecuperacaoRegistro'), codigo('ENTRADA'));
  ['x', '1', '7', '13', '2-3', '-4'].forEach(v => {
    m.amb.propriedades.RECUPERACAO_REGISTRO = v;
    assert.throws(() => chamar(m, 'diagnosticarRecuperacaoRegistro'), codigo('ENTRADA'), v);
  });
  ['', '10', 'RECUPERAR-10', 'MIGRAR-1-1-1-0-0000000000000000'].forEach(v => {
    m.amb.propriedades.RECUPERACAO_REGISTRO = v;
    assert.throws(() => chamar(m, 'executarRecuperacaoRegistro'), codigo('CONFIRMACAO_RECUPERACAO'), v);
  });
  const semColunas = D.montar({ atual: D.linhasAtuais().map(l => l.slice(0, 12)) });
  semColunas.amb.propriedades.RECUPERACAO_REGISTRO = '6';
  assert.throws(() => chamar(semColunas, 'diagnosticarRecuperacaoRegistro'), codigo('MIGRACAO_NECESSARIA'));
  assert.strictEqual(m.atual.escritas.length + semColunas.atual.escritas.length, 0);
});

t('recuperação: ID fora do formato recebe UUID novo, só aquela célula; é idempotente', () => {
  const m = D.montar();
  const antes = JSON.parse(retrato(m.atual));
  m.amb.propriedades.RECUPERACAO_REGISTRO = recuperar(m, 10).codigoConfirmacao;
  const r = chamar(m, 'executarRecuperacaoRegistro');
  assert.strictEqual(r.executada, true);
  assert(/^[0-9a-f-]{36}$/.test(r.novoRegistroId));
  assert.deepStrictEqual(m.atual.escritas.map(e => [e.linha, e.coluna]), [[10, 13]]);
  const depois = JSON.parse(retrato(m.atual));
  depois[9][12] = antes[9][12];
  assert.deepStrictEqual(depois, antes, 'só a célula do ID mudou');
  assert.strictEqual(m.amb.propriedades.RECUPERACAO_REGISTRO, undefined);
  assert.strictEqual(chamar(m, 'obterDetalhe', r.novoRegistroId).nome, 'Hugo Inválido');
  assert.throws(() => chamar(m, 'executarRecuperacaoRegistro'), codigo('CONFIRMACAO_RECUPERACAO'), 'sem propriedade, nada a executar');
  assert.deepStrictEqual(recuperar(m, 10).acoes, [], 'nada mais a fazer');
});

t('recuperação: ID repetido — só a linha escolhida recebe ID novo; a outra mantém o ID', () => {
  [[9, 'Gabriela Repetida', 'Fábio Repetido'], [8, 'Fábio Repetido', 'Gabriela Repetida']].forEach(([linha, escolhida, outra]) => {
    const m = D.montar();
    const outraAntes = JSON.stringify(linhaDe(m, outra));
    m.amb.propriedades.RECUPERACAO_REGISTRO = recuperar(m, linha).codigoConfirmacao;
    const r = chamar(m, 'executarRecuperacaoRegistro');
    assert.strictEqual(linhaDe(m, escolhida)[12], r.novoRegistroId);
    assert.notStrictEqual(r.novoRegistroId, D.uuid(6));
    assert.strictEqual(JSON.stringify(linhaDe(m, outra)), outraAntes, 'a outra linha não muda');
    assert.strictEqual(chamar(m, 'obterDetalhe', D.uuid(6)).nome, outra);
    assert.strictEqual(chamar(m, 'obterDetalhe', r.novoRegistroId).nome, escolhida);
  });
});

t('recuperação: versão malformada vira 1, ID mantido; vazia também', () => {
  [0, 'abc', -2, 1.5].forEach(v => {
    const m = comVersoesMalformadas(v, 2);
    const d = recuperar(m, 2);
    assert.deepStrictEqual([d.problemas, d.acoes], [['VERSAO_MALFORMADA'], ['VERSAO_1']], String(v));
    m.amb.propriedades.RECUPERACAO_REGISTRO = d.codigoConfirmacao;
    chamar(m, 'executarRecuperacaoRegistro');
    assert.deepStrictEqual(m.atual.escritas.map(e => [e.linha, e.coluna, e.valor]), [[2, 14, 1]]);
    assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[12], D.uuid(1));
    assert.strictEqual(chamar(m, 'obterDetalhe', D.uuid(1)).versao, 1);
  });
  const m = D.montar();
  m.atual.valores[9][13] = 'x';
  const d = recuperar(m, 10);
  assert.deepStrictEqual([d.problemas, d.acoes], [['IDENTIFICADOR_FORA_DO_FORMATO', 'VERSAO_MALFORMADA'], ['NOVO_ID', 'VERSAO_1']]);
});

t('recuperação: linha ou grupo mudou depois do diagnóstico → recusa sem gravar', () => {
  const casos = [
    ['nome da linha', v => { v[9][3] = 'Outro Nome'; }, 10],
    ['observação da linha', v => { v[9][9] = 'nota nova'; }, 10],
    ['linha trocada de lugar', v => { const x = v[9]; v[9] = v[10]; v[10] = x; v[9][12] = 'abc'; }, 10],
    ['outra linha entra no grupo', v => { v[10][12] = D.uuid(6); }, 9],
    ['outra linha do grupo muda', v => { v[7][2] = 9000098; }, 9]
  ];
  casos.forEach(([rotulo, mudar, linha]) => {
    const m = D.montar();
    m.amb.propriedades.RECUPERACAO_REGISTRO = recuperar(m, linha).codigoConfirmacao;
    mudar(m.atual.valores);
    const antes = retrato(m.atual);
    assert.throws(() => chamar(m, 'executarRecuperacaoRegistro'), codigo('CONFIRMACAO_RECUPERACAO'), rotulo);
    assert.strictEqual(retrato(m.atual), antes, rotulo);
    assert.strictEqual(m.atual.escritas.length, 0, rotulo);
  });
});

t('recuperação: trava ocupada recusa sem gravar', () => {
  const m = D.montar();
  m.amb.propriedades.RECUPERACAO_REGISTRO = recuperar(m, 10).codigoConfirmacao;
  m.amb.travaOcupada = true;
  assert.throws(() => chamar(m, 'executarRecuperacaoRegistro'), codigo('TRAVA_OCUPADA'));
  assert.strictEqual(m.atual.escritas.length, 0);
});

/*==================== REGISTROS E DESEMPENHO ====================*/

t('registros de execução sem nomes, e-mails nem Nº USP', () => {
  const m = D.montar();
  chamar(m, 'obterPendentes'); chamar(m, 'obterConcluidosRecentes'); chamar(m, 'buscarHistorico', 'bruna'); chamar(m, 'obterRelatorio');
  salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  m.amb.falhaEnvio = true;
  salvar(m, D.uuid(2), 3, { avisarAluno: true });
  chamar(m, 'diagnosticarPlanilha');
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = chamar(m, 'diagnosticarMigracaoRegistroId').codigoConfirmacao;
  chamar(m, 'executarMigracaoRegistroId');
  m.amb.propriedades.RECUPERACAO_REGISTRO = '10';
  m.amb.propriedades.RECUPERACAO_REGISTRO = chamar(m, 'diagnosticarRecuperacaoRegistro').codigoConfirmacao;
  chamar(m, 'executarRecuperacaoRegistro');
  const logs = m.amb.logs.join('\n');
  ['Bruna', 'Álvaro', 'Elisa', 'Fábio', 'Hugo', '@exemplo.invalid', '9000001', '9000005', '9000008', '"abc"'].forEach(x => assert(!logs.includes(x), 'registro contém ' + x));
});

t('desempenho: 3.000 linhas, leituras em lote', () => {
  const linhas = [D.TITULOS_ATUAL.slice()];
  for (let i = 0; i < 3000; i++) {
    linhas.push(D.linha({ nome: 'Pessoa ' + i, nUsp: 9100000 + i, email: 'p' + i + '@exemplo.invalid', id: D.uuid(10000 + i), sit: i % 3 ? 'Concluído' : '', conclusao: i % 3 ? D.brt(2025, 1 + (i % 12), 1 + (i % 28)) : '' }));
  }
  const m = D.montar({ atual: linhas });
  const medir = (nome, fn) => {
    const c0 = Object.assign({}, m.atual.contadores); const a0 = m.amb.aberturas[D.IDS.RESPOSTAS] || 0; const t0 = process.hrtime.bigint();
    fn();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const d = k => m.atual.contadores[k] - c0[k];
    console.log(`        ${nome}: ${ms.toFixed(1)} ms, aberturas=${(m.amb.aberturas[D.IDS.RESPOSTAS] || 0) - a0}, getValues=${d('getValues')}, getValue=${d('getValue')}, setValue=${d('setValue')}`);
    return { ms, getValues: d('getValues'), getValue: d('getValue'), setValue: d('setValue') };
  };
  const p = medir('obterPendentes', () => assert.strictEqual(chamar(m, 'obterPendentes').length, 1000));
  assert.deepStrictEqual([p.getValues, p.getValue], [1, 0]);
  assert(p.ms < 2000);
  const c = medir('obterConcluidosRecentes', () => assert.strictEqual(chamar(m, 'obterConcluidosRecentes').length, 10));
  assert.strictEqual(c.getValues, 1);
  medir('buscarHistorico', () => chamar(m, 'buscarHistorico', 'pessoa 29'));
  medir('obterRelatorio', () => assert.strictEqual(chamar(m, 'obterRelatorio').total, 3004));
  const s = medir('salvarPedido (concluir + avisar)', () => salvar(m, D.uuid(10000), 1, { avisarAluno: true, concluirSolicitacao: true }));
  // Uma leitura em cada trava do salvamento, mais o antes e o depois da auditoria.
  assert.strictEqual(s.getValues, 4, 'uma leitura em cada trava e duas da auditoria');
  assert.strictEqual(s.setValue, 7);
});

/*==================== AUDITORIA (2.1) ====================*/

// Núcleo (Auditoria.gs) idêntico ao do Painel dos servidores, que tem a
// suíte do selo encadeado, da virada do ano e da consolidação
// (sistemas/painel-servidores/testes/testar_auditoria.js). Aqui: o que
// este sistema grava, de quem, e que nada é alterado sem auditoria.
const COLS_EV = ['evento_id', 'seq', 'data_hora', 'data_hora_navegador', 'duracao_ms', 'sessao_id', 'evento_pai_id', 'email', 'nome',
  'tipo_conta', 'perfil', 'categoria', 'evento', 'criticidade', 'tela', 'alvo_tipo', 'alvo_id', 'resultado', 'mensagem', 'motivo',
  'origem', 'detalhes', 'n_alteracoes', 'versao', 'navegador', 'largura_tela', 'tema', 'modo_navegacao', 'hash_alteracoes', 'hash_anterior', 'hash'];
const ANO = String(new Date().getFullYear());
const eventos = m => m.auditoria.linhas('EVENTOS_' + ANO).map(l => Object.fromEntries(COLS_EV.map((c, i) => [c, l[i]])));
const alteracoes = m => m.auditoria.linhas('ALTERACOES_' + ANO).map(l => ({ evento_id: l[0], evento: l[3], alvo_tipo: l[4], alvo_id: l[5], planilha: l[6], campo: l[7], antes: l[8], depois: l[9] }));
const doEvento = (m, codigo) => eventos(m).filter(e => e.evento === codigo);

t('auditoria: salvar com aviso grava quem, antes/depois de cada célula e o e-mail como evento filho', () => {
  const m = D.montar();
  const r = chamar(m, 'salvarPedido', D.uuid(1), 1, { observacoes: 'Conferido', concluirSolicitacao: true, avisarAluno: true });
  assert.strictEqual(r.email, 'ENVIADO');
  const [salvar] = doEvento(m, 'PEDIDO.SALVAR');
  assert(salvar, 'PEDIDO.SALVAR');
  assert.strictEqual(salvar.email, D.ADMIN);
  assert.strictEqual(salvar.nome, 'Pessoa Administradora');
  assert.strictEqual(salvar.perfil, 'ADMINISTRADOR');
  assert.strictEqual(salvar.categoria, 'Alteração');
  assert.strictEqual(salvar.alvo_id, D.uuid(1));
  assert.strictEqual(salvar.resultado, 'OK');
  assert.strictEqual(salvar.origem, 'servidor');
  const det = JSON.parse(salvar.detalhes);
  assert.deepStrictEqual([det.concluir, det.avisar, det.resultado, det.email], [true, true, 'SALVO', 'ENVIADO']);
  const alt = alteracoes(m).filter(a => a.evento_id === salvar.evento_id);
  const campo = c => alt.find(a => a.campo === c);
  assert.deepStrictEqual([campo('J Observações').antes, campo('J Observações').depois], ['', 'Conferido']);
  assert.deepStrictEqual([campo('K Situação').antes, campo('K Situação').depois], ['', 'Concluído']);
  assert.deepStrictEqual([campo('Versão').antes, campo('Versão').depois], ['1', '3']);
  assert(campo('Data de Conclusão').depois && campo('E-mail Enviado').depois);
  assert(alt.every(a => a.planilha === 'ABERTURA_HABILITACOES' && a.alvo_id === D.uuid(1)));
  assert.strictEqual(Number(salvar.n_alteracoes), alt.length);
  const [aviso] = doEvento(m, 'ALUNO.AVISAR');
  assert.strictEqual(aviso.evento_pai_id, salvar.evento_id);
  assert.deepStrictEqual([aviso.resultado, aviso.mensagem], ['OK', 'ENVIADO']);
  // e-mail do aluno não vai para a auditoria
  assert(!JSON.stringify(m.auditoria.lista.map(a => a.dados)).includes('bruna@exemplo.invalid'));
});

t('auditoria: e-mail que falhou vira ALUNO.AVISAR com ERRO; salvar sem aviso não cria o filho', () => {
  const m = D.montar({ ambiente: { falhaEnvio: true } });
  assert.strictEqual(chamar(m, 'salvarPedido', D.uuid(1), 1, { avisarAluno: true }).email, 'FALHOU');
  assert.deepStrictEqual(doEvento(m, 'ALUNO.AVISAR').map(e => [e.resultado, e.mensagem]), [['ERRO', 'FALHOU']]);
  const n = D.montar();
  chamar(n, 'salvarPedido', D.uuid(1), 1, { observacoes: 'x' });
  assert.strictEqual(doEvento(n, 'ALUNO.AVISAR').length, 0);
  assert.strictEqual(doEvento(n, 'PEDIDO.SALVAR').length, 1);
});

t('auditoria fora do ar: nada é salvo nem enviado; consultas continuam', () => {
  const m = D.montar();
  m.auditoria.falhar = true;
  const antes = retrato(m.atual);
  assert.throws(() => chamar(m, 'salvarPedido', D.uuid(1), 1, { concluirSolicitacao: true, avisarAluno: true }),
    e => codigo('AUDITORIA_INDISPONIVEL')(e) && /nada foi alterado/.test(e.message));
  assert.throws(() => chamar(m, 'atribuirIdentificador', ...ARGS.atribuirIdentificador), codigo('AUDITORIA_INDISPONIVEL'));
  assert.strictEqual(retrato(m.atual), antes);
  assert.strictEqual(m.amb.emails.length, 0);
  assert.strictEqual(chamar(m, 'obterPendentes').length, 7);
  assert.strictEqual(chamar(m, 'obterDetalhe', D.uuid(1)).registroId, D.uuid(1));
  // sem a chave no ID_INDEX: mesma recusa
  const semChave = D.montar({ indice: D.abaIndice([['ABERTURA_HABILITACOES', 'spreadsheet', D.IDS.RESPOSTAS, ''], ['PERMISSOES_DE_ACESSO', 'spreadsheet', D.IDS.PERMISSOES, '']]) });
  assert.throws(() => chamar(semChave, 'salvarPedido', D.uuid(1), 1, {}), codigo('AUDITORIA_INDISPONIVEL'));
  assert.strictEqual(semChave.amb.emails.length, 0);
});

t('auditoria: salvamento recusado fica registrado com o motivo, sem alterações', () => {
  const m = D.montar();
  assert.throws(() => chamar(m, 'salvarPedido', D.uuid(1), 7, {}), codigo('CONFLITO_VERSAO'));
  assert.throws(() => chamar(m, 'salvarPedido', D.uuid(10), 1, { avisarAluno: true }), codigo('SEM_EMAIL'));
  const ev = doEvento(m, 'PEDIDO.SALVAR');
  assert.deepStrictEqual(ev.map(e => e.resultado), ['CONFLITO', 'RECUSADO']);
  assert(/^CONFLITO_VERSAO:/.test(ev[0].mensagem) && /^SEM_EMAIL:/.test(ev[1].mensagem));
  assert.strictEqual(alteracoes(m).length, 0);
});

t('auditoria: recusas de acesso (LEITOR gravando, conta fora da lista, página negada)', () => {
  const l = como(D.montar(), D.LEITOR);
  assert.throws(() => chamar(l, 'salvarPedido', D.uuid(1), 1, {}), codigo('SO_LEITURA'));
  const [rec] = doEvento(l, 'PERMISSAO.RECUSAR');
  assert.deepStrictEqual([rec.alvo_id, rec.resultado, rec.perfil, rec.nome], ['salvarPedido', 'NEGADO', 'LEITOR', 'Pessoa Leitora']);
  const e = como(D.montar(), D.ESTRANHO);
  assert.throws(() => chamar(e, 'obterDetalhe', D.uuid(1)), codigo('SEM_ACESSO'));
  const [neg] = doEvento(e, 'ACESSO.NEGAR');
  assert.deepStrictEqual([neg.alvo_id, neg.mensagem, neg.perfil, neg.email], ['obterDetalhe', 'SEM_ACESSO', 'SEM_ACESSO', D.ESTRANHO]);
  const g = como(D.montar(), D.ESTRANHO);
  chamar(g, 'doGet', {});
  assert.deepStrictEqual(doEvento(g, 'ACESSO.NEGAR').map(x => [x.alvo_tipo, x.alvo_id, x.mensagem]), [['pagina', 'Gerenciador', 'SEM_ACESSO']]);
});

t('auditoria: consultas que mostram pedidos ficam registradas', () => {
  const m = como(D.montar(), D.LEITOR);
  chamar(m, 'obterPendentes'); chamar(m, 'obterConcluidosRecentes'); chamar(m, 'obterDetalhe', D.uuid(2));
  chamar(m, 'buscarHistorico', 'bruna'); chamar(m, 'buscarHistorico', ''); chamar(m, 'obterRelatorio');
  assert.deepStrictEqual(eventos(m).map(e => e.evento), ['PENDENTES.LISTAR', 'CONCLUIDOS.LISTAR', 'PEDIDO.ABRIR', 'HISTORICO.BUSCAR', 'RELATORIO.GERAR']);
  const [abrir] = doEvento(m, 'PEDIDO.ABRIR');
  assert.deepStrictEqual([abrir.alvo_id, abrir.categoria, abrir.perfil], [D.uuid(2), 'Leitura', 'LEITOR']);
  const [busca] = doEvento(m, 'HISTORICO.BUSCAR');
  assert.deepStrictEqual([busca.mensagem, JSON.parse(busca.detalhes).resultados], ['bruna', 2]);
  assert.strictEqual(JSON.parse(doEvento(m, 'PENDENTES.LISTAR')[0].detalhes).pedidos, 7);
});

t('auditoria: lote da página (código do servidor recusado, lote grande, e-mail falso ignorado, sessão ligada)', () => {
  const m = D.montar();
  const sessao = '11111111-2222-4333-8444-555555555555';
  assert.throws(() => chamar(m, 'registrarEventosHabilitacoes', { sessao_id: sessao, eventos: [{ evento: 'PEDIDO.SALVAR' }] }), codigo('ENTRADA'));
  assert.throws(() => chamar(m, 'registrarEventosHabilitacoes', { sessao_id: sessao, eventos: Array(51).fill({ evento: 'TELA.ABRIR' }) }), codigo('ENTRADA'));
  assert.strictEqual(eventos(m).length, 0);
  const r = chamar(m, 'registrarEventosHabilitacoes', {
    sessao_id: sessao, contexto: { navegador: 'Chrome 140 · Windows', largura_tela: 1280, tema: 'dark', modo_navegacao: 'abas' },
    eventos: [{ evento: 'ACESSO.ABRIR', duracao_ms: 812.4, email: 'outra@exemplo.invalid', perfil: 'ADMINISTRADOR', tela: 'Pendentes' },
      { evento: 'TELA.ABRIR', alvo_id: 'Concluídos', tela: 'Concluídos', mensagem: '=HYPERLINK("x")' }]
  });
  assert.strictEqual(r.gravados, 2);
  const [abriu, tela] = eventos(m);
  assert.deepStrictEqual([abriu.email, abriu.sessao_id, abriu.origem, abriu.duracao_ms, abriu.tema, abriu.modo_navegacao], [D.ADMIN, sessao, 'navegador', '812', 'dark', 'abas']);
  assert.strictEqual(tela.mensagem, ' =HYPERLINK("x")', 'texto que começa com = não vira fórmula');
  chamar(m, 'salvarPedido', D.uuid(1), 1, {});
  const [salvar] = doEvento(m, 'PEDIDO.SALVAR');
  assert.deepStrictEqual([salvar.sessao_id, salvar.tela], [sessao, 'Concluídos']);
});

t('auditoria: preparar pedido, migração e recuperação gravam as células por linha', () => {
  const m = D.montar();
  const novo = chamar(m, 'atribuirIdentificador', ...ARGS.atribuirIdentificador);
  const [prep] = doEvento(m, 'PEDIDO.PREPARAR');
  assert.strictEqual(prep.alvo_id, 'linha 6');
  const altPrep = alteracoes(m).filter(a => a.evento_id === prep.evento_id);
  assert.deepStrictEqual(altPrep.map(a => [a.alvo_id, a.campo, a.antes, a.depois]).sort(), [['linha 6', 'Registro ID', '', novo.registroId], ['linha 6', 'Versão', '', '1']]);
  const plano = chamar(m, 'diagnosticarMigracaoRegistroId');
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = plano.codigoConfirmacao;
  chamar(m, 'executarMigracaoRegistroId');
  const [mig] = doEvento(m, 'REGISTRO.MIGRAR');
  const altMig = alteracoes(m).filter(a => a.evento_id === mig.evento_id);
  assert(altMig.length >= 1 && altMig.every(a => a.alvo_tipo === 'pedido' && /^linha \d+$/.test(a.alvo_id)), JSON.stringify(altMig));
  assert.strictEqual(JSON.parse(mig.detalhes).executada, true);
  m.amb.propriedades.RECUPERACAO_REGISTRO = '10';
  m.amb.propriedades.RECUPERACAO_REGISTRO = chamar(m, 'diagnosticarRecuperacaoRegistro').codigoConfirmacao;
  const rec = chamar(m, 'executarRecuperacaoRegistro');
  const [evRec] = doEvento(m, 'REGISTRO.RECUPERAR');
  assert.strictEqual(evRec.alvo_id, 'linha 10');
  assert.deepStrictEqual(alteracoes(m).filter(a => a.evento_id === evRec.evento_id).map(a => [a.campo, a.antes, a.depois]), [['Registro ID', 'abc', rec.novoRegistroId]]);
  assert(doEvento(m, 'MANUTENCAO.EXECUTAR').some(e => e.alvo_id === 'diagnosticarMigracaoRegistroId'));
});

t('auditoria: preparar a planilha, gatilho único, integridade e adulteração apontada', () => {
  const m = D.montar();
  const r = chamar(m, 'prepararAuditoriaHabilitacoes');
  assert(['EVENTOS_' + ANO, 'ALTERACOES_' + ANO, 'SESSOES', 'RESUMO_DIARIO', 'DICIONARIO', 'LEIA-ME'].every(a => r.abas.includes(a)), r.abas.join());
  assert(!r.abas.includes('Página1'));
  assert.strictEqual(r.gatilho, 'criado (todo dia, 2h)');
  assert.strictEqual(chamar(m, 'prepararAuditoriaHabilitacoes').gatilho, 'já existia');
  assert.strictEqual(m.amb.gatilhos.length, 1);
  assert.strictEqual(m.auditoria.linhas('DICIONARIO').length, r.eventosNoDicionario);
  assert(m.auditoria.lista.filter(a => /^(EVENTOS|ALTERACOES)_/.test(a.nome)).every(a => a.protegida));
  chamar(m, 'salvarPedido', D.uuid(1), 1, { observacoes: 'um' });
  chamar(m, 'obterDetalhe', D.uuid(1));
  assert.strictEqual(chamar(m, 'verificarIntegridadeAuditoria').ok, true);
  const aba = m.auditoria.getSheetByName('ALTERACOES_' + ANO);
  aba.dados[1][9] = 'outro texto';
  const v = chamar(m, 'verificarIntegridadeAuditoria');
  assert.strictEqual(v.ok, false);
  assert(v.problemas.some(p => p.problema === 'alterações do evento mudaram'));
  // o gatilho de verdade passa; um objeto de evento inventado, não
  assert.throws(() => chamar(como(m, D.LEITOR), 'consolidarAuditoriaHabilitacoes', { triggerUid: 'inventado' }), codigo('SO_LEITURA'));
  assert.deepStrictEqual(chamar(m, 'consolidarAuditoriaHabilitacoes', { triggerUid: 'gatilho-1' }), { dias: 0 });
});

t('auditoria na homologação vai para a planilha de homologação', () => {
  const m = D.montar({ homologacao: D.linhasAtuais(), propriedades: { ID_INDEX_SPREADSHEET_ID: D.IDS.INDICE, AMBIENTE: 'homologacao' } });
  chamar(m, 'salvarPedido', D.uuid(1), 1, {});
  assert.strictEqual(eventos(m).length, 0);
  assert.strictEqual(m.arquivos[D.IDS.AUDITORIA_HOMOLOGACAO].planilha.linhas('EVENTOS_' + ANO).length, 1);
  m.amb.usuario = m.amb.dono;
  assert(/^ok: Auditoria de homologação$/.test(chamar(m, 'diagnosticarConfiguracao').chaves.AUDITORIA_ABERTURA_HABILITACOES));
});

/*==================== IDENTIFICAÇÃO NO CABEÇALHO (2.1) ====================*/

t('cabeçalho: nome e observação da aba de acesso; sem nome, o e-mail', () => {
  const m = D.montar();
  chamar(m, 'doGet', {});
  assert.deepStrictEqual([m.amb.paginas[0].usuarioNome, m.amb.paginas[0].usuarioDescricao], ['Pessoa Administradora', 'Equipe Fictícia de Teste']);
  assert(/^[0-9a-f-]{36}$/.test(m.amb.paginas[0].sessao));
  const sem = D.montar({ permissoes: D.abaPermissoes([['', '', D.ADMIN, '', 'ADMINISTRADOR']]) });
  chamar(sem, 'doGet', {});
  assert.deepStrictEqual([sem.amb.paginas[0].usuarioNome, sem.amb.paginas[0].usuarioDescricao], [D.ADMIN, '']);
  // e-mail repetido: menor perfil, nome e observação da primeira linha que os tiver
  const dup = D.montar({ permissoes: D.abaPermissoes([['', '', 'dup@exemplo.invalid', '', 'ADMINISTRADOR'], ['', 'Nome Duplicado', 'DUP@exemplo.invalid', 'Obs. duplicada', 'LEITOR']]) });
  como(dup, 'dup@exemplo.invalid');
  chamar(dup, 'doGet', {});
  assert.deepStrictEqual([dup.amb.paginas[0].perfil, dup.amb.paginas[0].usuarioNome, dup.amb.paginas[0].usuarioDescricao], ['LEITOR', 'Nome Duplicado', 'Obs. duplicada']);
});

/*==================== DADOS FICTÍCIOS DA HOMOLOGAÇÃO ====================*/

// O CSV versionado para montar a planilha de homologação
// (docs/sistemas/abertura-habilitacoes/dados-ficticios/) tem de produzir
// exatamente o resultado que o README dele promete.
function lerCsv_(texto) {
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

t('CSV de dados fictícios: diagnósticos batem com o README', () => {
  const pasta = path.join(__dirname, '..', '..', '..', '..', 'docs', 'sistemas', 'abertura-habilitacoes', 'dados-ficticios');
  const linhas = lerCsv_(fs.readFileSync(path.join(pasta, 'respostas-ao-formulario-2.csv'), 'utf8'));
  assert(linhas.every(l => l.length === 15), 'todas as linhas com as colunas A a O');
  linhas.slice(1).forEach(l => l.forEach(v => { if (/@/.test(v)) assert(/@exemplo\.invalid$/.test(v), 'e-mail fictício: ' + v); }));
  const m = como(D.montar({ atual: linhas }), D.ADMIN);
  const d = chamar(m, 'diagnosticarPlanilha');
  assert.deepStrictEqual([d.linhasComNome, d.pendentes, d.concluidos, d.reservasDeEnvio], [12, 10, 2, 0]);
  assert.strictEqual(d.tituloJ, 'Comentários, sugestões, elogios ou críticas.');
  assert.deepStrictEqual(d.migracao.linhas, {
    semIdentificador: [6], identificadoresRepetidos: [8], versaoAusente: [6], versaoMalformada: [10, 11], identificadoresForaDoFormato: []
  });
  assert(d.migracao.precisaMigrar && /^MIGRAR-1-1-1-0-[0-9a-f]{16}$/.test(d.migracao.codigoConfirmacao));
  assert.strictEqual(JSON.stringify(chamar(m, 'diagnosticarMigracaoRegistroId')), JSON.stringify(chamar(m, 'diagnosticarMigracaoRegistroId')));
  assert.strictEqual(chamar(m, 'obterPendentes').length, 10);
  assert.strictEqual(chamar(m, 'obterConcluidosRecentes').length, 2);
});

t('CSV de dados fictícios da lista de acesso: perfis e cabeçalho batem com o README', () => {
  const pasta = path.join(__dirname, '..', '..', '..', '..', 'docs', 'sistemas', 'abertura-habilitacoes', 'dados-ficticios');
  const linhas = lerCsv_(fs.readFileSync(path.join(pasta, 'gerenciador-habilitacoes.csv'), 'utf8'));
  assert(linhas.every(l => l.length === 5), 'colunas A a E');
  const perm = D.abaPermissoes(linhas.slice(1));
  const pagina = email => { const m = como(D.montar({ permissoes: perm }), email); chamar(m, 'doGet', {}); return m.amb.paginas[0]; };
  const a = pagina('admin.teste@exemplo.invalid');
  assert.deepStrictEqual([a.perfil, a.usuarioNome, a.usuarioDescricao], ['ADMINISTRADOR', 'Pessoa Administradora Teste', 'Equipe Fictícia do Serviço de Graduação']);
  const l = pagina('leitor.teste@exemplo.invalid');
  assert.deepStrictEqual([l.perfil, l.usuarioNome, l.usuarioDescricao], ['LEITOR', 'Pessoa Leitora Teste', 'Comissão Fictícia de Graduação']);
  const s = pagina('semnome.teste@exemplo.invalid');
  assert.deepStrictEqual([s.perfil, s.usuarioNome, s.usuarioDescricao], ['ADMINISTRADOR', 'semnome.teste@exemplo.invalid', '']);
  assert.strictEqual(pagina('semperfil.teste@exemplo.invalid').nome, 'GerenciadorSemAcesso');
  const d = pagina('dup.teste@exemplo.invalid');
  assert.deepStrictEqual([d.perfil, d.usuarioNome, d.usuarioDescricao], ['LEITOR', 'Pessoa Duplicada Teste', 'Primeira linha da pessoa']);
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);

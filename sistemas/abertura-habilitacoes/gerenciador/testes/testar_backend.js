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
  'diagnosticarPlanilha', 'doGet', 'executarMigracaoRegistroId', 'obterConcluidosRecentes', 'obterDetalhe',
  'obterPendentes', 'obterRelatorio', 'salvarPedido'];
const DE_ESCRITA = ['atribuirIdentificador', 'diagnosticarMigracaoRegistroId', 'diagnosticarPlanilha', 'executarMigracaoRegistroId', 'salvarPedido'];
const ARGS = {
  obterDetalhe: [D.uuid(1)], buscarHistorico: ['bruna'], salvarPedido: [D.uuid(1), 1, { concluirSolicitacao: true }],
  atribuirIdentificador: [{ linha: 6, carimbo: D.brt(2026, 5, 5).getTime(), nUsp: '9000005' }]
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

t('sessão sem e-mail: negado sem abrir planilha nenhuma', () => {
  PUBLICAS.filter(f => f !== 'doGet').forEach(f => {
    const m = como(D.montar(), '');
    assert.throws(() => chamar(m, f, ...(ARGS[f] || [])), codigo('SEM_IDENTIFICACAO'), f);
    assert.deepStrictEqual(m.amb.aberturas, {}, f);
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
  linhas[1][14] = D.reserva(1);
  const m = D.montar({ atual: linhas });
  const antes = retrato(m.atual);
  assert.throws(() => salvar(m, D.uuid(1), 1, { avisarAluno: true }), codigo('ENVIO_EM_ANDAMENTO'));
  assert.strictEqual(retrato(m.atual), antes);
  // sem avisar, salvar continua possível e não mexe na reserva
  salvar(m, D.uuid(1), 1, { observacoes: 'só nota' });
  assert.strictEqual(linhaDe(m, 'Bruna Exemplo')[14], linhas[1][14]);
  ['ENVIANDO…', D.reserva(15)].forEach(valor => {
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
  assert.deepStrictEqual([r.precisaMigrar, r.semIdentificador, r.identificadoresRepetidos, r.versaoInvalida, r.identificadoresForaDoFormato], [true, 1, 1, 1, 1]);
  assert.deepStrictEqual(r.linhas.semIdentificador, [6]);
  assert.deepStrictEqual(r.linhas.identificadoresRepetidos, [9]);
  assert.strictEqual(r.codigoConfirmacao, 'MIGRAR-1-1-1-0-12');
  assert(!m.amb.logs.join('\n').includes('Elisa'), 'nome no registro');
});

t('migração: sem confirmação ou com código errado não grava', () => {
  const m = D.montar();
  const antes = retrato(m.atual);
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'));
  m.amb.propriedades.MIGRACAO_REGISTRO_ID_CONFIRMACAO = 'MIGRAR-0-0-0-0-12';
  assert.throws(() => chamar(m, 'executarMigracaoRegistroId'), codigo('CONFIRMACAO_MIGRACAO'));
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

/*==================== REGISTROS E DESEMPENHO ====================*/

t('registros de execução sem nomes, e-mails nem Nº USP', () => {
  const m = D.montar();
  chamar(m, 'obterPendentes'); chamar(m, 'obterConcluidosRecentes'); chamar(m, 'buscarHistorico', 'bruna'); chamar(m, 'obterRelatorio');
  salvar(m, D.uuid(1), 1, { avisarAluno: true, concluirSolicitacao: true });
  m.amb.falhaEnvio = true;
  salvar(m, D.uuid(2), 3, { avisarAluno: true });
  chamar(m, 'diagnosticarPlanilha');
  chamar(m, 'diagnosticarMigracaoRegistroId');
  const logs = m.amb.logs.join('\n');
  ['Bruna', 'Álvaro', 'Elisa', 'Fábio', '@exemplo.invalid', '9000001', '9000005'].forEach(x => assert(!logs.includes(x), 'registro contém ' + x));
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
  assert.strictEqual(s.getValues, 2, 'uma leitura em cada trava');
  assert.strictEqual(s.setValue, 7);
});

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);

// Testes da 4.1.0 — encaminhador dos pedidos do Formulário de Pedido de
// Colação de Grau (PR 4 do plano): inclusão na aba Diplomas, documentos
// movidos da entrada para a pasta do aluno, correções (D3), bloqueios,
// idempotência, fim do autocadastro (D6) e guarda de acesso.
// Dados 100% fictícios (exemplo.invalid, nº USP 9000000+, IDs inventados).
// Uso: node sistemas/emissao-diplomas/testes/testar_encaminhador.js
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const assert = require('assert');
const S = require('./simulacao');

const IDS = {
  INDICE: 'INDICE_FICTICIO_0000000000000001', PERM: 'PERMISSOES_FICTICIA_PRODUCAO_0001', DIPL: 'DIPLOMAS_FICTICIA_PRODUCAO_000001',
  CENTRAL: 'ALUNOS_CENTRAL_FICTICIA_00000001', RAIZ: 'PASTA_RAIZ_FICTICIA_0000000000001', PEDIDOS: 'PEDIDOS_COLACAO_FICTICIA_0000001',
  ENTRADA: 'PASTA_ENTRADA_FICTICIA_000000001'
};
const ADMIN = 'admin.ficticio@exemplo.invalid', LEITOR = 'leitor.ficticio@exemplo.invalid', DONO = 'dono@exemplo.invalid';

const TITULOS = ['Registro ID', 'Versão', 'Nome completo', 'Nº USP', 'E-mail', 'Habilitação(ões) solicitada(s)', 'M/F', 'Nº RG', 'Colação',
  'Status — Dados Pessoais', 'Bacharelado — concluiu?', 'Bacharelado — ano', 'Licenciatura — concluiu?', 'Licenciatura — ano',
  'Formação de Psicólogo(a) — concluiu?', 'Formação de Psicólogo(a) — ano', 'Link da pasta no Drive', 'ID da Pasta',
  'Telefone Celular', 'E-mail Alternativo', 'Colação por Procuração?', 'Procurador(a) — Nome', 'Procurador(a) — RG/CIN',
  'Colação Antecipada?', 'Observações do Aluno', 'Permanecerá Matriculado?', 'Habilitação(ões) Pendente(s)', 'Anotação da equipe'];
const col = t => TITULOS.indexOf(t);
const TITULOS_CENTRAL = ['N USP', 'Nome', 'Ingresso', 'E-mail', 'ID da Pasta', 'E-mail secundário'];
const COLS = {
  PROTOCOLOS: ['Protocolo', 'Protocolo ID', 'Chave de envio', 'E-mail da sessão', 'Recebimento', 'Cadastro', 'Motivo do cadastro', 'Recebido em',
    'Recebimento concluído em', 'Colação', 'Janela do período', 'Semestre do período', 'Nº USP informado', 'Nome informado', 'Registro ID', 'Pasta do protocolo'],
  VERSOES: ['Protocolo ID', 'Versão', 'Chave de envio', 'E-mail da sessão', 'Situação', 'Enviada em', 'Concluída em', 'Dados do pedido'],
  DOCUMENTOS: ['Documento ID', 'Protocolo ID', 'Versão', 'Chave do documento', 'Tipo', 'ID do arquivo', 'Origem', 'Documento de origem', 'SHA-256',
    'Tamanho (bytes)', 'Formato', 'Situação', 'Registrado em'],
  EVENTOS: ['Quando', 'Protocolo ID', 'Versão', 'Evento', 'Campos alterados'],
  ENCAMINHAMENTOS: ['Quando', 'Protocolo ID', 'Versão', 'Resultado', 'Motivo', 'Registro ID', 'Origem'],
  DECISOES_CADASTRO: ['Quando', 'Protocolo ID', 'Versão', 'Decisão', 'Nº USP']
};
const linhaDe = (aba, o) => COLS[aba].map(t => (t in o ? o[t] : ''));

const PID = n => 'PROTOCOLO-ID-FICTICIO-' + n, RID = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
const SUB = n => 'SUBPASTA_PROTOCOLO_FICTICIA_' + n, ARQ = (n, t) => 'ARQUIVO_FICTICIO_' + n + '_' + t;
const dadosPedido = (o = {}) => JSON.stringify(Object.assign({
  nome: 'Aluna Fictícia Um', nUsp: '9000001', anoIngresso: '2021', rg: '00.000.000-0', telefone: '11900000000', emailAlternativo: 'um@exemplo.invalid',
  bachConcluiu: true, licConcluiu: false, psiConcluiu: true, permaneceMatriculado: 'SIM', habilitacaoPendente: ['Licenciatura'],
  procuracao: 'NÃO', procuradorNome: '', procuradorRg: '', colacaoAntecipada: 'NÃO', observacoesAluno: 'Obs fictícia', divergenciaApontada: '',
  cadastro: 'CONFIRMADO', colacao: '20262', ano: '2026'
}, o));

function protocolo(n, o = {}) {
  return {
    protocolo: linhaDe('PROTOCOLOS', Object.assign({ 'Protocolo': 'PCG-20262-0000' + n, 'Protocolo ID': PID(n), 'E-mail da sessão': 'aluna' + n + '@exemplo.invalid',
      'Recebimento': 'RECEBIDO', 'Cadastro': 'CONFIRMADO', 'Colação': '20262', 'Nº USP informado': '900000' + n, 'Nome informado': 'Aluna Fictícia ' + n,
      'Registro ID': RID(n), 'Pasta do protocolo': SUB(n) }, o.p || {})),
    versoes: [linhaDe('VERSOES', { 'Protocolo ID': PID(n), 'Versão': 1, 'Situação': 'RECEBIDO', 'Dados do pedido': dadosPedido(Object.assign({ nUsp: '900000' + n, nome: 'Aluna Fictícia ' + n }, o.d || {})) })],
    documentos: [
      linhaDe('DOCUMENTOS', { 'Protocolo ID': PID(n), 'Versão': 1, 'Tipo': 'RG', 'ID do arquivo': ARQ(n, 'RG'), 'Origem': 'ENVIADO' }),
      linhaDe('DOCUMENTOS', { 'Protocolo ID': PID(n), 'Versão': 1, 'Tipo': 'CERTIDAO', 'ID do arquivo': ARQ(n, 'CERT'), 'Origem': 'ENVIADO' })
    ]
  };
}

function driveFicticio() {
  const d = { criacoes: [], lixeira: [], pastas: {}, arquivos: {}, movimentos: [] };
  const iter = lista => { let i = 0; return { hasNext: () => i < lista.length, next: () => lista[i++] }; };
  function pasta(id, paiId) {
    const p = { getId: () => id, getUrl: () => 'https://exemplo.invalid/pasta/' + id, pai: paiId,
      getParents: () => iter(paiId ? [d.pastas[paiId] || { getId: () => paiId }] : []),
      getFiles: () => iter(Object.values(d.arquivos).filter(a => a.pai === id)), getFolders: () => iter([]),
      getFilesByName: () => iter([]), setTrashed: v => { if (v) d.lixeira.push(id); return p; }, setName: () => p,
      createFolder: nome => { d.criacoes.push(nome); return pasta('PASTA_NOVA_' + d.criacoes.length, id); } };
    d.pastas[id] = p; return p;
  }
  d.pasta = pasta;
  d.arquivo = (id, paiId) => {
    const a = { getId: () => id, pai: paiId, getParents: () => iter([d.pastas[a.pai] || { getId: () => a.pai }]),
      moveTo: destino => { d.movimentos.push([id, destino.getId()]); a.pai = destino.getId(); return a; } };
    d.arquivos[id] = a; return a;
  };
  pasta(IDS.RAIZ, null); pasta(IDS.ENTRADA, null);
  d.getFolderById = id => { if (!d.pastas[id]) throw new Error('não existe'); return d.pastas[id]; };
  d.getFileById = id => { if (!d.arquivos[id]) throw new Error('não existe'); return d.arquivos[id]; };
  return d;
}

function montar(o = {}) {
  const planilhas = {};
  planilhas[IDS.INDICE] = { 'Página1': [['Chave', 'Tipo', 'ID de Produção', 'Homologação'],
    ['PERMISSOES_DE_ACESSO', 'spreadsheet', IDS.PERM, IDS.PERM], ['EMISSAO_DIPLOMAS', 'spreadsheet', IDS.DIPL, IDS.DIPL],
    ['PLANILHA_ALUNOS', 'spreadsheet', IDS.CENTRAL, IDS.CENTRAL], ['PASTA_RAIZ_ALUNOS', 'folder', IDS.RAIZ, IDS.RAIZ],
    ['PEDIDOS_COLACAO', 'spreadsheet', IDS.PEDIDOS, IDS.PEDIDOS], ['PASTA_PROVISORIOS_COLACAO', 'folder', IDS.ENTRADA, IDS.ENTRADA]] };
  planilhas[IDS.PERM] = { EMISSAO_DIPLOMAS: [['N. USP', 'Nome', 'e-mail', 'Observação', 'Perfil'],
    ['1000001', 'Pessoa Administradora Fictícia', ADMIN, '', 'ADMINISTRADOR'], ['1000002', 'Pessoa Leitora Fictícia', LEITOR, '', 'LEITOR']] };
  const titulos = o.titulos || TITULOS;
  planilhas[IDS.DIPL] = { Diplomas: [titulos].concat(o.diplomas || []), INFOS: [['Tipo de arquivo'], ['RG']] };
  planilhas[IDS.CENTRAL] = { 'Página1': [TITULOS_CENTRAL].concat(o.central === undefined ? [['9000001', 'Aluna Fictícia 1', '2021', 'aluna1@exemplo.invalid', '', '']] : o.central) };
  const pedidos = o.pedidos || [protocolo(1)];
  const abas = { PROTOCOLOS: [COLS.PROTOCOLOS], VERSOES: [COLS.VERSOES], DOCUMENTOS: [COLS.DOCUMENTOS], EVENTOS: [COLS.EVENTOS] };
  if (o.semEncaminhamentos !== true) abas.ENCAMINHAMENTOS = [COLS.ENCAMINHAMENTOS];
  if (o.decisoes) abas.DECISOES_CADASTRO = [COLS.DECISOES_CADASTRO].concat(o.decisoes);
  pedidos.forEach(p => { abas.PROTOCOLOS.push(p.protocolo); abas.VERSOES.push(...p.versoes); abas.DOCUMENTOS.push(...p.documentos); });
  planilhas[IDS.PEDIDOS] = abas;
  const amb = S.ambiente({ usuario: o.usuario || ADMIN, propriedades: { ID_INDEX_SPREADSHEET_ID: IDS.INDICE }, planilhas });
  amb.drive = driveFicticio();
  pedidos.forEach(p => {
    const sub = p.protocolo[COLS.PROTOCOLOS.indexOf('Pasta do protocolo')];
    if (!amb.drive.pastas[sub]) amb.drive.pasta(sub, IDS.ENTRADA);
    p.documentos.forEach(dl => { const id = dl[COLS.DOCUMENTOS.indexOf('ID do arquivo')]; if (!amb.drive.arquivos[id]) amb.drive.arquivo(id, sub); });
  });
  return amb;
}
// A planilha de pedidos é a mesma entre execuções; o Drive também.
const rodar = (amb, usuario) => { amb.usuario = usuario === undefined ? ADMIN : usuario; return S.executar(amb, 'executarEncaminhadorColacao', []); };
const dipl = amb => amb.planilhas[IDS.DIPL].abas.Diplomas;
const central = amb => amb.planilhas[IDS.CENTRAL].abas['Página1'];
const enc = amb => amb.planilhas[IDS.PEDIDOS].abas.ENCAMINHAMENTOS.valores.slice(1).map(l => {
  const o = {}; COLS.ENCAMINHAMENTOS.forEach((t, i) => { o[t] = String(l[i] == null ? '' : l[i]).replace(/^'/, ''); }); return o;
});
const celula = (amb, linha, titulo) => dipl(amb).valores[linha][col(titulo)];
const semDadoPessoalNoLog = amb => {
  const log = amb.logs.join('\n');
  assert(!/Fictíci|900000\d|exemplo\.invalid|00000000-0000-4000|PROTOCOLO-ID|ARQUIVO_|PASTA_|SUBPASTA/.test(log), 'log com dado pessoal ou ID: ' + log);
};

let ok = 0, falhas = 0;
function t(nome, fn) {
  try { fn(); ok++; console.log('ok   ', nome); } catch (e) { falhas++; console.log('FALHA', nome, '\n      ', e && e.stack || e); }
}

/*==================== INCLUSÃO ====================*/

t('pedido confirmado: uma linha completa na aba Diplomas, documentos movidos e ENCAMINHADO', () => {
  const amb = montar();
  const r = rodar(amb);
  assert.strictEqual(r.encaminhados, 1);
  assert.strictEqual(r.corrigidos, 0);
  const a = dipl(amb);
  assert.strictEqual(a.valores.length, 2);
  assert.strictEqual(a.gravacoes.filter(g => Array.isArray(g[2])).length, 1, 'linha deveria entrar numa gravação só');
  const v = t => celula(amb, 1, t);
  assert.strictEqual(v('Registro ID'), RID(1));
  assert.strictEqual(v('Versão'), 1);
  assert.strictEqual(v('Nº USP'), '9000001');
  assert.strictEqual(v('Colação'), '20262');
  assert.strictEqual(v('E-mail'), 'aluna1@exemplo.invalid');
  assert.strictEqual(v('Habilitação(ões) solicitada(s)'), 'Formação de Psicólogo(a) + Bacharelado');
  assert.strictEqual(v('Bacharelado — concluiu?'), 'SIM'); assert.strictEqual(v('Bacharelado — ano'), '2026');
  assert.strictEqual(v('Licenciatura — concluiu?'), 'NÃO'); assert.strictEqual(v('Licenciatura — ano'), '');
  assert.strictEqual(v('Telefone Celular'), '11900000000');
  assert.strictEqual(v('Habilitação(ões) Pendente(s)'), 'Licenciatura');
  assert.strictEqual(v('Status — Dados Pessoais'), '');
  assert.strictEqual(v('ID da Pasta'), 'PASTA_NOVA_1');
  assert.strictEqual(central(amb).valores[1][4], 'PASTA_NOVA_1', 'pasta gravada na central');
  assert.deepStrictEqual(amb.drive.movimentos.map(m => m[1]), ['PASTA_NOVA_1', 'PASTA_NOVA_1']);
  const e = enc(amb);
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].Resultado, 'ENCAMINHADO'); assert.strictEqual(e[0]['Protocolo ID'], PID(1)); assert.strictEqual(e[0]['Registro ID'], RID(1));
  assert.strictEqual(e[0].Origem, 'ADMINISTRADOR');
  semDadoPessoalNoLog(amb);
});

t('idempotente: rodar de novo não acrescenta linha, registro nem movimento', () => {
  const amb = montar();
  rodar(amb); const antes = [dipl(amb).valores.length, enc(amb).length, amb.drive.movimentos.length];
  const r = rodar(amb);
  assert.strictEqual(r.encaminhados, 0);
  assert.deepStrictEqual([dipl(amb).valores.length, enc(amb).length, amb.drive.movimentos.length], antes);
});

t('retomada: linha gravada mas sem registro (queda) → não duplica, aplica e registra', () => {
  const amb = montar();
  rodar(amb);
  amb.planilhas[IDS.PEDIDOS].abas.ENCAMINHAMENTOS.valores.pop(); // registro perdido
  rodar(amb);
  assert.strictEqual(dipl(amb).valores.length, 2, 'não deveria duplicar a linha');
  assert.strictEqual(enc(amb)[0].Resultado, 'ENCAMINHADO');
});

t('recebendo (envio incompleto) e versão não concluída: nada é encaminhado', () => {
  const p = protocolo(1, { p: { 'Recebimento': 'RECEBENDO' } });
  const amb = montar({ pedidos: [p] });
  assert.strictEqual(rodar(amb).encaminhados, 0);
  assert.strictEqual(dipl(amb).valores.length, 1);
  assert.strictEqual(enc(amb).length, 0);
});

/*==================== IDENTIDADE ====================*/

t('cadastro PENDENTE sem decisão: aguarda, sem linha nem registro', () => {
  const amb = montar({ pedidos: [protocolo(1, { p: { 'Cadastro': 'PENDENTE' } })] });
  const r = rodar(amb);
  assert.strictEqual(r.aguardando, 1);
  assert.strictEqual(dipl(amb).valores.length, 1);
  assert.strictEqual(enc(amb).length, 0);
  assert.strictEqual(amb.drive.movimentos.length, 0);
});

t('PENDENTE com APROVADO no Gerenciador de Pessoas: encaminha com o Nº USP decidido', () => {
  const amb = montar({
    pedidos: [protocolo(1, { p: { 'Cadastro': 'PENDENTE', 'Nº USP informado': '9099999' } })],
    decisoes: [linhaDe('DECISOES_CADASTRO', { 'Protocolo ID': PID(1), 'Versão': 1, 'Decisão': 'APROVADO', 'Nº USP': '9000001' })]
  });
  assert.strictEqual(rodar(amb).encaminhados, 1);
  assert.strictEqual(celula(amb, 1, 'Nº USP'), '9000001');
});

t('PENDENTE aprovado: o nome da aba Diplomas é o da planilha central, não o digitado (decisão de 11/11/2026)', () => {
  const amb = montar({
    pedidos: [protocolo(1, { p: { 'Cadastro': 'PENDENTE' }, d: { nome: 'nome digitado sem acento' } })],
    decisoes: [linhaDe('DECISOES_CADASTRO', { 'Protocolo ID': PID(1), 'Versão': 1, 'Decisão': 'APROVADO', 'Nº USP': '9000001' })]
  });
  assert.strictEqual(rodar(amb).encaminhados, 1);
  assert.strictEqual(celula(amb, 1, 'Nome completo'), 'Aluna Fictícia 1');
});

t('REJEITADO ou DUPLICIDADE no Gerenciador de Pessoas: não segue', () => {
  for (const decisao of ['REJEITADO', 'DUPLICIDADE']) {
    const amb = montar({
      pedidos: [protocolo(1, { p: { 'Cadastro': 'PENDENTE' } })],
      decisoes: [linhaDe('DECISOES_CADASTRO', { 'Protocolo ID': PID(1), 'Decisão': decisao })]
    });
    rodar(amb);
    assert.strictEqual(dipl(amb).valores.length, 1, decisao);
    assert.strictEqual(enc(amb).length, 0, decisao);
  }
});

/*==================== BLOQUEIOS ====================*/

t('sem cadastro na central (D6): BLOQUEADO, nada gravado na central, nada movido; depois do cadastro, encaminha', () => {
  const amb = montar({ central: [] });
  const r = rodar(amb);
  assert.strictEqual(r.bloqueados, 1);
  assert.strictEqual(central(amb).gravacoes.length, 0, 'não pode autocadastrar');
  assert.strictEqual(dipl(amb).valores.length, 1);
  assert.strictEqual(amb.drive.movimentos.length, 0);
  assert.strictEqual(enc(amb)[0].Resultado, 'BLOQUEADO'); assert.strictEqual(enc(amb)[0].Motivo, 'SEM_CADASTRO_CENTRAL');
  rodar(amb);
  assert.strictEqual(enc(amb).length, 1, 'bloqueio igual não gera linha nova a cada ciclo');
  central(amb).valores.push(['9000001', 'Aluna Fictícia 1', '2021', 'aluna1@exemplo.invalid', '', '']);
  assert.strictEqual(rodar(amb).encaminhados, 1);
  assert.strictEqual(enc(amb).length, 2);
});

t('Nº USP repetido na central: BLOQUEADO sem escolher uma das linhas', () => {
  const amb = montar({ central: [['9000001', 'A', '', '', '', ''], ['9000001', 'B', '', '', '', '']] });
  rodar(amb);
  assert.strictEqual(enc(amb)[0].Motivo, 'NUSP_REPETIDO_CENTRAL');
  assert.strictEqual(dipl(amb).valores.length, 1);
  assert.strictEqual(amb.drive.criacoes.length, 0);
});

t('outro registro do mesmo Nº USP na mesma colação: BLOQUEADO por duplicidade, sem linha nova', () => {
  const outra = TITULOS.map(() => ''); outra[col('Registro ID')] = RID(99); outra[col('Nº USP')] = '9000001'; outra[col('Colação')] = '20262';
  const amb = montar({ diplomas: [outra] });
  rodar(amb);
  assert.strictEqual(enc(amb)[0].Motivo, 'DUPLICIDADE_DIPLOMAS');
  assert.strictEqual(dipl(amb).valores.length, 2);
  assert.strictEqual(amb.drive.movimentos.length, 0);
});

t('Registro ID repetido ou com outro Nº USP: BLOQUEADO', () => {
  const l = n => { const x = TITULOS.map(() => ''); x[col('Registro ID')] = RID(1); x[col('Nº USP')] = n; x[col('Colação')] = '20262'; return x; };
  let amb = montar({ diplomas: [l('9000001'), l('9000001')] });
  rodar(amb); assert.strictEqual(enc(amb)[0].Motivo, 'REGISTRO_REPETIDO');
  amb = montar({ diplomas: [l('9000777')] });
  rodar(amb); assert.strictEqual(enc(amb)[0].Motivo, 'REGISTRO_DIVERGENTE');
});

t('falta coluna na aba Diplomas: BLOQUEADO com o título, sem criar coluna', () => {
  const titulos = TITULOS.filter(x => x !== 'Telefone Celular');
  const amb = montar({ titulos });
  rodar(amb);
  assert.strictEqual(enc(amb)[0].Motivo, 'CABECALHO_AUSENTE: Telefone Celular');
  assert.strictEqual(dipl(amb).valores[0].length, titulos.length, 'não pode criar coluna');
  assert.strictEqual(dipl(amb).valores.length, 1);
});

t('documento fora da subpasta do protocolo: BLOQUEADO, nada movido nem gravado', () => {
  const amb = montar();
  amb.drive.arquivos[ARQ(1, 'CERT')].pai = 'OUTRA_PASTA_QUALQUER';
  rodar(amb);
  assert.strictEqual(enc(amb)[0].Motivo, 'ARQUIVO_FORA_DA_ENTRADA');
  assert.strictEqual(amb.drive.movimentos.length, 0, 'nenhum arquivo movido pela metade');
  assert.strictEqual(dipl(amb).valores.length, 1);
});

t('subpasta do protocolo fora da pasta de entrada: BLOQUEADO', () => {
  const amb = montar();
  amb.drive.pastas[SUB(1)].pai = IDS.RAIZ;
  amb.drive.pastas[SUB(1)].getParents = () => { let ok = true; return { hasNext: () => ok, next: () => { ok = false; return amb.drive.pastas[IDS.RAIZ]; } }; };
  rodar(amb);
  assert.strictEqual(enc(amb)[0].Motivo, 'ARQUIVO_FORA_DA_ENTRADA');
});

t('aba ENCAMINHAMENTOS ausente: não grava nada e avisa indisponível', () => {
  const amb = montar({ semEncaminhamentos: true });
  const r = rodar(amb);
  assert.strictEqual(r.indisponivel, true);
  assert.strictEqual(dipl(amb).valores.length, 1);
  semDadoPessoalNoLog(amb);
});

/*==================== CORREÇÕES (D3) ====================*/

function comCorrecao(amb, n, dados, docs) {
  const ab = amb.planilhas[IDS.PEDIDOS].abas;
  ab.VERSOES.valores.push(linhaDe('VERSOES', { 'Protocolo ID': PID(n), 'Versão': 2, 'Situação': 'RECEBIDO', 'Dados do pedido': dadosPedido(Object.assign({ nUsp: '900000' + n }, dados)) }));
  (docs || []).forEach(([tipo, id, novo]) => {
    ab.DOCUMENTOS.valores.push(linhaDe('DOCUMENTOS', { 'Protocolo ID': PID(n), 'Versão': 2, 'Tipo': tipo, 'ID do arquivo': id, 'Origem': novo ? 'ENVIADO' : 'REUTILIZADO' }));
    if (novo) amb.drive.arquivo(id, SUB(n));
  });
}

t('correção com "Status — Dados Pessoais" vazio: só as colunas do aluno mudam, ano desmarcado limpo, Versão + 1', () => {
  const amb = montar();
  rodar(amb);
  dipl(amb).valores[1][col('Anotação da equipe')] = '=FORMULA_DA_EQUIPE()';
  dipl(amb).gravacoes.length = 0;
  // A equipe corrigiu o nome no cadastro central; o que vale é o da central.
  central(amb).valores[1][1] = 'Aluna Fictícia Um Corrigida';
  comCorrecao(amb, 1, { nome: 'Nome Digitado Pelo Aluno', psiConcluiu: false, licConcluiu: true, telefone: '11911111111', habilitacaoPendente: [] },
    [['RG', 'ARQUIVO_FICTICIO_1_RG_V2', true], ['CERTIDAO', ARQ(1, 'CERT'), false]]);
  const r = rodar(amb);
  assert.strictEqual(r.encaminhados, 1);
  assert.strictEqual(r.corrigidos, 1, 'a página distingue correção de pedido novo');
  assert.strictEqual(dipl(amb).valores.length, 2, 'correção não cria linha');
  assert.strictEqual(celula(amb, 1, 'Nome completo'), 'Aluna Fictícia Um Corrigida');
  assert.strictEqual(celula(amb, 1, 'Formação de Psicólogo(a) — concluiu?'), 'NÃO');
  assert.strictEqual(celula(amb, 1, 'Formação de Psicólogo(a) — ano'), '', 'ano da habilitação desmarcada deveria ser limpo');
  assert.strictEqual(celula(amb, 1, 'Licenciatura — ano'), '2026');
  assert.strictEqual(celula(amb, 1, 'Habilitação(ões) solicitada(s)'), 'Bacharelado + Licenciatura');
  assert.strictEqual(celula(amb, 1, 'Versão'), 2);
  assert.strictEqual(celula(amb, 1, 'Anotação da equipe'), '=FORMULA_DA_EQUIPE()', 'coluna da equipe intocada');
  assert(dipl(amb).gravacoes.every(g => !Array.isArray(g[2])), 'correção não regrava a linha inteira');
  assert.deepStrictEqual(amb.drive.movimentos.slice(-1), [['ARQUIVO_FICTICIO_1_RG_V2', 'PASTA_NOVA_1']], 'só o documento novo é movido');
  const e = enc(amb);
  assert.strictEqual(e[1].Resultado, 'ENCAMINHADO'); assert.strictEqual(e[1].Motivo, 'CORRECAO_APLICADA'); assert.strictEqual(e[1]['Versão'], '2');
});

t('correção com a conferência começada: CORRECAO RETIDA, nada muda e nada é movido', () => {
  const amb = montar();
  rodar(amb);
  dipl(amb).valores[1][col('Status — Dados Pessoais')] = 'Conferido';
  const antes = JSON.stringify(dipl(amb).valores), movimentos = amb.drive.movimentos.length;
  comCorrecao(amb, 1, { nome: 'Outro Nome Fictício' }, [['RG', 'ARQUIVO_FICTICIO_1_RG_V2', true]]);
  const r = rodar(amb);
  assert.strictEqual(r.retidos, 1);
  assert.strictEqual(JSON.stringify(dipl(amb).valores), antes);
  assert.strictEqual(amb.drive.movimentos.length, movimentos);
  assert.strictEqual(enc(amb)[1].Resultado, 'CORRECAO RETIDA');
  rodar(amb);
  assert.strictEqual(enc(amb).length, 2, 'retida é final: não repete');
});

t('correção com divergência nova: CORRECAO RETIDA, nada muda; o aviso traz o texto do aluno, que não vai para ENCAMINHAMENTOS', () => {
  const amb = montar();
  rodar(amb);
  const antes = JSON.stringify(dipl(amb).valores), movimentos = amb.drive.movimentos.length;
  comCorrecao(amb, 1, { nome: 'Aluna Fictícia Um', divergenciaApontada: 'Meu nome tem acento <b>x</b>' }, [['RG', 'ARQUIVO_FICTICIO_1_RG_V2', true]]);
  const r = rodar(amb);
  assert.strictEqual(r.retidos, 1); assert.strictEqual(r.encaminhados, 0);
  assert.strictEqual(JSON.stringify(dipl(amb).valores), antes);
  assert.strictEqual(amb.drive.movimentos.length, movimentos);
  const e = enc(amb);
  assert.strictEqual(e[1].Resultado, 'CORRECAO RETIDA'); assert.strictEqual(e[1].Motivo, 'DIVERGENCIA_APONTADA');
  assert(!JSON.stringify(e).includes('acento'), 'texto do aluno não vai para ENCAMINHAMENTOS');
  assert.strictEqual(r.pendencias.length, 1);
  assert(/Gerenciador de Pessoas/.test(r.pendencias[0].motivo) && r.pendencias[0].motivo.includes('Meu nome tem acento <b>x</b>'), r.pendencias[0].motivo);
});

t('correção que mantém a divergência já encaminhada é aplicada', () => {
  const amb = montar();
  const ab = amb.planilhas[IDS.PEDIDOS].abas;
  rodar(amb);
  // a versão 1 (já encaminhada) passa a ter a divergência; a 2 repete o mesmo texto
  const v1 = ab.VERSOES.valores.find(l => l.includes(PID(1)));
  const iDados = ab.VERSOES.valores[0].indexOf('Dados do pedido');
  const d1 = JSON.parse(v1[iDados]); d1.divergenciaApontada = 'Texto fictício'; v1[iDados] = JSON.stringify(d1);
  comCorrecao(amb, 1, { nome: 'Aluna Fictícia Um', telefone: '11922222222', divergenciaApontada: 'Texto fictício' }, []);
  const r = rodar(amb);
  assert.strictEqual(r.encaminhados, 1); assert.strictEqual(r.retidos, 0);
  assert.strictEqual(enc(amb)[1].Motivo, 'CORRECAO_APLICADA');
});

/*==================== EQUIPE E ACESSO ====================*/

t('ADMINISTRADOR recebe as pendências (bloqueado e retida) com o motivo em texto', () => {
  const amb = montar({ central: [], pedidos: [protocolo(1), protocolo(2)] });
  central(amb).valores.push(['9000002', 'Aluna Fictícia 2', '2021', '', '', '']);
  const r = rodar(amb);
  assert.strictEqual(r.encaminhados, 1); assert.strictEqual(r.bloqueados, 1);
  assert.strictEqual(r.pendencias.length, 1);
  assert.strictEqual(r.pendencias[0].protocolo, 'PCG-20262-00001');
  assert(/Gerenciador de Pessoas/.test(r.pendencias[0].motivo));
  assert(!('registroId' in r.pendencias[0]) && !JSON.stringify(r.pendencias).includes(PID(1)), 'sem IDs internos para a página');
});

t('LEITOR e pessoa sem acesso não disparam o encaminhador', () => {
  for (const u of [LEITOR, 'fora@exemplo.invalid', '']) {
    const amb = montar();
    assert.throws(() => rodar(amb, u));
    assert.strictEqual(dipl(amb).valores.length, 1);
    assert.strictEqual(enc(amb).length, 0);
  }
});

t('gatilho: roda no contexto do dono e registra a origem; pela página é recusado', () => {
  let amb = montar({ usuario: DONO });
  const r = S.executar(amb, 'encaminharPedidosColacaoPorGatilho', []);
  assert.strictEqual(r.encaminhados, 1);
  assert.strictEqual(enc(amb)[0].Origem, 'GATILHO');
  semDadoPessoalNoLog(amb);
  amb = montar({ usuario: ADMIN });
  assert.throws(() => S.executar(amb, 'encaminharPedidosColacaoPorGatilho', []), /editor do projeto/);
});

t('trava ocupada: não grava nada e avisa', () => {
  const amb = montar();
  const ctx = S.contexto(amb);
  ctx.LockService.getScriptLock = () => ({ tryLock: () => false, waitLock: () => { throw new Error('ocupado'); }, releaseLock: () => {} });
  const r = ctx.executarEncaminhadorColacao();
  assert.strictEqual(r.ocupado, true);
  assert.strictEqual(dipl(amb).valores.length, 1);
});

t('vários pedidos: cada um na sua linha, sem misturar dados', () => {
  const amb = montar({ pedidos: [protocolo(1), protocolo(2), protocolo(3)],
    central: [1, 2, 3].map(n => ['900000' + n, 'Aluna Fictícia ' + n, '2021', '', '', '']) });
  assert.strictEqual(rodar(amb).encaminhados, 3);
  [1, 2, 3].forEach(n => {
    const linha = dipl(amb).valores.findIndex(l => l[col('Registro ID')] === RID(n));
    assert(linha > 0);
    assert.strictEqual(celula(amb, linha, 'Nº USP'), '900000' + n);
    assert.strictEqual(celula(amb, linha, 'Nome completo'), 'Aluna Fictícia ' + n);
  });
  semDadoPessoalNoLog(amb);
});

console.log(`\n${ok} ok, ${falhas} falha(s).`);
process.exit(falhas ? 1 : 0);

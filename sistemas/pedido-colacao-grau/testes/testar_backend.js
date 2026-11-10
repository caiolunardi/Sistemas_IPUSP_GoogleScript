// Testes do servidor do Formulário de Pedido de Colação de Grau 2.0.
// Casos negativos do plano (T-AUT, T-DUP, T-CON, T-DOC, T-PRZ, T-REC)
// que cabem no recebimento (PR 3). Dados 100% fictícios.
// Uso: node testar_backend.js
'use strict';
const vm = require('vm');
const { ambiente, contexto, executar } = require('./simulacao');

let ok = 0;
const falhas = [];
function caso(nome, fn) {
  try { fn(); ok++; } catch (e) { falhas.push(nome + ': ' + (e && e.stack || e)); }
}
function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'diferente') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
function verdade(v, msg) { if (!v) throw new Error(msg || 'esperava verdadeiro'); }
function erroCom(fn, codigo, msg) {
  try { fn(); } catch (e) {
    if (codigo && e.codigoColacao !== codigo) throw new Error((msg || 'código') + ': esperava ' + codigo + ', veio ' + e.codigoColacao + ' (' + e.message + ')');
    return e;
  }
  throw new Error((msg || '') + ': esperava erro ' + codigo);
}

/*---------------- cenário fictício ----------------*/

const ID = {
  INDICE: 'IDINDEX_FICTICIO_0000000000',
  PEDIDOS: 'PEDIDOS_FICTICIO_000000000P', PEDIDOS_H: 'PEDIDOS_FICTICIO_000000000H',
  PASTA: 'PASTA_PROV_FICTICIA_000000P', PASTA_H: 'PASTA_PROV_FICTICIA_000000H',
  ALUNOS: 'ALUNOS_FICTICIO_0000000000P', ALUNOS_H: 'ALUNOS_FICTICIO_0000000000H',
  PERIODOS: 'PERIODOS_FICTICIO_00000000P', PERIODOS_H: 'PERIODOS_FICTICIO_00000000H',
  DIPLOMAS: 'DIPLOMAS_FICTICIO_00000000P', DIPLOMAS_H: 'DIPLOMAS_FICTICIO_00000000H'
};

const abasPedidos = (() => {
  const amb0 = ambiente({});
  return vm.runInContext('ABAS_PEDIDOS', contexto(amb0));
})();

function planilhaPedidos(opcoes) {
  const abas = {};
  Object.keys(abasPedidos).forEach(k => {
    const def = abasPedidos[k];
    if (opcoes && opcoes.semAba === def.nome) return;
    let cols = def.colunas.slice();
    if (opcoes && opcoes.semColuna) cols = cols.filter(c => c !== opcoes.semColuna);
    abas[def.nome] = [cols];
  });
  if (opcoes && opcoes.decisoes) abas.DECISOES_CADASTRO = [['Protocolo ID', 'Decisão']].concat(opcoes.decisoes);
  return abas;
}

const ALUNOS = [
  ['N. USP', 'Nome', 'Ingresso', 'E-mail USP', 'ID da Pasta', 'E-mail secundário'],
  ['9000001', 'Aluna Fictícia Um', '2021/1', 'ana@usp.br', 'PASTA_ALUNA_UM_FICTICIA_0001', 'um@exemplo.invalid'],
  ['9000002', 'Aluno Fictício Dois', '2020/1', 'bruno@usp.br', '', ''],
  ['9000003', 'Pessoa Repetida A', '2020/1', 'pcg.repetido@usp.br', '', ''],
  ['9000004', 'Pessoa Repetida B', '2020/1', 'pcg.repetido@usp.br', '', ''],
  ['9000005', 'Número Repetido A', '2019/1', 'pcg.rep.a@usp.br', '', ''],
  ['9000005', 'Número Repetido B', '2019/1', 'pcg.rep.b@usp.br', '', ''],
  ['', 'Sem Número Fictício', '2019/1', 'pcg.sem.numero@usp.br', '', ''],
  ['9000008', 'Sem Ingresso Fictício', '', 'pcg.sem.ingresso@usp.br', '', '']
];

function periodo(opcoes) {
  const o = Object.assign({ tipo: 'Sazonal', abre: '01/11/2026', hAbre: '00:00', fecha: '30/11/2026', hFecha: '23:59', semestre: '2026/2' }, opcoes || {});
  return [
    ['Formulário', 'B', 'Tipo', 'Abre', 'Hora', 'Fecha', 'Hora', 'Abre2', 'H', 'Fecha2', 'H', 'L', 'Semestre'],
    ['Exclusão de Disciplinas', '', 'Sazonal', '01/01/2026', '00:00', '02/01/2026', '00:00', '', '', '', '', '', '2026/1'],
    ['Pedido de Colação de Grau', '', o.tipo, o.abre, o.hAbre, o.fecha, o.hFecha, '', '', '', '', '', o.semestre]
  ];
}

function cenario(opcoes) {
  const o = Object.assign({ usuario: 'ana@usp.br', ambiente: null }, opcoes || {});
  const indice = [
    ['Chave', 'Tipo', 'ID de Produção', 'Homologação', 'Descrição'],
    ['PEDIDOS_COLACAO', 'spreadsheet', ID.PEDIDOS, ID.PEDIDOS_H, ''],
    ['PASTA_PROVISORIOS_COLACAO', 'folder', ID.PASTA, ID.PASTA_H, ''],
    ['PLANILHA_ALUNOS', 'spreadsheet', ID.ALUNOS, ID.ALUNOS_H, ''],
    ['PERIODOS', 'spreadsheet', ID.PERIODOS, ID.PERIODOS_H, ''],
    ['EMISSAO_DIPLOMAS', 'spreadsheet', ID.DIPLOMAS, ID.DIPLOMAS_H, '']
  ];
  const props = { ID_INDEX_SPREADSHEET_ID: ID.INDICE };
  if (o.ambiente) props.AMBIENTE = o.ambiente;
  const planilhas = {};
  planilhas[ID.INDICE] = { 'Página1': indice };
  [['', ''], ['_H', 'H']].forEach(([suf]) => {
    planilhas[ID['PEDIDOS' + suf]] = planilhaPedidos(o.pedidos);
    planilhas[ID['PERIODOS' + suf]] = { 'Página1': periodo(o.periodo) };
    planilhas[ID['DIPLOMAS' + suf]] = { 'Diplomas': [['Registro ID', 'Nome completo', 'Status — Dados Pessoais']].concat(o.diplomas || []) };
  });
  if (!o.semAlunos) {
    planilhas[ID.ALUNOS] = { 'Página1': ALUNOS };
    planilhas[ID.ALUNOS_H] = { 'Página1': ALUNOS };
  }
  return ambiente({ usuario: o.usuario, propriedades: props, planilhas: planilhas, pastas: [ID.PASTA, ID.PASTA_H], agora: o.agora, passoMs: o.passoMs });
}

const B64 = {
  PDF: Buffer.from('%PDF-1.4\n% documento fictício de teste\n').toString('base64'),
  PNG: Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.from('fictício')]).toString('base64'),
  JPEG: Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.from('fictício')]).toString('base64'),
  EXE: Buffer.from('MZ\x90\x00 executável disfarçado').toString('base64'),
  HTML: Buffer.from('<html><script>alert(1)</script></html>').toString('base64')
};

let contadorChave = 0;
function chave() { contadorChave++; return '00000000-0000-4000-8000-' + String(contadorChave).padStart(12, '0'); }

function pedido(extra) {
  return Object.assign({
    chaveEnvio: chave(),
    nome: 'Aluna Fictícia Um', nUsp: '9000001', anoIngresso: '2021', rg: '00.000.000-0',
    telefone: '11900000000', emailAlternativo: 'um@exemplo.invalid',
    bachConcluiu: true, licConcluiu: false, psiConcluiu: true, permaneceMatriculado: 'SIM',
    habilitacaoPendente: ['Licenciatura'], procuracao: 'NÃO', procuradorNome: '', procuradorRg: '',
    colacaoAntecipada: 'NÃO', observacoesAluno: '', divergenciaApontada: '',
    documentos: [{ tipo: 'RG', ordem: 1, base64: B64.PDF }, { tipo: 'CERTIDAO', ordem: 1, base64: B64.PNG }]
  }, extra || {});
}

function tabela(amb, id, aba) {
  const valores = amb.planilhas[id].abas[aba].valores;
  const t = valores[0];
  return valores.slice(1).map(l => { const o = {}; t.forEach((c, i) => { o[c] = l[i] === undefined ? '' : l[i]; }); return o; });
}
const protocolos = (amb, id = ID.PEDIDOS) => tabela(amb, id, 'PROTOCOLOS');
const versoes = (amb, id = ID.PEDIDOS) => tabela(amb, id, 'VERSOES');
const documentos = (amb, id = ID.PEDIDOS) => tabela(amb, id, 'DOCUMENTOS');
const eventos = (amb, id = ID.PEDIDOS) => tabela(amb, id, 'EVENTOS');
const enviar = (amb, dados) => executar(amb, 'enviarPedidoColacao', [dados]);

/*---------------- T-AUT: autorização ----------------*/

const PUBLICAS = [
  ['obterDadosIniciais', []],
  ['enviarPedidoColacao', [null]],
  ['listarMeusPedidos', []],
  ['reenviarComprovanteColacao', ['PCG-20262-00001']]
];

['', 'x@gmail.com', 'aluna@usp.br.exemplo.invalid', '*@usp.br', 'a,b@usp.br', 'usp.br', '@usp.br'].forEach(usuario => {
  PUBLICAS.forEach(([fn, args]) => {
    caso(`T-AUT-01 ${fn} recusa sessão "${usuario}" antes de abrir qualquer planilha`, () => {
      const amb = cenario({ usuario: usuario });
      erroCom(() => executar(amb, fn, args), 'SEM_IDENTIFICACAO');
      igual(amb.aberturas, [], 'abriu recurso');
    });
  });
});

caso('T-AUT-01 doGet sem conta USP serve só o aviso, sem abrir nada', () => {
  const amb = cenario({ usuario: 'x@gmail.com' });
  const pagina = executar(amb, 'doGet', []);
  verdade(pagina.html && pagina.html.indexOf('conta institucional') !== -1, 'aviso');
  igual(amb.aberturas, []);
});

caso('doGet com conta USP serve o formulário; prefixo de homologação no título', () => {
  const amb = cenario({ ambiente: 'homologacao' });
  const pagina = executar(amb, 'doGet', []);
  igual(pagina.nome, 'ColacaoApp');
  igual(pagina.titulo, '[HOMOLOGAÇÃO] Pedido de Colação de Grau');
});

caso('T-AUT-01 funções do responsável recusam quem abre pela página', () => {
  ['diagnosticarConfiguracao', 'prepararPlanilhaPedidosColacao'].forEach(fn => {
    const amb = cenario({ usuario: 'ana@usp.br' });
    erroCom(() => executar(amb, fn, []), 'SO_RESPONSAVEL', fn);
    igual(amb.aberturas, [], fn);
  });
});

caso('T-AUT-02 outra pessoa não reenvia recibo, não vê nem retoma o pedido alheio', () => {
  const amb = cenario();
  const dados = pedido();
  const r = enviar(amb, dados);
  amb.usuario = 'bruno@usp.br';
  erroCom(() => executar(amb, 'reenviarComprovanteColacao', [r.protocolo]), 'NAO_ENCONTRADO');
  igual(executar(amb, 'listarMeusPedidos', []), []);
  const d2 = pedido({ chaveEnvio: dados.chaveEnvio, nome: 'Aluno Fictício Dois', nUsp: '9000002' });
  erroCom(() => enviar(amb, d2), 'CHAVE_INVALIDA', 'reuso da chave alheia');
  igual(protocolos(amb).length, 1);
  igual(versoes(amb).length, 1);
  const inicio = executar(amb, 'obterDadosIniciais', []);
  igual(inicio.pedidoAtual, undefined, 'viu pedido alheio');
  igual(amb.emails.filter(e => e.to === 'bruno@usp.br').length, 0);
});

caso('T-AUT-03 identidade confirmada: servidor usa nome e nº USP do cadastro', () => {
  const amb = cenario();
  const r = enviar(amb, pedido({ nome: 'Outro Nome', nUsp: '9000002', anoIngresso: '1999' }));
  const p = protocolos(amb)[0];
  igual([p['Cadastro'], p['Nº USP informado'], p['Nome informado']], ['CONFIRMADO', '9000001', 'Aluna Fictícia Um']);
  igual(r.cadastro, 'CONFIRMADO');
  const dados = JSON.parse(versoes(amb)[0]['Dados do pedido']);
  igual([dados.nome, dados.nUsp, dados.anoIngresso], ['Aluna Fictícia Um', '9000001', '2021']);
});

caso('T-AUT-03 divergência apontada pelo aluno confirmado vira PENDENTE (D2)', () => {
  const amb = cenario();
  const r = enviar(amb, pedido({ divergenciaApontada: 'Falta um acento no sobrenome.' }));
  const p = protocolos(amb)[0];
  igual([p['Cadastro'], p['Motivo do cadastro']], ['PENDENTE', 'DIVERGENCIA_APONTADA']);
  igual(r.cadastro, 'PENDENTE');
});

caso('T-AUT-04 provisório com nº USP de outra pessoa: PENDENTE com conflito, sem revelar nada', () => {
  const amb = cenario({ usuario: 'novo@usp.br' });
  const inicio = executar(amb, 'obterDadosIniciais', []);
  igual(inicio.identidade, { situacao: 'PROVISORIO' });
  const r = enviar(amb, pedido({ nome: 'Nova Pessoa Fictícia', nUsp: '9000001', anoIngresso: '2022' }));
  const p = protocolos(amb)[0];
  igual([p['Cadastro'], p['Motivo do cadastro']], ['PENDENTE', 'CONFLITO_NUSP']);
  const texto = JSON.stringify([inicio, r, executar(amb, 'listarMeusPedidos', [])]);
  ['Aluna Fictícia Um', 'ana@usp.br', 'um@exemplo.invalid', 'CONFLITO'].forEach(s => verdade(texto.indexOf(s) === -1, 'revelou ' + s));
  // A resposta é a mesma de quem não tem cadastro nenhum.
  const amb2 = cenario({ usuario: 'outro@usp.br' });
  const r2 = enviar(amb2, pedido({ nome: 'Outra Nova', nUsp: '9099999', anoIngresso: '2022' }));
  igual(Object.keys(r).sort(), Object.keys(r2).sort());
  igual(r.cadastro, r2.cadastro);
});

caso('T-AUT-04 a dona do nº USP não vê o pedido provisório de quem digitou o número dela', () => {
  const amb = cenario({ usuario: 'novo@usp.br' });
  enviar(amb, pedido({ nome: 'Nova Pessoa Fictícia', nUsp: '9000001', anoIngresso: '2022' }));
  amb.usuario = 'ana@usp.br';
  igual(executar(amb, 'listarMeusPedidos', []), []);
  const inicio = executar(amb, 'obterDadosIniciais', []);
  igual(inicio.pedidoAtual, undefined);
  enviar(amb, pedido());
  igual(protocolos(amb).length, 2, 'cada uma com o seu protocolo');
});

caso('T-AUT-05 provisório não recebe documentos de ninguém para manter', () => {
  const amb = cenario();
  enviar(amb, pedido());
  amb.usuario = 'novo@usp.br';
  const inicio = executar(amb, 'obterDadosIniciais', []);
  igual(inicio.pedidoAtual, undefined);
  erroCom(() => enviar(amb, pedido({ nome: 'Nova', nUsp: '9000001', documentos: [] })), 'DOCUMENTO_FALTANDO');
});

caso('T-AUT-06 (parte local) aluno não precisa de permissão: nada é compartilhado', () => {
  const amb = cenario();
  enviar(amb, pedido());
  // A simulação não tem addEditor/addViewer/setSharing: se o código
  // tentasse compartilhar, o envio falharia.
  igual(amb.lixeira, []);
});

/*---------------- T-DUP ----------------*/

caso('T-DUP-01 mesma chave duas vezes: um protocolo, uma versão, um arquivo por documento, um recibo', () => {
  const amb = cenario();
  const dados = pedido();
  const r1 = enviar(amb, dados);
  const r2 = enviar(amb, dados);
  igual(r1.protocolo, 'PCG-20262-00001');
  igual([r2.protocolo, r2.recebidoEm, r2.versao], [r1.protocolo, r1.recebidoEm, 1]);
  igual([protocolos(amb).length, versoes(amb).length, documentos(amb).length, amb.arquivos.length], [1, 1, 2, 2]);
  igual(amb.emails.length, 1);
  igual(r2.reciboEnviado, null);
});

caso('T-DUP-02 outra chave na mesma colação vira correção (versão 2), sem pedido novo', () => {
  const amb = cenario();
  const r1 = enviar(amb, pedido());
  amb.agora += 3600000;
  const r2 = enviar(amb, pedido({ telefone: '11911111111', documentos: [{ tipo: 'RG', ordem: 1, base64: B64.JPEG }] }));
  igual([r2.protocolo, r2.versao, r2.correcao, r2.recebidoEm], [r1.protocolo, 2, true, r1.recebidoEm]);
  verdade(r2.correcaoEnviadaEm && r2.correcaoEnviadaEm !== r1.recebidoEm, 'hora da correção');
  igual(protocolos(amb).length, 1);
  igual(versoes(amb).map(v => [v['Versão'], v['Situação']]), [[1, 'RECEBIDO'], [2, 'RECEBIDO']]);
  const docs2 = documentos(amb).filter(d => d['Versão'] === 2);
  igual(docs2.map(d => [d['Tipo'], d['Origem']]).sort(), [['CERTIDAO', 'REUTILIZADO'], ['RG', 'ENVIADO']]);
  const certidaoV1 = documentos(amb).filter(d => d['Versão'] === 1 && d['Tipo'] === 'CERTIDAO')[0];
  const certidaoV2 = docs2.filter(d => d['Tipo'] === 'CERTIDAO')[0];
  igual(certidaoV2['ID do arquivo'], certidaoV1['ID do arquivo']);
  igual(certidaoV2['Documento de origem'], certidaoV1['Documento ID']);
  igual(amb.arquivos.length, 3, 'só o RG novo foi criado');
  const ev = eventos(amb).filter(e => e['Evento'] === 'CORRECAO_INICIADA')[0];
  verdade(ev['Campos alterados'].indexOf('telefone') !== -1 && ev['Campos alterados'].indexOf('11911111111') === -1, 'campos sem valores');
});

caso('T-DUP-07 correção sem nenhuma mudança é recusada e não grava versão', () => {
  const amb = cenario();
  enviar(amb, pedido());
  amb.agora += 3600000;
  const antes = amb.escritas.length;
  erroCom(() => enviar(amb, pedido({ documentos: [] })), 'SEM_ALTERACAO');
  igual(versoes(amb).length, 1);
  igual(amb.arquivos.length, 2);
  igual(amb.escritas.length, antes, 'nada gravado');
});

caso('T-DUP-03 mesmo nº USP em outra colação: pedido novo; anteriores intactos', () => {
  const amb = cenario();
  enviar(amb, pedido());
  amb.planilhas[ID.PERIODOS].abas['Página1'].valores[2][12] = '2027/1';
  const r = enviar(amb, pedido());
  igual(r.protocolo, 'PCG-20271-00001');
  igual(protocolos(amb).map(p => p['Colação']), ['20262', '20271']);
  igual(amb.arquivos.length, 4);
  igual(amb.lixeira, []);
});

caso('T-DUP-06 cadastro inconsistente vira PENDENTE com o motivo certo', () => {
  [['pcg.repetido@usp.br', 'EMAIL_REPETIDO'], ['pcg.rep.a@usp.br', 'NUSP_REPETIDO'], ['pcg.sem.numero@usp.br', 'NUSP_VAZIO'], ['b@usp.br', 'SEM_CADASTRO']]
    .forEach(([usuario, motivo]) => {
      const amb = cenario({ usuario: usuario });
      igual(executar(amb, 'obterDadosIniciais', []).identidade, { situacao: 'PROVISORIO' }, usuario);
      enviar(amb, pedido({ nome: 'Pessoa Fictícia', nUsp: '9099990', anoIngresso: '2020' }));
      const p = protocolos(amb)[0];
      igual([p['Cadastro'], p['Motivo do cadastro']], ['PENDENTE', motivo], usuario);
    });
});

caso('Requisito 4: sem cadastro ou com a planilha central fora do ar, o pedido é protocolado no prazo', () => {
  const amb = cenario({ semAlunos: true });
  const r = enviar(amb, pedido());
  igual([r.protocolo, r.cadastro], ['PCG-20262-00001', 'PENDENTE']);
  igual(protocolos(amb)[0]['Motivo do cadastro'], 'CADASTRO_INDISPONIVEL');
});

caso('Ingresso vazio no cadastro confirmado: usa o digitado', () => {
  const amb = cenario({ usuario: 'pcg.sem.ingresso@usp.br' });
  erroCom(() => enviar(amb, pedido({ anoIngresso: '' })), 'CAMPO_INVALIDO');
  enviar(amb, pedido({ anoIngresso: '2018' }));
  igual(JSON.parse(versoes(amb)[0]['Dados do pedido']).anoIngresso, '2018');
});

caso('Numeração sequencial por colação e pedido REJEITADO não bloqueia pedido novo', () => {
  const amb = cenario();
  enviar(amb, pedido());
  amb.usuario = 'bruno@usp.br';
  const r2 = enviar(amb, pedido());
  igual(r2.protocolo, 'PCG-20262-00002');
  const idDois = protocolos(amb)[1]['Protocolo ID'];
  amb.planilhas[ID.PEDIDOS].abas.DECISOES_CADASTRO = null;
  const pl = amb.planilhas[ID.PEDIDOS];
  pl.insertSheet('DECISOES_CADASTRO');
  pl.abas.DECISOES_CADASTRO.valores = [['Protocolo ID', 'Decisão'], [idDois, 'REJEITADO']];
  const r3 = enviar(amb, pedido());
  igual([r3.protocolo, r3.correcao], ['PCG-20262-00003', false]);
  const lista = executar(amb, 'listarMeusPedidos', []);
  verdade(lista.some(p => /não aprovado/.test(p.cadastro)), 'decisão aparece');
});

/*---------------- T-CON ----------------*/

caso('T-CON-01 trava ocupada: nada gravado e mensagem para enviar de novo', () => {
  const amb = cenario();
  amb.travaLivre = false;
  const e = erroCom(() => enviar(amb, pedido()), 'OCUPADO');
  verdade(/não será duplicado/.test(e.message));
  igual(amb.escritas, []);
});

caso('T-CON-01 duas execuções com a mesma chave (a primeira caiu no meio): um protocolo', () => {
  const amb = cenario();
  const dados = pedido();
  let n = 0;
  amb.falhar = ev => ev === 'createFile' && ++n === 2;
  erroCom(() => enviar(amb, dados), 'INDISPONIVEL');
  amb.falhar = null;
  const r = enviar(amb, dados);
  igual([protocolos(amb).length, versoes(amb).length, documentos(amb).length, amb.arquivos.length], [1, 1, 2, 2]);
  igual(r.protocolo, 'PCG-20262-00001');
});

/*---------------- T-DOC ----------------*/

caso('T-DOC-03 nome dos arquivos novos: tipo, nome, colação, protocolo e versão; nada vai para a lixeira', () => {
  const amb = cenario();
  enviar(amb, pedido());
  igual(amb.arquivos.map(a => a.nome).sort(), [
    'Certidão de Nascimento - Aluna Fictícia Um - 20262 - PCG-20262-00001 - v1.png',
    'RG-CIN - Aluna Fictícia Um - 20262 - PCG-20262-00001 - v1.pdf'
  ]);
  igual(amb.arquivos.map(a => a.mime).sort(), ['application/pdf', 'image/png']);
  verdade(amb.arquivos.every(a => a.pasta !== ID.PASTA), 'arquivo fora da subpasta do protocolo');
  igual(amb.pastas[ID.PASTA].pastas.map(p => p.nome), ['PCG-20262-00001']);
  igual(amb.lixeira, []);
});

caso('T-DOC-06 conteúdo recusado antes de gravar qualquer coisa', () => {
  const grande = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(10 * 1024 * 1024)]).toString('base64');
  const seis = Array.from({ length: 6 }, (_, i) => ({ tipo: 'RG', ordem: i + 1, base64: B64.PDF }));
  [
    ['executável com nome .pdf', [{ tipo: 'RG', ordem: 1, nome: 'rg.pdf', mimeType: 'application/pdf', base64: B64.EXE }]],
    ['HTML', [{ tipo: 'RG', ordem: 1, base64: B64.HTML }]],
    ['vazio', [{ tipo: 'RG', ordem: 1, base64: '' }]],
    ['acima de 10 MB', [{ tipo: 'RG', ordem: 1, base64: grande }]],
    ['mais de 5 arquivos', seis],
    ['tipo desconhecido', [{ tipo: 'FOTO', ordem: 1, base64: B64.PDF }]],
    ['base64 inválido', [{ tipo: 'RG', ordem: 1, base64: '@@@' }]],
    ['repetido', [{ tipo: 'RG', ordem: 1, base64: B64.PDF }, { tipo: 'RG', ordem: 1, base64: B64.PDF }]],
    ['não é lista', 'texto']
  ].forEach(([nome, docs]) => {
    const amb = cenario();
    erroCom(() => enviar(amb, pedido({ documentos: docs })), 'DOCUMENTO_INVALIDO', nome);
    igual(amb.aberturas, [], nome + ': abriu recurso');
  });
});

caso('T-DOC-06 MIME falso do navegador não conta: PNG com nome .pdf vira .png', () => {
  const amb = cenario();
  enviar(amb, pedido({ documentos: [{ tipo: 'RG', ordem: 1, nome: 'rg.pdf', mimeType: 'application/pdf', base64: B64.PNG }, { tipo: 'CERTIDAO', ordem: 1, base64: B64.PDF }] }));
  const rg = amb.arquivos.filter(a => /^RG-CIN/.test(a.nome))[0];
  igual([rg.mime, /\.png$/.test(rg.nome)], ['image/png', true]);
  const doc = documentos(amb).filter(d => d['Tipo'] === 'RG')[0];
  igual(doc['Formato'], 'PNG');
  igual(doc['SHA-256'].length, 64);
});

caso('Pedido novo sem os dois documentos obrigatórios: recusado sem gravar', () => {
  const amb = cenario();
  erroCom(() => enviar(amb, pedido({ documentos: [{ tipo: 'RG', ordem: 1, base64: B64.PDF }] })), 'DOCUMENTO_FALTANDO');
  igual(amb.escritas, []);
});

/*---------------- campos ----------------*/

caso('Campos conferidos no servidor', () => {
  [
    { rg: '' }, { telefone: '123' }, { emailAlternativo: 'sem-arroba' }, { bachConcluiu: false, psiConcluiu: false },
    { permaneceMatriculado: 'TALVEZ' }, { procuracao: 'SIM', procuradorNome: '' }, { colacaoAntecipada: '' },
    { habilitacaoPendente: ['Bacharelado'] }, { habilitacaoPendente: ['Doutorado'] }, { anoIngresso: '20a1' }, { anoIngresso: '1900' }
  ].forEach(extra => {
    const amb = cenario();
    erroCom(() => enviar(amb, pedido(extra)), 'CAMPO_INVALIDO', JSON.stringify(extra));
    igual(amb.aberturas, []);
  });
  const amb = cenario();
  erroCom(() => enviar(amb, pedido({ chaveEnvio: 'qualquer' })), 'CHAVE_INVALIDA');
});

caso('Texto que parece fórmula não vira fórmula', () => {
  const amb = cenario();
  enviar(amb, pedido({ observacoesAluno: '=IMPORTXML("http://exemplo.invalid")' }));
  const dados = JSON.parse(versoes(amb)[0]['Dados do pedido']);
  verdade(dados.observacoesAluno[0] === "'", 'prefixo');
  const linha = amb.planilhas[ID.PEDIDOS].abas.PROTOCOLOS.gravacoes[0][1];
  verdade(linha.every(v => typeof v !== 'string' || v === '' || v[0] === "'"), 'todo texto gravado como texto');
});

/*---------------- T-PRZ ----------------*/

caso('T-PRZ-01 23:59:59 aceito; 00:00:00 do dia seguinte recusado', () => {
  const amb = cenario({ agora: Date.parse('2026-11-30T23:59:59-03:00') });
  const r = enviar(amb, pedido());
  igual(r.recebidoEm, '30/11/2026 às 23:59:59');
  const amb2 = cenario({ agora: Date.parse('2026-12-01T00:00:00-03:00') });
  erroCom(() => enviar(amb2, pedido()), 'FECHADO');
  igual(amb2.escritas, []);
  const amb3 = cenario({ agora: Date.parse('2026-10-31T23:59:59-03:00') });
  erroCom(() => enviar(amb3, pedido()), 'FECHADO');
});

caso('T-PRZ-02 começou antes do fechamento e terminou depois: vale a hora do início', () => {
  const amb = cenario({ agora: Date.parse('2026-11-30T23:59:58-03:00'), passoMs: 700 });
  const r = enviar(amb, pedido());
  igual(r.recebidoEm, '30/11/2026 às 23:59:58');
  verdade(amb.agora > Date.parse('2026-12-01T00:00:00-03:00'), 'o relógio passou do fechamento');
  igual(protocolos(amb)[0]['Recebimento'], 'RECEBIDO');
});

caso('T-PRZ-03 retomada com a mesma chave depois do fechamento conclui com a hora original', () => {
  const amb = cenario({ agora: Date.parse('2026-11-30T23:50:00-03:00') });
  const dados = pedido();
  amb.falhar = ev => ev === 'createFile';
  erroCom(() => enviar(amb, dados), 'INDISPONIVEL');
  amb.falhar = null;
  amb.agora = Date.parse('2026-12-02T10:00:00-03:00');
  const r = enviar(amb, dados);
  igual(r.recebidoEm, '30/11/2026 às 23:50:00');
  igual(protocolos(amb)[0]['Recebido em'], '2026-11-30T23:50:00.000-03:00');
});

caso('T-PRZ-05 mudar o semestre em PERIODOS depois não muda a colação do pedido', () => {
  const amb = cenario();
  enviar(amb, pedido());
  amb.planilhas[ID.PERIODOS].abas['Página1'].valores[2][12] = '2027/1';
  igual(protocolos(amb)[0]['Colação'], '20262');
  igual(protocolos(amb)[0]['Semestre do período'], '2026/2');
  igual(protocolos(amb)[0]['Janela do período'], '2026-11-01 00:00 a 2026-11-30 23:59');
  igual(executar(amb, 'obterDadosIniciais', []).pedidoAtual, undefined);
});

caso('T-PRZ-06 correção depois do fechamento é recusada', () => {
  const amb = cenario();
  enviar(amb, pedido());
  amb.agora = Date.parse('2026-12-01T08:00:00-03:00');
  erroCom(() => enviar(amb, pedido()), 'FECHADO');
  igual(versoes(amb).length, 1);
  const inicio = executar(amb, 'obterDadosIniciais', []);
  igual([inicio.periodoFechado, inicio.temPedidos], [true, true]);
});

caso('Período contínuo nunca fecha; período ausente ou semestre inválido dá mensagem', () => {
  const amb = cenario({ periodo: { tipo: 'Contínuo', abre: '', fecha: '' }, agora: Date.parse('2027-05-05T05:00:00-03:00') });
  igual(enviar(amb, pedido()).protocolo, 'PCG-20262-00001');
  const amb2 = cenario({ periodo: { semestre: '26/2' } });
  verdade(/formato inesperado/.test(executar(amb2, 'obterDadosIniciais', []).periodoErro));
  erroCom(() => enviar(amb2, pedido()), 'PERIODO_INDISPONIVEL');
});

/*---------------- D3 ----------------*/

caso('D3 correção recusada quando a equipe já preencheu "Status — Dados Pessoais"', () => {
  const amb = cenario();
  enviar(amb, pedido());
  const registroId = protocolos(amb)[0]['Registro ID'];
  amb.planilhas[ID.DIPLOMAS].abas.Diplomas.valores.push([registroId, 'Aluna Fictícia Um', 'Conferido']);
  const inicio = executar(amb, 'obterDadosIniciais', []);
  igual([inicio.pedidoAtual.protocolo, inicio.pedidoAtual.podeCorrigir], ['PCG-20262-00001', false]);
  erroCom(() => enviar(amb, pedido()), 'CORRECAO_ENCERRADA');
  igual(versoes(amb).length, 1);
  verdade(amb.escritas.every(e => e.indexOf(ID.DIPLOMAS) !== 0), 'gravou na aba Diplomas');
});

caso('D3 linha encaminhada com status vazio permite correção; Registro ID repetido não', () => {
  const amb = cenario();
  enviar(amb, pedido());
  const registroId = protocolos(amb)[0]['Registro ID'];
  const diplomas = amb.planilhas[ID.DIPLOMAS].abas.Diplomas.valores;
  diplomas.push([registroId, 'Aluna Fictícia Um', '']);
  igual(executar(amb, 'obterDadosIniciais', []).pedidoAtual.podeCorrigir, true);
  diplomas.push([registroId, 'Aluna Fictícia Um', '']);
  igual(executar(amb, 'obterDadosIniciais', []).pedidoAtual.podeCorrigir, false);
});

caso('Correção pré-preenche só os campos do pedido, sem IDs internos', () => {
  const amb = cenario();
  enviar(amb, pedido({ observacoesAluno: 'Observação fictícia' }));
  const p = executar(amb, 'obterDadosIniciais', []).pedidoAtual;
  igual(p.dados.observacoesAluno, 'Observação fictícia');
  igual(p.documentosMantidos.sort(), ['CERTIDAO', 'RG']);
  const texto = JSON.stringify(p);
  [protocolos(amb)[0]['Registro ID'], protocolos(amb)[0]['Protocolo ID'], 'ARQ_', 'PASTA_', 'cadastro'].forEach(s => verdade(texto.indexOf(s) === -1, 'expôs ' + s));
});

/*---------------- T-REC ----------------*/

[
  ['depois de gravar PROTOCOLOS (passo 3)', ev => ev === 'appendRow:VERSOES'],
  ['no segundo arquivo (passo 4)', (() => { let n = 0; return ev => ev === 'createFile' && ++n === 2; })],
  ['ao registrar o documento (passo 4)', (() => { let n = 0; return ev => ev === 'appendRow:DOCUMENTOS' && ++n === 1; })],
  ['ao marcar RECEBIDO (passo 5)', (() => { let n = 0; return ev => ev === 'setValue:PROTOCOLOS' && ++n === 1; })]
].forEach(([quando, fabrica]) => {
  caso('T-REC-01 falha ' + quando + ': a mesma chave retoma sem duplicar', () => {
    const amb = cenario();
    const dados = pedido();
    amb.falhar = typeof fabrica() === 'function' ? fabrica() : fabrica;
    const e = erroCom(() => enviar(amb, dados), 'INDISPONIVEL');
    verdade(/data e a hora|Tente de novo/.test(e.message));
    igual(amb.emails.length, 0, 'recibo antes de concluir');
    amb.falhar = null;
    const r = enviar(amb, dados);
    igual(r.protocolo, 'PCG-20262-00001');
    igual([protocolos(amb).length, versoes(amb).length, documentos(amb).length], [1, 1, 2]);
    igual([protocolos(amb)[0]['Recebimento'], versoes(amb)[0]['Situação']], ['RECEBIDO', 'RECEBIDO']);
    verdade(amb.arquivos.length <= 3, 'arquivos demais: ' + amb.arquivos.length);
    igual(amb.emails.length, 1);
  });
});

caso('T-REC-01 pedido parado aparece no diagnóstico; a página retoma com a chave guardada', () => {
  const amb = cenario();
  amb.falhar = ev => ev === 'createFile';
  erroCom(() => enviar(amb, pedido()), 'INDISPONIVEL');
  amb.falhar = null;
  const inicio = executar(amb, 'obterDadosIniciais', []);
  igual(inicio.pedidoAtual.chaveIncompleta, versoes(amb)[0]['Chave de envio']);
  amb.agora += 20 * 60000;
  amb.usuario = 'gradip@usp.br';
  const diag = executar(amb, 'diagnosticarConfiguracao', []);
  igual(diag.parados, ['PCG-20262-00001 v1']);
  igual(diag.chaves.PEDIDOS_COLACAO, 'ok');
  amb.usuario = 'ana@usp.br';
  const lista = executar(amb, 'listarMeusPedidos', []);
  verdade(/incompleto/.test(lista[0].recebimento));
  igual(lista[0].podeReenviarRecibo, false);
});

caso('Requisito 2: se a releitura não confirma RECEBIDO, a página não recebe protocolo', () => {
  const amb = cenario();
  amb.ignorarSetValue = (aba, l, c, v) => aba === 'PROTOCOLOS' && v === "'RECEBIDO";
  const e = erroCom(() => enviar(amb, pedido()), 'INDISPONIVEL');
  verdade(e.message.indexOf('PCG-') === -1);
  igual(amb.emails.length, 0);
});

caso('T-REC-02 aba ou coluna faltando em PEDIDOS_COLACAO: nada gravado', () => {
  [{ semAba: 'DOCUMENTOS' }, { semColuna: 'Registro ID' }].forEach(o => {
    const amb = cenario({ pedidos: o });
    erroCom(() => enviar(amb, pedido()), 'INDISPONIVEL', JSON.stringify(o));
    igual(amb.escritas, []);
    erroCom(() => executar(amb, 'obterDadosIniciais', []), 'INDISPONIVEL');
  });
});

caso('T-REC-03 registros de execução e erros sem nome, nº USP, e-mail, RG ou IDs', () => {
  const amb = cenario();
  amb.falhar = ev => ev === 'createFile';
  const e = erroCom(() => enviar(amb, pedido()), 'INDISPONIVEL');
  amb.falhar = null;
  const amb2 = cenario({ semAlunos: true });
  enviar(amb2, pedido());
  const texto = amb.logs.concat(amb2.logs).join('\n') + e.message;
  ['Aluna', '9000001', 'ana@usp.br', '00.000.000-0'].concat(Object.values(ID)).forEach(s => verdade(texto.indexOf(s) === -1, 'vazou ' + s + ' em: ' + texto));
});

/*---------------- recibo (D9) ----------------*/

caso('Recibo: só para o e-mail da sessão, sem RG; falha no e-mail não desfaz o protocolo', () => {
  const amb = cenario();
  const r = enviar(amb, pedido());
  igual(amb.emails.length, 1);
  const m = amb.emails[0];
  igual([m.to, m.noReply], ['ana@usp.br', true]);
  igual(m.subject, 'Pedido de colação de grau PCG-20262-00001 recebido');
  verdade(m.body.indexOf('00.000.000-0') === -1 && m.body.indexOf('deferimento') !== -1);
  verdade(r.reciboEnviado === true);

  const amb2 = cenario({ usuario: 'bruno@usp.br' });
  amb2.falharEmail = true;
  const r2 = enviar(amb2, pedido());
  igual([r2.protocolo, r2.reciboEnviado], ['PCG-20262-00001', false]);
  igual(protocolos(amb2)[0]['Recebimento'], 'RECEBIDO');
  verdade(eventos(amb2).some(e => e['Evento'] === 'RECIBO_FALHOU'));
  amb2.falharEmail = false;
  igual(executar(amb2, 'reenviarComprovanteColacao', ['pcg-20262-00001']), { enviado: true });
  igual(amb2.emails.length, 1);
  erroCom(() => executar(amb2, 'reenviarComprovanteColacao', ['PCG-20262-00001']), 'AGUARDE');
});

caso('Trava ocupada só na hora do recibo não vira erro para quem já tem protocolo', () => {
  const amb = cenario();
  const ctx = contexto(amb);
  let chamadas = 0;
  ctx.LockService.getScriptLock = () => ({ tryLock: () => ++chamadas < 5, releaseLock: () => {} });
  const r = ctx.enviarPedidoColacao(pedido());
  igual([r.protocolo, r.reciboEnviado], ['PCG-20262-00001', false]);
});

caso('Homologação: assunto com [HOMOLOGAÇÃO] e só a coluna Homologação do ID_INDEX', () => {
  const amb = cenario({ ambiente: 'homologacao' });
  enviar(amb, pedido());
  verdade(amb.emails[0].subject.indexOf('[HOMOLOGAÇÃO] ') === 0);
  igual(protocolos(amb, ID.PEDIDOS_H).length, 1);
  [ID.PEDIDOS, ID.ALUNOS, ID.PERIODOS, ID.DIPLOMAS, ID.PASTA].forEach(id => verdade(amb.aberturas.indexOf(id) === -1, 'abriu produção'));
  verdade(executar(amb, 'obterDadosIniciais', []).homologacao === true);
});

caso('AMBIENTE inválido falha fechado', () => {
  const amb = cenario({ ambiente: 'teste' });
  erroCom(() => enviar(amb, pedido()), 'INDISPONIVEL');
  igual(amb.escritas, []);
});

/*---------------- escritor único ----------------*/

caso('Escritor único: só PEDIDOS_COLACAO (4 abas) e a pasta de entrada recebem gravação', () => {
  const amb = cenario();
  enviar(amb, pedido());
  enviar(amb, pedido({ telefone: '11922222222', documentos: [] }));
  executar(amb, 'listarMeusPedidos', []);
  executar(amb, 'obterDadosIniciais', []);
  const destinos = Array.from(new Set(amb.escritas)).sort();
  igual(destinos, [ID.PEDIDOS + '/DOCUMENTOS', ID.PEDIDOS + '/EVENTOS', ID.PEDIDOS + '/PROTOCOLOS', ID.PEDIDOS + '/VERSOES']);
  verdade(amb.arquivos.every(a => amb.pastas[ID.PASTA].pastas.some(p => p.id === a.pasta)), 'arquivo fora da entrada');
});

/*---------------- funções do responsável ----------------*/

caso('Preparação cria só as abas que faltam e não mexe na que existe', () => {
  const amb = cenario({ usuario: 'gradip@usp.br', pedidos: { semAba: 'EVENTOS', semColuna: 'Formato' } });
  const rel = executar(amb, 'prepararPlanilhaPedidosColacao', []);
  igual(rel.filter(l => /criada/.test(l)), ['EVENTOS: criada']);
  verdade(rel.some(l => /DOCUMENTOS: .*Formato.*nada foi alterado/.test(l)));
  igual(amb.planilhas[ID.PEDIDOS].abas.EVENTOS.valores[0], abasPedidos.EVENTOS.colunas);
  igual(amb.planilhas[ID.PEDIDOS].abas.DOCUMENTOS.valores[0].indexOf('Formato'), -1);
});

caso('Diagnóstico sem IDs nem dados pessoais', () => {
  const amb = cenario();
  enviar(amb, pedido());
  amb.usuario = 'gradip@usp.br';
  const diag = executar(amb, 'diagnosticarConfiguracao', []);
  igual([diag.protocolos, diag.periodo], [1, 'aberto, colação 20262']);
  const texto = JSON.stringify(diag) + amb.logs.join('\n');
  Object.values(ID).concat(['ana@usp.br', 'Aluna']).forEach(s => verdade(texto.indexOf(s) === -1, 'vazou ' + s));
});

caso('Só estas funções ficam ao alcance de google.script.run (sem "_" no fim)', () => {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'src');
  const publicas = fs.readdirSync(dir).filter(f => f.endsWith('.gs'))
    .flatMap(f => (fs.readFileSync(path.join(dir, f), 'utf8').match(/^function [A-Za-z0-9_]+/gm) || []).map(x => x.slice(9)))
    .filter(n => !n.endsWith('_')).sort();
  igual(publicas, ['diagnosticarConfiguracao', 'doGet', 'enviarPedidoColacao', 'listarMeusPedidos', 'obterDadosIniciais',
    'prepararPlanilhaPedidosColacao', 'reenviarComprovanteColacao']);
});

/*---------------- resultado ----------------*/

if (falhas.length) {
  console.log(falhas.join('\n\n'));
  console.log(`\n${ok} ok, ${falhas.length} falha(s)`);
  process.exit(1);
}
console.log(`${ok} ok`);

// Testes da 4.0.1 — proteção da pasta compartilhada e integridade das
// inclusões. Casos negativos de exclusão, duplicidade e concorrência
// simulada com outros projetos (Gerenciador de Pessoas, edição direta
// na planilha). Dados 100% fictícios (domínio exemplo.invalid, nº USP
// 9000000+, IDs sem formato de ID do Google).
// Uso: node sistemas/emissao-diplomas/testes/testar_integridade.js
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const S = require('./simulacao');

const IDS = {
  INDICE: 'INDICE_FICTICIO_0000000000000001',
  PERM: 'PERMISSOES_FICTICIA_PRODUCAO_0001',
  DIPL: 'DIPLOMAS_FICTICIA_PRODUCAO_000001',
  CENTRAL: 'ALUNOS_CENTRAL_FICTICIA_00000001',
  RAIZ: 'PASTA_RAIZ_FICTICIA_0000000000001'
};
const ADMIN = 'admin.ficticio@exemplo.invalid';
const LEITOR = 'leitor.ficticio@exemplo.invalid';
const ID_A = '00000000-0000-4000-8000-00000000aaaa'; // 2025/2, mesma pessoa
const ID_B = '00000000-0000-4000-8000-00000000bbbb'; // 2026/2, mesma pessoa
const ID_C = '00000000-0000-4000-8000-00000000cccc'; // outra pessoa

const TITULOS = ['Registro ID', 'Versão', 'Nome completo', 'Nº USP', 'E-mail', 'M/F', 'Nº RG', 'Colação', 'Status — Dados Pessoais',
  'Bacharelado — concluiu?', 'Bacharelado — ano', 'Licenciatura — concluiu?', 'Licenciatura — ano',
  'Formação de Psicólogo(a) — concluiu?', 'Formação de Psicólogo(a) — ano', 'Link da pasta no Drive', 'ID da Pasta'];
const linhaDiploma = (id, nome, nUsp, colacao, idPasta) => {
  const l = TITULOS.map(() => '');
  l[0] = id; l[1] = 1; l[2] = nome; l[3] = nUsp; l[4] = nUsp + '@exemplo.invalid'; l[7] = colacao;
  if (idPasta) { l[15] = 'https://exemplo.invalid/pasta/' + idPasta; l[16] = idPasta; }
  return l;
};
const TITULOS_CENTRAL = ['N USP', 'Nome', 'Ingresso', 'E-mail', 'ID da Pasta', 'E-mail secundário'];

function driveFicticio(pastasExistentes) {
  const d = { criacoes: [], lixeira: [], pastas: {} };
  const raiz = { getId: () => IDS.RAIZ };
  function novaPasta(id) {
    const p = {
      getId: () => id, getUrl: () => 'https://exemplo.invalid/pasta/' + id,
      getParents: () => { let ok = true; return { hasNext: () => ok, next: () => { ok = false; return raiz; } }; },
      getFiles: () => ({ hasNext: () => false }), getFolders: () => ({ hasNext: () => false }),
      getFilesByName: () => ({ hasNext: () => false }),
      setTrashed: v => { if (v) d.lixeira.push(id); return p; }, setName: () => p
    };
    d.pastas[id] = p;
    return p;
  }
  raiz.createFolder = nome => { d.criacoes.push(nome); return novaPasta('PASTA_NOVA_' + d.criacoes.length); };
  (pastasExistentes || []).forEach(novaPasta);
  d.getFolderById = id => { if (id === IDS.RAIZ) return raiz; if (!d.pastas[id]) throw new Error('não existe'); return d.pastas[id]; };
  d.getFileById = () => { throw new Error('não existe'); };
  d.raiz = raiz;
  return d;
}

function montar(o = {}) {
  const planilhas = {};
  planilhas[IDS.INDICE] = { 'Página1': [
    ['Chave', 'Tipo', 'ID de Produção', 'Homologação'],
    ['PERMISSOES_DE_ACESSO', 'spreadsheet', IDS.PERM, IDS.PERM],
    ['EMISSAO_DIPLOMAS', 'spreadsheet', IDS.DIPL, IDS.DIPL],
    ['PLANILHA_ALUNOS', 'spreadsheet', IDS.CENTRAL, IDS.CENTRAL],
    ['PASTA_RAIZ_ALUNOS', 'folder', IDS.RAIZ, IDS.RAIZ]
  ] };
  planilhas[IDS.PERM] = { EMISSAO_DIPLOMAS: [
    ['N. USP', 'Nome', 'e-mail', 'Observação', 'Perfil'],
    ['1000001', 'Pessoa Administradora Fictícia', ADMIN, '', 'ADMINISTRADOR'],
    ['1000002', 'Pessoa Leitora Fictícia', LEITOR, '', 'LEITOR']
  ] };
  planilhas[IDS.DIPL] = { Diplomas: [TITULOS].concat(o.diplomas || []), INFOS: [['Tipo de arquivo'], ['RG']] };
  planilhas[IDS.CENTRAL] = { 'Página1': [TITULOS_CENTRAL].concat(o.central || []) };
  const amb = S.ambiente({ usuario: o.usuario || ADMIN, propriedades: { ID_INDEX_SPREADSHEET_ID: IDS.INDICE }, planilhas });
  amb.drive = driveFicticio(o.pastas);
  return amb;
}
const abaDipl = amb => amb.planilhas[IDS.DIPL].abas.Diplomas;
const abaCentral = amb => amb.planilhas[IDS.CENTRAL].abas['Página1'];
const gravacoes = aba => aba.gravacoes.length;
const nenhumDadoPessoalNoLog = amb => {
  const log = amb.logs.join('\n');
  assert(!/Fictíci|9000\d{3}|exemplo\.invalid|00000000-0000-4000|PASTA_/.test(log), 'log com dado pessoal ou ID: ' + log);
};

let ok = 0, falhas = 0;
function t(nome, fn) {
  try { fn(); ok++; console.log('ok   ', nome); }
  catch (e) { falhas++; console.log('FALHA', nome, '\n      ', String(e && e.stack || e).split('\n').slice(0, 10).join('\n       ')); }
}
const erroCom = trecho => e => { if (!e || !String(e.message).includes(trecho)) throw new Error('esperado erro com "' + trecho + '", veio: ' + (e && e.message)); return true; };

/*==== Exclusão: a pasta compartilhada nunca vai para a lixeira (D5) ====*/

t('excluir o registro de 2026/2 de quem tem 2025/2 sem cache de pasta mantém a pasta e o ID na central', () => {
  // Caso real do achado A2: a linha de 2025/2 não tem Link/ID da pasta (veio do formulário ou foi digitada).
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20252', ''), linhaDiploma(ID_B, 'Aluna Fictícia Um', '9000001', '20262', 'PASTA_DA_ALUNA')],
    central: [['9000001', 'Aluna Fictícia Um', '2021/1', '9000001@exemplo.invalid', 'PASTA_DA_ALUNA', '']],
    pastas: ['PASTA_DA_ALUNA']
  });
  S.executar(amb, 'excluirAluno', [ID_B, 1]);
  assert.deepStrictEqual(amb.drive.lixeira, [], 'pasta foi para a lixeira');
  assert.strictEqual(abaCentral(amb).valores[1][4], 'PASTA_DA_ALUNA', 'ID da pasta mudou na central');
  assert.strictEqual(gravacoes(abaCentral(amb)), 0, 'gravou na central');
  assert.strictEqual(abaDipl(amb).valores.length, 2, 'deveria sobrar só o cabeçalho e a linha de 2025/2');
  assert.strictEqual(abaDipl(amb).valores[1][0], ID_A);
});

t('excluir o único registro da pessoa também mantém a pasta e o cadastro (a pasta é do Nº USP)', () => {
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', 'PASTA_DA_ALUNA')],
    central: [['9000001', 'Aluna Fictícia Um', '2021/1', '9000001@exemplo.invalid', 'PASTA_DA_ALUNA', '']],
    pastas: ['PASTA_DA_ALUNA']
  });
  S.executar(amb, 'excluirAluno', [ID_A, 1]);
  assert.deepStrictEqual(amb.drive.lixeira, []);
  assert.strictEqual(gravacoes(abaCentral(amb)), 0);
  assert.strictEqual(abaDipl(amb).valores.length, 1);
});

t('exclusão em lote: nenhuma pasta vai para a lixeira e só as linhas pedidas saem', () => {
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20252', 'PASTA_DA_ALUNA'), linhaDiploma(ID_B, 'Aluna Fictícia Um', '9000001', '20262', ''), linhaDiploma(ID_C, 'Aluno Fictício Dois', '9000002', '20262', 'PASTA_DO_ALUNO')],
    central: [['9000001', 'Aluna Fictícia Um', '', '', 'PASTA_DA_ALUNA', ''], ['9000002', 'Aluno Fictício Dois', '', '', 'PASTA_DO_ALUNO', '']],
    pastas: ['PASTA_DA_ALUNA', 'PASTA_DO_ALUNO']
  });
  const r = S.executar(amb, 'excluirAlunosEmLote', [[ID_A, ID_C]]);
  assert.strictEqual(r.excluidos, 2);
  assert.deepStrictEqual(amb.drive.lixeira, []);
  assert.strictEqual(gravacoes(abaCentral(amb)), 0);
  assert.deepStrictEqual(abaDipl(amb).valores.slice(1).map(l => l[0]), [ID_B]);
});

t('exclusão com versão desatualizada é recusada e nada muda', () => {
  const amb = montar({ diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')] });
  assert.throws(() => S.executar(amb, 'excluirAluno', [ID_A, 7]), erroCom('alterado por outra sessão'));
  assert.strictEqual(gravacoes(abaDipl(amb)), 0);
});

t('LEITOR não exclui nem inclui (recusa antes de gravar)', () => {
  const amb = montar({ usuario: LEITOR, diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')] });
  assert.throws(() => S.executar(amb, 'excluirAluno', [ID_A, 1]), e => e.codigoAcesso === 'SO_LEITURA');
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', { nome: 'Outra Fictícia', nUsp: '9000009' }]), e => e.codigoAcesso === 'SO_LEITURA');
  assert.strictEqual(gravacoes(abaDipl(amb)), 0);
});

t('o código não manda mais pasta para a lixeira na exclusão nem limpa o ID na central', () => {
  const fonte = fs.readFileSync(path.join(S.SRC, 'DiplomasBackend.gs'), 'utf8');
  const corpo = fonte.slice(fonte.indexOf('function excluirAlunoInterno_('), fonte.indexOf('function excluirAluno('));
  assert(!/setTrashed|limparIdPasta|COL_ALUNOS_CENTRAL_ID_PASTA/.test(corpo), 'excluirAlunoInterno_ ainda mexe em pasta ou na central');
  assert(!/function limparIdPastaNaCentral_|function outrosRegistrosUsamPasta_/.test(fonte), 'funções antigas de exclusão de pasta continuam no código');
});

/*==== Inclusão manual (adicionarAluno) ====*/

const DADOS = { nome: 'Aluno Fictício Novo', nUsp: '9000010', email: 'novo@exemplo.invalid', genero: 'M', rg: 'RG-FICT-10', bachConcluiu: true, bachAno: '2026' };

t('inclusão válida grava a linha inteira numa única chamada, com Registro ID e Versão 1', () => {
  const amb = montar({ diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')] });
  const r = S.executar(amb, 'adicionarAluno', ['20262', DADOS]);
  const aba = abaDipl(amb);
  assert.strictEqual(gravacoes(aba), 1, 'deveria ser uma gravação só: ' + JSON.stringify(aba.gravacoes));
  const l = aba.valores[2];
  assert.strictEqual(l.length, TITULOS.length, 'a linha nova cobre todas as colunas');
  assert(/^[0-9a-f-]{36}$/.test(r.registroId) && l[0] === r.registroId);
  assert.deepStrictEqual([l[1], l[2], l[3], l[5], l[7], l[9], l[10], l[11], l[13]], [1, 'Aluno Fictício Novo', '9000010', 'M', '20262', 'SIM', '2026', 'NÃO', 'NÃO']);
  assert.strictEqual(l[8], '', 'Status — Dados Pessoais deveria nascer vazio');
});

t('segundo registro do mesmo Nº USP na mesma colação é recusado sem gravar nada', () => {
  const amb = montar({ diplomas: [linhaDiploma(ID_A, 'Aluno Fictício Novo', '9000010', '20262', '')] });
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', DADOS]), erroCom('Já existe um registro deste Nº USP nesta colação'));
  assert.strictEqual(gravacoes(abaDipl(amb)), 0);
});

t('Nº USP com formatação diferente (pontos, espaços) também conta como o mesmo', () => {
  const amb = montar({ diplomas: [linhaDiploma(ID_A, 'Aluno Fictício Novo', '9000010', '20262', '')] });
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', Object.assign({}, DADOS, { nUsp: ' 9.000.010 ' })]), erroCom('Já existe'));
  assert.strictEqual(gravacoes(abaDipl(amb)), 0);
});

t('mesmo Nº USP em outra colação é permitido (nova colação da mesma pessoa)', () => {
  const amb = montar({ diplomas: [linhaDiploma(ID_A, 'Aluno Fictício Novo', '9000010', '20252', '')] });
  S.executar(amb, 'adicionarAluno', ['20262', DADOS]);
  assert.strictEqual(abaDipl(amb).valores.length, 3);
});

t('coluna obrigatória ausente: erro antes de gravar qualquer coisa', () => {
  const amb = montar();
  const aba = abaDipl(amb);
  aba.valores[0] = aba.valores[0].map(x => (x === 'M/F' ? 'Gênero' : x));
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', DADOS]), erroCom('M/F'));
  assert.strictEqual(gravacoes(aba), 0);
});

t('dados vazios e colação inválida são recusados sem gravar', () => {
  const amb = montar();
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', { nome: '', nUsp: '' }]));
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['2026/2', DADOS]));
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', null]));
  assert.strictEqual(gravacoes(abaDipl(amb)), 0);
});

t('concorrência: outra gravação sobrescreve a linha recém-acrescentada → erro de integridade, não sucesso', () => {
  const amb = montar();
  const aba = abaDipl(amb);
  const original = aba.appendRow.bind(aba);
  aba.appendRow = linha => { original(linha); const l = aba.valores[aba.valores.length - 1]; l[2] = 'Outra Pessoa Fictícia'; l[3] = '9000099'; return aba; };
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', DADOS]), erroCom('Erro de integridade'));
  nenhumDadoPessoalNoLog(amb);
});

t('concorrência: o mesmo Registro ID aparece duas vezes depois de gravar → erro de integridade', () => {
  const amb = montar();
  const aba = abaDipl(amb);
  const original = aba.appendRow.bind(aba);
  aba.appendRow = linha => { original(linha); aba.valores.push(linha.slice()); return aba; };
  assert.throws(() => S.executar(amb, 'adicionarAluno', ['20262', DADOS]), erroCom('Erro de integridade'));
});

/*==== Pasta e autocadastro na planilha central (garantirPastaAlunoCentral_) ====*/

t('pasta já registrada na central: nada é criado nem gravado (regressão)', () => {
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')],
    central: [['9000001', 'Aluna Fictícia Um', '', '', 'PASTA_DA_ALUNA', '']], pastas: ['PASTA_DA_ALUNA']
  });
  S.executar(amb, 'garantirPasta', [ID_A]);
  assert.deepStrictEqual(amb.drive.criacoes, []);
  assert.strictEqual(gravacoes(abaCentral(amb)), 0);
});

t('fim do autocadastro (4.1, D6): sem cadastro na central, para sem criar linha nem pasta', () => {
  const amb = montar({ diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')] });
  assert.throws(() => S.executar(amb, 'garantirPasta', [ID_A]), erroCom('Gerenciador de Pessoas'));
  assert.strictEqual(abaCentral(amb).valores.length, 1, 'não deveria criar cadastro');
  assert.strictEqual(gravacoes(abaCentral(amb)), 0);
  assert.deepStrictEqual(amb.drive.criacoes, []);
  nenhumDadoPessoalNoLog(amb);
});

t('Nº USP repetido na central: para sem criar pasta nem gravar (não escolhe uma das linhas)', () => {
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')],
    central: [['9000001', 'Aluna Fictícia Um', '', '', '', ''], ['9000001', 'Aluna Fictícia Um (cópia)', '', '', '', '']]
  });
  assert.throws(() => S.executar(amb, 'garantirPasta', [ID_A]), erroCom('mais de uma linha'));
  assert.deepStrictEqual(amb.drive.criacoes, []);
  assert.strictEqual(gravacoes(abaCentral(amb)), 0);
});

t('concorrência: outra pasta gravada na central enquanto esta era criada → usa a outra e descarta a nova vazia', () => {
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')],
    central: [['9000001', 'Aluna Fictícia Um', '', '', '', '']], pastas: ['PASTA_DE_OUTRO_SISTEMA']
  });
  const raiz = amb.drive.raiz;
  const criar = raiz.createFolder;
  raiz.createFolder = nome => { const p = criar(nome); abaCentral(amb).valores[1][4] = 'PASTA_DE_OUTRO_SISTEMA'; return p; };
  S.executar(amb, 'garantirPasta', [ID_A]);
  assert.strictEqual(abaCentral(amb).valores[1][4], 'PASTA_DE_OUTRO_SISTEMA', 'sobrescreveu a pasta gravada por outro sistema');
  assert.deepStrictEqual(amb.drive.lixeira, ['PASTA_NOVA_1'], 'só a pasta nova e vazia vai para a lixeira');
  assert.strictEqual(gravacoes(abaCentral(amb)), 0, 'não deveria gravar na central');
  assert.strictEqual(abaDipl(amb).valores[1][16], 'PASTA_DE_OUTRO_SISTEMA', 'cache do registro deveria apontar para a pasta certa');
});

t('concorrência: a linha do Nº USP muda de posição durante a criação → grava na linha certa', () => {
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')],
    central: [['9000001', 'Aluna Fictícia Um', '', '', '', '']]
  });
  const raiz = amb.drive.raiz;
  const criar = raiz.createFolder;
  raiz.createFolder = nome => { const p = criar(nome); abaCentral(amb).valores.splice(1, 0, ['9000005', 'Outra Pessoa Fictícia', '', '', 'PASTA_DELA', '']); return p; };
  S.executar(amb, 'garantirPasta', [ID_A]);
  const c = abaCentral(amb).valores;
  assert.strictEqual(c[1][4], 'PASTA_DELA', 'a pasta de outra pessoa foi sobrescrita');
  assert.strictEqual(c[2][4], 'PASTA_NOVA_1');
});

t('concorrência: o cadastro some da central durante a criação → erro, nada gravado, pasta nova descartada', () => {
  const amb = montar({
    diplomas: [linhaDiploma(ID_A, 'Aluna Fictícia Um', '9000001', '20262', '')],
    central: [['9000001', 'Aluna Fictícia Um', '', '', '', '']]
  });
  const raiz = amb.drive.raiz;
  const criar = raiz.createFolder;
  raiz.createFolder = nome => { const p = criar(nome); abaCentral(amb).valores.splice(1, 1); return p; };
  assert.throws(() => S.executar(amb, 'garantirPasta', [ID_A]), erroCom('sumiu'));
  assert.deepStrictEqual(amb.drive.lixeira, ['PASTA_NOVA_1']);
  assert.strictEqual(gravacoes(abaCentral(amb)), 0);
});

console.log(`\n${ok} ok, ${falhas} falha(s).`);
process.exit(falhas ? 1 : 0);

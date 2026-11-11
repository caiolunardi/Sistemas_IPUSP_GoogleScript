// Testes do servidor (4.0): projeto autônomo, planilha pelo ID_INDEX,
// conferência de acesso pela aba EMISSAO_DIPLOMAS e perfis LEITOR /
// ADMINISTRADOR. Dados 100% fictícios (domínio exemplo.invalid).
// Uso: node sistemas/emissao-diplomas/testes/testar_acesso.js
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const S = require('./simulacao');

const IDS = {
  INDICE: 'INDICE_FICTICIO_0000000000000001',
  PERM_PROD: 'PERMISSOES_FICTICIA_PRODUCAO_0001',
  PERM_HOMOLOG: 'PERMISSOES_FICTICIA_HOMOLOG_00001',
  DIPL_PROD: 'DIPLOMAS_FICTICIA_PRODUCAO_000001',
  DIPL_HOMOLOG: 'DIPLOMAS_FICTICIA_HOMOLOGACAO_001'
};
const ADMIN = 'admin.ficticio@exemplo.invalid';
const LEITOR = 'leitor.ficticio@exemplo.invalid';
const SETOR = 'setor.ficticio@exemplo.invalid';

const TITULOS_DIPLOMAS = ['Registro ID', 'Versão', 'Nome completo', 'Nº USP', 'E-mail', 'Colação', 'Status — Dados Pessoais'];

function montar(opcoes = {}) {
  const permissoes = opcoes.permissoes || [
    ['N. USP', 'Nome', 'e-mail', 'Observação', 'Perfil'],
    ['1000001', 'Pessoa Administradora Fictícia', ADMIN, 'Equipe Fictícia do Serviço de Graduação', 'ADMINISTRADOR'],
    ['1000002', 'Pessoa Leitora Fictícia', LEITOR, '', 'LEITOR'],
    ['', '', SETOR, 'Setor Fictício', 'ADMINISTRADOR'],
    ['', 'Coringa', '*@exemplo.invalid', '', 'ADMINISTRADOR'],
    ['', 'Perfil inválido', 'outra@exemplo.invalid', '', 'EDITOR']
  ];
  const planilhas = {};
  planilhas[IDS.INDICE] = { 'Página1': [
    ['Chave', 'Tipo', 'ID de Produção', 'Homologação'],
    ['PERMISSOES_DE_ACESSO', 'spreadsheet', IDS.PERM_PROD, IDS.PERM_HOMOLOG],
    ['EMISSAO_DIPLOMAS', 'spreadsheet', IDS.DIPL_PROD, IDS.DIPL_HOMOLOG]
  ] };
  planilhas[IDS.PERM_PROD] = opcoes.semAba ? { Outra: [['x']] } : { EMISSAO_DIPLOMAS: permissoes };
  planilhas[IDS.PERM_HOMOLOG] = { EMISSAO_DIPLOMAS: [permissoes[0], ['', 'Só na homologação', 'homolog@exemplo.invalid', '', 'ADMINISTRADOR']] };
  const linhas = opcoes.linhasDiplomas || [
    TITULOS_DIPLOMAS,
    ['00000000-0000-4000-8000-00000000aaaa', 1, 'Aluna Fictícia Um', '9000001', 'aluna1@exemplo.invalid', '20261', 'OK']
  ];
  planilhas[IDS.DIPL_PROD] = { Diplomas: linhas, INFOS: [['Tipo de arquivo'], ['Histórico Escolar']] };
  planilhas[IDS.DIPL_HOMOLOG] = { Diplomas: [TITULOS_DIPLOMAS], INFOS: [['Tipo de arquivo'], ['Tipo só da homologação']] };
  (opcoes.indiceExtra || []).forEach(l => planilhas[IDS.INDICE]['Página1'].push(l));
  Object.assign(planilhas, opcoes.planilhasExtra || {});
  const propriedades = opcoes.propriedades || { ID_INDEX_SPREADSHEET_ID: IDS.INDICE };
  const amb = S.ambiente({ usuario: opcoes.usuario === undefined ? ADMIN : opcoes.usuario, propriedades, planilhas });
  if (opcoes.drive) amb.drive = opcoes.drive;
  return amb;
}

const recusa = codigo => e => {
  if (!e || e.codigoAcesso !== codigo) throw new Error('esperado ' + codigo + ', veio: ' + (e && (e.codigoAcesso || e.message)));
  return true;
};

let ok = 0, falhas = 0;
function t(nome, fn) {
  try { fn(); ok++; console.log('ok   ', nome); }
  catch (e) { falhas++; console.log('FALHA', nome, '\n      ', String(e && e.stack || e).split('\n').slice(0, 10).join('\n       ')); }
}

/*==================== CÓDIGO-FONTE ====================*/

const fontes = S.arquivosGs().map(f => [f, fs.readFileSync(path.join(S.SRC, f), 'utf8')]);

t('nenhum arquivo usa a planilha vinculada (getActiveSpreadsheet/getUi)', () => {
  fontes.forEach(([f, s]) => {
    const codigo = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert(!/getActiveSpreadsheet\s*\(|getUi\s*\(|getActiveSheet\s*\(/.test(codigo), f);
  });
});

const LEITURA = ['obterColacoes', 'obterAlunos', 'obterDetalheAluno', 'obterTiposDeArquivo', 'obterObservacoes',
  'historicoListarSessoesAnalise', 'historicoObterSessaoAnalise', 'historicoObterUltimaSessaoAnalise'];

// 4.1: só pelo editor ou pelo gatilho (o e-mail da sessão é o do dono).
const SO_DONO = ['encaminharPedidosColacaoPorGatilho', 'prepararEncaminhamentosColacao', 'instalarGatilhoEncaminhadorColacao',
  'removerGatilhoEncaminhadorColacao', 'diagnosticarEncaminhamentosColacao'];

t('toda função pública confere o acesso na primeira linha (consulta = LEITOR; o resto = ADMINISTRADOR)', () => {
  let publicas = 0;
  fontes.forEach(([f, s]) => {
    const re = /^function ([A-Za-z0-9]+)\(([^)]*)\)\s*\{\n([^\n]*)/gm;
    let m;
    while ((m = re.exec(s))) {
      const nome = m[1];
      if (nome === 'doGet') continue;
      publicas++;
      const esperado = LEITURA.includes(nome) ? 'exigirLeitorDiplomas_();' : SO_DONO.includes(nome) ? 'exigirContextoDoDonoDiplomas_();' : 'exigirAdministradorDiplomas_();';
      assert(m[3].trim().startsWith(esperado), `${f}: ${nome} começa com "${m[3].trim()}"`);
    }
  });
  assert(publicas >= 40, 'poucas funções públicas encontradas: ' + publicas);
});

t('o manifesto mantém "executar como quem implantou" e acesso conferido no servidor', () => {
  const man = JSON.parse(fs.readFileSync(path.join(S.SRC, 'appsscript.json'), 'utf8'));
  assert.strictEqual(man.webapp.executeAs, 'USER_DEPLOYING');
  assert.strictEqual(man.webapp.access, 'ANYONE');
});

/*==================== ABERTURA DA PÁGINA ====================*/

const pagina = amb => S.executar(amb, 'doGet', [{}]);

t('ADMINISTRADOR: página com nome e observação e correção de Registro ID ligada', () => {
  const amb = montar({ linhasDiplomas: [TITULOS_DIPLOMAS, ['', '', 'Aluna Sem ID Fictícia', '9000002', 'x@exemplo.invalid', '20261', '']] });
  const saida = pagina(amb);
  assert.strictEqual(saida.template.nome, 'DiplomasApp');
  assert.strictEqual(saida.template.perfil, 'ADMINISTRADOR');
  assert.strictEqual(saida.template.usuarioNome, 'Pessoa Administradora Fictícia');
  assert.strictEqual(saida.template.usuarioDescricao, 'Equipe Fictícia do Serviço de Graduação');
  assert.strictEqual(saida.template.homologacao, false);
  assert.strictEqual(saida.titulo, 'Gerenciador de Colação de Grau e Diplomas');
  const diplomas = amb.planilhas[IDS.DIPL_PROD].abas.Diplomas;
  assert(diplomas.gravacoes.length > 0, 'a correção de Registro ID deveria ter gravado');
  assert(String(diplomas.valores[1][0]).length > 10, 'Registro ID preenchido');
});

t('LEITOR: página abre em modo consulta e a abertura não grava nada', () => {
  const amb = montar({ usuario: LEITOR, linhasDiplomas: [TITULOS_DIPLOMAS, ['', '', 'Aluna Sem ID Fictícia', '9000002', 'x@exemplo.invalid', '20261', '']] });
  const saida = pagina(amb);
  assert.strictEqual(saida.template.perfil, 'LEITOR');
  assert.strictEqual(saida.template.usuarioNome, 'Pessoa Leitora Fictícia');
  assert.strictEqual(saida.template.usuarioDescricao, '');
  assert.strictEqual(amb.planilhas[IDS.DIPL_PROD].abas.Diplomas.gravacoes.length, 0);
  assert(!amb.aberturas.includes(IDS.DIPL_PROD), 'LEITOR não deve abrir a planilha de diplomas ao carregar a página');
});

t('conta de setor sem nome: mostra o e-mail no lugar do nome', () => {
  const saida = pagina(montar({ usuario: SETOR }));
  assert.strictEqual(saida.template.usuarioNome, SETOR);
  assert.strictEqual(saida.template.usuarioDescricao, 'Setor Fictício');
});

t('e-mail com maiúsculas e espaços é reconhecido', () => {
  const saida = pagina(montar({ usuario: '  Admin.Ficticio@Exemplo.Invalid ' }));
  assert.strictEqual(saida.template.perfil, 'ADMINISTRADOR');
});

[
  ['sem e-mail na sessão', { usuario: '' }, 'SEM_IDENTIFICACAO'],
  ['e-mail fora da lista', { usuario: 'estranho@exemplo.invalid' }, 'SEM_ACESSO'],
  ['coringa não vale', { usuario: 'qualquer@exemplo.invalid' }, 'SEM_ACESSO'],
  ['perfil desconhecido não vale', { usuario: 'outra@exemplo.invalid' }, 'SEM_ACESSO'],
  ['sem a aba EMISSAO_DIPLOMAS', { semAba: true }, 'ACESSO_INDISPONIVEL'],
  ['sem ID_INDEX configurado', { propriedades: {} }, 'ACESSO_INDISPONIVEL'],
  ['títulos errados na aba', { permissoes: [['A', 'B', 'C', 'D', 'E'], ['', 'X', ADMIN, '', 'ADMINISTRADOR']] }, 'ACESSO_INDISPONIVEL']
].forEach(([nome, opcoes, codigo]) => {
  t(`sem acesso (${nome}): página de aviso, sem dados nem gravação`, () => {
    const amb = montar(opcoes);
    const saida = pagina(amb);
    assert.strictEqual(saida.template.nome, 'DiplomasSemAcesso');
    assert(saida.template.mensagem.length > 20);
    assert(!amb.aberturas.includes(IDS.DIPL_PROD));
    assert(!amb.logs.join('\n').includes('@exemplo.invalid'), 'e-mail no registro de execução');
    assert.throws(() => S.executar(amb, 'obterColacoes', []), recusa(codigo));
  });
});

t('e-mail repetido: vale o menor perfil', () => {
  const amb = montar({ permissoes: [
    ['N. USP', 'Nome', 'e-mail', 'Observação', 'Perfil'],
    ['', 'Primeira linha', ADMIN, 'Obs 1', 'ADMINISTRADOR'],
    ['', 'Segunda linha', ADMIN, 'Obs 2', 'LEITOR']
  ] });
  const saida = pagina(amb);
  assert.strictEqual(saida.template.perfil, 'LEITOR');
  assert.strictEqual(saida.template.usuarioNome, 'Primeira linha');
});

/*==================== PERFIS NAS FUNÇÕES ====================*/

t('LEITOR consulta: obterTiposDeArquivo lê a aba INFOS da planilha do ID_INDEX', () => {
  const amb = montar({ usuario: LEITOR });
  assert.deepStrictEqual(Array.from(S.executar(amb, 'obterTiposDeArquivo', [])), ['Histórico Escolar']);
  assert(amb.aberturas.includes(IDS.DIPL_PROD));
});

['salvarEdicaoAluno', 'excluirAluno', 'excluirAlunosEmLote', 'gerarDocumento', 'gerarListaFormandos', 'enviarEmailColacaoLote',
  'salvarObservacoes', 'uploadArquivo', 'garantirPasta', 'avaliarHistoricoExtraido', 'historicoGerarRelatorioConsolidado',
  'migrarAnaliseHistoricoRelatoriosV1', 'rodarTestesHistorico'].forEach(nome => {
  t(`LEITOR em ${nome}: SO_LEITURA antes de abrir a planilha de diplomas`, () => {
    const amb = montar({ usuario: LEITOR });
    assert.throws(() => S.executar(amb, nome, ['00000000-0000-4000-8000-00000000aaaa', 1, {}]), recusa('SO_LEITURA'));
    assert(!amb.aberturas.includes(IDS.DIPL_PROD));
    assert.strictEqual(amb.planilhas[IDS.DIPL_PROD].abas.Diplomas.gravacoes.length, 0);
  });
});

t('ADMINISTRADOR passa pela conferência das funções que gravam', () => {
  const amb = montar();
  // Sem dados válidos a função falha depois, mas nunca por acesso.
  try { S.executar(amb, 'excluirAluno', ['inexistente', 1]); } catch (e) { assert(!e.codigoAcesso, 'recusou por acesso: ' + e.codigoAcesso); }
  assert(amb.aberturas.includes(IDS.DIPL_PROD));
});

/*==================== HOMOLOGAÇÃO ====================*/

t('AMBIENTE=homologacao: permissões e diplomas pela coluna Homologação, título marcado', () => {
  const amb = montar({ usuario: 'homolog@exemplo.invalid', propriedades: { ID_INDEX_SPREADSHEET_ID: IDS.INDICE, AMBIENTE: 'homologacao' } });
  const saida = pagina(amb);
  assert.strictEqual(saida.template.perfil, 'ADMINISTRADOR');
  assert.strictEqual(saida.template.homologacao, true);
  assert(/^\[HOMOLOGAÇÃO\] /.test(saida.titulo));
  assert.deepStrictEqual(Array.from(S.executar(amb, 'obterTiposDeArquivo', [])), ['Tipo só da homologação']);
  assert(!amb.aberturas.includes(IDS.PERM_PROD) && !amb.aberturas.includes(IDS.DIPL_PROD), 'homologação abriu planilha de produção');
});

t('a conta da produção não entra na homologação', () => {
  const amb = montar({ usuario: ADMIN, propriedades: { ID_INDEX_SPREADSHEET_ID: IDS.INDICE, AMBIENTE: 'homologacao' } });
  assert.strictEqual(pagina(amb).template.nome, 'DiplomasSemAcesso');
});


/*==== Efeitos colaterais: consulta de LEITOR não grava (revisão independente, B1/C4) ====*/

const CENTRAL = 'ALUNOS_CENTRAL_FICTICIA_00000001';
const RAIZ = 'PASTA_RAIZ_FICTICIA_0000000000001';
const ID_ALUNA = '00000000-0000-4000-8000-00000000aaaa';
function driveFicticio(pastasExistentes) {
  const d = { criacoes: [], arquivosCriados: [] };
  const raiz = { getId: () => RAIZ, createFolder: n => { d.criacoes.push(n); return pasta('NOVA_' + d.criacoes.length); } };
  function pasta(id) {
    return { getId: () => id, getUrl: () => 'https://exemplo.invalid/pasta/' + id, getParents: () => { let ok = true; return { hasNext: () => ok, next: () => { ok = false; return raiz; } }; },
      getFilesByName: n => { const lista = n.startsWith('Observações - Aluna Fictícia Um - ') ? [{ getBlob: () => ({ getDataAsString: () => 'Observação fictícia' }), getLastUpdated: () => new Date(5) }] : []; return { hasNext: () => lista.length > 0, next: () => lista.shift() }; },
      getFiles: () => ({ hasNext: () => false }), createFile: (...a) => { d.arquivosCriados.push(a); return {}; } };
  }
  d.getFolderById = id => { if (id === RAIZ) return raiz; if (!(pastasExistentes || []).includes(id)) throw new Error('não existe'); return pasta(id); };
  d.createFolder = n => { d.criacoes.push(n); return pasta('X'); };
  return d;
}
function montarComCentral(usuario, comPasta) {
  return montar({
    usuario,
    linhasDiplomas: [TITULOS_DIPLOMAS.concat(['Link da pasta no Drive']), [ID_ALUNA, 1, 'Aluna Fictícia Um', '9000001', 'aluna1@exemplo.invalid', '20261', 'OK', '']],
    indiceExtra: [['PLANILHA_ALUNOS', 'spreadsheet', CENTRAL, CENTRAL], ['PASTA_RAIZ_ALUNOS', 'folder', RAIZ, RAIZ]],
    planilhasExtra: { [CENTRAL]: { 'Página1': comPasta ? [['N USP', 'Nome', '', 'E-mail', 'ID da Pasta'], ['9000001', 'Aluna Fictícia Um', '', '', 'PASTA_DA_ALUNA']] : [['N USP', 'Nome', '', 'E-mail', 'ID da Pasta']] } },
    drive: driveFicticio(comPasta ? ['PASTA_DA_ALUNA'] : [])
  });
}
const totalGravacoes = amb => Object.values(amb.planilhas).reduce((n, p) => n + Object.values(p.abas).reduce((m, a) => m + a.gravacoes.length, 0), 0);

t('LEITOR: obterObservacoes de aluno sem pasta não cria pasta, cadastro, coluna nem cache', () => {
  const amb = montarComCentral(LEITOR, false);
  const r = S.executar(amb, 'obterObservacoes', [ID_ALUNA]);
  assert.strictEqual(JSON.stringify(r), JSON.stringify({ texto: '', versaoArquivo: 0 }));
  assert.strictEqual(totalGravacoes(amb), 0, 'gravou: ' + JSON.stringify(Object.values(amb.planilhas).map(p => Object.values(p.abas).map(a => a.gravacoes))));
  assert.strictEqual(amb.drive.criacoes.length, 0, 'criou pasta no Drive');
});

t('LEITOR: obterObservacoes de aluno com pasta lê o texto sem gravar', () => {
  const amb = montarComCentral(LEITOR, true);
  const r = S.executar(amb, 'obterObservacoes', [ID_ALUNA]);
  assert.strictEqual(r.texto, 'Observação fictícia');
  assert.strictEqual(totalGravacoes(amb), 0);
  assert.strictEqual(amb.drive.criacoes.length, 0);
});

t('ADMINISTRADOR: sem cadastro na central, obterObservacoes não cria cadastro nem pasta (fim do autocadastro, D6)', () => {
  const amb = montarComCentral(ADMIN, false);
  assert.throws(() => S.executar(amb, 'obterObservacoes', [ID_ALUNA]), /Gerenciador de Pessoas/);
  assert.strictEqual(amb.drive.criacoes.length, 0, 'não deveria criar pasta');
  assert.strictEqual(amb.planilhas[CENTRAL].abas['Página1'].gravacoes.length, 0, 'não deveria gravar na planilha central');
});

t('só o dono (editor ou gatilho) chama o encaminhador do gatilho e as funções do editor', () => {
  for (const nome of SO_DONO) {
    const amb = montarComCentral(ADMIN, true);
    assert.throws(() => S.executar(amb, nome, []), /editor do projeto/, nome + ' aceitou chamada pela página');
  }
});

t('toda consulta de LEITOR termina sem nenhuma gravação em planilha nem criação no Drive', () => {
  const consultas = [
    ['obterColacoes', []], ['obterAlunos', ['20261']], ['obterDetalheAluno', [ID_ALUNA]], ['obterTiposDeArquivo', []],
    ['obterObservacoes', [ID_ALUNA]], ['historicoListarSessoesAnalise', [ID_ALUNA]], ['historicoObterSessaoAnalise', [ID_ALUNA, 'x']],
    ['historicoObterUltimaSessaoAnalise', [ID_ALUNA]]
  ];
  const listadas = new Set(consultas.map(c => c[0]));
  // A lista acima tem de cobrir toda função pública cuja guarda é a de LEITOR.
  fontes.forEach(([f, s]) => {
    const re = /^function\s+([A-Za-z0-9]+)\s*\([^)]*\)\s*\{\s*\n\s*exigirLeitorDiplomas_\(\)/gm; let m;
    while ((m = re.exec(s))) assert(listadas.has(m[1]), 'consulta de LEITOR sem teste de efeitos: ' + m[1] + ' (' + f + ')');
  });
  for (const comPasta of [false, true]) for (const [nome, args] of consultas) {
    const amb = montarComCentral(LEITOR, comPasta);
    try { S.executar(amb, nome, args); } catch (e) { if (e && e.codigoAcesso) throw e; /* erro de dado fictício incompleto é aceito; gravar não */ }
    assert.strictEqual(totalGravacoes(amb), 0, nome + ' gravou com LEITOR');
    assert.strictEqual(amb.drive.criacoes.length + amb.drive.arquivosCriados.length, 0, nome + ' criou no Drive com LEITOR');
  }
});

/*==== Migração de Registro ID: só as colunas de Registro ID e Versão (B2/C2) ====*/

t('migração grava só as colunas Registro ID e Versão, nunca a faixa inteira', () => {
  const amb = montar({ linhasDiplomas: [TITULOS_DIPLOMAS,
    [ID_ALUNA, 1, 'Aluna Fictícia Um', '9000001', 'a1@exemplo.invalid', '20261', 'OK'],
    ['', '', 'Aluna Sem ID Fictícia', '9000002', 'a2@exemplo.invalid', '20261', '']] });
  pagina(amb);
  const g = amb.planilhas[IDS.DIPL_PROD].abas.Diplomas.gravacoes;
  assert(g.length > 0, 'deveria corrigir');
  g.forEach(([l, c, v]) => {
    assert([1, 2].includes(c), 'gravou fora das colunas Registro ID/Versão: coluna ' + c);
    if (Array.isArray(v)) assert(v.every(x => x.length === 1), 'faixa com mais de uma coluna');
  });
});

t('migração persiste a Versão vazia mesmo quando todos os Registro ID estão certos', () => {
  const amb = montar({ linhasDiplomas: [TITULOS_DIPLOMAS, [ID_ALUNA, '', 'Aluna Fictícia Um', '9000001', 'a1@exemplo.invalid', '20261', 'OK']] });
  pagina(amb);
  const aba = amb.planilhas[IDS.DIPL_PROD].abas.Diplomas;
  assert.strictEqual(aba.valores[1][1], 1, 'Versão deveria ficar 1');
  assert.strictEqual(aba.valores[1][0], ID_ALUNA, 'Registro ID não muda');
});

t('migração não registra nome nem ID no registro de execução', () => {
  const amb = montar({ linhasDiplomas: [TITULOS_DIPLOMAS,
    [ID_ALUNA, 1, 'Aluna Fictícia Um', '9000001', 'a1@exemplo.invalid', '20261', 'OK'],
    [ID_ALUNA, 1, 'Aluna Duplicada Fictícia', '9000003', 'a3@exemplo.invalid', '20261', 'OK']] });
  pagina(amb);
  const log = amb.logs.join('\n');
  assert(!/Fictícia|9000003|00000000-0000-4000/.test(log), 'log com dado pessoal ou ID: ' + log);
});

console.log(`\n${ok} ok, ${falhas} falha(s).`);
process.exit(falhas ? 1 : 0);

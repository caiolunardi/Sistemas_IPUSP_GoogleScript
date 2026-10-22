// Planilhas sintéticas para os testes. Tudo inventado: nomes, e-mails
// (domínio reservado .invalid), números USP (faixa 9000xxx) e IDs de
// planilha (textos curtos sem formato de ID do Google).
'use strict';

const { criarAba, criarAmbiente, criarPlanilhaAuditoria, formatarData, TZ } = require('./simulacao');

const IDS = {
  INDICE: 'INDICE_SINTETICO',
  RESPOSTAS: 'RESPOSTAS_SINTETICAS',
  RESPOSTAS_HOMOLOGACAO: 'RESPOSTAS_HOMOLOGACAO_SINTETICAS',
  PERMISSOES: 'PERMISSOES_SINTETICAS',
  PERMISSOES_HOMOLOGACAO: 'PERMISSOES_HOMOLOGACAO_SINTETICAS',
  AUDITORIA: 'AUDITORIA_SINTETICA',
  AUDITORIA_HOMOLOGACAO: 'AUDITORIA_HOMOLOGACAO_SINTETICA',
  // O baseline 1.0 sanitizado usa este marcador no lugar do ID real.
  BASELINE: 'CONFIGURAR_ID_DA_PLANILHA_DE_RESPOSTAS'
};

const ADMIN = 'admin@exemplo.invalid';
const LEITOR = 'leitor@exemplo.invalid';
const ESTRANHO = 'estranho@exemplo.invalid';

const HAB_B = 'Bacharelado em Psicologia';
const HAB_L = 'Licenciatura em Psicologia';

const TITULOS_ATUAL = [
  'Carimbo de data/hora', 'Endereço de e-mail', 'Nº USP', 'Nome', 'E-mail USP', 'Ano de ingresso',
  'Realizou trancamento total de matrícula em algum semestre?', 'Deseja solicitar a abertura de qual programa?',
  'Declaro que as informações são verdadeiras', 'Observações', 'Situação',
  'Data de Conclusão', 'Registro ID', 'Versão', 'E-mail Enviado'
];

const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

// Data no fuso de Brasília (UTC-3, sem horário de verão desde 2019).
const brt = (a, m, d, h = 9, min = 0) => new Date(Date.UTC(a, m - 1, d, h + 3, min));

function linha(o) {
  return [
    o.carimbo === undefined ? brt(2026, 3, 2) : o.carimbo,
    o.emailForm || '', o.nUsp || '', o.nome || '', o.email === undefined ? '' : o.email,
    o.ano || '2024', o.tranc || 'Não', o.hab || HAB_B, 'Sim',
    o.obs || '', o.sit === undefined ? '' : o.sit,
    o.conclusao || '', o.id === undefined ? '' : o.id, o.versao === undefined ? 1 : o.versao, o.enviado || ''
  ];
}

/** Aba atual com casos variados (pendentes, concluídos, sem ID, ID repetido etc.). */
function linhasAtuais() {
  return [
    TITULOS_ATUAL.slice(),
    linha({ nome: 'Bruna Exemplo', nUsp: 9000001, email: 'bruna@exemplo.invalid', emailForm: 'bruna.f@exemplo.invalid', id: uuid(1), carimbo: brt(2026, 3, 2, 10) }),
    linha({ nome: 'Álvaro Fictício', nUsp: 9000002, email: 'alvaro@exemplo.invalid', hab: HAB_L, sit: 'pendente', id: uuid(2), versao: 3, carimbo: brt(2026, 2, 10), obs: 'Aguardando documento' }),
    linha({ nome: 'Carla Modelo', nUsp: 9000003, email: 'carla@exemplo.invalid', hab: HAB_B + ', ' + HAB_L, sit: 'Concluído', conclusao: brt(2026, 4, 1, 15), id: uuid(3), versao: 2, enviado: brt(2026, 4, 1, 15, 5), carimbo: brt(2026, 3, 20) }),
    linha({ nome: 'Daniel Teste', nUsp: 9000004, email: 'daniel@exemplo.invalid', sit: 'concluido', id: uuid(4), carimbo: '15/01/2026 09:30:00' }),
    linha({ nome: 'Elisa Sem Identificador', nUsp: 9000005, email: 'elisa@exemplo.invalid', id: '', versao: '', carimbo: brt(2026, 5, 5) }),
    linha({ nome: '', nUsp: '', email: '', id: '', versao: '', carimbo: '' }),
    linha({ nome: 'Fábio Repetido', nUsp: 9000006, email: 'fabio@exemplo.invalid', sit: 'Em análise', id: uuid(6), carimbo: brt(2026, 1, 3) }),
    linha({ nome: 'Gabriela Repetida', nUsp: 9000007, email: 'gabriela@exemplo.invalid', id: uuid(6), carimbo: brt(2026, 1, 4) }),
    linha({ nome: 'Hugo Inválido', nUsp: 9000008, email: 'hugo@exemplo.invalid', id: 'abc', carimbo: brt(2026, 1, 5) }),
    linha({ nome: 'Joana Sem Email', nUsp: 9000010, email: '', id: uuid(10), carimbo: brt(2026, 1, 6), hab: 'Outra resposta escrita' }),
    linha({ nome: 'Lia Concluída Antiga', nUsp: 9000011, email: 'lia@exemplo.invalid', sit: 'CONCLUÍDO', conclusao: '20/12/2025 10:00', id: uuid(11), carimbo: brt(2025, 11, 1) })
  ];
}

const TITULOS_HISTORICO = ['Carimbo de data/hora', 'Nome completo', 'Número USP', 'E-mail USP', 'Qual programa deseja abrir?', 'Situação'];

function linhasHistorico() {
  return [
    TITULOS_HISTORICO.slice(),
    ['10/05/2021 14:00:00', 'Bruna Exemplo', '9000001', 'bruna@exemplo.invalid', HAB_L, 'ok'],
    [brt(2022, 8, 15), 'Marcos Histórico', '9000020', 'marcos@exemplo.invalid', HAB_B, 'ok'],
    ['03/02/2022', 'Nadia Antiga', '9000021', 'nadia@exemplo.invalid', HAB_B + ', ' + HAB_L, ''],
    ['', 'Otávio Sem Data', '9000022', 'otavio@exemplo.invalid', HAB_B, ''],
    ['', '', '', '', '', '']
  ];
}

function abaPermissoes(linhas) {
  return criarAba('GERENCIADOR_HABILITACOES', [['N. USP', 'Nome', 'E-mail', 'Observação', 'Perfil']].concat(linhas || [
    ['', 'Pessoa Administradora', ADMIN, 'Equipe Fictícia de Teste', 'ADMINISTRADOR'],
    ['', 'Pessoa Leitora', LEITOR, '', 'LEITOR'],
    ['', 'Coringa', '*@exemplo.invalid', 'deve ser ignorado', 'ADMINISTRADOR'],
    ['', 'Duplicada', 'dup@exemplo.invalid', '', 'ADMINISTRADOR'],
    ['', 'Duplicada', 'DUP@exemplo.invalid ', '', 'LEITOR'],
    ['', 'Sem perfil', 'semperfil@exemplo.invalid', '', ''],
    ['', 'Perfil desconhecido', 'super@exemplo.invalid', '', 'SUPERUSUARIO'],
    ['', 'Caixa e espaços', '  Admin2@Exemplo.Invalid ', '', ' administrador ']
  ]));
}

function abaIndice(linhas) {
  return criarAba('Página1', [['Chave', 'Tipo', 'ID de Produção', 'Homologação (cópia de testes)']].concat(linhas || [
    ['OUTRA_CHAVE', 'spreadsheet', 'OUTRO', ''],
    ['ABERTURA_HABILITACOES', 'spreadsheet', IDS.RESPOSTAS, IDS.RESPOSTAS_HOMOLOGACAO],
    ['PERMISSOES_DE_ACESSO', 'spreadsheet', IDS.PERMISSOES, IDS.PERMISSOES_HOMOLOGACAO],
    ['AUDITORIA_ABERTURA_HABILITACOES', 'spreadsheet', IDS.AUDITORIA, IDS.AUDITORIA_HOMOLOGACAO]
  ]));
}

/**
 * Ambiente completo. opcoes: { atual: linhas, historico: linhas|null,
 * permissoes, indice, propriedades, usuario, homologacao: linhas, ... }
 */
function montar(opcoes = {}) {
  const atual = criarAba('Respostas ao formulário 2', opcoes.atual || linhasAtuais());
  const historico = opcoes.historico === null ? null
    : criarAba('2021 - 2022', opcoes.historico || linhasHistorico(), { somenteLeitura: true });
  const abasRespostas = [atual].concat(historico ? [historico] : []);
  const arquivos = {
    [IDS.INDICE]: { nome: 'ID_INDEX', abas: [opcoes.indice || abaIndice()] },
    [IDS.RESPOSTAS]: { nome: 'Respostas sintéticas', abas: abasRespostas },
    [IDS.PERMISSOES]: { nome: 'Permissões sintéticas', abas: [opcoes.permissoes || abaPermissoes()] },
    [IDS.AUDITORIA]: { planilha: criarPlanilhaAuditoria('Auditoria sintética') }
  };
  let atualHomologacao = null;
  if (opcoes.homologacao) {
    atualHomologacao = criarAba('Respostas ao formulário 2', opcoes.homologacao);
    arquivos[IDS.RESPOSTAS_HOMOLOGACAO] = { nome: 'Respostas de homologação', abas: [atualHomologacao] };
    arquivos[IDS.PERMISSOES_HOMOLOGACAO] = { nome: 'Permissões de homologação', abas: [opcoes.permissoesHomologacao || abaPermissoes()] };
    arquivos[IDS.AUDITORIA_HOMOLOGACAO] = { planilha: criarPlanilhaAuditoria('Auditoria de homologação') };
  }
  const amb = criarAmbiente(Object.assign({
    arquivos,
    propriedades: opcoes.propriedades || { ID_INDEX_SPREADSHEET_ID: IDS.INDICE }
  }, opcoes.ambiente || {}, opcoes.usuario !== undefined ? { usuario: opcoes.usuario } : {}));
  const auditoria = arquivos[IDS.AUDITORIA].planilha;
  return { amb, atual, historico, atualHomologacao, arquivos, auditoria };
}

/**
 * Reserva de envio com X minutos de idade. Com marca (8 hexadecimais),
 * no formato atual da 2.0; sem marca, no formato com data e sem marca
 * (também aceito).
 */
function reserva(minutosAtras, marca) {
  return 'ENVIANDO… ' + formatarData(new Date(Date.now() - minutosAtras * 60000), TZ, 'yyyy-MM-dd HH:mm:ss') + (marca ? ' #' + marca : '');
}

module.exports = { IDS, ADMIN, LEITOR, ESTRANHO, HAB_B, HAB_L, TITULOS_ATUAL, TITULOS_HISTORICO, uuid, brt, linha,
  linhasAtuais, linhasHistorico, abaPermissoes, abaIndice, montar, reserva };

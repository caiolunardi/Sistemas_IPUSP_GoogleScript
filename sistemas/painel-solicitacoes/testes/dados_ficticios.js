// Planilhas sintéticas para os testes locais. Nada aqui é dado real:
// curso 99999, habilitações e disciplinas inventadas (sigla TST...).
const CAB_CURRICULOS = ["ruleset_id", "curso_codigo", "habilitacao_codigo", "habilitacao_nome",
  "estrutura_curricular", "versao", "vigencia_inicio", "vigencia_fim", "status", "selecao_automatica",
  "criterio_selecao", "observacao", "semestres_minimos", "semestres_maximos",
  "excedente_eletivas_compensa_livres", "revisao", "ultima_revisao_em", "ultima_revisao_por"];
const CAB_REQ = ["requisito_id", "ruleset_id", "criterio", "campo_parser", "operador", "valor", "unidade",
  "obrigatorio", "descricao", "ordem", "ativo", "observacao"];
const CAB_DISC = ["regra_disciplina_id", "ruleset_id", "sigla", "nome", "tipo_regra", "grupo_id",
  "status_aceitos", "ativo", "ordem", "observacao"];
const CAB_GR = ["grupo_id", "ruleset_id", "nome_grupo", "tipo_regra", "valor_minimo", "unidade",
  "campo_soma", "ativo", "observacao"];
const CAB_DIC = ["dominio", "codigo", "rotulo", "descricao", "ativo"];

function linha(cab, obj) { return cab.map(c => obj[c] === undefined ? '' : obj[c]); }

const REGRAS = {
  CURRICULOS: [CAB_CURRICULOS,
    linha(CAB_CURRICULOS, { ruleset_id: 'RS-A-V2', curso_codigo: '99999', habilitacao_codigo: '100', habilitacao_nome: 'Habilitação Fictícia A', estrutura_curricular: 'EST-A', versao: 2, status: 'ATIVO', semestres_minimos: 8, semestres_maximos: 14, excedente_eletivas_compensa_livres: 'SIM', observacao: 'NOTA INTERNA QUE NAO PODE VAZAR' }),
    linha(CAB_CURRICULOS, { ruleset_id: 'RS-A-V1', curso_codigo: '99999', habilitacao_codigo: '100', habilitacao_nome: 'Habilitação Fictícia A', estrutura_curricular: 'EST-A', versao: 1, status: 'INATIVO', excedente_eletivas_compensa_livres: 'SIM' }),
    linha(CAB_CURRICULOS, { ruleset_id: 'RS-A2-V1', curso_codigo: '99999', habilitacao_codigo: '100', habilitacao_nome: 'Habilitação Fictícia A', estrutura_curricular: 'EST-A2', versao: 1, status: 'ATIVO', excedente_eletivas_compensa_livres: 'NAO' }),
    linha(CAB_CURRICULOS, { ruleset_id: 'RS-B-V1', curso_codigo: '99999', habilitacao_codigo: '200', habilitacao_nome: 'Habilitação Fictícia B', estrutura_curricular: 'EST-B', versao: 1, status: 'ATIVO', semestres_minimos: 10, semestres_maximos: 16, excedente_eletivas_compensa_livres: 'NAO' }),
    linha(CAB_CURRICULOS, { ruleset_id: 'RS-C-V1', curso_codigo: '99999', habilitacao_codigo: '300', habilitacao_nome: 'Habilitação Fictícia C', estrutura_curricular: 'EST-C', versao: 1, status: 'ATIVO', excedente_eletivas_compensa_livres: '' }),
    linha(CAB_CURRICULOS, { ruleset_id: 'RS-D-V1', curso_codigo: '99999', habilitacao_codigo: '400', habilitacao_nome: 'Habilitação Fictícia D', estrutura_curricular: 'EST-D', versao: 1, status: 'RASCUNHO' })
  ],
  REQUISITOS_NUMERICOS: [CAB_REQ,
    linha(CAB_REQ, { requisito_id: 'R1', ruleset_id: 'RS-A-V2', criterio: 'CREDITOS_OBRIGATORIOS', operador: 'GTE', valor: 138, unidade: 'créditos', descricao: 'Créditos-aula obrigatórios', ordem: 10, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R2', ruleset_id: 'RS-A-V2', criterio: 'CREDITOS_ELETIVOS', operador: 'GTE', valor: 15, unidade: 'créditos', ordem: 20, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R3', ruleset_id: 'RS-A-V2', criterio: 'CREDITOS_LIVRES', operador: 'GTE', valor: 47, unidade: 'créditos', ordem: 30, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R4', ruleset_id: 'RS-A-V2', criterio: 'CH_ESTAGIO', operador: 'GTE', valor: 500, unidade: 'horas', ordem: 40, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R5', ruleset_id: 'RS-A-V2', criterio: 'CH_AAC', operador: 'GTE', valor: 60, unidade: 'horas', ordem: 50, ativo: 'NAO' }),
    linha(CAB_REQ, { requisito_id: 'R6', ruleset_id: 'RS-B-V1', criterio: 'CREDITOS_ELETIVOS', operador: 'GTE', valor: 20, unidade: 'créditos', ordem: 10, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R7', ruleset_id: 'RS-B-V1', criterio: 'CREDITOS_LIVRES', operador: 'GTE', valor: 10, unidade: 'créditos', ordem: 20, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R11', ruleset_id: 'RS-A2-V1', criterio: 'CREDITOS_OBRIGATORIOS', operador: 'GTE', valor: 150, unidade: 'créditos', ordem: 10, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R8', ruleset_id: 'RS-C-V1', criterio: 'CREDITOS_ELETIVOS', operador: 'GTE', valor: 10, unidade: 'créditos', ordem: 10, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R9', ruleset_id: 'RS-C-V1', criterio: 'CREDITOS_LIVRES', operador: 'GTE', valor: 10, unidade: 'créditos', ordem: 20, ativo: 'SIM' }),
    linha(CAB_REQ, { requisito_id: 'R10', ruleset_id: 'RS-C-V1', criterio: 'CH_AAC', operador: 'XYZ', valor: 60, unidade: 'horas', ordem: 30, ativo: 'SIM' })
  ],
  DISCIPLINAS: [CAB_DISC,
    linha(CAB_DISC, { regra_disciplina_id: 'D1', ruleset_id: 'RS-A-V2', sigla: 'TST0001', nome: 'Disciplina Teste Um', tipo_regra: 'OBRIGATORIA', ativo: 'SIM', ordem: 10 }),
    linha(CAB_DISC, { regra_disciplina_id: 'D2', ruleset_id: 'RS-A-V2', sigla: 'TST0002', nome: 'Disciplina Teste Dois', tipo_regra: 'OBRIGATORIA', ativo: 'SIM', ordem: 20 }),
    linha(CAB_DISC, { regra_disciplina_id: 'D3', ruleset_id: 'RS-A-V2', sigla: 'TST0010', nome: 'Optativa Teste A', tipo_regra: 'GRUPO', grupo_id: 'G1', ativo: 'SIM' }),
    linha(CAB_DISC, { regra_disciplina_id: 'D4', ruleset_id: 'RS-A-V2', sigla: 'TST0011', nome: 'Optativa Teste B', tipo_regra: 'GRUPO', grupo_id: 'G1', ativo: 'SIM' }),
    linha(CAB_DISC, { regra_disciplina_id: 'D5', ruleset_id: 'RS-A-V2', sigla: 'TST0012', nome: 'Optativa Teste C', tipo_regra: 'GRUPO', grupo_id: 'G1', ativo: 'SIM' }),
    linha(CAB_DISC, { regra_disciplina_id: 'D6', ruleset_id: 'RS-A-V2', sigla: 'TST0099', nome: 'Disciplina Inativa', tipo_regra: 'OBRIGATORIA', ativo: 'NAO' }),
    linha(CAB_DISC, { regra_disciplina_id: 'D8', ruleset_id: 'RS-B-V1', sigla: 'TST0001', nome: 'Disciplina Teste Um', tipo_regra: 'OBRIGATORIA', ativo: 'SIM' }),
    linha(CAB_DISC, { regra_disciplina_id: 'D7', ruleset_id: 'RS-A-V2', sigla: 'TST0020', nome: 'Prática Teste', tipo_regra: 'GRUPO', grupo_id: 'G2', ativo: 'SIM' })
  ],
  GRUPOS_REGRAS: [CAB_GR,
    linha(CAB_GR, { grupo_id: 'G1', ruleset_id: 'RS-A-V2', nome_grupo: 'Optativas de teste', tipo_regra: 'MIN_COUNT', valor_minimo: 2, unidade: 'disciplinas', ativo: 'SIM' }),
    linha(CAB_GR, { grupo_id: 'G2', ruleset_id: 'RS-A-V2', nome_grupo: 'Práticas de teste', tipo_regra: 'MIN_CREDITS', valor_minimo: 8, unidade: 'créditos', campo_soma: 'creditos_aula', ativo: 'SIM' })
  ],
  DICIONARIO: [CAB_DIC,
    linha(CAB_DIC, { dominio: 'CRITERIO_NUMERICO', codigo: 'CREDITOS_OBRIGATORIOS', rotulo: 'Créditos obrigatórios', descricao: 'campo_parser=creditos_obrigatorios', ativo: 'SIM' }),
    linha(CAB_DIC, { dominio: 'CRITERIO_NUMERICO', codigo: 'CREDITOS_ELETIVOS', rotulo: 'Créditos eletivos', descricao: 'campo_parser=creditos_eletivos', ativo: 'SIM' }),
    linha(CAB_DIC, { dominio: 'CRITERIO_NUMERICO', codigo: 'CREDITOS_LIVRES', rotulo: 'Créditos livres', descricao: 'campo_parser=creditos_livres', ativo: 'SIM' }),
    linha(CAB_DIC, { dominio: 'CRITERIO_NUMERICO', codigo: 'CH_ESTAGIO', rotulo: 'Carga horária de estágio', descricao: 'campo_parser=ch_estagio', ativo: 'SIM' }),
    linha(CAB_DIC, { dominio: 'CRITERIO_NUMERICO', codigo: 'CH_AAC', rotulo: 'Carga horária em AAC', descricao: 'campo_parser=ch_aac', ativo: 'SIM' }),
    linha(CAB_DIC, { dominio: 'OPERADOR', codigo: 'GTE', rotulo: 'Maior ou igual (>=)', ativo: 'SIM' }),
    linha(CAB_DIC, { dominio: 'OPERADOR', codigo: 'XYZ', rotulo: 'Operador desconhecido', ativo: 'SIM' })
  ]
};

const INDICE = { 'Página1': [['Chave', 'Tipo', 'ID de Produção', 'Homologação'],
  ['PERIODOS', 'spreadsheet', 'ID-PERIODOS-FICTICIO', ''],
  ['REGRAS_CURRICULARES', 'spreadsheet', 'ID-REGRAS-FICTICIO', '']] };

const PERIODOS = { 'Períodos': [['Formulário', 'Link', 'Tipo'],
  ['Pedido de Trancamento Parcial de Matrícula', '', 'Sazonal', '01/02/2099', '08:00', '20/02/2099', '18:00']] };

const PLANILHAS = { 'ID-INDEX-FICTICIO': INDICE, 'ID-REGRAS-FICTICIO': REGRAS, 'ID-PERIODOS-FICTICIO': PERIODOS };
const PROPRIEDADES = { ID_INDEX_SPREADSHEET_ID: 'ID-INDEX-FICTICIO' };

module.exports = { PLANILHAS, PROPRIEDADES, REGRAS, CAB_CURRICULOS, linha };

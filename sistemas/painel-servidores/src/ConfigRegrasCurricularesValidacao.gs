/*=====================================================
  REGRAS CURRICULARES — VALIDAÇÃO

  Todo o checklist estrutural de conteúdo de um ruleset
  (Instruções.txt item 17), mais as checagens pontuais usadas
  ao salvar/excluir requisitos, disciplinas e grupos
  individualmente (duplicidade de critério, referência a
  grupo inexistente, exclusão de grupo em uso etc).

  Desde a evolução multi-currículo/revisão interna, a
  validação completa está em DUAS camadas:

    - validarConteudoCompletoRuleset_: só o conteúdo em si
      (campos preenchidos, referências resolvendo, sem
      duplicidade) — usada tanto na ativação quanto depois de
      cada correção de ruleset ATIVO.
    - validarRulesetParaAtivacao_: a de cima + as
      pré-condições que só existem no momento de ativar um
      RASCUNHO (status atual, não ter sido usado em análise).

  Esta camada NUNCA toca em HTML nem decide layout — só
  recebe dados já lidos pelo Repository e devolve
  {valido, erros[]}. Quem decide o que fazer com o
  resultado é ConfigRegrasCurriculares.gs /
  ConfigRegrasCurricularesAuditoria.gs.
=====================================================*/

const TIPO_REGRA_DISCIPLINA_OBRIGATORIA = "OBRIGATORIA";
const TIPO_REGRA_DISCIPLINA_GRUPO = "GRUPO";

const TIPO_REGRA_GRUPO_ONE_OF = "ONE_OF";
const TIPO_REGRA_GRUPO_MIN_COUNT = "MIN_COUNT";
const TIPO_REGRA_GRUPO_MIN_CREDITS = "MIN_CREDITS";

// Aceita tanto o texto "SIM" (o que a planilha realmente guarda)
// quanto um boolean nativo do JS (defensivo, caso algum valor chegue
// como true/false em vez de texto — ex: um checkbox nativo do Sheets
// formatado na coluna por engano).
function ehAtivo_(valorAtivo) {
  if (valorAtivo === true) return true;
  if (valorAtivo === false) return false;
  return normalizarSemAcento_(valorAtivo) === "sim";
}

/*-----------------------------------------------------
  CHECAGENS PONTUAIS — usadas ao salvar UMA entidade
  (não esperam pela ativação pra avisar o problema)
------------------------------------------------------*/

// No máximo uma regra numérica ATIVA por critério, dentro do mesmo
// ruleset (Instruções.txt item 13). "requisitoIdIgnorar" exclui o
// próprio requisito da checagem quando é uma edição, não uma criação.
function validarDuplicidadeCriterioAtivo_(rulesetId, criterio, ativo, requisitoIdIgnorar) {

  if (!ehAtivo_(ativo)) return; // só importa duplicidade entre ativos

  const existentes = repoListarRequisitos_(rulesetId).filter(r =>
    String(r.requisito_id) !== String(requisitoIdIgnorar || "") &&
    ehAtivo_(r.ativo) &&
    String(r.criterio).trim() === String(criterio).trim()
  );

  if (existentes.length > 0) {
    throw new Error(`Já existe um requisito ativo para o critério "${criterio}" neste ruleset. Desative o antigo antes de ativar outro para o mesmo critério.`);
  }

}

// Disciplina tipo GRUPO precisa de um grupo_id que exista e pertença
// ao MESMO ruleset (Instruções.txt item 15).
function validarGrupoPertenceAoRuleset_(rulesetId, grupoId) {
  if (!grupoId) throw new Error("Selecione um grupo para uma disciplina do tipo \"Grupo\".");
  const grupo = repoLocalizarGrupo_(grupoId);
  if (!grupo || String(grupo.dados.ruleset_id).trim() !== String(rulesetId).trim()) {
    throw new Error("O grupo selecionado não existe ou não pertence a este ruleset.");
  }
}

// Antes de excluir um grupo: nenhuma disciplina pode estar
// referenciando ele (Instruções.txt item 36).
function validarGrupoSemDisciplinasVinculadas_(grupoId) {

  const grupo = repoLocalizarGrupo_(grupoId);
  if (!grupo) return; // já não existe, exclusão é no-op mais adiante

  const vinculadas = repoListarDisciplinas_(grupo.dados.ruleset_id)
    .filter(d => String(d.grupo_id || "").trim() === String(grupoId).trim());

  if (vinculadas.length > 0) {
    const nomes = vinculadas.map(d => d.sigla || d.nome).join(", ");
    throw new Error(`Não é possível excluir este grupo: ele é usado pela(s) disciplina(s) ${nomes}. Remova ou reatribua essa(s) disciplina(s) primeiro.`);
  }

}

/*-----------------------------------------------------
  VALIDAÇÃO DE CAMPOS ACADÊMICOS NOVOS (semestres mínimos/
  máximos e compensação de eletivas — evolução multi-currículo/
  revisão interna). Chamada pela validação de conteúdo completa
  (sempre com exigirPreenchido=true, comportamento inalterado) e,
  desde a 3ª rodada cirúrgica (Achado 1), também PRÉ-ESCRITA por
  salvarDadosGeraisRuleset quando a correção é de um ruleset ATIVO
  — ali com exigirPreenchido=true também (um ATIVO nunca pode
  ficar incompleto, então antecipamos a MESMA exigência que já
  valeria no pós-mutação, evitando abrir auditoria/rollback por um
  erro de formulário previsível).

  "exigirPreenchido" (default true — preserva o comportamento
  histórico de validarConteudoCompletoRuleset_, que SEMPRE exigiu
  os 3 campos preenchidos): quando false, um campo vazio não é
  erro (RASCUNHO em construção — Instruções.txt item 44, "monte o
  currículo aos poucos"). Mas um valor PREENCHIDO precisa ser
  estruturalmente válido em QUALQUER modo, RASCUNHO incluso — não
  existe "quase válido": um -1 óbvio não é tolerado só porque o
  ruleset ainda está em RASCUNHO (Achado 1, 3ª rodada cirúrgica).

  "Leitura estrita" (Instruções da tarefa): vazio NUNCA é
  tratado como "Não" — um valor de compensação vazio (quando
  exigido) ou inválido é sempre um erro de validação, nunca um
  valor implícito.
------------------------------------------------------*/
function validarSemestresECompensacao_(ruleset, erros, exigirPreenchido) {

  if (exigirPreenchido === undefined) exigirPreenchido = true;

  const minimoTexto = String(ruleset.semestres_minimos === null || ruleset.semestres_minimos === undefined ? "" : ruleset.semestres_minimos).trim();
  const maximoTexto = String(ruleset.semestres_maximos === null || ruleset.semestres_maximos === undefined ? "" : ruleset.semestres_maximos).trim();

  let minimoNumero = null;
  if (minimoTexto === "") {
    if (exigirPreenchido) erros.push("Semestres mínimos precisa ser um número inteiro maior que zero.");
  } else if (isNaN(Number(minimoTexto)) || !Number.isInteger(Number(minimoTexto)) || Number(minimoTexto) <= 0) {
    erros.push("Semestres mínimos precisa ser um número inteiro maior que zero.");
  } else {
    minimoNumero = Number(minimoTexto);
  }

  let maximoNumero = null;
  if (maximoTexto === "") {
    if (exigirPreenchido) erros.push("Semestres máximos precisa ser um número inteiro maior que zero.");
  } else if (isNaN(Number(maximoTexto)) || !Number.isInteger(Number(maximoTexto)) || Number(maximoTexto) <= 0) {
    erros.push("Semestres máximos precisa ser um número inteiro maior que zero.");
  } else {
    maximoNumero = Number(maximoTexto);
  }

  if (minimoNumero !== null && maximoNumero !== null && maximoNumero < minimoNumero) {
    erros.push("Semestres máximos precisa ser maior ou igual a semestres mínimos.");
  }

  const compensacao = String(ruleset.excedente_eletivas_compensa_livres || "").trim().toUpperCase();
  if (compensacao === "") {
    if (exigirPreenchido) erros.push('O campo "Excedente de eletivas compensa créditos livres?" precisa ser respondido explicitamente como Sim ou Não (não pode ficar vazio).');
  } else if (compensacao !== VALOR_BOOLEANO_SIM && compensacao !== VALOR_BOOLEANO_NAO) {
    erros.push('O campo "Excedente de eletivas compensa créditos livres?" precisa ser respondido explicitamente como Sim ou Não (não pode ficar vazio).');
  }

}

/*-----------------------------------------------------
  VALIDAÇÃO DE UM REQUISITO ATIVO (3ª rodada cirúrgica, Achado 1)

  Mesma checagem que validarConteudoCompletoRuleset_ já aplica a
  cada requisito ativo — extraída aqui pra ser chamada tanto ali
  quanto PRÉ-ESCRITA por salvarRequisitoCurricular, quando o
  requisito resultante ficará ativo=SIM dentro de uma correção de
  ATIVO (o cenário concreto em que um erro previsível hoje só é
  pego depois de já ter aberto auditoria/feito rollback). Só valida
  os campos do PRÓPRIO requisito (criterio/campo_parser/operador/
  valor) — duplicidade entre requisitos do mesmo ruleset continua
  sendo responsabilidade de validarDuplicidadeCriterioAtivo_ (já
  roda antes da escrita desde a 2ª rodada) e não é papel desta
  função.
------------------------------------------------------*/
function validarCamposRequisitoAtivo_(requisito) {

  const erros = [];

  const criterio = String(requisito.criterio || "").trim();
  if (!criterio) {
    erros.push("Requisito está ativo mas não tem critério definido.");
    return erros; // sem critério, as checagens abaixo não fazem sentido
  }

  const criteriosValidos = repoObterCriteriosNumericos_().map(c => c.codigo);
  if (criteriosValidos.indexOf(criterio) === -1) {
    erros.push(`Critério "${criterio}" não existe (ou não está ativo) no DICIONARIO.`);
  }

  const mapaCriterioParaParser = repoMapaCriterioParaCampoParser_();
  if (!mapaCriterioParaParser[criterio]) {
    erros.push(`Critério "${criterio}" não possui campo_parser configurado no DICIONARIO (descrição precisa conter "campo_parser=...").`);
  }

  const operador = String(requisito.operador || "").trim();
  if (!operador) {
    erros.push(`Requisito de critério "${criterio}" não tem operador definido.`);
  } else {
    const operadoresValidos = repoObterDominioDicionario_("OPERADOR").map(o => o.codigo);
    if (operadoresValidos.indexOf(operador) === -1) {
      erros.push(`Operador "${operador}" (critério "${criterio}") não existe no DICIONARIO.`);
    }
  }

  if (requisito.valor === "" || requisito.valor === null || requisito.valor === undefined || isNaN(Number(requisito.valor))) {
    erros.push(`Critério "${criterio}" não possui um valor numérico válido.`);
  }

  return erros;

}

/*-----------------------------------------------------
  VALIDAÇÃO DE UM GRUPO ATIVO (3ª rodada cirúrgica, Achado 1)

  Mesma checagem que validarConteudoCompletoRuleset_ já aplica a
  cada grupo ativo — extraída pelo mesmo motivo de
  validarCamposRequisitoAtivo_ acima, reutilizada tanto ali quanto
  PRÉ-ESCRITA por salvarGrupoCurricular. Não repete a checagem de
  "tipo_regra desconhecido" — essa já é recusada antes de chegar
  aqui, em QUALQUER modo (o endpoint sempre exige um tipo_regra
  válido do DICIONARIO, mesmo em RASCUNHO).
------------------------------------------------------*/
function validarCamposGrupoAtivo_(grupo) {

  const erros = [];

  const valorMinimoNumero = Number(grupo.valor_minimo);
  const valorMinimoValido = grupo.valor_minimo !== "" && grupo.valor_minimo !== null && grupo.valor_minimo !== undefined &&
    !isNaN(valorMinimoNumero) && valorMinimoNumero > 0;

  if (grupo.tipo_regra === TIPO_REGRA_GRUPO_ONE_OF) {
    if (!valorMinimoValido) {
      erros.push(`Grupo "${grupo.nome_grupo}" (Cumprir pelo menos uma) precisa de um valor mínimo válido (normalmente 1).`);
    }
  } else if (grupo.tipo_regra === TIPO_REGRA_GRUPO_MIN_COUNT) {
    if (!valorMinimoValido) {
      erros.push(`Grupo "${grupo.nome_grupo}" (Quantidade mínima) precisa de um valor mínimo válido.`);
    }
  } else if (grupo.tipo_regra === TIPO_REGRA_GRUPO_MIN_CREDITS) {
    if (!valorMinimoValido) {
      erros.push(`Grupo "${grupo.nome_grupo}" (Créditos mínimos) precisa de um valor mínimo válido.`);
    }
    if (!String(grupo.campo_soma || "").trim()) {
      erros.push(`Grupo "${grupo.nome_grupo}" (Créditos mínimos) precisa de um campo de soma selecionado.`);
    }
  }

  return erros;

}

/*-----------------------------------------------------
  VALIDAÇÃO COMPLETA DE CONTEÚDO — Instruções.txt item 17,
  refatorada em duas camadas (Instruções da tarefa multi-
  currículo/revisão interna, "Refatore minimamente a
  validação para separar: A) validação completa do CONTEÚDO
  do ruleset; B) pré-condições específicas da ATIVAÇÃO"):

    - validarConteudoCompletoRuleset_ (esta função): TUDO que
      diz respeito ao próprio conteúdo estar estruturalmente
      correto e completo — campos preenchidos, referências
      resolvendo, sem duplicidade, sem tipo desconhecido.
      Usada tanto pela ativação quanto, depois de cada
      mutação confirmada, pela correção de ruleset ATIVO
      (ConfigRegrasCurricularesAuditoria.gs) — um ATIVO nunca
      pode ficar estruturalmente incompleto, mesmo em modo
      correção.

    - validarRulesetParaAtivacao_ (logo abaixo): chama esta
      função e ACRESCENTA as pré-condições que só fazem
      sentido no momento de ativar um RASCUNHO (status atual
      e não ter sido usado em análise).

  NÃO duplica a lógica: validarRulesetParaAtivacao_ nunca
  reimplementa nenhum dos pontos abaixo, só adiciona os dois
  pontos que são exclusivos da ativação.
------------------------------------------------------*/

function validarConteudoCompletoRuleset_(rulesetId) {

  const erros = [];

  const rulesetResultado = repoLocalizarRuleset_(rulesetId);

  // 1. ruleset existe
  if (!rulesetResultado) {
    return { valido: false, erros: [`Ruleset "${rulesetId}" não encontrado.`], resumo: null };
  }

  const ruleset = rulesetResultado.dados;

  // 4. ruleset_id é único
  const todosRulesets = repoListarRulesets_();
  const ocorrencias = todosRulesets.filter(r => String(r.ruleset_id).trim() === String(rulesetId).trim());
  if (ocorrencias.length > 1) {
    erros.push(`O identificador "${rulesetId}" aparece mais de uma vez na aba CURRICULOS. Corrija manualmente antes de continuar.`);
  }

  // 5-7. curso_codigo, habilitacao_codigo, habilitacao_nome preenchidos
  if (!String(ruleset.curso_codigo || "").trim()) erros.push("curso_codigo está vazio.");
  if (!String(ruleset.habilitacao_codigo || "").trim() && ruleset.habilitacao_codigo !== 0) erros.push("habilitacao_codigo está vazio.");
  if (!String(ruleset.habilitacao_nome || "").trim()) erros.push("habilitacao_nome está vazio.");

  // estrutura_curricular precisa estar preenchida antes de ativar: é o
  // que define o "escopo" usado pra decidir quais outros rulesets ATIVOS
  // (mesma habilitação) devem ser inativados automaticamente na
  // ativação (ver ativarRulesetCurricular, ConfigRegrasCurriculares.gs).
  // Sem ela o sistema não tem como saber esse escopo com segurança — e
  // não adivinha: bloqueia a ativação em vez de arriscar inativar (ou
  // deixar de inativar) o ruleset errado.
  if (!String(ruleset.estrutura_curricular || "").trim()) {
    erros.push("A estrutura curricular precisa ser informada antes de ativar este ruleset.");
  }

  // 8. versao válida
  const versaoNumero = Number(ruleset.versao);
  if (!ruleset.versao || isNaN(versaoNumero) || versaoNumero <= 0) {
    erros.push("O campo versão precisa ser um número válido maior que zero.");
  }

  // Semestres mínimos/máximos e compensação de eletivas (campos
  // acadêmicos novos — evolução multi-currículo/revisão interna).
  validarSemestresECompensacao_(ruleset, erros);

  const requisitos = repoListarRequisitos_(rulesetId);
  const disciplinas = repoListarDisciplinas_(rulesetId);
  const grupos = repoListarGrupos_(rulesetId);

  const requisitosAtivos = requisitos.filter(r => ehAtivo_(r.ativo));

  // 9-13, 24 (parte de requisitos) — checagem de cada requisito ativo
  // extraída em validarCamposRequisitoAtivo_ (3ª rodada cirúrgica,
  // Achado 1), reutilizada aqui e, pré-escrita, pelos endpoints de
  // mutação — nunca duas definições diferentes da mesma regra.
  const criteriosVistos = {};
  requisitosAtivos.forEach(r => {

    validarCamposRequisitoAtivo_(r).forEach(e => erros.push(e));

    if (String(r.criterio || "").trim()) {
      // 14. duplicidade — contamos ocorrências por critério
      criteriosVistos[r.criterio] = (criteriosVistos[r.criterio] || 0) + 1;
    }

  });

  Object.keys(criteriosVistos).forEach(criterio => {
    if (criteriosVistos[criterio] > 1) {
      erros.push(`Há ${criteriosVistos[criterio]} requisitos ativos para o critério "${criterio}" — só pode haver um.`);
    }
  });

  // 15. todo requisito pertence mesmo a este ruleset (defensivo —
  // repoListarRequisitos_ já filtra por ruleset_id, então isso só
  // pegaria uma inconsistência muito anormal de leitura)
  requisitos.forEach(r => {
    if (String(r.ruleset_id).trim() !== String(rulesetId).trim()) {
      erros.push(`Requisito "${r.requisito_id}" está associado a outro ruleset_id.`);
    }
  });

  // 16-19. disciplinas
  const gruposPorId = {};
  grupos.forEach(g => { gruposPorId[g.grupo_id] = g; });

  disciplinas.forEach(d => {

    // 16. pertence a este ruleset (defensivo, mesma lógica do 15)
    if (String(d.ruleset_id).trim() !== String(rulesetId).trim()) {
      erros.push(`Disciplina "${d.sigla}" está associada a outro ruleset_id.`);
    }

    if (!ehAtivo_(d.ativo)) return; // só validamos referências de disciplinas ativas

    if (d.tipo_regra === TIPO_REGRA_DISCIPLINA_GRUPO) {
      // 18. disciplina tipo GRUPO referencia grupo existente
      if (!d.grupo_id || !gruposPorId[d.grupo_id]) {
        erros.push(`Disciplina "${d.sigla}" é do tipo Grupo mas referencia um grupo_id inexistente neste ruleset.`);
      }
    } else if (d.tipo_regra === TIPO_REGRA_DISCIPLINA_OBRIGATORIA) {
      // 19. disciplina OBRIGATORIA não deve ter grupo_id
      if (d.grupo_id) {
        erros.push(`Disciplina "${d.sigla}" é Obrigatória mas tem um grupo_id preenchido (não deveria ter).`);
      }
    } else {
      erros.push(`Disciplina "${d.sigla}" tem tipo_regra "${d.tipo_regra}" desconhecido.`);
    }

  });

  // 17, 20-22. grupos
  grupos.forEach(g => {

    // 17. pertence a este ruleset (defensivo)
    if (String(g.ruleset_id).trim() !== String(rulesetId).trim()) {
      erros.push(`Grupo "${g.nome_grupo}" está associado a outro ruleset_id.`);
    }

    if (!ehAtivo_(g.ativo)) return;

    // 20-22. checagem de conteúdo do grupo ativo extraída em
    // validarCamposGrupoAtivo_ (3ª rodada cirúrgica, Achado 1),
    // reutilizada aqui e, pré-escrita, por salvarGrupoCurricular.
    if (g.tipo_regra === TIPO_REGRA_GRUPO_ONE_OF || g.tipo_regra === TIPO_REGRA_GRUPO_MIN_COUNT || g.tipo_regra === TIPO_REGRA_GRUPO_MIN_CREDITS) {
      validarCamposGrupoAtivo_(g).forEach(e => erros.push(e));
    } else {
      erros.push(`Grupo "${g.nome_grupo}" tem tipo_regra "${g.tipo_regra}" desconhecido.`);
    }

  });

  // 23. IDs duplicados dentro deste ruleset
  const idsRequisitos = requisitos.map(r => r.requisito_id);
  const idsDisciplinas = disciplinas.map(d => d.regra_disciplina_id);
  const idsGrupos = grupos.map(g => g.grupo_id);

  [
    { lista: idsRequisitos, rotulo: "requisito_id" },
    { lista: idsDisciplinas, rotulo: "regra_disciplina_id" },
    { lista: idsGrupos, rotulo: "grupo_id" }
  ].forEach(({ lista, rotulo }) => {
    const vistos = new Set();
    lista.forEach(id => {
      if (vistos.has(id)) erros.push(`ID duplicado (${rotulo}): "${id}".`);
      vistos.add(id);
    });
  });

  // 24. campos obrigatórios não vazios (disciplinas/grupos ativos —
  // requisitos já cobertos acima)
  disciplinas.filter(d => ehAtivo_(d.ativo)).forEach(d => {
    if (!String(d.sigla || "").trim()) erros.push("Há uma disciplina ativa sem sigla preenchida.");
    if (!String(d.nome || "").trim()) erros.push(`Disciplina "${d.sigla}" está sem nome preenchido.`);
  });

  grupos.filter(g => ehAtivo_(g.ativo)).forEach(g => {
    if (!String(g.nome_grupo || "").trim()) erros.push("Há um grupo ativo sem nome preenchido.");
  });

  const resumo = {
    requisitosAtivos: requisitosAtivos.length,
    disciplinas: disciplinas.length,
    grupos: grupos.length
  };

  return { valido: erros.length === 0, erros: erros, resumo: resumo };

}

/*-----------------------------------------------------
  PRÉ-CONDIÇÕES ESPECÍFICAS DA ATIVAÇÃO — chama a validação de
  conteúdo acima e acrescenta só os dois pontos que fazem
  sentido exclusivamente no momento de ativar um RASCUNHO.
  Continua sendo a função chamada pelo botão "Validar regras"/
  "Ativar ruleset" da UI e por ativarRulesetCurricular
  (ConfigRegrasCurriculares.gs) — comportamento inalterado do
  ponto de vista de quem já usa esta função.
------------------------------------------------------*/
function validarRulesetParaAtivacao_(rulesetId) {

  const resultadoConteudo = validarConteudoCompletoRuleset_(rulesetId);

  // Ruleset nem existe — nada mais a checar (mesmo comportamento de
  // antes: erro único, resumo null).
  if (resultadoConteudo.resumo === null) return resultadoConteudo;

  const erros = resultadoConteudo.erros.slice();
  const rulesetResultado = repoLocalizarRuleset_(rulesetId);
  const ruleset = rulesetResultado.dados;

  // 2. status atual é RASCUNHO
  if (String(ruleset.status).trim().toUpperCase() !== STATUS_RULESET_RASCUNHO) {
    erros.push(`Só é possível ativar um ruleset em RASCUNHO (status atual: "${ruleset.status}").`);
  }

  // 3. ruleset não aparece em ANALISE_HISTORICO — só bloqueia a
  // ATIVAÇÃO inicial de um RASCUNHO. Um ruleset já ATIVO e já usado
  // em análises PODE ser corrigido através do fluxo de correção
  // auditada (ConfigRegrasCurricularesAuditoria.gs) — essa checagem
  // não se aplica lá, só aqui.
  if (repoRulesetJaUtilizadoEmAnalise_(rulesetId)) {
    erros.push("Este ruleset já foi utilizado em uma análise de histórico e não pode mais ser alterado. Crie uma nova versão.");
  }

  return { valido: erros.length === 0, erros: erros, resumo: resultadoConteudo.resumo };

}


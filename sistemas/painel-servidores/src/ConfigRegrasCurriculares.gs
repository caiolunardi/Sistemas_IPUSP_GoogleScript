/*=====================================================
  REGRAS CURRICULARES — ENDPOINTS (orquestração)

  Única camada chamada diretamente pelo cliente
  (google.script.run). Cada função aqui: pega lock quando
  muta, resolve a entidade por ID (nunca por linha vinda do
  cliente), roda as validações de
  ConfigRegrasCurricularesValidacao.gs, grava via
  ConfigRegrasCurricularesRepository.gs, e devolve ao
  cliente só o que ele precisa (nunca número de linha).

  DISTINÇÃO SALVAR vs VALIDAR/ATIVAR (Instruções.txt item 44
  — "montar o currículo aos poucos e testar antes de
  ativar"):

    - Salvar um requisito/disciplina/grupo bloqueia SÓ:
      inconsistência estrutural (ex: disciplina Obrigatória
      com grupo preenchido), referência que não resolve
      (grupo_id inexistente, critério sem campo_parser no
      DICIONARIO), valores fornecidos que não são do tipo
      esperado (texto onde devia ser número), e o campo que
      É a própria identidade da linha (sigla+nome do
      requisito/disciplina, nome do grupo, critério do
      requisito).

    - "Validar regras" / "Ativar" rodam o checklist completo
      de completude (Instruções.txt item 17, implementado em
      validarRulesetParaAtivacao_) — é ali que "falta
      preencher valor", "falta campo de soma" etc. aparecem.

  Isso permite montar o ruleset incrementalmente sem travar
  a cada campo que ainda não foi preenchido, mas sem nunca
  deixar a planilha num estado estruturalmente incoerente.

  MULTI-CURRÍCULO / REVISÃO INTERNA (evolução desta tarefa):
  os 7 endpoints de mutação abaixo (salvarDadosGeraisRuleset,
  salvarRequisitoCurricular, excluirRequisitoCurricular,
  salvarDisciplinaCurricular, excluirDisciplinaCurricular,
  salvarGrupoCurricular, excluirGrupoCurricular) agora aceitam
  DOIS contextos, decididos sempre pelo STATUS REAL do ruleset
  no servidor (nunca por um boolean vindo do cliente):

    - RASCUNHO: fluxo normal de sempre.
    - ATIVO + motivo válido: modo de correção auditada — ver
      prepararContextoMutacaoRuleset_/confirmarCorrecaoAtiva_/
      falharCorrecaoAtiva_ (ConfigRegrasCurricularesAuditoria.gs).
    - INATIVO, ou ATIVO sem motivo: recusado.

  "Criar nova versão" (V1 -> V2, mesmo curso+habilitação) e
  "Criar regras para outro currículo" (mesmo prefixo/
  habilitação, curso_codigo diferente) continuam sendo duas
  operações distintas — ver criarNovaVersaoRuleset e
  criarRulesetParaOutroCurriculo mais abaixo.
=====================================================*/

/*-----------------------------------------------------
  LISTAGEM / LEITURA (sem lock — só leitura)
------------------------------------------------------*/

function listarRulesetsCurriculares() {
  exigirAcessoPainel_();
  return repoListarRulesets_();
}

function obterRulesetCurricular(rulesetId) {
  exigirAcessoPainel_();

  if (!rulesetId) throw new Error("Ruleset não informado.");

  const resultado = repoLocalizarRuleset_(rulesetId);
  if (!resultado) throw new Error(`Ruleset "${rulesetId}" não encontrado.`);

  const requisitos = repoListarRequisitos_(rulesetId);
  const disciplinas = repoListarDisciplinas_(rulesetId);
  const grupos = repoListarGrupos_(rulesetId);

  return {
    ruleset: anexarSnapshotToken_(resultado.dados),
    requisitos: requisitos,
    disciplinas: disciplinas,
    grupos: grupos,
    resumo: {
      requisitosAtivos: requisitos.filter(r => ehAtivo_(r.ativo)).length,
      disciplinas: disciplinas.length,
      grupos: grupos.length
    },
    // jaUtilizado só é usado hoje pra explicar por que um RASCUNHO
    // legado ficou bloqueado (não deveria acontecer em uso normal —
    // um RASCUNHO nunca é gravado em ANALISE_HISTORICO). analisesCount
    // é o que a tela usa pra avisar, num ruleset ATIVO, "já foi
    // utilizado em N análises" sem bloquear a correção (Instruções da
    // tarefa — repoContarAnalisesRuleset_).
    jaUtilizado: repoRulesetJaUtilizadoEmAnalise_(rulesetId),
    analisesCount: repoContarAnalisesRuleset_(rulesetId)
  };

}

// Histórico de revisões (auditoria) de um ruleset — usado pela ação
// "📜 Histórico de revisões" da UI. Só leitura; devolve lista vazia se
// a aba de auditoria ainda não tiver sido criada pela migração
// administrativa (ConfigRegrasCurricularesMigracao.gs).
//
// 2ª rodada cirúrgica (Achado 6): a listagem passa a ser LEVE — nunca
// inclui snapshot_antes_json/snapshot_depois_json (podem ficar pesados
// conforme o ruleset acumula revisões, e a tela nunca precisou deles).
// Quem precisar do snapshot completo de uma auditoria específica usa
// obterDetalheAuditoriaRuleset, abaixo.
function listarHistoricoRevisoesRuleset(rulesetId) {
  exigirAcessoPainel_();
  if (!rulesetId) throw new Error("Ruleset não informado.");
  return repoListarAuditoriasRulesetResumo_(rulesetId);
}

// Acesso técnico, sob demanda, aos snapshots completos (ANTES/DEPOIS)
// de UMA auditoria específica (Achado 6) — nunca chamado pela listagem
// padrão da tela. Sem UI própria nesta rodada (o achado permite deixar
// isso fora do escopo para não aumentar a superfície da UI).
function obterDetalheAuditoriaRuleset(auditoriaId) {
  exigirAcessoPainel_();
  if (!auditoriaId) throw new Error("Auditoria não informada.");
  const auditoria = repoObterAuditoriaPorId_(auditoriaId);
  if (!auditoria) throw new Error(`Auditoria "${auditoriaId}" não encontrada.`);
  return auditoria;
}

function listarRequisitosRuleset(rulesetId) {
  exigirAcessoPainel_();
  return repoListarRequisitos_(rulesetId);
}

function listarDisciplinasRuleset(rulesetId) {
  exigirAcessoPainel_();
  return repoListarDisciplinas_(rulesetId);
}

function listarGruposRuleset(rulesetId) {
  exigirAcessoPainel_();
  return repoListarGrupos_(rulesetId);
}

// Estruturado pro cliente conseguir montar todos os dropdowns de
// Requisitos/Disciplinas/Grupos com UMA chamada só, em vez de uma
// viagem ao servidor por dropdown.
function obterDicionarioRegrasCurriculares() {
  exigirAcessoPainel_();
  return {
    criteriosNumericos: repoObterCriteriosNumericos_().map(c => ({ codigo: c.codigo, rotulo: c.rotulo })),
    operadores: repoObterDominioDicionario_("OPERADOR"),
    tipoRegraDisciplina: repoObterDominioDicionario_("TIPO_REGRA_DISCIPLINA"),
    tipoRegraGrupo: repoObterDominioDicionario_("TIPO_REGRA_GRUPO"),
    opcoesCampoSoma: repoObterOpcoesCampoSoma_()
  };
}

/*-----------------------------------------------------
  UTILITÁRIOS INTERNOS DESTE ARQUIVO
------------------------------------------------------*/

// Confere que o ruleset existe, está em RASCUNHO e nunca foi usado
// numa análise — as três condições que precisam valer pra QUALQUER
// mutação NORMAL (não-corretiva) dentro dele (dados gerais,
// requisitos, disciplinas, grupos). Devolve o resultado de
// repoLocalizarRuleset_ (aba/mapa/linha/dados) pra quem chamou não
// precisar localizar de novo.
//
// Renomeada de "exigirRulesetEditavel_" (evolução multi-currículo/
// revisão interna — Instruções da tarefa: "não deixe uma função
// chamada 'editável' com comportamento ambíguo"). O comportamento
// desta função em si é IDÊNTICO ao que tinha antes; o que muda é que
// agora ela só cobre o caso RASCUNHO — o caso ATIVO tem a função
// irmã abaixo, e cada um dos 7 endpoints de mutação decide qual
// aplicar via prepararContextoMutacaoRuleset_
// (ConfigRegrasCurricularesAuditoria.gs).
function exigirRulesetRascunhoEditavel_(rulesetId) {

  const resultado = repoLocalizarRuleset_(rulesetId);
  if (!resultado) throw new Error(`Ruleset "${rulesetId}" não encontrado.`);

  const status = String(resultado.dados.status || "").trim().toUpperCase();
  if (status !== STATUS_RULESET_RASCUNHO) {
    throw new Error(`Este ruleset está "${status}" e não pode mais ser editado. Crie uma nova versão para alterar as regras.`);
  }

  if (repoRulesetJaUtilizadoEmAnalise_(rulesetId)) {
    throw new Error("Este ruleset já foi utilizado em uma análise de histórico e não pode mais ser alterado.");
  }

  return resultado;

}

// Confere as pré-condições pra CORRIGIR um ruleset ATIVO (revisão
// interna auditada): precisa existir, estar ATIVO (nem RASCUNHO nem
// INATIVO — RASCUNHO usa o fluxo normal acima, INATIVO nunca é
// editável) e vir acompanhado de um motivo não-vazio (Instruções da
// tarefa: "sem motivo, não permitir entrar no modo de correção").
// Repare que, ao contrário de exigirRulesetRascunhoEditavel_, esta
// função NÃO chama repoRulesetJaUtilizadoEmAnalise_ — um ruleset ATIVO
// já ter sido usado em análises é o caso ESPERADO (é por isso que
// existe a correção auditada em primeiro lugar), não um bloqueio.
function exigirRulesetAtivoCorrigivel_(rulesetId, motivo) {

  const resultado = repoLocalizarRuleset_(rulesetId);
  if (!resultado) throw new Error(`Ruleset "${rulesetId}" não encontrado.`);

  const status = String(resultado.dados.status || "").trim().toUpperCase();
  if (status !== STATUS_RULESET_ATIVO) {
    throw new Error(`Este ruleset está "${status}" — a correção de ruleset ativo só se aplica a rulesets ATIVOS.`);
  }

  const motivoTexto = String(motivo || "").trim();
  if (!motivoTexto) {
    throw new Error("Informe o motivo da correção antes de alterar um ruleset ATIVO.");
  }

  return resultado;

}

/*=====================================================
  RESOLVER — contrato de referência pro futuro motor de
  análise (Diplomas). Formalizado aqui, mas NÃO consumido
  por nenhuma tela deste Dashboard hoje — é só a função de
  referência que o outro projeto vai chamar (Instruções da
  tarefa: "formalize uma função PURA/interna de referência").

  Core PURO (não toca em SpreadsheetApp — recebe a lista já
  carregada), pra ser diretamente testável sem mock de
  planilha. O wrapper logo abaixo é o único ponto que de fato
  lê a planilha, via repoListarRulesets_.
=====================================================*/
function resolverRulesetAtivoEmLista_(rulesets, cursoCodigo, habilitacaoCodigo) {

  // habilitacao_codigo "0" (Psicólogo, por exemplo) é um valor válido
  // e nunca pode ser tratado como vazio/falsy — por isso a comparação
  // é sempre por texto (String(...).trim()), nunca por truthiness.
  const cursoTexto = String(cursoCodigo === null || cursoCodigo === undefined ? "" : cursoCodigo).trim();
  const habilitacaoTexto = String(habilitacaoCodigo === null || habilitacaoCodigo === undefined ? "" : habilitacaoCodigo).trim();

  const candidatos = (rulesets || []).filter(r =>
    String(r.curso_codigo).trim() === cursoTexto &&
    String(r.habilitacao_codigo).trim() === habilitacaoTexto &&
    String(r.status).trim().toUpperCase() === STATUS_RULESET_ATIVO
  );

  if (candidatos.length === 0) return { status: "NAO_ENCONTRADO" };
  if (candidatos.length === 1) return { status: "ENCONTRADO", ruleset: candidatos[0] };
  return { status: "AMBIGUO", candidatos: candidatos };

}

// Wrapper que lê a planilha oficial e delega pro core puro acima.
// Esta é a função que o futuro motor de análise do projeto Diplomas
// deverá chamar — curso_codigo vem do Histórico Escolar (PDF),
// habilitacao_codigo vem da habilitação que está sendo avaliada (não
// necessariamente a mesma do cabeçalho do PDF — ver caso
// Psicólogo+Bacharelado nas Instruções da tarefa). Esta função NUNCA
// escolhe arbitrariamente entre múltiplos candidatos (sem "mais
// recente", sem "maior versão", sem heurística nenhuma) e NUNCA cai
// pra outro curso_codigo — currículo sem ruleset correspondente é
// NAO_ENCONTRADO, não um fallback pro currículo mais novo.
function resolverRulesetAtivoPorCursoEHabilitacao_(cursoCodigo, habilitacaoCodigo) {
  return resolverRulesetAtivoEmLista_(repoListarRulesets_(), cursoCodigo, habilitacaoCodigo);
}

function canonicalizarBooleano_(valor) {
  return ehAtivo_(valor) ? VALOR_BOOLEANO_SIM : VALOR_BOOLEANO_NAO;
}

// Versão estrita do booleano — usada nos campos acadêmicos novos onde
// "vazio" NUNCA pode significar "Não" (Instruções da tarefa). Aceita
// "" (ainda não respondido — permitido durante RASCUNHO) ou
// literalmente SIM/NAO; qualquer outra coisa é erro.
function normalizarBooleanoEstrito_(valor, rotuloCampo) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim().toUpperCase();
  if (texto === "") return "";
  if (texto === VALOR_BOOLEANO_SIM || texto === VALOR_BOOLEANO_NAO) return texto;
  throw new Error(`${rotuloCampo} precisa ser "Sim" ou "Não".`);
}

// Inteiro opcional (mesma filosofia de normalizarNumeroOpcional_
// abaixo, mas exigindo número INTEIRO MAIOR QUE ZERO quando algo for
// informado — usado por semestres_minimos/semestres_maximos). A
// exigência de ">0" é uma correção incidental (3ª rodada cirúrgica,
// Achado 1): um número de semestres negativo ou zero nunca foi um
// valor válido, em RASCUNHO ou em ATIVO — não é uma regra nova de
// negócio, é o mesmo "precisa ser inteiro" já existente, só que
// também rejeitando o que sempre foi absurdo.
function normalizarInteiroOpcional_(valor, rotuloCampo) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim();
  if (texto === "") return "";
  const numero = Number(texto);
  if (isNaN(numero) || !Number.isInteger(numero) || numero <= 0) {
    throw new Error(`${rotuloCampo} precisa ser um número inteiro maior que zero.`);
  }
  return numero;
}

// "" continua "" (NULL_NUNCA_ZERO — Instruções.txt item 38: célula
// vazia nunca vira zero). Só valida como número quando algo foi
// digitado.
function normalizarNumeroOpcional_(valor, rotuloCampo) {
  const texto = String(valor === null || valor === undefined ? "" : valor).trim();
  if (texto === "") return "";
  if (isNaN(Number(texto))) throw new Error(`${rotuloCampo} precisa ser um número.`);
  return Number(texto);
}

/*=====================================================
  DADOS GERAIS DO RULESET (aba CURRICULOS, aba "Geral")
=====================================================*/

// dadosNovos: os campos acadêmicos novos (semestres_minimos,
// semestres_maximos, excedente_eletivas_compensa_livres) são
// aceitos tanto em RASCUNHO quanto em correção de ATIVO — ver "O QUE
// PODE SER CORRIGIDO EM ATIVO" nas Instruções da tarefa.
//
// estrutura_curricular/selecao_automatica/criterio_selecao são campos
// de identidade/escopo (ou reservados, no caso de seleção automática)
// e só podem ser alterados em RASCUNHO — em modo de correção de
// ATIVO, o servidor NUNCA confia num valor diferente vindo do
// cliente pra esses três campos, mesmo que a UI já os desabilite
// (Instruções da tarefa: "campos que nunca podem ser alterados em
// ruleset ativo" + "mantenha selecao_automatica/criterio_selecao sob
// a política atual/reservada").
// Chamada só por salvarDadosGeraisRuleset (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function salvarDadosGeraisRulesetSemAuditoria_(dados) {

  if (!dados || !dados.rulesetId) throw new Error("Dados do ruleset incompletos.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let correcaoAtiva = null;
  const entidadeTipoCorrecao = "RULESET_GERAL";
  const entidadeIdCorrecao = dados.rulesetId;
  const operacaoCorrecao = "EDITAR_DADOS_GERAIS";

  try {

    // 2/4-5: localizar ruleset + decidir RASCUNHO vs ATIVO_CORRECAO vs
    // recusa — nenhuma escrita acontece aqui (2ª rodada, Achado 1).
    const contexto = prepararContextoMutacaoRuleset_(dados.rulesetId, dados.motivoCorrecaoAtiva);

    const atual = repoLocalizarRuleset_(dados.rulesetId);

    // 6: snapshotToken
    exigirSnapshotValido_(atual.dados, dados.snapshotToken, "o ruleset");

    // 7-10: dados enviados / referências / regras estruturais — TUDO
    // isso (inclusive o parsing das datas de vigência, que antes só
    // era validado DEPOIS da primeira escrita) precisa passar antes de
    // qualquer escrita real.
    const semestresMinimos = normalizarInteiroOpcional_(dados.semestres_minimos, "Semestres mínimos");
    const semestresMaximos = normalizarInteiroOpcional_(dados.semestres_maximos, "Semestres máximos");
    const excedenteCompensaLivres = normalizarBooleanoEstrito_(
      dados.excedente_eletivas_compensa_livres,
      'O campo "Excedente de eletivas compensa créditos livres?"'
    );

    const camposParaGravar = {
      observacao: String(dados.observacao || "").trim(),
      semestres_minimos: semestresMinimos,
      semestres_maximos: semestresMaximos,
      excedente_eletivas_compensa_livres: excedenteCompensaLivres
    };

    if (contexto.modo === "RASCUNHO") {

      const selecaoAutomatica = canonicalizarBooleano_(dados.selecao_automatica);
      const criterioSelecao = String(dados.criterio_selecao || "").trim();

      if (selecaoAutomatica === VALOR_BOOLEANO_SIM && !criterioSelecao) {
        throw new Error('Para marcar "Seleção automática" como SIM, preencha o critério de seleção primeiro.');
      }

      camposParaGravar.estrutura_curricular = String(dados.estrutura_curricular || "").trim();
      camposParaGravar.selecao_automatica = selecaoAutomatica;
      camposParaGravar.criterio_selecao = criterioSelecao;

    } else {

      // ATIVO_CORRECAO: estrutura_curricular/selecao_automatica/
      // criterio_selecao são identidade/reservados — se o cliente
      // mandar algo DIFERENTE do que já está gravado, é recusado
      // (nunca aplicado silenciosamente, nunca ignorado sem avisar).
      const estruturaEnviada = String(dados.estrutura_curricular || "").trim();
      const estruturaAtual = String(atual.dados.estrutura_curricular || "").trim();
      if (estruturaEnviada !== estruturaAtual) {
        throw new Error("A estrutura curricular não pode ser alterada em modo de correção de ruleset ativo.");
      }

    }

    // vigencia_inicio/vigencia_fim ficam como TEXTO puro (mesma
    // proteção usada na Colação de Grau — ConfigCore.gs,
    // gravarCelulaTexto_): sem isso, o Sheets reinterpreta
    // "dd/mm/aaaa" como um valor de Data por conta própria. O parsing
    // (que pode lançar erro de validação) acontece aqui, ANTES de
    // qualquer escrita.
    const vigenciaInicio = String(dados.vigencia_inicio || "").trim()
      ? validarDataBrTexto_(dados.vigencia_inicio, "Vigência — início")
      : "";
    const vigenciaFim = String(dados.vigencia_fim || "").trim()
      ? validarDataBrTexto_(dados.vigencia_fim, "Vigência — fim")
      : "";

    // 3ª rodada cirúrgica, Achado 1: em correção de ATIVO, os campos
    // acadêmicos novos (semestres mínimos/máximos, compensação de
    // eletivas) precisam estar COMPLETOS e coerentes — a mesma
    // checagem que validarConteudoCompletoRuleset_ faria depois da
    // escrita (validarSemestresECompensacao_, reutilizada, não
    // duplicada) roda aqui antes de qualquer auditoria/mutação. Em
    // RASCUNHO isso continua tolerado (currículo "montado aos
    // poucos") — nenhuma mudança de comportamento nesse modo.
    if (contexto.modo === "ATIVO_CORRECAO") {
      const errosCamposNovos = [];
      validarSemestresECompensacao_(
        {
          semestres_minimos: semestresMinimos,
          semestres_maximos: semestresMaximos,
          excedente_eletivas_compensa_livres: excedenteCompensaLivres
        },
        errosCamposNovos,
        true
      );
      if (errosCamposNovos.length) {
        throw new Error(errosCamposNovos.join(" "));
      }
    }

    // 11: SOMENTE AGORA (toda a validação acima já passou) preparar a
    // auditoria — a primeira escrita real do fluxo de correção.
    if (contexto.modo === "ATIVO_CORRECAO") {
      correcaoAtiva = prepararAuditoriaCorrecaoAtiva_(dados.rulesetId, String(dados.motivoCorrecaoAtiva).trim());
    }

    // 12: aplicar mutação
    repoAtualizarLinhaCampos_(atual.aba, atual.mapa, atual.linha, camposParaGravar);
    gravarCelulaTexto_(atual.aba.getRange(atual.linha, atual.mapa["vigencia_inicio"]), vigenciaInicio);
    gravarCelulaTexto_(atual.aba.getRange(atual.linha, atual.mapa["vigencia_fim"]), vigenciaFim);

    // 13-15: validar resultado + confirmar auditoria
    if (correcaoAtiva) {
      const validacaoPosterior = validarConteudoCompletoRuleset_(dados.rulesetId);
      if (!validacaoPosterior.valido) {
        throw new Error(
          "A alteração deixaria o ruleset ATIVO em um estado inválido e não pôde ser confirmada:\n\n" +
          validacaoPosterior.erros.map(e => `• ${e}`).join("\n")
        );
      }
      confirmarCorrecaoAtiva_(correcaoAtiva, entidadeTipoCorrecao, entidadeIdCorrecao, operacaoCorrecao);
    }

    return repoObterRuleset_(dados.rulesetId);

  } catch (err) {
    // 3ª rodada cirúrgica (Achado 3): só agora — depois de
    // falharCorrecaoAtiva_ já ter tentado o rollback e de sabermos se
    // ele funcionou — a mensagem final é montada. Nenhum throw antes
    // deste ponto pode afirmar "foi desfeita"/"foi restaurada".
    if (correcaoAtiva) {
      const resultadoFalha = falharCorrecaoAtiva_(correcaoAtiva, err, entidadeTipoCorrecao, entidadeIdCorrecao, operacaoCorrecao);
      throw construirErroFinalCorrecao_(err, resultadoFalha);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  REQUISITOS NUMÉRICOS
=====================================================*/

// Chamada só por salvarRequisitoCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function salvarRequisitoCurricularSemAuditoria_(dados) {

  if (!dados || !dados.rulesetId) throw new Error("Dados do requisito incompletos.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let correcaoAtiva = null;
  let entidadeIdCorrecao = null;
  let operacaoCorrecao = null;

  try {

    // 2/4-5: decidir RASCUNHO vs ATIVO_CORRECAO vs recusa — sem escrever nada.
    const contexto = prepararContextoMutacaoRuleset_(dados.rulesetId, dados.motivoCorrecaoAtiva);

    // 3/6: localizar a entidade alvo (se edição) e validar snapshotToken cedo.
    let existente = null;
    if (dados.requisitoId) {
      existente = repoLocalizarRequisito_(dados.requisitoId);
      if (!existente) throw new Error("Este requisito não existe mais (pode ter sido excluído por outra pessoa). Recarregue a tela.");
      if (String(existente.dados.ruleset_id).trim() !== String(dados.rulesetId).trim()) {
        throw new Error("Este requisito não pertence a este ruleset.");
      }
      exigirSnapshotValido_(existente.dados, dados.snapshotToken, "o requisito");
    }

    // 7-9: dados enviados / referências / duplicidade
    const criterio = String(dados.criterio || "").trim();
    if (!criterio) throw new Error("Selecione um critério.");

    const criteriosValidos = repoObterCriteriosNumericos_().map(c => c.codigo);
    if (criteriosValidos.indexOf(criterio) === -1) {
      throw new Error(`Critério "${criterio}" não é válido (não existe ou não está ativo no DICIONARIO).`);
    }

    // campo_parser é sempre preenchido automaticamente a partir do
    // DICIONARIO — o usuário nunca digita isso (Instruções.txt item 12).
    const campoParser = repoMapaCriterioParaCampoParser_()[criterio];
    if (!campoParser) {
      throw new Error(
        `O critério "${criterio}" não tem campo_parser configurado no DICIONARIO ` +
        `(a descrição da linha CRITERIO_NUMERICO precisa conter "campo_parser=..."). ` +
        `Corrija o DICIONARIO antes de usar esse critério.`
      );
    }

    const operador = String(dados.operador || "").trim();
    if (operador) {
      const operadoresValidos = repoObterDominioDicionario_("OPERADOR").map(o => o.codigo);
      if (operadoresValidos.indexOf(operador) === -1) {
        throw new Error(`Operador "${operador}" não é válido.`);
      }
    }

    const valor = normalizarNumeroOpcional_(dados.valor, "Valor");
    const ativo = canonicalizarBooleano_(dados.ativo);
    const obrigatorio = canonicalizarBooleano_(dados.obrigatorio);

    // No máximo um requisito ATIVO por critério, dentro do mesmo
    // ruleset — só checamos quando ESTE requisito está (ou continua)
    // ativo; um requisito inativo pode conviver com outro ativo do
    // mesmo critério sem problema (Instruções.txt item 13).
    if (ativo === VALOR_BOOLEANO_SIM) {
      validarDuplicidadeCriterioAtivo_(dados.rulesetId, criterio, ativo, dados.requisitoId);
    }

    const camposComuns = {
      ruleset_id: dados.rulesetId,
      criterio: criterio,
      campo_parser: campoParser,
      operador: operador,
      valor: valor,
      unidade: String(dados.unidade || "").trim(),
      obrigatorio: obrigatorio,
      descricao: String(dados.descricao || "").trim(),
      ativo: ativo,
      observacao: String(dados.observacao || "").trim()
    };

    // 3ª rodada cirúrgica, Achado 1: requisito ATIVO precisa ter
    // critério/operador/valor coerentes ANTES de qualquer
    // auditoria/mutação — validarCamposRequisitoAtivo_ é a MESMA
    // função usada por validarConteudoCompletoRuleset_ (pós-mutação),
    // nunca uma segunda definição da mesma regra. Em RASCUNHO isso
    // continua tolerado (currículo "montado aos poucos").
    if (contexto.modo === "ATIVO_CORRECAO" && ativo === VALOR_BOOLEANO_SIM) {
      const errosRequisitoAtivo = validarCamposRequisitoAtivo_(camposComuns);
      if (errosRequisitoAtivo.length) {
        throw new Error(errosRequisitoAtivo.join(" "));
      }
    }

    operacaoCorrecao = dados.requisitoId ? "EDITAR_REQUISITO" : "INCLUIR_REQUISITO";

    let novoId, ordem;
    if (existente) {
      entidadeIdCorrecao = dados.requisitoId;
    } else {
      novoId = gerarIdEntidade_("req");
      ordem = repoProximaOrdem_(repoListarRequisitos_(dados.rulesetId));
      entidadeIdCorrecao = novoId;
    }

    // 11: SOMENTE AGORA (toda a validação acima já passou) preparar a
    // auditoria — a primeira escrita real do fluxo de correção.
    if (contexto.modo === "ATIVO_CORRECAO") {
      correcaoAtiva = prepararAuditoriaCorrecaoAtiva_(dados.rulesetId, String(dados.motivoCorrecaoAtiva).trim());
    }

    // 12: aplicar mutação
    let resultadoFinal;

    if (existente) {

      repoAtualizarLinhaCampos_(existente.aba, existente.mapa, existente.linha, camposComuns);
      resultadoFinal = anexarSnapshotToken_(Object.assign({}, existente.dados, camposComuns, {
        requisito_id: dados.requisitoId,
        ordem: existente.dados.ordem
      }));

    } else {

      repoInserirRequisito_(Object.assign({ requisito_id: novoId, ordem: ordem }, camposComuns));
      resultadoFinal = anexarSnapshotToken_(Object.assign({ requisito_id: novoId, ordem: ordem }, camposComuns));

    }

    // 13-15: validar resultado + confirmar auditoria
    if (correcaoAtiva) {
      const validacaoPosterior = validarConteudoCompletoRuleset_(dados.rulesetId);
      if (!validacaoPosterior.valido) {
        throw new Error(
          "A alteração deixaria o ruleset ATIVO em um estado inválido e não pôde ser confirmada:\n\n" +
          validacaoPosterior.erros.map(e => `• ${e}`).join("\n")
        );
      }
      confirmarCorrecaoAtiva_(correcaoAtiva, "REQUISITO", entidadeIdCorrecao, operacaoCorrecao);
    }

    return resultadoFinal;

  } catch (err) {
    if (correcaoAtiva) {
      const resultadoFalha = falharCorrecaoAtiva_(correcaoAtiva, err, "REQUISITO", entidadeIdCorrecao, operacaoCorrecao);
      throw construirErroFinalCorrecao_(err, resultadoFalha);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }

}

// Chamada só por excluirRequisitoCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function excluirRequisitoCurricularSemAuditoria_(requisitoId, snapshotToken, motivoCorrecaoAtiva) {

  if (!requisitoId) throw new Error("Requisito não informado.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let correcaoAtiva = null;
  const entidadeIdCorrecao = requisitoId;
  const operacaoCorrecao = "EXCLUIR_REQUISITO";

  try {

    // 3: localizar entidade alvo
    const existente = repoLocalizarRequisito_(requisitoId);
    if (!existente) return { sucesso: true }; // já não existe — exclusão já está "concluída"

    // 4-5: decidir modo — sem escrever nada
    const contexto = prepararContextoMutacaoRuleset_(existente.dados.ruleset_id, motivoCorrecaoAtiva);

    // 6: snapshotToken
    exigirSnapshotValido_(existente.dados, snapshotToken, "o requisito");

    // 11: preparar auditoria (só agora, com toda a validação já feita)
    if (contexto.modo === "ATIVO_CORRECAO") {
      correcaoAtiva = prepararAuditoriaCorrecaoAtiva_(existente.dados.ruleset_id, String(motivoCorrecaoAtiva).trim());
    }

    // 12
    repoExcluirLinha_(existente.aba, existente.linha);

    // 13-15
    if (correcaoAtiva) {
      const validacaoPosterior = validarConteudoCompletoRuleset_(existente.dados.ruleset_id);
      if (!validacaoPosterior.valido) {
        throw new Error(
          "A exclusão deixaria o ruleset ATIVO em um estado inválido e não pôde ser confirmada:\n\n" +
          validacaoPosterior.erros.map(e => `• ${e}`).join("\n")
        );
      }
      confirmarCorrecaoAtiva_(correcaoAtiva, "REQUISITO", entidadeIdCorrecao, operacaoCorrecao);
    }

    return { sucesso: true };

  } catch (err) {
    if (correcaoAtiva) {
      const resultadoFalha = falharCorrecaoAtiva_(correcaoAtiva, err, "REQUISITO", entidadeIdCorrecao, operacaoCorrecao);
      throw construirErroFinalCorrecao_(err, resultadoFalha);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  DISCIPLINAS
=====================================================*/

// Chamada só por salvarDisciplinaCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function salvarDisciplinaCurricularSemAuditoria_(dados) {

  if (!dados || !dados.rulesetId) throw new Error("Dados da disciplina incompletos.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let correcaoAtiva = null;
  let entidadeIdCorrecao = null;
  let operacaoCorrecao = null;

  try {

    // 2/4-5: decidir RASCUNHO vs ATIVO_CORRECAO vs recusa — sem escrever nada.
    const contexto = prepararContextoMutacaoRuleset_(dados.rulesetId, dados.motivoCorrecaoAtiva);

    // 3/6: localizar a entidade alvo (se edição) e validar snapshotToken cedo.
    let existente = null;
    if (dados.regraDisciplinaId) {
      existente = repoLocalizarDisciplina_(dados.regraDisciplinaId);
      if (!existente) throw new Error("Esta disciplina não existe mais (pode ter sido excluída por outra pessoa). Recarregue a tela.");
      if (String(existente.dados.ruleset_id).trim() !== String(dados.rulesetId).trim()) {
        throw new Error("Esta disciplina não pertence a este ruleset.");
      }
      exigirSnapshotValido_(existente.dados, dados.snapshotToken, "a disciplina");
    }

    // 7-8: dados enviados / referências
    const sigla = String(dados.sigla || "").trim();
    const nome = String(dados.nome || "").trim();
    if (!sigla) throw new Error("Informe a sigla da disciplina.");
    if (!nome) throw new Error("Informe o nome da disciplina.");

    const tipoRegra = String(dados.tipo_regra || "").trim();
    const tiposValidos = repoObterDominioDicionario_("TIPO_REGRA_DISCIPLINA").map(t => t.codigo);
    if (tiposValidos.indexOf(tipoRegra) === -1) {
      throw new Error(`Tipo de exigência "${tipoRegra}" não é válido.`);
    }

    let grupoId = String(dados.grupo_id || "").trim();

    if (tipoRegra === TIPO_REGRA_DISCIPLINA_GRUPO) {
      // valida que o grupo existe e pertence a este mesmo ruleset
      validarGrupoPertenceAoRuleset_(dados.rulesetId, grupoId);
    } else if (tipoRegra === TIPO_REGRA_DISCIPLINA_OBRIGATORIA) {
      if (grupoId) {
        throw new Error('Disciplina do tipo "Obrigatória" não deve ter um grupo selecionado.');
      }
      grupoId = "";
    }

    const ativo = canonicalizarBooleano_(dados.ativo);

    const camposComuns = {
      ruleset_id: dados.rulesetId,
      sigla: sigla,
      nome: nome,
      tipo_regra: tipoRegra,
      grupo_id: grupoId,
      status_aceitos: String(dados.status_aceitos || "").trim(),
      ativo: ativo,
      observacao: String(dados.observacao || "").trim()
    };

    operacaoCorrecao = dados.regraDisciplinaId ? "EDITAR_DISCIPLINA" : "INCLUIR_DISCIPLINA";

    let novoId, ordem;
    if (existente) {
      entidadeIdCorrecao = dados.regraDisciplinaId;
    } else {
      novoId = gerarIdEntidade_("disc");
      ordem = repoProximaOrdem_(repoListarDisciplinas_(dados.rulesetId));
      entidadeIdCorrecao = novoId;
    }

    // 11: SOMENTE AGORA (toda a validação acima já passou) preparar a
    // auditoria — a primeira escrita real do fluxo de correção.
    if (contexto.modo === "ATIVO_CORRECAO") {
      correcaoAtiva = prepararAuditoriaCorrecaoAtiva_(dados.rulesetId, String(dados.motivoCorrecaoAtiva).trim());
    }

    // 12: aplicar mutação
    let resultadoFinal;

    if (existente) {

      repoAtualizarLinhaCampos_(existente.aba, existente.mapa, existente.linha, camposComuns);
      resultadoFinal = anexarSnapshotToken_(Object.assign({}, existente.dados, camposComuns, {
        regra_disciplina_id: dados.regraDisciplinaId,
        ordem: existente.dados.ordem
      }));

    } else {

      repoInserirDisciplina_(Object.assign({ regra_disciplina_id: novoId, ordem: ordem }, camposComuns));
      resultadoFinal = anexarSnapshotToken_(Object.assign({ regra_disciplina_id: novoId, ordem: ordem }, camposComuns));

    }

    // 13-15: validar resultado + confirmar auditoria
    if (correcaoAtiva) {
      const validacaoPosterior = validarConteudoCompletoRuleset_(dados.rulesetId);
      if (!validacaoPosterior.valido) {
        throw new Error(
          "A alteração deixaria o ruleset ATIVO em um estado inválido e não pôde ser confirmada:\n\n" +
          validacaoPosterior.erros.map(e => `• ${e}`).join("\n")
        );
      }
      confirmarCorrecaoAtiva_(correcaoAtiva, "DISCIPLINA", entidadeIdCorrecao, operacaoCorrecao);
    }

    return resultadoFinal;

  } catch (err) {
    if (correcaoAtiva) {
      const resultadoFalha = falharCorrecaoAtiva_(correcaoAtiva, err, "DISCIPLINA", entidadeIdCorrecao, operacaoCorrecao);
      throw construirErroFinalCorrecao_(err, resultadoFalha);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }

}

// Chamada só por excluirDisciplinaCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function excluirDisciplinaCurricularSemAuditoria_(regraDisciplinaId, snapshotToken, motivoCorrecaoAtiva) {

  if (!regraDisciplinaId) throw new Error("Disciplina não informada.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let correcaoAtiva = null;
  const entidadeIdCorrecao = regraDisciplinaId;
  const operacaoCorrecao = "EXCLUIR_DISCIPLINA";

  try {

    // 3: localizar entidade alvo
    const existente = repoLocalizarDisciplina_(regraDisciplinaId);
    if (!existente) return { sucesso: true };

    // 4-5: decidir modo — sem escrever nada
    const contexto = prepararContextoMutacaoRuleset_(existente.dados.ruleset_id, motivoCorrecaoAtiva);

    // 6: snapshotToken
    exigirSnapshotValido_(existente.dados, snapshotToken, "a disciplina");

    // 11: preparar auditoria (só agora, com toda a validação já feita)
    if (contexto.modo === "ATIVO_CORRECAO") {
      correcaoAtiva = prepararAuditoriaCorrecaoAtiva_(existente.dados.ruleset_id, String(motivoCorrecaoAtiva).trim());
    }

    // 12
    repoExcluirLinha_(existente.aba, existente.linha);

    // 13-15
    if (correcaoAtiva) {
      const validacaoPosterior = validarConteudoCompletoRuleset_(existente.dados.ruleset_id);
      if (!validacaoPosterior.valido) {
        throw new Error(
          "A exclusão deixaria o ruleset ATIVO em um estado inválido e não pôde ser confirmada:\n\n" +
          validacaoPosterior.erros.map(e => `• ${e}`).join("\n")
        );
      }
      confirmarCorrecaoAtiva_(correcaoAtiva, "DISCIPLINA", entidadeIdCorrecao, operacaoCorrecao);
    }

    return { sucesso: true };

  } catch (err) {
    if (correcaoAtiva) {
      const resultadoFalha = falharCorrecaoAtiva_(correcaoAtiva, err, "DISCIPLINA", entidadeIdCorrecao, operacaoCorrecao);
      throw construirErroFinalCorrecao_(err, resultadoFalha);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  GRUPOS_REGRAS
=====================================================*/

// Chamada só por salvarGrupoCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function salvarGrupoCurricularSemAuditoria_(dados) {

  if (!dados || !dados.rulesetId) throw new Error("Dados do grupo incompletos.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let correcaoAtiva = null;
  let entidadeIdCorrecao = null;
  let operacaoCorrecao = null;

  try {

    // 2/4-5: decidir RASCUNHO vs ATIVO_CORRECAO vs recusa — sem escrever nada.
    const contexto = prepararContextoMutacaoRuleset_(dados.rulesetId, dados.motivoCorrecaoAtiva);

    // 3/6: localizar a entidade alvo (se edição) e validar snapshotToken cedo.
    let existente = null;
    if (dados.grupoId) {
      existente = repoLocalizarGrupo_(dados.grupoId);
      if (!existente) throw new Error("Este grupo não existe mais (pode ter sido excluído por outra pessoa). Recarregue a tela.");
      if (String(existente.dados.ruleset_id).trim() !== String(dados.rulesetId).trim()) {
        throw new Error("Este grupo não pertence a este ruleset.");
      }
      exigirSnapshotValido_(existente.dados, dados.snapshotToken, "o grupo");
    }

    // 7-8: dados enviados / referências
    const nomeGrupo = String(dados.nome_grupo || "").trim();
    if (!nomeGrupo) throw new Error("Informe o nome do grupo.");

    const tipoRegra = String(dados.tipo_regra || "").trim();
    const tiposValidos = repoObterDominioDicionario_("TIPO_REGRA_GRUPO").map(t => t.codigo);
    if (tiposValidos.indexOf(tipoRegra) === -1) {
      throw new Error(`Tipo de regra "${tipoRegra}" não é válido.`);
    }

    const valorMinimo = normalizarNumeroOpcional_(dados.valor_minimo, "Valor mínimo");

    let campoSoma = String(dados.campo_soma || "").trim();
    if (tipoRegra === TIPO_REGRA_GRUPO_MIN_CREDITS) {
      if (campoSoma) {
        const opcoesValidas = repoObterOpcoesCampoSoma_().map(o => o.valor);
        if (opcoesValidas.indexOf(campoSoma) === -1) {
          throw new Error(`Campo de soma "${campoSoma}" não é uma opção válida.`);
        }
      }
    } else {
      campoSoma = ""; // não se aplica a ONE_OF/MIN_COUNT
    }

    const ativo = canonicalizarBooleano_(dados.ativo);

    const camposComuns = {
      ruleset_id: dados.rulesetId,
      nome_grupo: nomeGrupo,
      tipo_regra: tipoRegra,
      valor_minimo: valorMinimo,
      unidade: String(dados.unidade || "").trim(),
      campo_soma: campoSoma,
      ativo: ativo,
      observacao: String(dados.observacao || "").trim()
    };

    // 3ª rodada cirúrgica, Achado 1: grupo ATIVO precisa ter
    // valor_minimo (e, se MIN_CREDITS, campo_soma) coerentes ANTES de
    // qualquer auditoria/mutação — validarCamposGrupoAtivo_ é a MESMA
    // função usada por validarConteudoCompletoRuleset_ (pós-mutação),
    // nunca uma segunda definição da mesma regra. Em RASCUNHO isso
    // continua tolerado (currículo "montado aos poucos").
    if (contexto.modo === "ATIVO_CORRECAO" && ativo === VALOR_BOOLEANO_SIM) {
      const errosGrupoAtivo = validarCamposGrupoAtivo_(camposComuns);
      if (errosGrupoAtivo.length) {
        throw new Error(errosGrupoAtivo.join(" "));
      }
    }

    operacaoCorrecao = dados.grupoId ? "EDITAR_GRUPO" : "INCLUIR_GRUPO";

    let novoId;
    if (existente) {
      entidadeIdCorrecao = dados.grupoId;
    } else {
      novoId = gerarIdEntidade_("grp");
      entidadeIdCorrecao = novoId;
    }

    // 11: SOMENTE AGORA (toda a validação acima já passou) preparar a
    // auditoria — a primeira escrita real do fluxo de correção.
    if (contexto.modo === "ATIVO_CORRECAO") {
      correcaoAtiva = prepararAuditoriaCorrecaoAtiva_(dados.rulesetId, String(dados.motivoCorrecaoAtiva).trim());
    }

    // 12: aplicar mutação
    let resultadoFinal;

    if (existente) {

      repoAtualizarLinhaCampos_(existente.aba, existente.mapa, existente.linha, camposComuns);
      resultadoFinal = anexarSnapshotToken_(Object.assign({}, existente.dados, camposComuns, { grupo_id: dados.grupoId }));

    } else {

      repoInserirGrupo_(Object.assign({ grupo_id: novoId }, camposComuns));
      resultadoFinal = anexarSnapshotToken_(Object.assign({ grupo_id: novoId }, camposComuns));

    }

    // 13-15: validar resultado + confirmar auditoria
    if (correcaoAtiva) {
      const validacaoPosterior = validarConteudoCompletoRuleset_(dados.rulesetId);
      if (!validacaoPosterior.valido) {
        throw new Error(
          "A alteração deixaria o ruleset ATIVO em um estado inválido e não pôde ser confirmada:\n\n" +
          validacaoPosterior.erros.map(e => `• ${e}`).join("\n")
        );
      }
      confirmarCorrecaoAtiva_(correcaoAtiva, "GRUPO", entidadeIdCorrecao, operacaoCorrecao);
    }

    return resultadoFinal;

  } catch (err) {
    if (correcaoAtiva) {
      const resultadoFalha = falharCorrecaoAtiva_(correcaoAtiva, err, "GRUPO", entidadeIdCorrecao, operacaoCorrecao);
      throw construirErroFinalCorrecao_(err, resultadoFalha);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }

}

// Chamada só por excluirGrupoCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function excluirGrupoCurricularSemAuditoria_(grupoId, snapshotToken, motivoCorrecaoAtiva) {

  if (!grupoId) throw new Error("Grupo não informado.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  let correcaoAtiva = null;
  const entidadeIdCorrecao = grupoId;
  const operacaoCorrecao = "EXCLUIR_GRUPO";

  try {

    // 3: localizar entidade alvo
    const existente = repoLocalizarGrupo_(grupoId);
    if (!existente) return { sucesso: true };

    // 4-5: decidir modo — sem escrever nada
    const contexto = prepararContextoMutacaoRuleset_(existente.dados.ruleset_id, motivoCorrecaoAtiva);

    // 6: snapshotToken
    exigirSnapshotValido_(existente.dados, snapshotToken, "o grupo");

    // 10: regra estrutural verificável antes da escrita — nenhuma
    // disciplina pode estar referenciando este grupo (Instruções.txt
    // item 36). Antes desta rodada, isso era checado ANTES do
    // snapshotToken; agora fica depois dele, mas ainda inteiramente
    // antes de qualquer escrita.
    validarGrupoSemDisciplinasVinculadas_(grupoId);

    // 11: preparar auditoria (só agora, com toda a validação já feita)
    if (contexto.modo === "ATIVO_CORRECAO") {
      correcaoAtiva = prepararAuditoriaCorrecaoAtiva_(existente.dados.ruleset_id, String(motivoCorrecaoAtiva).trim());
    }

    // 12
    repoExcluirLinha_(existente.aba, existente.linha);

    // 13-15
    if (correcaoAtiva) {
      const validacaoPosterior = validarConteudoCompletoRuleset_(existente.dados.ruleset_id);
      if (!validacaoPosterior.valido) {
        throw new Error(
          "A exclusão deixaria o ruleset ATIVO em um estado inválido e não pôde ser confirmada:\n\n" +
          validacaoPosterior.erros.map(e => `• ${e}`).join("\n")
        );
      }
      confirmarCorrecaoAtiva_(correcaoAtiva, "GRUPO", entidadeIdCorrecao, operacaoCorrecao);
    }

    return { sucesso: true };

  } catch (err) {
    if (correcaoAtiva) {
      const resultadoFalha = falharCorrecaoAtiva_(correcaoAtiva, err, "GRUPO", entidadeIdCorrecao, operacaoCorrecao);
      throw construirErroFinalCorrecao_(err, resultadoFalha);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  VALIDAÇÃO / ATIVAÇÃO / INATIVAÇÃO / NOVA VERSÃO
=====================================================*/

// Roda o checklist completo (Instruções.txt item 17) sem mudar nada
// — usado pelo botão "Validar regras", que pode ser clicado a
// qualquer momento durante a montagem do ruleset.
function validarRulesetCurricular(rulesetId) {
  exigirAcessoPainel_();
  if (!rulesetId) throw new Error("Ruleset não informado.");
  const resultado = validarRulesetParaAtivacao_(rulesetId);
  const ctx = contextoAuditoriaPainel_();
  registrarEventoSemFalhar_({
    evento: "RULESET.VALIDAR", alvo_tipo: "ruleset", alvo_id: rulesetId,
    detalhes: { valido: !!resultado.valido, erros: (resultado.erros || []).length },
    sessao_id: ctx.sessao_id, tela: ctx.tela, contexto: ctx.contexto
  });
  return resultado;
}

// Ao ativar, se já existir outro ruleset ATIVO para a MESMA
// habilitação E MESMA estrutura curricular (curso_codigo +
// habilitacao_codigo + estrutura_curricular), ele é automaticamente
// INATIVADO — só pode haver um ATIVO por estrutura curricular de cada
// vez. Estruturas curriculares diferentes da mesma habilitação PODEM
// ficar ATIVAS ao mesmo tempo (ex: alunos antigos numa estrutura,
// alunos novos em outra) — isso não é conflito, é o caso normal.
// estrutura_curricular vazia bloqueia a ativação inteira (ver
// validarRulesetParaAtivacao_): sem ela não dá pra saber o escopo, e
// o sistema nunca adivinha — mais seguro recusar do que arriscar
// inativar (ou deixar de inativar) o ruleset errado.
// Chamada só por ativarRulesetCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function ativarRulesetCurricularSemAuditoria_(rulesetId, snapshotToken) {

  if (!rulesetId) throw new Error("Ruleset não informado.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const atual = repoLocalizarRuleset_(rulesetId);
    if (!atual) throw new Error(`Ruleset "${rulesetId}" não encontrado.`);

    exigirSnapshotValido_(atual.dados, snapshotToken, "o ruleset");

    const statusAtual = String(atual.dados.status || "").trim().toUpperCase();
    if (statusAtual !== STATUS_RULESET_RASCUNHO) {
      throw new Error(`Só é possível ativar um ruleset em RASCUNHO (status atual: "${statusAtual}").`);
    }

    const resultadoValidacao = validarRulesetParaAtivacao_(rulesetId);
    if (!resultadoValidacao.valido) {
      throw new Error(
        `Não foi possível ativar "${rulesetId}":\n\n` +
        resultadoValidacao.erros.map(e => `• ${e}`).join("\n")
      );
    }

    const cursoCodigo = String(atual.dados.curso_codigo).trim();
    const habilitacaoCodigo = String(atual.dados.habilitacao_codigo).trim();
    const estruturaCurricular = String(atual.dados.estrutura_curricular || "").trim();

    // Defensivo: validarRulesetParaAtivacao_ (chamada acima) já recusa
    // ativação com estrutura_curricular vazia, então nunca deveríamos
    // chegar aqui sem ela — mas repetimos a checagem aqui, antes de
    // tocar em qualquer outro ruleset, seguindo o princípio de "nunca
    // adivinhar o escopo": se essa garantia mudar no futuro, é mais
    // seguro travar aqui do que inativar algo com base num escopo
    // ambíguo.
    if (!estruturaCurricular) {
      throw new Error("A estrutura curricular precisa ser informada antes de ativar este ruleset.");
    }

    // Só outro ruleset ATIVO da MESMA habilitação E da MESMA estrutura
    // curricular é candidato a substituição automática. Estruturas
    // curriculares diferentes da mesma habilitação podem conviver
    // ATIVAS ao mesmo tempo (ex: alunos antigos numa estrutura, alunos
    // novos em outra) — isso não é inconsistência, é esperado.
    const outrosAtivosMesmoEscopo = repoListarRulesets_().filter(r =>
      String(r.ruleset_id).trim() !== String(rulesetId).trim() &&
      String(r.curso_codigo).trim() === cursoCodigo &&
      String(r.habilitacao_codigo).trim() === habilitacaoCodigo &&
      String(r.estrutura_curricular || "").trim() === estruturaCurricular &&
      String(r.status).trim().toUpperCase() === STATUS_RULESET_ATIVO
    );

    const desativadosAutomaticamente = [];
    outrosAtivosMesmoEscopo.forEach(r => {
      const localizado = repoLocalizarRuleset_(r.ruleset_id);
      if (!localizado) return; // sumiu entre a leitura e agora — ignora, não é crítico
      repoAtualizarLinhaCampos_(localizado.aba, localizado.mapa, localizado.linha, { status: STATUS_RULESET_INATIVO });
      desativadosAutomaticamente.push(r.ruleset_id);
    });

    // revisao começa em 1 (Instruções da tarefa: "ruleset novo começa
    // revisao = 1; ao ativar um RASCUNHO pela primeira vez, continua
    // revisão 1 — não incrementar revisão simplesmente por ativar").
    // Isso só preenche o campo se ele ainda estiver vazio (ex: um
    // ruleset criado manualmente na planilha antes da migração
    // administrativa rodar) — nunca sobrescreve uma revisão já
    // definida.
    const camposAtivacao = { status: STATUS_RULESET_ATIVO };
    if (String(atual.dados.revisao || "").trim() === "") camposAtivacao.revisao = 1;

    repoAtualizarLinhaCampos_(atual.aba, atual.mapa, atual.linha, camposAtivacao);

    return {
      ruleset: repoObterRuleset_(rulesetId),
      rulesetsDesativadosAutomaticamente: desativadosAutomaticamente
    };

  } finally {
    lock.releaseLock();
  }

}

// Chamada só por inativarRulesetCurricular (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function inativarRulesetCurricularSemAuditoria_(rulesetId, snapshotToken) {

  if (!rulesetId) throw new Error("Ruleset não informado.");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {

    const atual = repoLocalizarRuleset_(rulesetId);
    if (!atual) throw new Error(`Ruleset "${rulesetId}" não encontrado.`);

    exigirSnapshotValido_(atual.dados, snapshotToken, "o ruleset");

    const statusAtual = String(atual.dados.status || "").trim().toUpperCase();
    if (statusAtual !== STATUS_RULESET_ATIVO) {
      throw new Error(`Só é possível inativar um ruleset ATIVO (status atual: "${statusAtual}").`);
    }

    repoAtualizarLinhaCampos_(atual.aba, atual.mapa, atual.linha, { status: STATUS_RULESET_INATIVO });

    return repoObterRuleset_(rulesetId);

  } finally {
    lock.releaseLock();
  }

}

// Deriva o "prefixo" do ruleset_id atual (a parte antes de
// "-<curso>-<habilitacao>-V<versao>") — NUNCA inventamos um prefixo
// novo do zero, só reaproveitamos literalmente o que já está no ID
// de origem (Instruções.txt item 14: "não invente regra acadêmica").
function derivarPrefixoRulesetId_(rulesetIdOrigem, cursoCodigo, habilitacaoCodigo) {

  const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const padrao = new RegExp(`^(.+)-${escapeRegex(cursoCodigo)}-${escapeRegex(habilitacaoCodigo)}-V\\d+$`);
  const m = String(rulesetIdOrigem).match(padrao);

  if (!m) {
    throw new Error(
      `Não consegui reconhecer o padrão do identificador "${rulesetIdOrigem}" ` +
      `(esperado algo como PREFIXO-${cursoCodigo}-${habilitacaoCodigo}-V1). ` +
      `Corrija o ruleset_id manualmente na planilha antes de criar uma nova versão.`
    );
  }

  return m[1];

}

// Cria uma nova versão (RASCUNHO) clonando dados gerais + requisitos
// + disciplinas + grupos do ruleset de origem, com IDs novos pra
// tudo (Instruções.txt item 10). O ruleset de origem NUNCA é
// alterado. selecao_automatica sempre volta pra NAO "por segurança".
// Chamada só por criarNovaVersaoRuleset (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function criarNovaVersaoRulesetSemAuditoria_(rulesetIdOrigem) {

  if (!rulesetIdOrigem) throw new Error("Ruleset de origem não informado.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {

    const origem = repoLocalizarRuleset_(rulesetIdOrigem);
    if (!origem) throw new Error(`Ruleset "${rulesetIdOrigem}" não encontrado.`);

    const cursoCodigo = String(origem.dados.curso_codigo).trim();
    const habilitacaoCodigo = String(origem.dados.habilitacao_codigo).trim();
    const prefixo = derivarPrefixoRulesetId_(rulesetIdOrigem, cursoCodigo, habilitacaoCodigo);

    const todosDaHabilitacao = repoListarRulesets_().filter(r =>
      String(r.curso_codigo).trim() === cursoCodigo &&
      String(r.habilitacao_codigo).trim() === habilitacaoCodigo
    );
    const maiorVersao = Math.max(0, ...todosDaHabilitacao.map(r => Number(r.versao) || 0));
    const novaVersaoNumero = maiorVersao + 1;
    const novoRulesetId = `${prefixo}-${cursoCodigo}-${habilitacaoCodigo}-V${novaVersaoNumero}`;

    if (repoLocalizarRuleset_(novoRulesetId)) {
      throw new Error(`O identificador "${novoRulesetId}" já existe — isso não deveria acontecer. Confira a planilha manualmente antes de tentar de novo.`);
    }

    // 1) Novo ruleset (dados gerais). vigencia_inicio/vigencia_fim são
    // tratados à parte logo abaixo, como texto puro (mesmo motivo de
    // salvarDadosGeraisRuleset). Também clona os campos acadêmicos
    // novos (semestres/compensação — Instruções da tarefa: "Nova
    // versão precisa copiar também semestres_minimos, semestres_maximos,
    // excedente_eletivas_compensa_livres") e sempre começa com
    // revisao = 1 (é uma versão nova, não uma correção).
    const novaLinhaRuleset = repoInserirRuleset_({
      ruleset_id: novoRulesetId,
      curso_codigo: cursoCodigo,
      habilitacao_codigo: habilitacaoCodigo,
      habilitacao_nome: origem.dados.habilitacao_nome,
      estrutura_curricular: origem.dados.estrutura_curricular,
      versao: novaVersaoNumero,
      status: STATUS_RULESET_RASCUNHO,
      selecao_automatica: VALOR_BOOLEANO_NAO,
      criterio_selecao: origem.dados.criterio_selecao,
      observacao: origem.dados.observacao,
      semestres_minimos: origem.dados.semestres_minimos,
      semestres_maximos: origem.dados.semestres_maximos,
      excedente_eletivas_compensa_livres: origem.dados.excedente_eletivas_compensa_livres,
      revisao: 1,
      ultima_revisao_em: "",
      ultima_revisao_por: ""
    });

    const abaRuleset = obterAbaRegras_(ABA_REGRAS_CURRICULOS);
    const mapaRuleset = mapearCabecalhosObrigatorios_(abaRuleset, CABECALHOS_CURRICULOS);
    gravarCelulaTexto_(abaRuleset.getRange(novaLinhaRuleset, mapaRuleset["vigencia_inicio"]), formatarCelulaData_(origem.dados.vigencia_inicio));
    gravarCelulaTexto_(abaRuleset.getRange(novaLinhaRuleset, mapaRuleset["vigencia_fim"]), formatarCelulaData_(origem.dados.vigencia_fim));

    // 2) Clona GRUPOS primeiro — precisamos do mapa id-antigo -> id-novo
    // pra remapear corretamente as disciplinas do tipo Grupo.
    const mapaGrupoAntigoParaNovo = {};
    repoListarGrupos_(rulesetIdOrigem).forEach(g => {
      const novoGrupoId = gerarIdEntidade_("grp");
      mapaGrupoAntigoParaNovo[g.grupo_id] = novoGrupoId;
      repoInserirGrupo_({
        grupo_id: novoGrupoId,
        ruleset_id: novoRulesetId,
        nome_grupo: g.nome_grupo,
        tipo_regra: g.tipo_regra,
        valor_minimo: g.valor_minimo,
        unidade: g.unidade,
        campo_soma: g.campo_soma,
        ativo: g.ativo,
        observacao: g.observacao
      });
    });

    // 3) Clona DISCIPLINAS, remapeando grupo_id quando aplicável.
    repoListarDisciplinas_(rulesetIdOrigem).forEach(d => {
      const grupoIdRemapeado = d.grupo_id ? (mapaGrupoAntigoParaNovo[d.grupo_id] || "") : "";
      repoInserirDisciplina_({
        regra_disciplina_id: gerarIdEntidade_("disc"),
        ruleset_id: novoRulesetId,
        sigla: d.sigla,
        nome: d.nome,
        tipo_regra: d.tipo_regra,
        grupo_id: grupoIdRemapeado,
        status_aceitos: d.status_aceitos,
        ativo: d.ativo,
        ordem: d.ordem,
        observacao: d.observacao
      });
    });

    // 4) Clona REQUISITOS_NUMERICOS (sem referências cruzadas a remapear).
    repoListarRequisitos_(rulesetIdOrigem).forEach(r => {
      repoInserirRequisito_({
        requisito_id: gerarIdEntidade_("req"),
        ruleset_id: novoRulesetId,
        criterio: r.criterio,
        campo_parser: r.campo_parser,
        operador: r.operador,
        valor: r.valor,
        unidade: r.unidade,
        obrigatorio: r.obrigatorio,
        descricao: r.descricao,
        ordem: r.ordem,
        ativo: r.ativo,
        observacao: r.observacao
      });
    });

    return repoObterRuleset_(novoRulesetId);

  } finally {
    lock.releaseLock();
  }

}

/*=====================================================
  CRIAR REGRAS PARA OUTRO CURRÍCULO (multi-currículo)

  Operação DIFERENTE de "Criar nova versão": aqui o
  curso_codigo MUDA (ex: 47012 -> 47011), a habilitação é
  preservada, e o resultado é sempre um RASCUNHO novo, nunca
  ativado automaticamente (Instruções da tarefa: "a operação
  deve CLONAR a origem apenas como ponto de partida" / "nunca
  ativar automaticamente" / "não crie rulesets 47011 por
  conta própria, não invente nenhuma regra acadêmica" — quem
  decide o curso novo e revisa os dados é sempre o operador
  humano, esta função só copia estrutura como esqueleto).

  Reaproveita derivarPrefixoRulesetId_ com o curso_codigo de
  ORIGEM (é ele que está de fato codificado no ruleset_id
  atual) — o curso NOVO só entra na hora de montar o
  novoRulesetId.
=====================================================*/
// Chamada só por criarRulesetParaOutroCurriculo (AuditoriaPainel.gs), que confere o acesso e grava a auditoria.
function criarRulesetParaOutroCurriculoSemAuditoria_(dados) {

  if (!dados || !dados.rulesetIdOrigem) throw new Error("Ruleset de origem não informado.");

  const novoCursoCodigo = String(dados.novoCursoCodigo || "").trim();
  if (!novoCursoCodigo) throw new Error("Informe o código do novo currículo.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {

    const origem = repoLocalizarRuleset_(dados.rulesetIdOrigem);
    if (!origem) throw new Error(`Ruleset "${dados.rulesetIdOrigem}" não encontrado.`);

    const cursoOrigem = String(origem.dados.curso_codigo).trim();
    const habilitacaoCodigo = String(origem.dados.habilitacao_codigo).trim();

    if (novoCursoCodigo === cursoOrigem) {
      throw new Error(
        'O novo código de curso precisa ser diferente do currículo de origem. ' +
        'Para manter o mesmo currículo e criar uma nova versão das regras, use "Criar nova versão".'
      );
    }

    // Reconhece o prefixo a partir do ID de ORIGEM (o curso codificado
    // nele é o cursoOrigem, não o novoCursoCodigo) — nunca inventamos
    // um prefixo novo (Instruções.txt item 14 / Instruções da tarefa).
    const prefixo = derivarPrefixoRulesetId_(dados.rulesetIdOrigem, cursoOrigem, habilitacaoCodigo);

    const todosDoNovoCursoHabilitacao = repoListarRulesets_().filter(r =>
      String(r.curso_codigo).trim() === novoCursoCodigo &&
      String(r.habilitacao_codigo).trim() === habilitacaoCodigo
    );
    const maiorVersao = Math.max(0, ...todosDoNovoCursoHabilitacao.map(r => Number(r.versao) || 0));
    const novaVersaoNumero = maiorVersao + 1;
    const novoRulesetId = `${prefixo}-${novoCursoCodigo}-${habilitacaoCodigo}-V${novaVersaoNumero}`;

    if (repoLocalizarRuleset_(novoRulesetId)) {
      throw new Error(`O identificador "${novoRulesetId}" já existe — confira a planilha manualmente antes de tentar de novo.`);
    }

    // Campos acadêmicos do novo currículo: aceitos do modal, mas TODOS
    // opcionais nesta etapa (o RASCUNHO resultante pode ser completado
    // depois, igual a qualquer outro RASCUNHO — Instruções da tarefa:
    // "as regras foram copiadas apenas como ponto de partida").
    const estruturaCurricular = String(dados.estrutura_curricular || "").trim();
    const semestresMinimos = normalizarInteiroOpcional_(dados.semestres_minimos, "Semestres mínimos");
    const semestresMaximos = normalizarInteiroOpcional_(dados.semestres_maximos, "Semestres máximos");
    const excedenteCompensaLivres = normalizarBooleanoEstrito_(
      dados.excedente_eletivas_compensa_livres,
      'O campo "Excedente de eletivas compensa créditos livres?"'
    );
    const vigenciaInicio = String(dados.vigencia_inicio || "").trim()
      ? validarDataBrTexto_(dados.vigencia_inicio, "Vigência — início")
      : "";
    const vigenciaFim = String(dados.vigencia_fim || "").trim()
      ? validarDataBrTexto_(dados.vigencia_fim, "Vigência — fim")
      : "";

    // 1) Novo ruleset — RASCUNHO, nunca ativado, seleção automática
    // sempre NÃO, critério de seleção sempre vazio, revisao = 1
    // (Instruções da tarefa).
    const novaLinhaRuleset = repoInserirRuleset_({
      ruleset_id: novoRulesetId,
      curso_codigo: novoCursoCodigo,
      habilitacao_codigo: habilitacaoCodigo,
      habilitacao_nome: origem.dados.habilitacao_nome,
      estrutura_curricular: estruturaCurricular,
      versao: novaVersaoNumero,
      status: STATUS_RULESET_RASCUNHO,
      selecao_automatica: VALOR_BOOLEANO_NAO,
      criterio_selecao: "",
      observacao: origem.dados.observacao,
      semestres_minimos: semestresMinimos,
      semestres_maximos: semestresMaximos,
      excedente_eletivas_compensa_livres: excedenteCompensaLivres,
      revisao: 1,
      ultima_revisao_em: "",
      ultima_revisao_por: ""
    });

    const abaRuleset = obterAbaRegras_(ABA_REGRAS_CURRICULOS);
    const mapaRuleset = mapearCabecalhosObrigatorios_(abaRuleset, CABECALHOS_CURRICULOS);
    gravarCelulaTexto_(abaRuleset.getRange(novaLinhaRuleset, mapaRuleset["vigencia_inicio"]), vigenciaInicio);
    gravarCelulaTexto_(abaRuleset.getRange(novaLinhaRuleset, mapaRuleset["vigencia_fim"]), vigenciaFim);

    // 2) Clona GRUPOS primeiro — mesmo padrão de criarNovaVersaoRuleset:
    // precisamos do mapa id-antigo -> id-novo pra remapear as
    // disciplinas do tipo Grupo corretamente.
    const mapaGrupoAntigoParaNovo = {};
    repoListarGrupos_(dados.rulesetIdOrigem).forEach(g => {
      const novoGrupoId = gerarIdEntidade_("grp");
      mapaGrupoAntigoParaNovo[g.grupo_id] = novoGrupoId;
      repoInserirGrupo_({
        grupo_id: novoGrupoId,
        ruleset_id: novoRulesetId,
        nome_grupo: g.nome_grupo,
        tipo_regra: g.tipo_regra,
        valor_minimo: g.valor_minimo,
        unidade: g.unidade,
        campo_soma: g.campo_soma,
        ativo: g.ativo,
        observacao: g.observacao
      });
    });

    // 3) Clona DISCIPLINAS, remapeando grupo_id quando aplicável.
    repoListarDisciplinas_(dados.rulesetIdOrigem).forEach(d => {
      const grupoIdRemapeado = d.grupo_id ? (mapaGrupoAntigoParaNovo[d.grupo_id] || "") : "";
      repoInserirDisciplina_({
        regra_disciplina_id: gerarIdEntidade_("disc"),
        ruleset_id: novoRulesetId,
        sigla: d.sigla,
        nome: d.nome,
        tipo_regra: d.tipo_regra,
        grupo_id: grupoIdRemapeado,
        status_aceitos: d.status_aceitos,
        ativo: d.ativo,
        ordem: d.ordem,
        observacao: d.observacao
      });
    });

    // 4) Clona REQUISITOS_NUMERICOS.
    repoListarRequisitos_(dados.rulesetIdOrigem).forEach(r => {
      repoInserirRequisito_({
        requisito_id: gerarIdEntidade_("req"),
        ruleset_id: novoRulesetId,
        criterio: r.criterio,
        campo_parser: r.campo_parser,
        operador: r.operador,
        valor: r.valor,
        unidade: r.unidade,
        obrigatorio: r.obrigatorio,
        descricao: r.descricao,
        ordem: r.ordem,
        ativo: r.ativo,
        observacao: r.observacao
      });
    });

    return repoObterRuleset_(novoRulesetId);

  } finally {
    lock.releaseLock();
  }

}

function TESTE_DIAGNOSTICO_TEMP_() {
  const resultado = listarRulesetsCurriculares();
  Logger.log("Quantidade: " + resultado.length);
  Logger.log(JSON.stringify(resultado));
}
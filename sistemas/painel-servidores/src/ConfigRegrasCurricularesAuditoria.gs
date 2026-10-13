/*=====================================================
  REGRAS CURRICULARES — AUDITORIA / CORREÇÃO DE RULESET ATIVO

  Implementa a "revisão interna": a possibilidade de corrigir um
  ruleset ATIVO sem criar uma nova versão (V1 continua V1), mantendo
  rastreabilidade completa através da aba AUDITORIA_REGRAS_CURRICULARES
  (ver CABECALHOS_AUDITORIA, ConfigRegrasCurricularesRepository.gs).

  SEQUÊNCIA (revisada na 2ª rodada cirúrgica — "Achado 1": a auditoria
  só pode ser preparada DEPOIS que TODA a validação da requisição já
  passou, nunca antes; erro puramente de validação nunca escreve nada
  e, portanto, nunca aciona rollback):

    Responsabilidade de CADA endpoint (ConfigRegrasCurriculares.gs),
    NESTA ORDEM, sem nenhuma escrita antes do passo 11:
      1.  adquirir LockService
      2.  localizar ruleset
      3.  localizar entidade alvo, se houver
      4.  validar status real do ruleset (prepararContextoMutacaoRuleset_)
      5.  validar motivo, se ATIVO       (idem, dentro da função acima)
      6.  validar snapshotToken
      7.  validar todos os dados enviados
      8.  validar todas as referências relacionadas
      9.  validar duplicidades
      10. validar regras estruturais verificáveis antes da escrita

      SOMENTE DEPOIS de 4-10 terem passado, todos, é que o endpoint
      chama:
      11. prepararAuditoriaCorrecaoAtiva_ — PRIMEIRA escrita real do
          fluxo de correção: snapshot completo ANTES, revisão
          atual/nova, linha de auditoria PREPARADA.

      [ ... o endpoint aplica a mutação em si (passo 12) ... ]

    DEPOIS da mutação (só se o conteúdo continuar válido):
      13. validar o estado resultante (validarConteudoCompletoRuleset_)
      14-15. confirmarCorrecaoAtiva_ — atualiza CURRICULOS.revisao /
          ultima_revisao_em / ultima_revisao_por, captura snapshot
          completo DEPOIS, e só então finaliza a auditoria como
          CONFIRMADA (verificando explicitamente que a atualização da
          linha de auditoria teve sucesso — "Achado 3": nunca deixar
          mutação aplicada sem auditoria CONFIRMADA).
      16. liberar lock (finally, em qualquer caminho).

  Se a preparação (passo 11) falhar, a mutação NUNCA chega a ser
  aplicada — falha de forma segura, sem trilha nenhuma sendo melhor do
  que mutação sem trilha. Como nada foi escrito ainda nesse ponto,
  NENHUM rollback é acionado (não há o que desfazer).

  Se algo falhar DEPOIS da preparação (mutação inválida, ou falha ao
  confirmar a auditoria — "Achado 3"), falharCorrecaoAtiva_ aciona um
  rollback CIRÚRGICO: restaura só a entidade efetivamente alterada
  (nunca o ruleset inteiro — "Achado 2") e os metadados de revisão do
  ruleset (que podem já ter avançado), e marca a auditoria como
  FALHOU. O snapshot completo continua sendo capturado integralmente,
  mas passa a servir só como EVIDÊNCIA de auditoria — não mais como
  mecanismo de reconstrução total.

  Cada chamada confirmada = uma revisão a mais (Instruções da tarefa:
  "cada salvamento efetivo = uma revisão" — nunca tentamos agrupar
  várias telas numa única revisão).
=====================================================*/

/*-----------------------------------------------------
  IDENTIDADE DO USUÁRIO
------------------------------------------------------*/

// Session.getActiveUser() só devolve e-mail quando o script está
// autorizado com esse escopo; em muitos contextos (execução como
// outro usuário, gatilhos) vem vazio. Tentamos o usuário ativo
// primeiro, depois o efetivo, e só usamos um texto explícito de
// "não identificado" como último recurso — nunca inventamos um
// e-mail (Instruções da tarefa).
function obterEmailUsuarioAtual_() {

  try {
    const ativo = Session.getActiveUser() && Session.getActiveUser().getEmail();
    if (ativo) return ativo;
  } catch (err) {
    Logger.log("Falha ao obter Session.getActiveUser(): " + err);
  }

  try {
    const efetivo = Session.getEffectiveUser() && Session.getEffectiveUser().getEmail();
    if (efetivo) return efetivo;
  } catch (err) {
    Logger.log("Falha ao obter Session.getEffectiveUser(): " + err);
  }

  return "NAO_IDENTIFICADO";

}

function agoraFormatado_() {
  return Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm:ss");
}

/*-----------------------------------------------------
  SNAPSHOT COMPLETO DO RULESET
  (dados gerais + requisitos + disciplinas + grupos, em ordem
  determinística, sem o snapshotToken efêmero — Instruções da tarefa)
------------------------------------------------------*/

function despojarSnapshotToken_(objeto) {
  if (!objeto) return objeto;
  const copia = Object.assign({}, objeto);
  delete copia.snapshotToken;
  return copia;
}

function ordenarPorId_(lista, campoId) {
  return lista.slice().sort((a, b) => String(a[campoId] || "").localeCompare(String(b[campoId] || "")));
}

function capturarSnapshotRulesetCompleto_(rulesetId) {

  const localizado = repoLocalizarRuleset_(rulesetId);

  return {
    ruleset: localizado ? despojarSnapshotToken_(localizado.dados) : null,
    requisitos: ordenarPorId_(repoListarRequisitos_(rulesetId).map(despojarSnapshotToken_), "requisito_id"),
    disciplinas: ordenarPorId_(repoListarDisciplinas_(rulesetId).map(despojarSnapshotToken_), "regra_disciplina_id"),
    grupos: ordenarPorId_(repoListarGrupos_(rulesetId).map(despojarSnapshotToken_), "grupo_id")
  };

}

// Restaura os metadados de revisão do ruleset (revisao /
// ultima_revisao_em / ultima_revisao_por) para o valor de ANTES da
// correção. Chamado sempre pelo rollback cirúrgico, mesmo nos casos em
// que esses campos nunca chegaram a ser avançados (falha antes da
// confirmação) — nesse caso a restauração é um no-op, porque o valor
// atual já é igual ao do snapshot. Necessário porque
// confirmarCorrecaoAtiva_ grava a revisão nova ANTES de confirmar a
// auditoria — se a confirmação falhar depois disso ("Achado 3"), a
// revisão já avançada também precisa voltar.
function restaurarMetadadosRevisaoRuleset_(rulesetId, snapshotAntes) {
  if (!snapshotAntes || !snapshotAntes.ruleset) return;
  const localizado = repoLocalizarRuleset_(rulesetId);
  if (!localizado) return; // ruleset sumiu — nada a restaurar
  repoAtualizarLinhaCampos_(localizado.aba, localizado.mapa, localizado.linha, {
    revisao: snapshotAntes.ruleset.revisao,
    ultima_revisao_em: snapshotAntes.ruleset.ultima_revisao_em,
    ultima_revisao_por: snapshotAntes.ruleset.ultima_revisao_por
  });
}

// Restaura UMA entidade filha (requisito, disciplina ou grupo) de
// acordo com a operação que a alterou — nunca toca em nenhuma outra
// linha da mesma tabela ("Achado 2": rollback cirúrgico, nunca
// apagar/reinserir outras entidades por causa de uma falha
// localizada). "listaSnapshotAntes" é a lista completa daquele tipo de
// entidade dentro do snapshot ANTES (ex: snapshotAntes.requisitos).
function restaurarEntidadeFilhaDoSnapshot_(operacao, entidadeId, listaSnapshotAntes, campoId, localizarFn, inserirFn) {

  const operacaoTexto = String(operacao || "");

  if (operacaoTexto.indexOf("EDITAR_") === 0) {
    // Existia antes e continua existindo — devolve os campos originais
    // daquela MESMA linha, sem tocar em nenhuma outra.
    const original = (listaSnapshotAntes || []).find(e => String(e[campoId]) === String(entidadeId));
    if (!original) throw new Error(`Não encontrei o registro original de "${entidadeId}" no snapshot para restaurar a edição.`);
    const loc = localizarFn(entidadeId);
    if (!loc) throw new Error(`"${entidadeId}" não foi encontrado durante a restauração da edição.`);
    repoAtualizarLinhaCampos_(loc.aba, loc.mapa, loc.linha, original);
    return;
  }

  if (operacaoTexto.indexOf("INCLUIR_") === 0) {
    // Não existia antes — a única forma de desfazer é excluir somente
    // a linha recém-criada.
    const loc = localizarFn(entidadeId);
    if (loc) repoExcluirLinha_(loc.aba, loc.linha);
    return;
  }

  if (operacaoTexto.indexOf("EXCLUIR_") === 0) {
    // Existia antes e foi removida — reinsere com o MESMO ID e os
    // MESMOS dados que tinha no snapshot (nunca gera ID novo).
    const original = (listaSnapshotAntes || []).find(e => String(e[campoId]) === String(entidadeId));
    if (!original) throw new Error(`Não encontrei o registro original de "${entidadeId}" no snapshot para reinserir após exclusão.`);
    const loc = localizarFn(entidadeId);
    if (!loc) inserirFn(original); // só reinsere se realmente não existir mais
    return;
  }

  throw new Error(`Operação "${operacaoTexto}" desconhecida para rollback cirúrgico.`);

}

// Rollback CIRÚRGICO ("Achado 2"): restaura só a entidade efetivamente
// alterada por esta correção — nunca o ruleset inteiro. O snapshot
// completo (capturarSnapshotRulesetCompleto_) continua sendo a fonte
// dos dados "de antes", mas só da entidade em questão, nunca mais como
// "apaga tudo e reinsere tudo" do ruleset inteiro.
function restaurarEntidadeDoSnapshot_(rulesetId, entidadeTipo, entidadeId, operacao, snapshotAntes) {

  if (!snapshotAntes) {
    throw new Error("Snapshot anterior ausente — não é possível restaurar.");
  }

  if (entidadeTipo === "RULESET_GERAL") {
    // A própria linha do ruleset É a entidade alterada — restaurar
    // todos os seus campos (já inclui revisao/ultima_revisao_em/
    // ultima_revisao_por, então cobre também a parte de metadados).
    if (!snapshotAntes.ruleset) throw new Error("Snapshot do ruleset ausente — não é possível restaurar dados gerais.");
    const localizado = repoLocalizarRuleset_(rulesetId);
    if (!localizado) throw new Error(`Ruleset "${rulesetId}" não encontrado durante a restauração.`);
    repoAtualizarLinhaCampos_(localizado.aba, localizado.mapa, localizado.linha, snapshotAntes.ruleset);
    return;
  }

  if (entidadeTipo === "REQUISITO") {
    restaurarEntidadeFilhaDoSnapshot_(operacao, entidadeId, snapshotAntes.requisitos, "requisito_id", repoLocalizarRequisito_, repoInserirRequisito_);
  } else if (entidadeTipo === "DISCIPLINA") {
    restaurarEntidadeFilhaDoSnapshot_(operacao, entidadeId, snapshotAntes.disciplinas, "regra_disciplina_id", repoLocalizarDisciplina_, repoInserirDisciplina_);
  } else if (entidadeTipo === "GRUPO") {
    restaurarEntidadeFilhaDoSnapshot_(operacao, entidadeId, snapshotAntes.grupos, "grupo_id", repoLocalizarGrupo_, repoInserirGrupo_);
  } else {
    throw new Error(`Tipo de entidade "${entidadeTipo}" desconhecido para rollback cirúrgico.`);
  }

  // A revisão/metadados do ruleset também podem ter avançado (ver
  // "Achado 3" — falha na confirmação da auditoria acontece DEPOIS que
  // confirmarCorrecaoAtiva_ já gravou a revisão nova) — restaura
  // sempre; é um no-op quando ainda não tinham avançado.
  restaurarMetadadosRevisaoRuleset_(rulesetId, snapshotAntes);

}

/*-----------------------------------------------------
  CONTEXTO DE MUTAÇÃO — decide RASCUNHO normal vs ATIVO em
  correção auditada vs recusa (INATIVO, ou ATIVO sem motivo).
  Chamado no INÍCIO de cada um dos 7 endpoints de mutação
  (ConfigRegrasCurriculares.gs).

  Desde a 2ª rodada cirúrgica ("Achado 1"), esta função é PURA
  VALIDAÇÃO — nunca escreve nada na planilha. Ela só decide QUAL modo
  se aplica (RASCUNHO / ATIVO_CORRECAO / recusa); a preparação de fato
  da auditoria (que já é uma escrita — PREPARADA + snapshot ANTES) foi
  deslocada para prepararAuditoriaCorrecaoAtiva_, chamada pelo próprio
  endpoint SÓ DEPOIS que toda a validação específica da requisição
  (snapshotToken, dados, referências, duplicidades, regras estruturais)
  já passou. Isso garante a regra central desta rodada: se nenhuma
  escrita ainda aconteceu, nenhum rollback pode ser disparado.
------------------------------------------------------*/

function prepararContextoMutacaoRuleset_(rulesetId, motivoCorrecaoAtiva) {

  const localizado = repoLocalizarRuleset_(rulesetId);
  if (!localizado) throw new Error(`Ruleset "${rulesetId}" não encontrado.`);

  const status = String(localizado.dados.status || "").trim().toUpperCase();

  if (status === STATUS_RULESET_RASCUNHO) {
    exigirRulesetRascunhoEditavel_(rulesetId);
    return { modo: "RASCUNHO" };
  }

  if (status === STATUS_RULESET_ATIVO) {
    exigirRulesetAtivoCorrigivel_(rulesetId, motivoCorrecaoAtiva);
    return { modo: "ATIVO_CORRECAO" };
  }

  throw new Error(`Este ruleset está "${status}" e não pode ser editado.`);

}

// Passo 11 do novo fluxo: snapshot ANTES, revisão atual/nova, linha de
// auditoria PREPARADA — a PRIMEIRA escrita real do fluxo de correção.
// Chamada pelo endpoint só depois que toda a validação prévia (passos
// 4-10) já passou. Se qualquer um destes passos falhar, a exceção sobe
// e o endpoint chamador NUNCA chega a aplicar a mutação (Instruções da
// tarefa: "se a auditoria não puder sequer ser preparada, não fazer a
// alteração — falhar de forma segura"); como nada foi escrito ainda
// nesse ponto, nenhum rollback é acionado.
function prepararAuditoriaCorrecaoAtiva_(rulesetId, motivo) {

  const localizado = repoLocalizarRuleset_(rulesetId);
  if (!localizado) throw new Error(`Ruleset "${rulesetId}" não encontrado.`);

  const snapshotAntes = capturarSnapshotRulesetCompleto_(rulesetId);
  const revisaoAnterior = Number(localizado.dados.revisao) || 0;
  const revisaoNova = revisaoAnterior + 1;

  const auditoriaId = repoInserirAuditoria_({
    registrado_em: agoraFormatado_(),
    registrado_por: obterEmailUsuarioAtual_(),
    ruleset_id: rulesetId,
    curso_codigo: localizado.dados.curso_codigo,
    habilitacao_codigo: localizado.dados.habilitacao_codigo,
    estrutura_curricular: localizado.dados.estrutura_curricular,
    versao: localizado.dados.versao,
    revisao_anterior: revisaoAnterior,
    revisao_nova: revisaoNova,
    status_ruleset: STATUS_RULESET_ATIVO,
    entidade_tipo: "",
    entidade_id: "",
    operacao: "",
    motivo: motivo,
    snapshot_antes_json: JSON.stringify(snapshotAntes),
    snapshot_depois_json: "",
    estado: ESTADO_AUDITORIA_PREPARADA
  });

  return {
    auditoriaId: auditoriaId,
    rulesetId: rulesetId,
    revisaoAnterior: revisaoAnterior,
    revisaoNova: revisaoNova,
    snapshotAntes: snapshotAntes,
    motivo: motivo
  };

}

// Passos 9-13 — chamado pelo endpoint DEPOIS que a mutação já foi
// aplicada com sucesso E o conteúdo do ruleset já foi revalidado como
// estruturalmente válido (validarConteudoCompletoRuleset_ — essa
// checagem é responsabilidade do endpoint, não desta função, pra
// deixar claro no próprio endpoint qual mutação está sendo
// confirmada). Se qualquer passo daqui falhar, a exceção sobe pro
// catch do endpoint, que chama falharCorrecaoAtiva_.
function confirmarCorrecaoAtiva_(correcao, entidadeTipo, entidadeId, operacao) {

  const localizado = repoLocalizarRuleset_(correcao.rulesetId);
  if (!localizado) throw new Error(`Ruleset "${correcao.rulesetId}" não encontrado ao confirmar a correção.`);

  const agora = agoraFormatado_();
  const usuario = obterEmailUsuarioAtual_();

  repoAtualizarLinhaCampos_(localizado.aba, localizado.mapa, localizado.linha, {
    revisao: correcao.revisaoNova,
    ultima_revisao_em: agora,
    ultima_revisao_por: usuario
  });

  const snapshotDepois = capturarSnapshotRulesetCompleto_(correcao.rulesetId);

  const auditoriaAtualizada = repoAtualizarAuditoria_(correcao.auditoriaId, {
    entidade_tipo: entidadeTipo,
    entidade_id: String(entidadeId || ""),
    operacao: operacao,
    snapshot_depois_json: JSON.stringify(snapshotDepois),
    estado: ESTADO_AUDITORIA_CONFIRMADA
  });

  // "Achado 3": repoAtualizarAuditoria_ devolve false quando a linha
  // PREPARADA não é mais localizada (ex: alguém apagou a linha
  // manualmente entre a preparação e a confirmação). Isso NUNCA pode
  // ser silenciosamente ignorado — o sistema não pode terminar com a
  // mutação aplicada e a revisão avançada, mas sem auditoria
  // CONFIRMADA. Lançar aqui faz o catch do endpoint acionar o rollback
  // cirúrgico (restaura a entidade + os metadados de revisão que
  // acabaram de ser gravados alguns milissegundos atrás, logo acima).
  // 3ª rodada cirúrgica (Achado 3): esta mensagem é NEUTRA de propósito
  // — nunca afirma "foi desfeita"/"foi restaurada". Neste ponto o
  // rollback ainda nem começou (quem decide isso é o catch do
  // endpoint, chamando falharCorrecaoAtiva_ logo em seguida); dizer
  // aqui que a alteração já foi desfeita seria uma afirmação sobre um
  // estado que ainda não se sabe se vai ser alcançado.
  if (!auditoriaAtualizada) {
    throw new Error(
      `Não foi possível confirmar a auditoria "${correcao.auditoriaId}" da correção do ruleset ` +
      `"${correcao.rulesetId}" (a linha de auditoria PREPARADA não foi encontrada). ` +
      `Falha na confirmação da alteração.`
    );
  }

}

// Chamado pelo catch do endpoint sempre que algo falha DEPOIS que a
// auditoria já foi preparada (passo 11 concluído) — seja porque a
// mutação em si lançou erro, seja porque o conteúdo pós-mutação ficou
// inválido, seja porque a confirmação da própria auditoria falhou
// ("Achado 3"). Aciona o rollback CIRÚRGICO ("Achado 2" —
// restaurarEntidadeDoSnapshot_, nunca o ruleset inteiro) e marca a
// auditoria como FALHOU.
//
// 3ª rodada cirúrgica (Achado 3): antes, esta função não devolvia
// nada — o catch do endpoint não tinha como saber se a restauração
// automática (rollback) realmente funcionou, e por isso sempre
// relançava o erro ORIGINAL sem alterar sua mensagem, mesmo quando
// essa mensagem já dizia (prematuramente) "foi desfeita". Agora
// devolve { restauracaoOk, erroRestauracao } pra que o chamador monte
// a mensagem final com honestidade (ver construirErroFinalCorrecao_,
// abaixo) — não é uma máquina transacional nova, só é sincero sobre
// um estado que antes ficava incerto.
function falharCorrecaoAtiva_(correcao, erroOriginal, entidadeTipo, entidadeId, operacao) {

  let restauracaoOk = false;
  let erroRestauracaoCapturado = null;
  try {
    restaurarEntidadeDoSnapshot_(correcao.rulesetId, entidadeTipo, entidadeId, operacao, correcao.snapshotAntes);
    restauracaoOk = true;
  } catch (erroRestauracao) {
    erroRestauracaoCapturado = erroRestauracao;
    Logger.log(
      "Falha ao tentar restaurar a entidade \"" + entidadeTipo + ":" + entidadeId + "\" (operação \"" + operacao +
      "\") do ruleset \"" + correcao.rulesetId + "\" após correção malsucedida " +
      "(auditoria \"" + correcao.auditoriaId + "\"): " + erroRestauracao
    );
  }

  try {
    repoAtualizarAuditoria_(correcao.auditoriaId, {
      entidade_tipo: entidadeTipo || "",
      entidade_id: String(entidadeId || ""),
      operacao: operacao || "",
      estado: ESTADO_AUDITORIA_FALHOU,
      snapshot_depois_json: JSON.stringify({
        erro: String((erroOriginal && erroOriginal.message) || erroOriginal || ""),
        restauracaoAutomaticaAplicada: restauracaoOk
      })
    });
  } catch (erroAuditoria) {
    Logger.log("Falha ao marcar auditoria \"" + correcao.auditoriaId + "\" como FALHOU: " + erroAuditoria);
  }

  return { restauracaoOk: restauracaoOk, erroRestauracao: erroRestauracaoCapturado };

}

// Monta a mensagem de erro FINAL de uma correção de ATIVO que falhou —
// chamada pelo catch de cada um dos 7 endpoints, DEPOIS de
// falharCorrecaoAtiva_ já ter tentado o rollback (3ª rodada cirúrgica,
// Achado 3). É só aqui, com restauracaoOk já conhecido, que a
// mensagem pode afirmar o que de fato aconteceu:
//  - rollback funcionou: confirma que o estado anterior foi restaurado.
//  - rollback também falhou: ERRO CRÍTICO explícito — nunca afirma
//    restauração que não aconteceu, preserva os dois erros (original e
//    de restauração) e avisa pra não mexer no ruleset até conferir
//    manualmente. Sem máquina transacional nova — só honestidade sobre
//    um estado incerto.
function construirErroFinalCorrecao_(erroOriginal, resultadoFalha) {

  const mensagemOriginal = String((erroOriginal && erroOriginal.message) || erroOriginal || "");

  if (resultadoFalha && resultadoFalha.restauracaoOk) {
    return new Error(
      "A alteração não foi concluída e o estado anterior foi restaurado.\n\n" + mensagemOriginal
    );
  }

  const erroRestauracao = resultadoFalha && resultadoFalha.erroRestauracao;
  const mensagemRestauracao = String((erroRestauracao && erroRestauracao.message) || erroRestauracao || "(nenhuma correção estava em andamento)");

  return new Error(
    "ERRO CRÍTICO: a operação falhou e a restauração automática também não pôde ser concluída. " +
    "Não faça novas alterações neste ruleset até conferir manualmente seu estado atual e a auditoria.\n\n" +
    "Erro original: " + mensagemOriginal + "\n" +
    "Erro durante a restauração: " + mensagemRestauracao
  );

}
